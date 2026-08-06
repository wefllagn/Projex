import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { createGuardedTestRunRoot } from '../../src/infrastructure/storage/repository-storage.js'
import { requireTestDatabaseUrl } from '../integration/test-database-url.js'

class SafeTestAbort extends Error {}

function abort(message: string): never {
  throw new SafeTestAbort(message)
}

function runNode(script: string, args: string[], environment: NodeJS.ProcessEnv, failure: string): void {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
    shell: false,
  })
  if (result.error || result.status !== 0) abort(failure)
}

async function main(): Promise<void> {
  const testDatabaseUrl = (() => {
    try {
      return requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
    } catch {
      return abort('Smart HTTP tests require TEST_DATABASE_URL to name exactly projex_test.')
    }
  })()
  for (const key of ['GIT_EXECUTABLE', 'GIT_HTTP_BACKEND_EXECUTABLE'] as const) {
    if (!process.env[key] || !path.isAbsolute(process.env[key])) {
      abort(`Smart HTTP tests require an absolute ${key}.`)
    }
  }
  const guarded = await createGuardedTestRunRoot({
    testRoot: process.env.TEST_GIT_STORAGE_ROOT,
    normalRoot: process.env.GIT_STORAGE_ROOT || undefined,
    projectRoot: path.resolve(process.cwd(), '..'),
  }).catch(() => abort('TEST_GIT_STORAGE_ROOT failed the guarded test-storage checks.'))
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    GIT_EXECUTION_MODE: 'local_process',
    GIT_SMART_HTTP_ENABLED: 'true',
    GIT_STORAGE_ROOT: guarded.runRoot,
  }
  const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
  const tscCli = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc')
  const vitestCli = path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs')
  try {
    runNode(tscCli, ['-p', 'tsconfig.json'], environment, 'Smart HTTP compiled-hook build failed.')
    runNode(
      prismaCli,
      ['migrate', 'deploy', '--schema', path.join(process.cwd(), 'prisma', 'schema.prisma')],
      environment,
      'Smart HTTP test-database migration failed.',
    )
    runNode(
      vitestCli,
      ['run', '--config', 'vitest.smart-http.config.ts'],
      environment,
      'Smart HTTP end-to-end tests failed.',
    )
  } finally {
    await guarded.cleanup()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof SafeTestAbort ? error.message : 'Smart HTTP test runner failed safely.'}\n`,
  )
  process.exitCode = 1
})
