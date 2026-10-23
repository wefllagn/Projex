import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  identityResult: [] as unknown,
  readFile: vi.fn(),
  buildRestoreVerificationPlan: vi.fn(),
  disconnect: vi.fn(),
  queryRaw: vi.fn(),
}))

const safety = vi.hoisted(() => ({
  OperationsSafetyError: class OperationsSafetyError extends Error {
    constructor(readonly code: string) {
      super(code)
      this.name = 'OperationsSafetyError'
    }
  },
}))

vi.mock('../infrastructure/operations/operations-error.js', () => safety)

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return { ...actual, readFile: mocks.readFile }
})

vi.mock('../infrastructure/database/prisma.js', () => ({
  createPrismaClient(databaseUrl: string) {
    mocks.events.push(`prisma:${databaseUrl}`)
    return {
      $queryRaw: mocks.queryRaw,
      $disconnect: mocks.disconnect,
    }
  },
}))

vi.mock('../infrastructure/operations/restore-verifier.js', () => ({
  buildRestoreVerificationPlan: mocks.buildRestoreVerificationPlan,
}))

vi.mock('../infrastructure/operations/postgres-tools.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown> & {
    validateRestoreDatabaseUrl(databaseUrl: string): unknown
  }
  return {
    ...actual,
    validateRestoreDatabaseUrl(databaseUrl: string) {
      mocks.events.push(`validate:${databaseUrl}`)
      return actual.validateRestoreDatabaseUrl(databaseUrl)
    },
  }
})

const restoreDatabaseUrl = 'postgresql://restore:secret@localhost/projex_restore_verify_i26aaron01'
const originalEnvironment = { ...process.env }
let stdout: ReturnType<typeof vi.spyOn>
let stderr: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.events.length = 0
  mocks.identityResult = [{
    database_name: 'projex_restore_verify_i26aaron01',
    server_address: '127.0.0.1',
  }]
  process.env.RESTORE_VERIFY_DATABASE_URL = restoreDatabaseUrl
  process.env.OPERATIONS_RESTORE_SOURCE_ROOT = path.resolve('restore-source')
  process.env.OPERATIONS_RESTORE_GIT_ROOT = path.resolve('restore-git')
  process.env.PG_RESTORE_EXECUTABLE = path.resolve('pg_restore')
  process.env.GIT_EXECUTABLE = path.resolve('git')
  process.exitCode = undefined
  stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  mocks.queryRaw.mockImplementation(async () => {
    mocks.events.push('identity')
    return mocks.identityResult
  })
  mocks.disconnect.mockImplementation(async () => {
    mocks.events.push('disconnect')
  })
  mocks.readFile.mockImplementation(async (filename: string) => {
    mocks.events.push(`read:${path.basename(filename)}`)
    return 'fixture'
  })
  mocks.buildRestoreVerificationPlan.mockImplementation(async () => {
    mocks.events.push('plan')
    return { manifest: { backupId: 'run-20261017' } }
  })
})

afterEach(() => {
  stdout.mockRestore()
  stderr.mockRestore()
  process.env = { ...originalEnvironment }
  process.exitCode = undefined
})

describe('restore preflight connected identity ordering', () => {
  it('validates before Prisma, attests before reads/planning, and disconnects after success', async () => {
    await import('./operations-restore-preflight.js')
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce())

    expect(mocks.events).toEqual([
      `validate:${restoreDatabaseUrl}`,
      `prisma:${restoreDatabaseUrl}`,
      'identity',
      'read:manifest.json',
      'read:manifest.sha256',
      'plan',
      'disconnect',
    ])
    expect(mocks.queryRaw).toHaveBeenCalledOnce()
    expect(mocks.buildRestoreVerificationPlan).toHaveBeenCalledOnce()
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"status":"ready"'))
    expect(stderr).not.toHaveBeenCalled()
  })

  it('blocks all filesystem/planning work and disconnects after identity failure', async () => {
    mocks.identityResult = [{ database_name: 'projex', server_address: '127.0.0.1' }]

    await import('./operations-restore-preflight.js')
    await vi.waitFor(() => expect(stderr).toHaveBeenCalledWith(expect.stringContaining('RESTORE_TARGET_DATABASE_MISMATCH')))

    expect(mocks.events).toEqual([
      `validate:${restoreDatabaseUrl}`,
      `prisma:${restoreDatabaseUrl}`,
      'identity',
      'disconnect',
    ])
    expect(mocks.readFile).not.toHaveBeenCalled()
    expect(mocks.buildRestoreVerificationPlan).not.toHaveBeenCalled()
    expect(stdout).not.toHaveBeenCalled()
  })
})
