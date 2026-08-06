import type { GitCredentialOperation } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  AdminAccountSummaryRecord,
  AdminCredentialRevocationResult,
  AdminRepository,
  ProvisioningRetryResult,
  RevokeSessionsResult,
} from './admin.repository.js'
import { createAdminService } from './admin.service.js'

const now = new Date('2031-01-10T08:00:00.000Z')
const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Active Admin',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

class OperationsRepository implements AdminRepository {
  credentialResult: AdminCredentialRevocationResult = {
    kind: 'revoked',
    credential: {
      id: '22222222-2222-4222-8222-222222222222',
      userId: '33333333-3333-4333-8333-333333333333',
      repositoryId: '44444444-4444-4444-8444-444444444444',
      allowedOperations: ['READ'] as GitCredentialOperation[],
      createdAt: new Date('2031-01-01T00:00:00.000Z'),
      expiresAt: new Date('2031-01-20T00:00:00.000Z'),
      lastUsedAt: null,
      revokedAt: now,
    },
  }
  retryResult: ProvisioningRetryResult = {
    kind: 'queued',
    job: {
      id: '55555555-5555-4555-8555-555555555555',
      repositoryId: '44444444-4444-4444-8444-444444444444',
      status: 'PENDING',
      claimAttempt: 3,
      maxClaimAttempts: 4,
      availableAt: now,
      updatedAt: now,
    },
  }
  revokeGitInput?: Parameters<AdminRepository['revokeGitCredential']>[0]
  retryInput?: Parameters<AdminRepository['retryRepositoryProvisioningJob']>[0]

  async findAccountSummary(): Promise<AdminAccountSummaryRecord | null> { return null }
  async revokeUserSessions(): Promise<RevokeSessionsResult> { return { kind: 'not_found' } }
  async revokeGitCredential(input: Parameters<AdminRepository['revokeGitCredential']>[0]) {
    this.revokeGitInput = input
    return this.credentialResult
  }
  async retryRepositoryProvisioningJob(input: Parameters<AdminRepository['retryRepositoryProvisioningJob']>[0]) {
    this.retryInput = input
    return this.retryResult
  }
}

describe('Phase 9C controlled operations service', () => {
  it('returns only safe credential metadata and passes a bounded audit context', async () => {
    const repository = new OperationsRepository()
    const service = createAdminService({ repository, now: () => now })
    const result = await service.revokeGitCredential(
      admin,
      '22222222-2222-4222-8222-222222222222',
      { reason: 'Confirmed credential security response.' },
      '66666666-6666-4666-8666-666666666666',
    )
    expect(result).toMatchObject({ changed: true, lifecycle: 'REVOKED' })
    expect(JSON.stringify(result)).not.toMatch(/secret|hash|verifier|authorization/i)
    expect(repository.revokeGitInput).toMatchObject({
      actorAdminId: admin.id,
      reason: 'Confirmed credential security response.',
      now,
    })
  })

  it('requeues one additional claim only when Git recovery is enabled', async () => {
    const repository = new OperationsRepository()
    const service = createAdminService({
      repository,
      now: () => now,
      gitProvisioningRetryEnabled: true,
    })
    await expect(service.retryRepositoryProvisioningJob(
      admin,
      '55555555-5555-4555-8555-555555555555',
      { reason: 'Approved bounded provisioning recovery.', expectedUpdatedAt: now },
      '66666666-6666-4666-8666-666666666666',
    )).resolves.toMatchObject({ status: 'PENDING', claimAttempt: 3, maxClaimAttempts: 4 })
    expect(repository.retryInput).toMatchObject({ expectedUpdatedAt: now, now })

    const disabled = createAdminService({ repository, gitProvisioningRetryEnabled: false })
    await expect(disabled.retryRepositoryProvisioningJob(
      admin,
      '55555555-5555-4555-8555-555555555555',
      { reason: 'Approved bounded provisioning recovery.', expectedUpdatedAt: now },
      '66666666-6666-4666-8666-666666666666',
    )).rejects.toMatchObject({ code: 'GIT_EXECUTION_DISABLED', statusCode: 422 })
  })

  it.each([
    ['stale', 'STALE_PROVISIONING_JOB_VERSION', 409],
    ['not_failed', 'PROVISIONING_JOB_NOT_FAILED', 409],
    ['quarantined', 'PROVISIONING_QUARANTINED', 422],
    ['unsafe_storage', 'PROVISIONING_STORAGE_STATE_UNSAFE', 422],
    ['retry_limit', 'PROVISIONING_RETRY_LIMIT_REACHED', 422],
    ['not_provisionable', 'REPOSITORY_NOT_PROVISIONABLE', 409],
  ] as const)('maps %s recovery rejection to a stable safe error', async (kind, code, statusCode) => {
    const repository = new OperationsRepository()
    repository.retryResult = { kind }
    const service = createAdminService({ repository, gitProvisioningRetryEnabled: true })
    await expect(service.retryRepositoryProvisioningJob(
      admin,
      '55555555-5555-4555-8555-555555555555',
      { reason: 'Approved bounded provisioning recovery.', expectedUpdatedAt: now },
      '66666666-6666-4666-8666-666666666666',
    )).rejects.toMatchObject({ code, statusCode })
  })

  it.each([
    { ...admin, role: 'INSTRUCTOR' as const },
    { ...admin, role: 'STUDENT' as const },
    { ...admin, status: 'INACTIVE' as const },
    { ...admin, status: 'SUSPENDED' as const },
  ])('denies non-active-admin callers before repository access', async (caller) => {
    const repository = new OperationsRepository()
    const credentialSpy = vi.spyOn(repository, 'revokeGitCredential')
    const retrySpy = vi.spyOn(repository, 'retryRepositoryProvisioningJob')
    const service = createAdminService({ repository, gitProvisioningRetryEnabled: true })
    await expect(service.revokeGitCredential(
      caller,
      '22222222-2222-4222-8222-222222222222',
      { reason: 'Confirmed credential security response.' },
      '66666666-6666-4666-8666-666666666666',
    )).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(service.retryRepositoryProvisioningJob(
      caller,
      '55555555-5555-4555-8555-555555555555',
      { reason: 'Approved bounded provisioning recovery.', expectedUpdatedAt: now },
      '66666666-6666-4666-8666-666666666666',
    )).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(credentialSpy).not.toHaveBeenCalled()
    expect(retrySpy).not.toHaveBeenCalled()
  })
})
