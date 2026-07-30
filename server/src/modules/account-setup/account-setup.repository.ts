import type { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import type { SafeUserProfile } from '../auth/auth.types.js'

export interface AccountSetupRepository {
  completeSetup(input: {
    tokenHash: string
    passwordHash: string
    completedAt: Date
  }): Promise<SafeUserProfile | null>
}

export function createPrismaAccountSetupRepository(
  prisma: PrismaClient,
): AccountSetupRepository {
  return {
    async completeSetup(input) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.accountSetupToken.findUnique({
          where: { tokenHash: input.tokenHash },
          select: {
            id: true,
            userId: true,
            expiresAt: true,
            usedAt: true,
            invalidatedAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                status: true,
              },
            },
          },
        })
        if (
          !token ||
          token.usedAt ||
          token.invalidatedAt ||
          token.expiresAt <= input.completedAt ||
          token.user.status !== 'SETUP_PENDING'
        ) {
          return null
        }

        const claimed = await transaction.accountSetupToken.updateMany({
          where: {
            id: token.id,
            usedAt: null,
            invalidatedAt: null,
            expiresAt: { gt: input.completedAt },
          },
          data: { usedAt: input.completedAt },
        })
        if (claimed.count !== 1) return null

        const user = await transaction.user.update({
          where: { id: token.userId, status: 'SETUP_PENDING' },
          data: {
            passwordHash: input.passwordHash,
            passwordChangedAt: input.completedAt,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        })
        await transaction.accountSetupToken.updateMany({
          where: {
            userId: token.userId,
            id: { not: token.id },
            usedAt: null,
            invalidatedAt: null,
          },
          data: { invalidatedAt: input.completedAt },
        })
        return user as {
          id: string
          fullName: string
          email: string
          role: UserRole
          status: UserStatus
        }
      })
    },
  }
}
