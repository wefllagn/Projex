import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildPgDumpPlan, buildPgRestorePlan, parsePostgresTarget } from './postgres-tools.js'

const executable = path.resolve('tools', 'postgres.exe')

describe('PostgreSQL operation command plans', () => {
  it('keeps backup credentials out of the argument array', () => {
    const url = 'postgresql://backup_user:private-password@127.0.0.1:5432/projex?sslmode=require'
    const plan = buildPgDumpPlan({ executable, databaseUrl: url, outputFile: path.resolve('out', 'database.dump') })
    expect(plan.args).toEqual([
      '--format=custom', '--no-owner', '--no-privileges', `--file=${path.resolve('out', 'database.dump')}`,
    ])
    expect(plan.args.join(' ')).not.toContain('private-password')
    expect(plan.environment).toMatchObject({ PGDATABASE: 'projex', PGUSER: 'backup_user', PGPASSWORD: 'private-password' })
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
