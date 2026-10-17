import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  assertConnectedBackupSourceIdentity,
  buildPgDumpPlan,
  buildPgRestorePlan,
  parsePostgresTarget,
  runAfterConnectedBackupSourceAttestation,
  validateBackupSourceDatabaseUrl,
} from './postgres-tools.js'

const executable = path.resolve('tools', 'postgres.exe')

describe('PostgreSQL operation command plans', () => {
  it('validates recovery-source URLs directly without database access', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(validateBackupSourceDatabaseUrl(`postgresql://backup:secret@${host}/projex_recovery_source_i26aaron01`))
        .toMatchObject({ databaseName: 'projex_recovery_source_i26aaron01' })
    }
    for (const databaseName of ['projex', 'projex_test', 'projex_restore_verify_i26aaron01', 'arbitrary_database']) {
      expect(() => validateBackupSourceDatabaseUrl(`postgresql://backup:secret@localhost/${databaseName}`))
        .toThrowError('BACKUP_SOURCE_DATABASE_UNRECOGNIZED')
    }
    expect(() => validateBackupSourceDatabaseUrl('postgresql://backup:secret@database.example.edu/projex_recovery_source_i26aaron01'))
      .toThrowError('BACKUP_SOURCE_HOST_NOT_LOOPBACK')
    expect(() => validateBackupSourceDatabaseUrl('not-a-url')).toThrowError('POSTGRES_URL_INVALID')
    expect(() => validateBackupSourceDatabaseUrl('https://localhost/projex_recovery_source_i26aaron01'))
      .toThrowError('POSTGRES_URL_INVALID')
  })

  it.each([
    'localhost',
    '127.0.0.1',
    '[::1]',
  ])('accepts the dedicated recovery source on recognized loopback host %s', (host) => {
    const url = `postgresql://backup_user:private-password@${host}:5432/projex_recovery_source_i26aaron01?sslmode=require`
    const plan = buildPgDumpPlan({ executable, databaseUrl: url, outputFile: path.resolve('out', 'database.dump') })
    expect(plan.args).toEqual([
      '--format=custom', '--no-owner', '--no-privileges', `--file=${path.resolve('out', 'database.dump')}`,
    ])
    expect(plan.args.join(' ')).not.toContain('private-password')
    expect(plan.environment).toMatchObject({ PGDATABASE: 'projex_recovery_source_i26aaron01', PGUSER: 'backup_user', PGPASSWORD: 'private-password' })
  })

  it.each([
    'projex',
    'projex_test',
    'projex_restore_verify_i26aaron01',
    'arbitrary_database',
  ])('rejects unrecognized backup source database %s', (databaseName) => {
    expect(() => buildPgDumpPlan({
      executable,
      databaseUrl: `postgresql://backup_user:secret@localhost/${databaseName}`,
      outputFile: path.resolve('out', 'database.dump'),
    })).toThrowError('BACKUP_SOURCE_DATABASE_UNRECOGNIZED')
  })

  it('rejects a dedicated recovery source on a non-loopback host', () => {
    expect(() => buildPgDumpPlan({
      executable,
      databaseUrl: 'postgresql://backup_user:secret@database.example.edu/projex_recovery_source_i26aaron01',
      outputFile: path.resolve('out', 'database.dump'),
    })).toThrowError('BACKUP_SOURCE_HOST_NOT_LOOPBACK')
  })

  it('rejects a malformed backup source URL', () => {
    expect(() => buildPgDumpPlan({
      executable,
      databaseUrl: 'not-a-url',
      outputFile: path.resolve('out', 'database.dump'),
    })).toThrowError('POSTGRES_URL_INVALID')
  })

  it.each([
    'localhost',
    '127.0.0.1',
    '[::1]',
  ])('accepts an explicitly recognized restore database on loopback host %s', (host) => {
    const restoreDatabaseUrl = `postgresql://restore_user:private-password@${host}:5432/projex_restore_verify_run123`
    const plan = buildPgRestorePlan({
      executable,
      restoreDatabaseUrl,
      inputFile: path.resolve('backup', 'database.dump'),
    })
    expect(plan.args).toEqual([
      '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', path.resolve('backup', 'database.dump'),
    ])
    expect(plan.args.join(' ')).not.toContain('restore_user')
    expect(plan.args.join(' ')).not.toContain('private-password')
    expect(plan.args.join(' ')).not.toContain(restoreDatabaseUrl)
    expect(plan.environment).toMatchObject({
      PGDATABASE: 'projex_restore_verify_run123',
      PGUSER: 'restore_user',
      PGPASSWORD: 'private-password',
    })
  })

  it.each([
    'projex',
    'projex_test',
    'projex_recovery_source_i26aaron01',
    'arbitrary_database',
  ])('rejects unrecognized restore database %s', (databaseName) => {
    expect(() => buildPgRestorePlan({
      executable,
      restoreDatabaseUrl: `postgresql://user:secret@localhost/${databaseName}`,
      inputFile: path.resolve('backup', 'database.dump'),
    })).toThrowError('RESTORE_DATABASE_UNRECOGNIZED')
  })

  it('rejects a restore database on a non-loopback host with only the stable redacted code', () => {
    const restoreDatabaseUrl = 'postgresql://restore_user:private-password@database.example.edu/projex_restore_verify_run123'
    let rejection: unknown
    try {
      buildPgRestorePlan({ executable, restoreDatabaseUrl, inputFile: path.resolve('backup', 'database.dump') })
    } catch (error) {
      rejection = error
    }
    expect(rejection).toMatchObject({
      name: 'OperationsSafetyError',
      code: 'RESTORE_DATABASE_HOST_NOT_LOOPBACK',
      message: 'RESTORE_DATABASE_HOST_NOT_LOOPBACK',
    })
    expect((rejection as Error).message).not.toContain('database.example.edu')
    expect((rejection as Error).message).not.toContain('restore_user')
    expect((rejection as Error).message).not.toContain('private-password')
    expect((rejection as Error).message).not.toContain('projex_restore_verify_run123')
  })

  it.each([
    'not-a-url',
    'https://localhost/projex_restore_verify_run123',
  ])('rejects malformed or non-PostgreSQL restore URL %s', (restoreDatabaseUrl) => {
    expect(() => buildPgRestorePlan({
      executable,
      restoreDatabaseUrl,
      inputFile: path.resolve('backup', 'database.dump'),
    })).toThrowError('POSTGRES_URL_INVALID')
  })

  it('rejects malformed and non-PostgreSQL URLs', () => {
    expect(() => parsePostgresTarget('not-a-url')).toThrowError('POSTGRES_URL_INVALID')
    expect(() => parsePostgresTarget('https://localhost/projex')).toThrowError('POSTGRES_URL_INVALID')
  })

  it.each(['127.0.0.1', '::1'])('accepts matching connected recovery source on %s', (serverAddress) => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', [{
      database_name: 'projex_recovery_source_i26aaron01',
      server_address: serverAddress,
    }])).not.toThrow()
  })

  it.each([
    'projex',
    'projex_recovery_source_different',
  ])('rejects connected database mismatch %s', (databaseName) => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', [{
      database_name: databaseName,
      server_address: '127.0.0.1',
    }])).toThrowError('BACKUP_SOURCE_DATABASE_MISMATCH')
  })

  it('rejects a connected non-loopback server address', () => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', [{
      database_name: 'projex_recovery_source_i26aaron01',
      server_address: '192.0.2.10',
    }])).toThrowError('BACKUP_SOURCE_SERVER_NOT_LOOPBACK')
  })

  it.each([null, ''])('rejects an indeterminate connected server address', (serverAddress) => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', [{
      database_name: 'projex_recovery_source_i26aaron01',
      server_address: serverAddress,
    }])).toThrowError('BACKUP_SOURCE_SERVER_ADDRESS_INDETERMINATE')
  })

  it('rejects zero or duplicate connected identity rows', () => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', []))
      .toThrowError('BACKUP_SOURCE_IDENTITY_MISSING')
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', [
      { database_name: 'projex_recovery_source_i26aaron01', server_address: '127.0.0.1' },
      { database_name: 'projex_recovery_source_i26aaron01', server_address: '127.0.0.1' },
    ])).toThrowError('BACKUP_SOURCE_IDENTITY_MULTIPLE_ROWS')
  })

  it.each([
    null,
    {},
    [null],
    [{ database_name: '', server_address: '127.0.0.1' }],
    [{ database_name: 42, server_address: '127.0.0.1' }],
    [{ database_name: 'projex_recovery_source_i26aaron01', server_address: 42 }],
  ])('rejects malformed connected identity result %#', (result) => {
    expect(() => assertConnectedBackupSourceIdentity('projex_recovery_source_i26aaron01', result))
      .toThrowError('BACKUP_SOURCE_IDENTITY_MALFORMED')
  })

  it('does not continue to quiescence after connected identity failure', async () => {
    const readIdentity = vi.fn().mockResolvedValue([{
      database_name: 'projex',
      server_address: '127.0.0.1',
    }])
    const readQuiescence = vi.fn()
    await expect(runAfterConnectedBackupSourceAttestation({
      expectedDatabaseName: 'projex_recovery_source_i26aaron01',
      readIdentity,
      runAfterAttestation: readQuiescence,
    })).rejects.toThrowError('BACKUP_SOURCE_DATABASE_MISMATCH')
    expect(readIdentity).toHaveBeenCalledOnce()
    expect(readQuiescence).not.toHaveBeenCalled()
  })
})
