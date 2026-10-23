import 'dotenv/config'
import { constants } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { loadEnv } from '../config/env.js'
import { createPrismaClient } from '../infrastructure/database/prisma.js'
import { createGitCommandRunner } from '../infrastructure/git/git-command-runner.js'
import { runDeploymentPreflight } from '../infrastructure/preflight/deployment-preflight.js'
import { verifyJavaContainerHost } from '../infrastructure/java/java-container.js'
import { assertHostedGitService } from '../infrastructure/preflight/hosted-service.js'

function checkExecutable(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: 'ignore' })
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')) }, 10_000)
    child.once('error', reject)
    child.once('close', (code) => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('failed')) })
  })
}

async function main(): Promise<void> {
  const scope = process.argv.find(arg => arg.startsWith('--scope='))?.slice(8) ?? 'all'
  if (!['all', 'api', 'java', 'git'].includes(scope)) throw new Error('Invalid preflight scope')
  let env
  try {
    env = loadEnv()
  } catch {
    console.error(JSON.stringify([{ check: 'environment', status: 'BLOCKING', code: 'CONFIG_INVALID' }]))
    process.exitCode = 1
    return
  }
  const prisma = createPrismaClient(env.databaseUrl)
  const results = [{ check: 'environment', status: 'PASS' as const, code: 'CONFIG_VALID' }, ...await runDeploymentPreflight({
    gitEnabled: scope !== 'java' && env.gitExecutionMode !== 'disabled',
    javaEnabled: (scope === 'all' || scope === 'java') && env.javaExecutionMode !== 'disabled',
    checks: {
      database: async () => { await prisma.$queryRaw`SELECT 1` },
      migrations: async () => {
        const applied = await prisma.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`
        const committed = (await readdir(path.resolve(process.cwd(), 'prisma', 'migrations'), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
        const appliedNames = new Set(applied.filter((item) => item.finished_at && !item.rolled_back_at).map((item) => item.migration_name))
        if (applied.some((item) => !item.finished_at && !item.rolled_back_at) || !committed.every((name) => appliedNames.has(name)) || [...appliedNames].some(name => !committed.includes(name))) throw new Error('not current')
        for (const name of committed) {
          const checksum = createHash('sha256').update(await readFile(path.resolve('prisma', 'migrations', name, 'migration.sql'))).digest('hex')
          if (!applied.some(item => item.migration_name === name && item.finished_at && !item.rolled_back_at && item.checksum === checksum)) throw new Error('migration checksum mismatch')
        }
      },
      git: async () => {
        if (env.gitExecutionMode === 'service_isolated') await assertHostedGitService(env.gitStorageRoot)
        await access(env.gitStorageRoot, constants.R_OK | constants.W_OK)
        await createGitCommandRunner({ executable: env.gitExecutable, timeoutMs: env.gitCommandTimeoutMs, outputLimitBytes: env.gitOutputLimitBytes }).detectVersion()
      },
      java: async () => {
        await access(env.javaJobRoot, constants.R_OK | constants.W_OK)
        if (env.javaExecutionMode === 'container') await verifyJavaContainerHost({ executable: env.javaDockerExecutable, image: env.javaDockerImage })
        else await Promise.all([checkExecutable(env.javaExecutable, ['--version']), checkExecutable(env.javacExecutable, ['--version'])])
      },
    },
  })]
  await prisma.$disconnect().catch(() => undefined)
  console.log(JSON.stringify(results, null, 2))
  if (results.some((result) => result.status === 'BLOCKING')) process.exitCode = 1
}

void main()
