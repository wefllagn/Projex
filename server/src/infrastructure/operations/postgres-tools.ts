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

type ConnectedBackupSourceIdentity = Readonly<{
  database_name: string
  server_address: string
}>

type ConnectedRestoreTargetIdentity = Readonly<{
  database_name: string
  server_address: string
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

export function assertConnectedBackupSourceIdentity(
  expectedDatabaseName: string,
  result: unknown,
): asserts result is readonly [ConnectedBackupSourceIdentity] {
  if (!Array.isArray(result)) {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MALFORMED')
  }
  if (result.length === 0) {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MISSING')
  }
  if (result.length !== 1) {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MULTIPLE_ROWS')
  }
  const row = result[0]
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MALFORMED')
  }
  const identity = row as Record<string, unknown>
  if (typeof identity.database_name !== 'string' || identity.database_name.length === 0) {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MALFORMED')
  }
  if (identity.server_address === null || identity.server_address === '') {
    throw new OperationsSafetyError('BACKUP_SOURCE_SERVER_ADDRESS_INDETERMINATE')
  }
  if (typeof identity.server_address !== 'string') {
    throw new OperationsSafetyError('BACKUP_SOURCE_IDENTITY_MALFORMED')
  }
  if (identity.database_name !== expectedDatabaseName) {
    throw new OperationsSafetyError('BACKUP_SOURCE_DATABASE_MISMATCH')
  }
  if (!['127.0.0.1', '::1'].includes(identity.server_address)) {
    throw new OperationsSafetyError('BACKUP_SOURCE_SERVER_NOT_LOOPBACK')
  }
}

export async function runAfterConnectedBackupSourceAttestation<T>(input: {
  expectedDatabaseName: string
  readIdentity(): Promise<unknown>
  runAfterAttestation(): Promise<T>
}): Promise<T> {
  const result = await input.readIdentity()
  assertConnectedBackupSourceIdentity(input.expectedDatabaseName, result)
  return input.runAfterAttestation()
}

export function assertConnectedRestoreTargetIdentity(
  expectedDatabaseName: string,
  result: unknown,
): asserts result is readonly [ConnectedRestoreTargetIdentity] {
  if (!Array.isArray(result)) {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MALFORMED')
  }
  if (result.length === 0) {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MISSING')
  }
  if (result.length !== 1) {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MULTIPLE_ROWS')
  }
  const row = result[0]
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MALFORMED')
  }
  const identity = row as Record<string, unknown>
  if (typeof identity.database_name !== 'string' || identity.database_name.length === 0) {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MALFORMED')
  }
  if (identity.server_address === null || identity.server_address === '') {
    throw new OperationsSafetyError('RESTORE_TARGET_SERVER_ADDRESS_INDETERMINATE')
  }
  if (typeof identity.server_address !== 'string') {
    throw new OperationsSafetyError('RESTORE_TARGET_IDENTITY_MALFORMED')
  }
  if (identity.database_name !== expectedDatabaseName) {
    throw new OperationsSafetyError('RESTORE_TARGET_DATABASE_MISMATCH')
  }
  if (!['127.0.0.1', '::1'].includes(identity.server_address)) {
    throw new OperationsSafetyError('RESTORE_TARGET_SERVER_NOT_LOOPBACK')
  }
}

export async function runAfterConnectedRestoreTargetAttestation<T>(input: {
  expectedDatabaseName: string
  readIdentity(): Promise<unknown>
  runAfterAttestation(): Promise<T>
}): Promise<T> {
  const result = await input.readIdentity()
  assertConnectedRestoreTargetIdentity(input.expectedDatabaseName, result)
  return input.runAfterAttestation()
}

export function assertRestoreDatabaseName(databaseName: string): void {
  if (!RESTORE_DATABASE.test(databaseName)) {
    throw new OperationsSafetyError('RESTORE_DATABASE_UNRECOGNIZED')
  }
}

export function assertRestoreTarget(target: Pick<ParsedPostgresTarget, 'databaseName' | 'hostname'>): void {
  assertRestoreDatabaseName(target.databaseName)
  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    throw new OperationsSafetyError('RESTORE_DATABASE_HOST_NOT_LOOPBACK')
  }
}

export function validateRestoreDatabaseUrl(databaseUrl: string): ParsedPostgresTarget {
  const target = parsePostgresTarget(databaseUrl)
  assertRestoreTarget(target)
  return target
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
  const target = validateRestoreDatabaseUrl(input.restoreDatabaseUrl)
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
