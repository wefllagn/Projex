import type { Prisma, PrismaClient } from '@prisma/client'
import {
  appendAdminAuditEvent,
  type AdminAuditWriter,
} from './admin-audit.js'

const adminCredentialSelect = {
  id: true,
  userId: true,
  repositoryId: true,
  allowedOperations: true,
  createdAt: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const satisfies Prisma.GitCredentialSelect

export type AdminGitCredentialRecord = Prisma.GitCredentialGetPayload<{
  select: typeof adminCredentialSelect
}>

const accountSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  passwordChangedAt: true,
  lastLoginAt: true,
  accountSetupTokens: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      expiresAt: true,
      usedAt: true,
      invalidatedAt: true,
      createdAt: true,
    },
  },
  classMemberships: {
    orderBy: [{ joinedAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      status: true,
      joinedAt: true,
      removedAt: true,
      lastActivatedAt: true,
      class: {
        select: {
          id: true,
          className: true,
          section: true,
          status: true,
        },
      },
    },
  },
} as const satisfies Prisma.UserSelect

export type AdminAccountRecord = Prisma.UserGetPayload<{
  select: typeof accountSummarySelect
}>

export interface AdminAccountSummaryRecord {
  user: AdminAccountRecord
  sessions: { active: number; revoked: number; expired: number }
}

export type RevokeSessionsResult =
  | { kind: 'not_found' }
  | { kind: 'revoked'; revokedSessionCount: number; revokedAt: Date }

export type AdminCredentialRevocationResult =
  | { kind: 'not_found' }
  | { kind: 'unchanged'; credential: AdminGitCredentialRecord }
  | { kind: 'revoked'; credential: AdminGitCredentialRecord }

export type ProvisioningRetryResult =
  | { kind: 'not_found' }
  | { kind: 'stale' }
  | { kind: 'not_failed' }
  | { kind: 'quarantined' }
  | { kind: 'unsafe_storage' }
  | { kind: 'retry_limit' }
  | { kind: 'not_provisionable' }
  | {
      kind: 'queued'
      job: {
        id: string
        repositoryId: string
        status: 'PENDING'
        claimAttempt: number
        maxClaimAttempts: number
        availableAt: Date
        updatedAt: Date
      }
    }

