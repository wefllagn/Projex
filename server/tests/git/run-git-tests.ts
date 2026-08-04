import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { createGuardedTestRunRoot } from '../../src/infrastructure/storage/repository-storage.js'
import { requireTestDatabaseUrl } from '../integration/test-database-url.js'

class SafeTestAbort extends Error {}

function abort(message: string): never {
  throw new SafeTestAbort(message)
}

async function main(): Promise<void> {
  let testDatabaseUrl: string
  try {
    testDatabaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
  } catch {
    abort('Real-Git tests require TEST_DATABASE_URL to name the recognized projex_test database.')
  }
  if (!process.env.GIT_EXECUTABLE || !path.isAbsolute(process.env.GIT_EXECUTABLE)) {
    abort('Real-Git tests require an absolute GIT_EXECUTABLE.')
  }

  const guarded = await createGuardedTestRunRoot({
    testRoot: process.env.TEST_GIT_STORAGE_ROOT,
    normalRoot: process.env.GIT_STORAGE_ROOT || undefined,
    projectRoot: path.resolve(process.cwd(), '..'),
  }).catch(() => abort('TEST_GIT_STORAGE_ROOT failed the guarded test-storage checks.'))

  const childEnvironment = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    GIT_EXECUTION_MODE: 'local_process',
    GIT_STORAGE_ROOT: guarded.runRoot,
  }
  const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
  const vitestCli = path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs')
  try {
    const migration = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--schema', path.join(process.cwd(), 'prisma', 'schema.prisma')],
      { cwd: process.cwd(), env: childEnvironment, stdio: 'inherit', shell: false },
    )
    if (migration.error || migration.status !== 0) abort('Real-Git test-database migration failed.')
    const tests = spawnSync(
      process.execPath,
      [vitestCli, 'run', '--config', 'vitest.git.config.ts'],
      { cwd: process.cwd(), env: childEnvironment, stdio: 'inherit', shell: false },
    )
    if (tests.error || tests.status !== 0) abort('Real-Git provisioning tests failed.')
  } finally {
    await guarded.cleanup()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof SafeTestAbort ? error.message : 'Real-Git test runner failed safely.'}\n`,
  )
  process.exitCode = 1
})
