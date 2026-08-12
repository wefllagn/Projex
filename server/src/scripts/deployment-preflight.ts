import 'dotenv/config'
import { constants } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { loadEnv } from '../config/env.js'
import { createPrismaClient } from '../infrastructure/database/prisma.js'
import { createGitCommandRunner } from '../infrastructure/git/git-command-runner.js'
import { runDeploymentPreflight } from '../infrastructure/preflight/deployment-preflight.js'

function checkExecutable(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: 'ignore' })
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')) }, 10_000)
    child.once('error', reject)
    child.once('close', (code) => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('failed')) })
  })
}

async function main(): Promise<void> {
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
    gitEnabled: env.gitExecutionMode === 'local_process',
    javaEnabled: env.javaExecutionMode === 'local_process',
    checks: {
      database: async () => { await prisma.$queryRaw`SELECT 1` },
      migrations: async () => {
        const applied = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`
        const committed = (await readdir(path.resolve(process.cwd(), 'prisma', 'migrations'), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
        const appliedNames = new Set(applied.filter((item) => item.finished_at && !item.rolled_back_at).map((item) => item.migration_name))
        if (applied.some((item) => !item.finished_at && !item.rolled_back_at) || !committed.every((name) => appliedNames.has(name))) throw new Error('not current')
      },
      git: async () => {
        await access(env.gitStorageRoot, constants.R_OK | constants.W_OK)
        await createGitCommandRunner({ executable: env.gitExecutable, timeoutMs: env.gitCommandTimeoutMs, outputLimitBytes: env.gitOutputLimitBytes }).detectVersion()
      },
      java: async () => {
        await Promise.all([checkExecutable(env.javaExecutable, ['--version']), checkExecutable(env.javacExecutable, ['--version']), access(env.javaJobRoot, constants.R_OK | constants.W_OK)])
      },
    },
  })]
  await prisma.$disconnect().catch(() => undefined)
  console.log(JSON.stringify(results, null, 2))
  if (results.some((result) => result.status === 'BLOCKING')) process.exitCode = 1
}

void main()
