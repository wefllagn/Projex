import type { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error.js'
import { INVALID_LOGIN_MESSAGE } from './auth.constants.js'
import type {
  AuthContext,
  AuthSession,
  AuthUser,
  SafeUserProfile,
  SessionMetadata,
} from './auth.types.js'

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  passwordHash: true,
  passwordChangedAt: true,
} as const

const sessionSelect = {
  id: true,
  userId: true,
  familyId: true,
  tokenHash: true,
  csrfTokenHash: true,
  createdAt: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  replacedBySessionId: true,
} as const

export interface CreateSessionInput extends SessionMetadata {
  id: string
  userId: string
  familyId: string
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
  updateLastLogin?: boolean
  verifiedPasswordHash?: string
}

export interface RotateSessionInput extends CreateSessionInput {
  previousSessionId: string
  usedAt: Date
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>
  findUserById(id: string): Promise<AuthUser | null>
  findContext(userId: string, sessionId: string): Promise<AuthContext | null>
  findSessionByTokenHash(
    tokenHash: string,
  ): Promise<{ session: AuthSession; user: AuthUser } | null>
  createSession(input: CreateSessionInput): Promise<AuthSession>
  rotateSession(input: RotateSessionInput): Promise<AuthSession | null>
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>
  revokeFamily(familyId: string, revokedAt: Date): Promise<void>
  revokeAllUserSessions(
    userId: string,
    revokedAt: Date,
    exceptSessionId?: string,
  ): Promise<void>
  changePassword(
    userId: string,
    currentSessionId: string,
    passwordHash: string,
    changedAt: Date,
  ): Promise<void>
}

function toProfile(user: {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
}): SafeUserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}

export function createPrismaAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email }, select: userSelect })
    },
    findUserById(id) {
      return prisma.user.findUnique({ where: { id }, select: userSelect })
    },
    async findContext(userId, sessionId) {
      const session = await prisma.refreshSession.findUnique({
        where: { id: sessionId },
        select: {
          ...sessionSelect,
          user: { select: userSelect },
        },
      })

      if (!session || session.userId !== userId) return null
      const { user, ...sessionRecord } = session
      return { user: toProfile(user), session: sessionRecord }
    },
    async findSessionByTokenHash(tokenHash) {
      const record = await prisma.refreshSession.findUnique({
        where: { tokenHash },
        select: {
          ...sessionSelect,
          user: { select: userSelect },
        },
      })
      if (!record) return null
      const { user, ...session } = record
      return { session, user }
    },
    async createSession(input) {
      return prisma.$transaction(async (transaction) => {
        if (input.updateLastLogin) {
          // Compare the credential under the same row lock used by password
          // recovery, so an in-flight old-password login cannot survive a reset.
          const matched = await transaction.user.updateMany({
            where: { id: input.userId, status: 'ACTIVE', ...(input.verifiedPasswordHash !== undefined ? { passwordHash: input.verifiedPasswordHash } : {}) },
            data: { lastLoginAt: new Date() },
          })
          if (matched.count !== 1) throw new AppError({ statusCode: 401, code: 'INVALID_CREDENTIALS', message: INVALID_LOGIN_MESSAGE })
        }

        return transaction.refreshSession.create({
          data: {
            id: input.id,
            userId: input.userId,
            familyId: input.familyId,
            tokenHash: input.tokenHash,
            csrfTokenHash: input.csrfTokenHash,
            expiresAt: input.expiresAt,
            userAgent: input.userAgent,
            ipAddress: input.ipAddress,
          },
          select: sessionSelect,
        })
      })
    },
    async rotateSession(input) {
      return prisma.$transaction(async (transaction) => {
        const revoked = await transaction.refreshSession.updateMany({
          where: {
            id: input.previousSessionId,
            revokedAt: null,
            replacedBySessionId: null,
          },
          data: {
            revokedAt: input.usedAt,
            lastUsedAt: input.usedAt,
          },
        })
        if (revoked.count !== 1) return null

        const replacement = await transaction.refreshSession.create({
          data: {
            id: input.id,
            userId: input.userId,
            familyId: input.familyId,
            tokenHash: input.tokenHash,
            csrfTokenHash: input.csrfTokenHash,
            expiresAt: input.expiresAt,
            userAgent: input.userAgent,
            ipAddress: input.ipAddress,
          },
          select: sessionSelect,
        })
        await transaction.refreshSession.update({
          where: { id: input.previousSessionId },
          data: { replacedBySessionId: replacement.id },
        })
        return replacement
      })
    },
    async revokeSession(sessionId, revokedAt) {
      await prisma.refreshSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt },
      })
    },
    async revokeFamily(familyId, revokedAt) {
      await prisma.refreshSession.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt },
      })
    },
    async revokeAllUserSessions(userId, revokedAt, exceptSessionId) {
      await prisma.refreshSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        },
        data: { revokedAt },
      })
    },
    async changePassword(userId, currentSessionId, passwordHash, changedAt) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { passwordHash, passwordChangedAt: changedAt },
        }),
        prisma.refreshSession.updateMany({
          where: {
            userId,
            id: { not: currentSessionId },
            revokedAt: null,
          },
          data: { revokedAt: changedAt },
        }),
      ])
    },
  }
}
