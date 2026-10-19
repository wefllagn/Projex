import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { GitTransportAccess } from '../git-transport/git-transport.types.js'
import type { ActivityWorkspaceCheckpointRepository } from './activity-workspace-checkpoint.repository.js'
import { createActivityWorkspaceCheckpointService } from './activity-workspace-checkpoint.service.js'

const activityId = '11111111-1111-4111-8111-111111111111'
const repositoryId = '22222222-2222-4222-8222-222222222222'
const studentId = '33333333-3333-4333-8333-333333333333'
const checkpointId = '44444444-4444-4444-8444-444444444444'
const now = new Date('2030-01-01T00:00:00.000Z')

const student: SafeUserProfile = {
  id: studentId,
  fullName: 'Student Owner',
  email: 'student@projex.local',
  role: 'STUDENT',
  status: 'ACTIVE',
}

function access(activityStatus: 'PUBLISHED' | 'CLOSED' = 'PUBLISHED'): GitTransportAccess {
  return {
    repositoryId,
    repositoryType: 'ACTIVITY_WORKSPACE',
    ownerId: studentId,
    status: 'ACTIVE',
    storageStatus: 'READY',
    storagePath: 'repositories/22/22/repository.git',
    defaultBranch: 'main',
    reviewStatus: 'WORKING',
    user: { id: studentId, role: 'STUDENT', status: 'ACTIVE' },
    repositoryMember: { memberRole: 'OWNER', status: 'ACTIVE' },
    teamMember: null,
    projectTask: null,
    classWorkspace: null,
    activityWorkspace: {
      status: activityStatus,
      dueDate: new Date('2030-01-02T00:00:00.000Z'),
      class: { status: 'ACTIVE', instructorId: null, teachingStaff: [], membership: { status: 'ACTIVE' } },
    },
    teamLeadStudentId: null,
  }
}

function fixture(activityStatus: 'PUBLISHED' | 'CLOSED' = 'PUBLISHED') {
  const checkpoint = {
    id: checkpointId,
    repositoryId,
    activityId,
    status: 'PENDING' as const,
    expectedHeadCommitHash: null,
    resultingCommitHash: null,
    entryFilePath: 'Main.java',
    failureCode: null,
    createdAt: now,
    completedAt: null,
  }
  const repository = {
    findWorkspace: vi.fn().mockResolvedValue({ repositoryId, entryClassName: 'Main' }),
    createCheckpoint: vi.fn().mockResolvedValue({ kind: 'created', checkpoint }),
    findCheckpoint: vi.fn().mockResolvedValue(checkpoint),
  } satisfies ActivityWorkspaceCheckpointRepository
  const accessRepository = { findAccess: vi.fn().mockResolvedValue(access(activityStatus)) }
  const service = createActivityWorkspaceCheckpointService({
    enabled: true,
    sourceLimitBytes: 100_000,
    repository,
    accessRepository: accessRepository as never,
    logger: pino({ level: 'silent' }),
    now: () => now,
  })
  return { service, repository, accessRepository }
}

describe('Activity Workspace browser checkpoints', () => {
  it('queues an idempotent checkpoint without creating an academic submission', async () => {
    const { service, repository } = fixture()
    const result = await service.create(student, activityId, {
      sourceCode: 'public class Main {}',
      expectedHeadCommitHash: null,
    }, 'checkpoint:request-key-123')

    expect(result).toMatchObject({ idempotentReplay: false, checkpoint: { checkpointId, status: 'PENDING', entryFilePath: 'Main.java' } })
    expect(repository.createCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      repositoryId,
      activityId,
      studentId,
      sourceCode: 'public class Main {}',
      expectedHeadCommitHash: null,
      entryFilePath: 'Main.java',
    }))
  })

  it('fails closed when the Activity is closed', async () => {
    const { service, repository } = fixture('CLOSED')
    await expect(service.create(student, activityId, {
      sourceCode: 'public class Main {}',
      expectedHeadCommitHash: null,
    }, 'checkpoint:request-key-123')).rejects.toMatchObject({ code: 'ACTIVITY_WORKSPACE_NOT_WRITABLE' })
    expect(repository.createCheckpoint).not.toHaveBeenCalled()
  })

  it('returns only the owning Student checkpoint status', async () => {
    const { service, repository } = fixture()
    await expect(service.get(student, activityId, checkpointId)).resolves.toMatchObject({ checkpointId, repositoryId, activityId })
    expect(repository.findCheckpoint).toHaveBeenCalledWith(checkpointId, activityId, studentId)
  })

  it('accepts ordinary ASCII source at the configured UTF-8 byte limit', async () => {
    const { service, repository } = fixture()
    const sourceCode = 'a'.repeat(100_000)

    await expect(service.create(student, activityId, {
      sourceCode,
      expectedHeadCommitHash: null,
    }, 'checkpoint:ascii-limit')).resolves.toMatchObject({ checkpoint: { checkpointId } })
    expect(repository.createCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ sourceCode }))
  })

  it('rejects multibyte source that is below the character limit but above the UTF-8 byte limit', async () => {
    const { service, repository } = fixture()
    const sourceCode = 'é'.repeat(50_001)
    expect(sourceCode.length).toBeLessThan(100_000)
    expect(Buffer.byteLength(sourceCode, 'utf8')).toBeGreaterThan(100_000)

    await expect(service.create(student, activityId, {
      sourceCode,
      expectedHeadCommitHash: null,
    }, 'checkpoint:multibyte-limit')).rejects.toMatchObject({
      statusCode: 413,
      code: 'SOURCE_CODE_TOO_LARGE',
    })
    expect(repository.createCheckpoint).not.toHaveBeenCalled()
  })
})
