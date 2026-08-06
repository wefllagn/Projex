import { AppError } from '../../shared/errors/app-error.js'
import type { Logger } from 'pino'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminGitCredentialRecord, AdminRepository } from './admin.repository.js'
import type { RevokeUserSessionsInput } from './admin.schemas.js'
import type {
  RevokeAdminGitCredentialInput,
  RetryRepositoryProvisioningJobInput,
} from './admin.schemas.js'

function forbidden(): AppError {
  return new AppError({
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'You are not authorized to perform this action.',
  })
}

function requireActiveAdmin(caller: SafeUserProfile): void {
  if (caller.role !== 'ADMIN' || caller.status !== 'ACTIVE') throw forbidden()
}

function userNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'USER_NOT_FOUND',
    message: 'User not found.',
  })
}

function adminError(statusCode: number, code: string, message: string): AppError {
  return new AppError({ statusCode, code, message })
}

function credentialProjection(
  credential: AdminGitCredentialRecord,
  changed: boolean,
) {
  return {
    credentialId: credential.id,
    userId: credential.userId,
    repositoryId: credential.repositoryId,
    allowedOperations: credential.allowedOperations,
    createdAt: credential.createdAt,
    expiresAt: credential.expiresAt,
    lastUsedAt: credential.lastUsedAt,
    revokedAt: credential.revokedAt,
    lifecycle: 'REVOKED' as const,
    changed,
  }
}

export function createAdminService(dependencies: {
  repository: AdminRepository
  now?: () => Date
  logger?: Logger
  gitProvisioningRetryEnabled?: boolean
}) {
  const now = dependencies.now ?? (() => new Date())

  return {
    async accountSummary(caller: SafeUserProfile, userId: string) {
      requireActiveAdmin(caller)
      const record = await dependencies.repository.findAccountSummary(userId, now())
      if (!record) throw userNotFound()
      const latestSetup = record.user.accountSetupTokens[0]
      const setupState =
        record.user.status !== 'SETUP_PENDING'
          ? 'COMPLETE'
          : latestSetup &&
              latestSetup.usedAt === null &&
              latestSetup.invalidatedAt === null &&
              latestSetup.expiresAt > now()
            ? 'PENDING'
            : 'ACTION_REQUIRED'
      return {
        userId: record.user.id,
        fullName: record.user.fullName,
        universityEmail: record.user.email,
        role: record.user.role,
        status: record.user.status,
        createdAt: record.user.createdAt,
        updatedAt: record.user.updatedAt,
        passwordChangedAt: record.user.passwordChangedAt,
        lastLoginAt: record.user.lastLoginAt,
        accountSetup: {
          state: setupState,
          lastIssuedAt: latestSetup?.createdAt ?? null,
          expiresAt:
            setupState === 'PENDING' ? (latestSetup?.expiresAt ?? null) : null,
        },
        sessions: record.sessions,
        memberships: record.user.classMemberships.map((membership) => ({
          memberId: membership.id,
          membershipStatus: membership.status,
          joinedAt: membership.joinedAt,
          removedAt: membership.removedAt,
          lastActivatedAt: membership.lastActivatedAt,
          class: {
            classId: membership.class.id,
            className: membership.class.className,
            section: membership.class.section,
            status: membership.class.status,
          },
        })),
      }
    },

    async revokeUserSessions(
      caller: SafeUserProfile,
      userId: string,
      input: RevokeUserSessionsInput,
      requestId: string,
    ) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.revokeUserSessions({
        actorAdminId: caller.id,
        targetUserId: userId,
        reason: input.reason,
        requestId,
        now: now(),
      })
      if (result.kind === 'not_found') throw userNotFound()
      return {
        userId,
        revokedSessionCount: result.revokedSessionCount,
        revokedAt: result.revokedAt,
      }
    },

    async revokeGitCredential(
      caller: SafeUserProfile,
      credentialId: string,
      input: RevokeAdminGitCredentialInput,
      requestId: string,
    ) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.revokeGitCredential({
        actorAdminId: caller.id,
        credentialId,
        reason: input.reason,
        requestId,
        now: now(),
      })
      if (result.kind === 'not_found') {
        throw adminError(404, 'GIT_CREDENTIAL_NOT_FOUND', 'Git credential not found.')
      }
      const changed = result.kind === 'revoked'
      if (changed) {
        dependencies.logger?.info(
          {
            event: 'admin.git_credential.revoked',
            actorAdminId: caller.id,
            credentialId,
            repositoryId: result.credential.repositoryId,
          },
          'administrator revoked repository-scoped Git credential',
        )
      }
      return credentialProjection(result.credential, changed)
    },

    async retryRepositoryProvisioningJob(
      caller: SafeUserProfile,
      jobId: string,
      input: RetryRepositoryProvisioningJobInput,
      requestId: string,
    ) {
      requireActiveAdmin(caller)
      if (dependencies.gitProvisioningRetryEnabled !== true) {
        throw adminError(
          422,
          'GIT_EXECUTION_DISABLED',
          'Git repository provisioning is unavailable.',
        )
      }
      const result = await dependencies.repository.retryRepositoryProvisioningJob({
        actorAdminId: caller.id,
        jobId,
        reason: input.reason,
        requestId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        now: now(),
      })
      const errors = {
        not_found: adminError(404, 'PROVISIONING_JOB_NOT_FOUND', 'Repository provisioning job not found.'),
        stale: adminError(409, 'STALE_PROVISIONING_JOB_VERSION', 'The provisioning job changed. Refresh and retry.'),
        not_failed: adminError(409, 'PROVISIONING_JOB_NOT_FAILED', 'Only a failed provisioning job can be retried.'),
        quarantined: adminError(422, 'PROVISIONING_QUARANTINED', 'Quarantined repository storage requires a separate recovery process.'),
        unsafe_storage: adminError(422, 'PROVISIONING_STORAGE_STATE_UNSAFE', 'Repository storage state is not eligible for retry.'),
        retry_limit: adminError(422, 'PROVISIONING_RETRY_LIMIT_REACHED', 'The provisioning retry limit has been reached.'),
        not_provisionable: adminError(409, 'REPOSITORY_NOT_PROVISIONABLE', 'The repository lifecycle does not permit provisioning.'),
      } as const
      if (result.kind !== 'queued') throw errors[result.kind]
      dependencies.logger?.info(
        {
          event: 'admin.repository_provisioning.retry_queued',
          actorAdminId: caller.id,
          repositoryId: result.job.repositoryId,
          provisioningJobId: result.job.id,
          claimAttempt: result.job.claimAttempt,
          maxClaimAttempts: result.job.maxClaimAttempts,
        },
        'administrator queued repository provisioning retry',
      )
      return {
        jobId: result.job.id,
        repositoryId: result.job.repositoryId,
        status: result.job.status,
        claimAttempt: result.job.claimAttempt,
        maxClaimAttempts: result.job.maxClaimAttempts,
        availableAt: result.job.availableAt,
        updatedAt: result.job.updatedAt,
        queued: true,
      }
    },
  }
}

export type AdminService = ReturnType<typeof createAdminService>
