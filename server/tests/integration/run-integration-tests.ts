import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { requireTestDatabaseUrl } from './test-database-url.js'

function abort(message: string): never {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

let testDatabaseUrl: string
try {
  testDatabaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
} catch {
  abort(
    'Integration tests require TEST_DATABASE_URL to name the recognized projex_test database.',
  )
}

const childEnvironment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
}
const prismaCli = path.join(
  process.cwd(),
  'node_modules',
  'prisma',
  'build',
  'index.js',
)
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
const migration = spawnSync(
  process.execPath,
  [prismaCli, 'migrate', 'deploy', '--schema', schemaPath],
  {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: 'inherit',
    shell: false,
  },
)
if (migration.error || migration.status !== 0) {
  abort('Test-database migration failed.')
}

const vitestCli = path.join(
  process.cwd(),
  'node_modules',
  'vitest',
  'vitest.mjs',
)
const tests = spawnSync(
  process.execPath,
  [vitestCli, 'run', '--config', 'vitest.integration.config.ts'],
  {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: 'inherit',
    shell: false,
  },
)
if (tests.error || tests.status !== 0) {
  abort('PostgreSQL integration tests failed.')
}
