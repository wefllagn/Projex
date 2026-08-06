import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminRepository } from './admin.repository.js'
import type { RevokeUserSessionsInput } from './admin.schemas.js'

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

export function createAdminService(dependencies: {
  repository: AdminRepository
  now?: () => Date
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
  }
}

export type AdminService = ReturnType<typeof createAdminService>
