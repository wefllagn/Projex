import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildPgDumpPlan, buildPgRestorePlan, parsePostgresTarget } from './postgres-tools.js'

const executable = path.resolve('tools', 'postgres.exe')

describe('PostgreSQL operation command plans', () => {
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

  it('requires an explicitly recognized restore database and never falls back', () => {
    expect(() => buildPgRestorePlan({
      executable,
      restoreDatabaseUrl: 'postgresql://user:secret@localhost/projex',
      inputFile: path.resolve('backup', 'database.dump'),
    })).toThrowError('RESTORE_DATABASE_UNRECOGNIZED')
    const plan = buildPgRestorePlan({
      executable,
      restoreDatabaseUrl: 'postgresql://user:secret@localhost/projex_restore_verify_run123',
      inputFile: path.resolve('backup', 'database.dump'),
    })
    expect(plan.args).toEqual([
      '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', path.resolve('backup', 'database.dump'),
    ])
    expect(plan.args.join(' ')).not.toContain('secret')
  })

  it('rejects malformed and non-PostgreSQL URLs', () => {
    expect(() => parsePostgresTarget('not-a-url')).toThrowError('POSTGRES_URL_INVALID')
    expect(() => parsePostgresTarget('https://localhost/projex')).toThrowError('POSTGRES_URL_INVALID')
  })
})
