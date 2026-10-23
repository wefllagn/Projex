import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { GitRepositoryReader } from '../../infrastructure/git/git-repository-reader.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'
import type { GitTransportAccess } from '../git-transport/git-transport.types.js'
import { createRepositoryContentService } from './repository-content.service.js'

const repositoryId = '11111111-1111-4111-8111-111111111111'
const ownerId = '22222222-2222-4222-8222-222222222222'
const primaryInstructorId = '33333333-3333-4333-8333-333333333333'
const coInstructorId = '44444444-4444-4444-8444-444444444444'

function caller(id: string, role: SafeUserProfile['role']): SafeUserProfile {
  return {
    id,
    fullName: 'Synthetic User',
    email: `${id}@integration.test`,
    role,
    status: 'ACTIVE',
  }
}

function activityAccess(user: SafeUserProfile): GitTransportAccess {
  return {
    repositoryId,
    repositoryType: 'ACTIVITY_WORKSPACE',
    ownerId,
    status: 'ACTIVE',
    storageStatus: 'READY',
    storagePath: 'repositories/11/11/repository.git',
    defaultBranch: 'main',
    reviewStatus: 'WORKING',
    user: { id: user.id, role: user.role, status: user.status },
    repositoryMember: user.id === ownerId ? { memberRole: 'OWNER', status: 'ACTIVE' } : null,
    teamMember: null,
    projectTask: null,
    classWorkspace: null,
    activityWorkspace: {
      status: 'PUBLISHED',
      dueDate: new Date('2030-01-02T00:00:00.000Z'),
      class: {
        status: 'ACTIVE',
        instructorId: primaryInstructorId,
        teachingStaff: [{ instructorId: coInstructorId, status: 'ACTIVE' }],
        membership: user.id === ownerId ? { status: 'ACTIVE' } : null,
      },
    },
    teamLeadStudentId: null,
  }
}

function serviceFor(user: SafeUserProfile) {
  const reader = {
    summary: vi.fn().mockResolvedValue({
      empty: true,
      defaultBranch: 'main',
      branchCount: 0,
      commitCount: 0,
      latestCommit: null,
    }),
  } as unknown as GitRepositoryReader
  const storage = { resolveManagedRepository: vi.fn().mockResolvedValue('C:\\managed\\repository.git') }
  const accessRepository = {
    findAccess: vi.fn().mockResolvedValue(activityAccess(user)),
  } as unknown as GitTransportRepository
  return {
    reader,
    storage,
    service: createRepositoryContentService({
      enabled: true,
      accessRepository,
      storage,
      reader,
      logger: pino({ level: 'silent' }),
      now: () => new Date('2030-01-01T00:00:00.000Z'),
    }),
  }
}

describe('Activity Workspace source inspection authorization', () => {
  it.each([
    ['Student owner', caller(ownerId, 'STUDENT')],
    ['primary Instructor', caller(primaryInstructorId, 'INSTRUCTOR')],
    ['ACTIVE Co-Instructor', caller(coInstructorId, 'INSTRUCTOR')],
  ] as const)('preserves source read for the %s', async (_label, user) => {
    const { reader, storage, service } = serviceFor(user)

    await expect(service.summary(user, repositoryId)).resolves.toMatchObject({ repositoryId })
    expect(storage.resolveManagedRepository).toHaveBeenCalledOnce()
    expect(reader.summary).toHaveBeenCalledOnce()
  })

  it.each([
    ['unrelated Student', caller('55555555-5555-4555-8555-555555555555', 'STUDENT')],
    ['unrelated Instructor', caller('66666666-6666-4666-8666-666666666666', 'INSTRUCTOR')],
    ['Admin', caller('77777777-7777-4777-8777-777777777777', 'ADMIN')],
  ] as const)('keeps source hidden from an %s', async (_label, user) => {
    const { reader, storage, service } = serviceFor(user)

    await expect(service.summary(user, repositoryId))
      .rejects.toMatchObject({ statusCode: 404, code: 'REPOSITORY_NOT_FOUND' })
    expect(storage.resolveManagedRepository).not.toHaveBeenCalled()
    expect(reader.summary).not.toHaveBeenCalled()
  })
})
