import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createPrismaClient } from '../infrastructure/database/prisma.js'
import { buildRestoreVerificationPlan } from '../infrastructure/operations/restore-verifier.js'
import { OperationsSafetyError } from '../infrastructure/operations/operations-error.js'
import {
  runAfterConnectedRestoreTargetAttestation,
  validateRestoreDatabaseUrl,
} from '../infrastructure/operations/postgres-tools.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new OperationsSafetyError(`${name}_REQUIRED`)
  return value
}

async function main(): Promise<void> {
  const restoreDatabaseUrl = required('RESTORE_VERIFY_DATABASE_URL')
  const expectedRestore = validateRestoreDatabaseUrl(restoreDatabaseUrl)
  const prisma = createPrismaClient(restoreDatabaseUrl)
  try {
    const plan = await runAfterConnectedRestoreTargetAttestation({
      expectedDatabaseName: expectedRestore.databaseName,
      readIdentity: () => prisma.$queryRaw<Array<{ database_name: string; server_address: string | null }>>`
        SELECT
          current_database() AS database_name,
          inet_server_addr()::text AS server_address
      `,
      runAfterAttestation: async () => {
        const backupSourceRoot = required('OPERATIONS_RESTORE_SOURCE_ROOT')
        return buildRestoreVerificationPlan({
          projectRoot: path.resolve(process.cwd(), '..'),
          backupSourceRoot,
          restoreGitRoot: required('OPERATIONS_RESTORE_GIT_ROOT'),
          normalGitStorageRoot: process.env.GIT_STORAGE_ROOT,
          testGitStorageRoot: process.env.TEST_GIT_STORAGE_ROOT,
          restoreDatabaseUrl,
          pgRestoreExecutable: required('PG_RESTORE_EXECUTABLE'),
          gitExecutable: required('GIT_EXECUTABLE'),
          manifestRaw: await readFile(path.join(backupSourceRoot, 'manifest.json'), 'utf8'),
          manifestChecksumRaw: await readFile(path.join(backupSourceRoot, 'manifest.sha256'), 'utf8'),
        })
      },
    })
    process.stdout.write(`${JSON.stringify({ status: 'ready', backupId: plan.manifest.backupId, execute: false })}\n`)
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: 'blocked', code: error instanceof OperationsSafetyError ? error.code : 'RESTORE_PREFLIGHT_FAILED' })}\n`)
  process.exitCode = 1
})
