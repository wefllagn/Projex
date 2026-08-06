import type { Prisma, PrismaClient } from '@prisma/client'
import {
  appendAdminAuditEvent,
  type AdminAuditWriter,
} from './admin-audit.js'

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

export interface AdminRepository {
  findAccountSummary(userId: string, now: Date): Promise<AdminAccountSummaryRecord | null>
  revokeUserSessions(input: {
    actorAdminId: string
    targetUserId: string
    reason: string
    requestId: string
    now: Date
  }): Promise<RevokeSessionsResult>
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
  }
}
