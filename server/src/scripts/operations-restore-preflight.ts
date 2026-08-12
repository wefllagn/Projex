import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { buildRestoreVerificationPlan } from '../infrastructure/operations/restore-verifier.js'
import { OperationsSafetyError } from '../infrastructure/operations/operations-error.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new OperationsSafetyError(`${name}_REQUIRED`)
  return value
}

async function main(): Promise<void> {
  const backupSourceRoot = required('OPERATIONS_RESTORE_SOURCE_ROOT')
  const plan = await buildRestoreVerificationPlan({
    projectRoot: path.resolve(process.cwd(), '..'),
    backupSourceRoot,
    restoreGitRoot: required('OPERATIONS_RESTORE_GIT_ROOT'),
    normalGitStorageRoot: process.env.GIT_STORAGE_ROOT,
    testGitStorageRoot: process.env.TEST_GIT_STORAGE_ROOT,
    restoreDatabaseUrl: process.env.RESTORE_VERIFY_DATABASE_URL,
    pgRestoreExecutable: required('PG_RESTORE_EXECUTABLE'),
    gitExecutable: required('GIT_EXECUTABLE'),
    manifestRaw: await readFile(path.join(backupSourceRoot, 'manifest.json'), 'utf8'),
    manifestChecksumRaw: await readFile(path.join(backupSourceRoot, 'manifest.sha256'), 'utf8'),
  })
  process.stdout.write(`${JSON.stringify({ status: 'ready', backupId: plan.manifest.backupId, execute: false })}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: 'blocked', code: error instanceof OperationsSafetyError ? error.code : 'RESTORE_PREFLIGHT_FAILED' })}\n`)
  process.exitCode = 1
})
