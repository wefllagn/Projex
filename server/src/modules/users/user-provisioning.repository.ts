import { Prisma, type PrismaClient, type UserRole, type UserStatus } from '@prisma/client'
import type { SafeUserProfile } from '../auth/auth.types.js'

export interface SetupTokenData {
  tokenHash: string
  expiresAt: Date
  createdAt: Date
}

export type ProvisioningResult =
  | { kind: 'created'; user: SafeUserProfile }
  | { kind: 'duplicate_email' }
  | { kind: 'class_not_found' }
  | { kind: 'class_not_owned' }

export type ResendResult =
  | { kind: 'created'; user: SafeUserProfile }
  | { kind: 'not_found' }
  | { kind: 'not_pending' }
  | { kind: 'forbidden' }
  | { kind: 'cooldown' }

export type StatusUpdateResult =
  | { kind: 'updated'; user: SafeUserProfile }
  | { kind: 'not_found' }
  | { kind: 'invalid_transition' }

export interface UserProvisioningRepository {
  createStudent(input: {
    callerId: string
    callerRole: UserRole
    fullName: string
    email: string
    classId?: string
    token: SetupTokenData
  }): Promise<ProvisioningResult>
  createInstructor(input: {
    fullName: string
    email: string
    token: SetupTokenData
  }): Promise<ProvisioningResult>
  replaceSetupToken(input: {
    callerId: string
    callerRole: UserRole
    userId: string
    token: SetupTokenData
    cooldownCutoff: Date
  }): Promise<ResendResult>
  updateStatus(input: {
    userId: string
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    changedAt: Date
  }): Promise<StatusUpdateResult>
}

const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
} as const

function safeProfile(user: {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
}): SafeUserProfile {
  return user
}

function isUniqueFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createPrismaUserProvisioningRepository(
  prisma: PrismaClient,
): UserProvisioningRepository {
  return {
    async createStudent(input) {
      try {
        return await prisma.$transaction(async (transaction) => {
          if (input.classId) {
            const classRecord = await transaction.class.findUnique({
              where: { id: input.classId },
              select: { id: true, instructorId: true },
            })
            if (!classRecord) return { kind: 'class_not_found' } as const
            if (
              input.callerRole === 'INSTRUCTOR' &&
              classRecord.instructorId !== input.callerId
            ) {
              return { kind: 'class_not_owned' } as const
            }
          }

          const user = await transaction.user.create({
            data: {
              fullName: input.fullName,
              email: input.email,
              passwordHash: null,
              role: 'STUDENT',
              status: 'SETUP_PENDING',
              ...(input.classId
                ? {
                    classMemberships: {
                      create: { classId: input.classId, status: 'ACTIVE' },
                    },
                  }
                : {}),
              accountSetupTokens: {
                create: {
                  tokenHash: input.token.tokenHash,
                  expiresAt: input.token.expiresAt,
                  createdAt: input.token.createdAt,
                },
              },
            },
            select: safeUserSelect,
          })
          return { kind: 'created', user: safeProfile(user) } as const
        })
      } catch (error) {
        if (isUniqueFailure(error)) return { kind: 'duplicate_email' }
        throw error
      }
    },
    async createInstructor(input) {
      try {
        const user = await prisma.user.create({
          data: {
            fullName: input.fullName,
            email: input.email,
            passwordHash: null,
            role: 'INSTRUCTOR',
            status: 'SETUP_PENDING',
            accountSetupTokens: {
              create: {
                tokenHash: input.token.tokenHash,
                expiresAt: input.token.expiresAt,
                createdAt: input.token.createdAt,
              },
            },
          },
          select: safeUserSelect,
        })
        return { kind: 'created', user: safeProfile(user) }
      } catch (error) {
        if (isUniqueFailure(error)) return { kind: 'duplicate_email' }
        throw error
      }
    },
    async replaceSetupToken(input) {
      return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: input.userId },
          select: {
            ...safeUserSelect,
            accountSetupTokens: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
            classMemberships:
              input.callerRole === 'INSTRUCTOR'
                ? {
                    where: {
                      status: 'ACTIVE',
                      class: { instructorId: input.callerId },
                    },
                    take: 1,
                    select: { id: true },
                  }
                : false,
          },
        })
        if (!user) return { kind: 'not_found' } as const
        if (user.status !== 'SETUP_PENDING') return { kind: 'not_pending' } as const
        if (
          input.callerRole === 'INSTRUCTOR' &&
          (user.role !== 'STUDENT' || user.classMemberships.length === 0)
        ) {
          return { kind: 'forbidden' } as const
        }
        if (
          user.accountSetupTokens[0]?.createdAt &&
          user.accountSetupTokens[0].createdAt > input.cooldownCutoff
        ) {
          return { kind: 'cooldown' } as const
        }

        await transaction.accountSetupToken.updateMany({
          where: {
            userId: input.userId,
            usedAt: null,
            invalidatedAt: null,
          },
          data: { invalidatedAt: input.token.createdAt },
        })
        await transaction.accountSetupToken.create({
          data: {
            userId: input.userId,
            tokenHash: input.token.tokenHash,
            expiresAt: input.token.expiresAt,
            createdAt: input.token.createdAt,
          },
        })
        return { kind: 'created', user: safeProfile(user) } as const
      })
    },
    async updateStatus(input) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.user.findUnique({
          where: { id: input.userId },
          select: safeUserSelect,
        })
        if (!existing) return { kind: 'not_found' } as const

        const allowed =
          (existing.status === 'ACTIVE' &&
            (input.status === 'INACTIVE' || input.status === 'SUSPENDED')) ||
          ((existing.status === 'INACTIVE' || existing.status === 'SUSPENDED') &&
            input.status === 'ACTIVE')
        if (!allowed) return { kind: 'invalid_transition' } as const

        const user = await transaction.user.update({
          where: { id: input.userId },
          data: { status: input.status },
          select: safeUserSelect,
        })
        if (input.status === 'INACTIVE' || input.status === 'SUSPENDED') {
          await transaction.refreshSession.updateMany({
            where: { userId: input.userId, revokedAt: null },
            data: { revokedAt: input.changedAt },
          })
        }
        return { kind: 'updated', user: safeProfile(user) } as const
      })
    },
  }
}