export interface AdminRepository {
  findAccountSummary(userId: string, now: Date): Promise<AdminAccountSummaryRecord | null>
  revokeUserSessions(input: {
    actorAdminId: string
    targetUserId: string
    reason: string
    requestId: string
    now: Date
  }): Promise<RevokeSessionsResult>
  revokeGitCredential(input: {
    actorAdminId: string
    credentialId: string
    reason: string
    requestId: string
    now: Date
  }): Promise<AdminCredentialRevocationResult>
  retryRepositoryProvisioningJob(input: {
    actorAdminId: string
    jobId: string
    reason: string
    requestId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ProvisioningRetryResult>
}

export function createPrismaAdminRepository(
  prisma: PrismaClient,
  auditWriter: AdminAuditWriter = appendAdminAuditEvent,
): AdminRepository {
  return {
    async findAccountSummary(userId, now) {
      const [user, active, revoked, expired] = await prisma.$transaction([
        prisma.user.findUnique({ where: { id: userId }, select: accountSummarySelect }),
        prisma.refreshSession.count({
          where: { userId, revokedAt: null, expiresAt: { gt: now } },
        }),
        prisma.refreshSession.count({ where: { userId, revokedAt: { not: null } } }),
        prisma.refreshSession.count({
          where: { userId, revokedAt: null, expiresAt: { lte: now } },
        }),
      ])
      if (!user) return null
      return {
        user,
        sessions: { active, revoked, expired },
      }
    },

    revokeUserSessions(input) {
      return prisma.$transaction(async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id: input.targetUserId },
          select: { id: true },
        })
        if (!target) return { kind: 'not_found' } as const

        const revoked = await transaction.refreshSession.updateMany({
          where: {
            userId: input.targetUserId,
            revokedAt: null,
            expiresAt: { gt: input.now },
          },
          data: { revokedAt: input.now },
        })
        if (revoked.count > 0) {
          await auditWriter(transaction, {
            actorAdminId: input.actorAdminId,
            action: 'USER_SESSIONS_REVOKED',
            targetType: 'USER',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { revokedSessionCount: revoked.count },
            createdAt: input.now,
          })
        }
        return {
          kind: 'revoked',
          revokedSessionCount: revoked.count,
          revokedAt: input.now,
        } as const
      })
    },

    revokeGitCredential(input) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.gitCredential.findUnique({
          where: { id: input.credentialId },
          select: adminCredentialSelect,
        })
        if (!existing) return { kind: 'not_found' } as const
        if (existing.revokedAt !== null) {
          return { kind: 'unchanged', credential: existing } as const
        }

        const updated = await transaction.gitCredential.updateMany({
          where: { id: input.credentialId, revokedAt: null },
          data: { revokedAt: input.now },
        })
        if (updated.count === 0) {
          const concurrent = await transaction.gitCredential.findUnique({
            where: { id: input.credentialId },
            select: adminCredentialSelect,
          })
          return concurrent
            ? ({ kind: 'unchanged', credential: concurrent } as const)
            : ({ kind: 'not_found' } as const)
        }

        const credential = await transaction.gitCredential.findUniqueOrThrow({
          where: { id: input.credentialId },
          select: adminCredentialSelect,
        })
        await auditWriter(transaction, {
          actorAdminId: input.actorAdminId,
          action: 'GIT_CREDENTIAL_REVOKED',
          targetType: 'GIT_CREDENTIAL',
          targetId: credential.id,
          reason: input.reason,
          requestId: input.requestId,
          metadata: {
            userId: credential.userId,
            repositoryId: credential.repositoryId,
            previousLifecycle: existing.expiresAt <= input.now ? 'EXPIRED' : 'ACTIVE',
          },
          createdAt: input.now,
        })
        return { kind: 'revoked', credential } as const
      })
    },

    retryRepositoryProvisioningJob(input) {
      return prisma.$transaction(async (transaction) => {
        const locked = await transaction.$queryRaw<Array<{ provisioning_job_id: string }>>`
          SELECT "provisioning_job_id"
          FROM "repository_provisioning_jobs"
          WHERE "provisioning_job_id" = ${input.jobId}::uuid
          FOR UPDATE
        `
        if (locked.length === 0) return { kind: 'not_found' } as const

        const current = await transaction.repositoryProvisioningJob.findUniqueOrThrow({
          where: { id: input.jobId },
          select: {
            id: true,
            repositoryId: true,
            status: true,
            claimAttempt: true,
            maxClaimAttempts: true,
            availableAt: true,
            completedAt: true,
            workerId: true,
            leaseExpiresAt: true,
            lastFailureCode: true,
            quarantineKey: true,
            updatedAt: true,
            repository: {
              select: {
                id: true,
                repositoryType: true,
                status: true,
                storageStatus: true,
                storagePath: true,
                team: { select: { status: true } },
                projectTask: {
                  select: {
                    status: true,
                    class: { select: { status: true } },
                  },
                },
              },
            },
          },
        })

        await transaction.$queryRaw`
          SELECT "repository_id"
          FROM "repositories"
          WHERE "repository_id" = ${current.repositoryId}::uuid
          FOR UPDATE
        `

        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (current.status !== 'FAILED') return { kind: 'not_failed' } as const
        if (current.repository.storageStatus === 'QUARANTINED' || current.quarantineKey !== null) {
          return { kind: 'quarantined' } as const
        }
        if (
          current.repository.storageStatus !== 'FAILED' ||
          current.repository.storagePath !== null ||
          current.workerId !== null ||
          current.leaseExpiresAt !== null ||
          current.completedAt === null ||
          current.claimAttempt !== current.maxClaimAttempts
        ) {
          return { kind: 'unsafe_storage' } as const
        }
        if (current.maxClaimAttempts >= 10) return { kind: 'retry_limit' } as const

        const repository = current.repository
        const classRepositoryAllowed =
          repository.repositoryType !== 'CLASS_PROJECT' ||
          (repository.team?.status === 'ACTIVE' &&
            repository.projectTask?.class.status === 'ACTIVE' &&
            (repository.projectTask.status === 'PUBLISHED' || repository.projectTask.status === 'CLOSED'))
        if (repository.status !== 'ACTIVE' || !classRepositoryAllowed) {
          return { kind: 'not_provisionable' } as const
        }

        const newMaxClaimAttempts = current.maxClaimAttempts + 1
        await transaction.repositoryProvisioningJob.update({
          where: { id: current.id },
          data: {
            status: 'PENDING',
            maxClaimAttempts: newMaxClaimAttempts,
            availableAt: input.now,
            completedAt: null,
            workerId: null,
            leaseExpiresAt: null,
            updatedAt: input.now,
          },
        })
        await transaction.repository.update({
          where: { id: current.repositoryId },
          data: { storageStatus: 'PENDING' },
        })

        const previousFailureCode =
          current.lastFailureCode && /^[A-Z][A-Z0-9_]{0,63}$/.test(current.lastFailureCode)
            ? current.lastFailureCode
            : current.lastFailureCode === null
              ? null
              : 'INTERNAL_FAILURE'
        await auditWriter(transaction, {
          actorAdminId: input.actorAdminId,
          action: 'REPOSITORY_PROVISIONING_RETRY_QUEUED',
          targetType: 'REPOSITORY_PROVISIONING_JOB',
          targetId: current.id,
          reason: input.reason,
          requestId: input.requestId,
          metadata: {
            repositoryId: current.repositoryId,
            claimAttempt: current.claimAttempt,
            previousMaxClaimAttempts: current.maxClaimAttempts,
            newMaxClaimAttempts,
            previousFailureCode,
            previousCompletedAt: current.completedAt.toISOString(),
          },
          createdAt: input.now,
        })

        return {
          kind: 'queued',
          job: {
            id: current.id,
            repositoryId: current.repositoryId,
            status: 'PENDING',
            claimAttempt: current.claimAttempt,
            maxClaimAttempts: newMaxClaimAttempts,
            availableAt: input.now,
            updatedAt: input.now,
          },
        } as const
      })
    },
  }
}
