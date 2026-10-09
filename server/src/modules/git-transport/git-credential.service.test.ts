import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { hashGitCredentialSecret } from './git-credential.crypto.js'
import { createGitCredentialService } from './git-credential.service.js'
import type { GitTransportRepository } from './git-transport.repository.js'
import type { GitTransportAccess } from './git-transport.types.js'

const caller = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Synthetic Student',
  email: 'synthetic@integration.test',
  role: 'STUDENT',
  status: 'ACTIVE',
} satisfies SafeUserProfile

const repositoryId = '22222222-2222-4222-8222-222222222222'
const credentialId = '33333333-3333-4333-8333-333333333333'
const current = new Date('2030-01-01T00:00:00.000Z')

function access(repositoryType: GitTransportAccess['repositoryType']): GitTransportAccess {
  const base: GitTransportAccess = {
    repositoryId,
    repositoryType,
    ownerId: caller.id,
    status: 'ACTIVE',
    storageStatus: 'READY',
    storagePath: 'repositories/22/22/repository.git',
    defaultBranch: 'main',
    reviewStatus: 'WORKING',
    user: { id: caller.id, role: 'STUDENT', status: 'ACTIVE' },
    repositoryMember: { memberRole: 'OWNER', status: 'ACTIVE' },
    teamMember: null,
    projectTask: null,
    classWorkspace: null,
    activityWorkspace: null,
    teamLeadStudentId: null,
  }

  if (repositoryType === 'CLASS_PROJECT') {
    return {
      ...base,
      teamMember: { status: 'ACTIVE' },
      projectTask: {
        status: 'PUBLISHED',
        dueDate: new Date('2030-01-02T00:00:00.000Z'),
        class: {
          instructorId: null,
          teachingStaff: [],
          status: 'ACTIVE',
          membership: { status: 'ACTIVE' },
        },
      },
      teamLeadStudentId: caller.id,
    }
  }

  if (repositoryType === 'CLASS_WORKSPACE') {
    return {
      ...base,
      classWorkspace: {
        status: 'ACTIVE',
        instructorId: null,
        teachingStaff: [],
        membership: { status: 'ACTIVE' },
      },
    }
  }

  if (repositoryType === 'ACTIVITY_WORKSPACE') {
    return {
      ...base,
      activityWorkspace: {
        status: 'PUBLISHED',
        dueDate: new Date('2030-01-02T00:00:00.000Z'),
        class: {
          status: 'ACTIVE',
          instructorId: null,
          teachingStaff: [],
          membership: { status: 'ACTIVE' },
        },
      },
    }
  }

  return base
}

function projection() {
  return {
    credentialId,
    repositoryId,
    operations: ['READ', 'WRITE'] as const,
    createdAt: current,
    expiresAt: new Date('2030-01-01T00:15:00.000Z'),
    lastUsedAt: null,
    revokedAt: null,
  }
}

describe('Git credential issuance availability', () => {
  it('rejects before repository access or persistence when Smart HTTP is disabled', async () => {
    const repository = {
      findAccess: vi.fn(),
      createCredential: vi.fn(),
    } as unknown as GitTransportRepository
    const service = createGitCredentialService({
      issuanceEnabled: false,
      repository,
      logger: pino({ level: 'silent' }),
      credentialTtlMinutes: 15,
    })

    await expect(service.issue(caller, repositoryId, ['READ']))
      .rejects.toMatchObject({ statusCode: 404, code: 'GIT_SMART_HTTP_UNAVAILABLE' })
    expect(repository.findAccess).not.toHaveBeenCalled()
    expect(repository.createCredential).not.toHaveBeenCalled()
  })

  it.each(['READ', 'WRITE'] as const)(
    'fails closed for ACTIVITY_WORKSPACE %s credential issuance in V1-A',
    async (operation) => {
      const repository = {
        findAccess: vi.fn().mockResolvedValue(access('ACTIVITY_WORKSPACE')),
        createCredential: vi.fn(),
      } as unknown as GitTransportRepository
      const service = createGitCredentialService({
        issuanceEnabled: true,
        repository,
        logger: pino({ level: 'silent' }),
        credentialTtlMinutes: 15,
        now: () => current,
      })

      await expect(service.issue(caller, repositoryId, [operation]))
        .rejects.toMatchObject({ statusCode: 403, code: 'GIT_OPERATION_NOT_AUTHORIZED' })
      expect(repository.createCredential).not.toHaveBeenCalled()
    },
  )

  it.each(['PERSONAL', 'CLASS_PROJECT', 'CLASS_WORKSPACE'] as const)(
    'preserves existing %s owner READ and WRITE credential issuance',
    async (repositoryType) => {
      const repository = {
        findAccess: vi.fn().mockResolvedValue(access(repositoryType)),
        createCredential: vi.fn().mockResolvedValue(projection()),
      } as unknown as GitTransportRepository
      const service = createGitCredentialService({
        issuanceEnabled: true,
        repository,
        logger: pino({ level: 'silent' }),
        credentialTtlMinutes: 15,
        now: () => current,
      })

      await expect(service.issue(caller, repositoryId, ['READ', 'WRITE']))
        .resolves.toMatchObject({ credentialId, repositoryId, operations: ['READ', 'WRITE'] })
      expect(repository.createCredential).toHaveBeenCalledOnce()
    },
  )

  it.each(['READ', 'WRITE'] as const)(
    'rejects ACTIVITY_WORKSPACE %s transport authentication even for a valid stored credential',
    async (operation) => {
      const secret = 'activityworkspacecredentialsecret1234567890'
      const repository = {
        findCredential: vi.fn().mockResolvedValue({
          ...projection(),
          userId: caller.id,
          secretHash: hashGitCredentialSecret(secret),
        }),
        findAccess: vi.fn().mockResolvedValue(access('ACTIVITY_WORKSPACE')),
        touchCredential: vi.fn(),
      } as unknown as GitTransportRepository
      const service = createGitCredentialService({
        issuanceEnabled: true,
        repository,
        logger: pino({ level: 'silent' }),
        credentialTtlMinutes: 15,
        now: () => current,
      })
      const authorization = `Basic ${Buffer.from(`${credentialId}:${secret}`).toString('base64')}`

      await expect(service.authenticate({ authorization, repositoryId, operation }))
        .rejects.toMatchObject({ statusCode: 401, code: 'GIT_AUTHENTICATION_FAILED' })
      expect(repository.touchCredential).not.toHaveBeenCalled()
    },
  )
})
