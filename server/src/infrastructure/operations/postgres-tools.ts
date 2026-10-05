import path from 'node:path'

import { OperationsSafetyError } from './operations-error.js'
import type { CommandPlan } from './process-runner.js'

const RESTORE_DATABASE = /^projex_restore_verify_[a-z0-9][a-z0-9_]{2,48}$/
const BACKUP_SOURCE_DATABASE = /^projex_recovery_source_[a-z0-9][a-z0-9_]{2,48}$/
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

type ParsedPostgresTarget = Readonly<{
  databaseName: string
  hostname: string
  environment: Readonly<Record<string, string>>
}>

export function parsePostgresTarget(databaseUrl: string): ParsedPostgresTarget {
  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new OperationsSafetyError('POSTGRES_URL_INVALID')
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new OperationsSafetyError('POSTGRES_URL_INVALID')
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!databaseName || databaseName.includes('/')) {
    throw new OperationsSafetyError('POSTGRES_DATABASE_NAME_INVALID')
  }
  const environment: Record<string, string> = {
    PGDATABASE: databaseName,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
  }
  if (parsed.username) environment.PGUSER = decodeURIComponent(parsed.username)
  if (parsed.password) environment.PGPASSWORD = decodeURIComponent(parsed.password)
  const sslMode = parsed.searchParams.get('sslmode')
  if (sslMode) environment.PGSSLMODE = sslMode
  return { databaseName, hostname: parsed.hostname.toLowerCase(), environment }
}

export function assertBackupSourceTarget(target: Pick<ParsedPostgresTarget, 'databaseName' | 'hostname'>): void {
  if (!BACKUP_SOURCE_DATABASE.test(target.databaseName)) {
    throw new OperationsSafetyError('BACKUP_SOURCE_DATABASE_UNRECOGNIZED')
  }
  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    throw new OperationsSafetyError('BACKUP_SOURCE_HOST_NOT_LOOPBACK')
  }
}

export function validateBackupSourceDatabaseUrl(databaseUrl: string): ParsedPostgresTarget {
  const target = parsePostgresTarget(databaseUrl)
  assertBackupSourceTarget(target)
  return target
}

export function assertRestoreDatabaseName(databaseName: string): void {
  if (!RESTORE_DATABASE.test(databaseName)) {
    throw new OperationsSafetyError('RESTORE_DATABASE_UNRECOGNIZED')
  }
}

function assertExecutable(executable: string): string {
  if (!path.isAbsolute(executable)) {
    throw new OperationsSafetyError('POSTGRES_EXECUTABLE_NOT_ABSOLUTE')
  }
  return path.resolve(executable)
}

export function buildPgDumpPlan(input: {
  executable: string
  databaseUrl: string
  outputFile: string
}): CommandPlan {
  if (!path.isAbsolute(input.outputFile)) {
    throw new OperationsSafetyError('BACKUP_OUTPUT_NOT_ABSOLUTE')
  }
  const target = validateBackupSourceDatabaseUrl(input.databaseUrl)
  return {
    executable: assertExecutable(input.executable),
    args: [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      `--file=${path.resolve(input.outputFile)}`,
    ],
    environment: target.environment,
  }
}

export function buildPgRestorePlan(input: {
  executable: string
  restoreDatabaseUrl: string
  inputFile: string
}): CommandPlan {
  if (!path.isAbsolute(input.inputFile)) {
    throw new OperationsSafetyError('RESTORE_INPUT_NOT_ABSOLUTE')
  }
  const target = parsePostgresTarget(input.restoreDatabaseUrl)
  assertRestoreDatabaseName(target.databaseName)
  return {
    executable: assertExecutable(input.executable),
    args: [
      '--exit-on-error',
      '--single-transaction',
      '--no-owner',
      '--no-privileges',
      path.resolve(input.inputFile),
    ],
    environment: target.environment,
  }
}
