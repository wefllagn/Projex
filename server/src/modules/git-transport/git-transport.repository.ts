import type { GitCredentialOperation, PrismaClient } from '@prisma/client'
import type {
  AcceptedPushReceipt,
  GitCredentialProjection,
  GitTransportAccess,
} from './git-transport.types.js'

interface StoredGitCredential extends GitCredentialProjection {
  userId: string
  secretHash: string
}

export interface GitTransportRepository {
  findAccess(repositoryId: string, userId: string): Promise<GitTransportAccess | null>
  createCredential(input: {
    userId: string
    repositoryId: string
    secretHash: string
    operations: GitCredentialOperation[]
    createdAt: Date
    expiresAt: Date
  }): Promise<GitCredentialProjection>
  findCredential(credentialId: string): Promise<StoredGitCredential | null>
  listCredentials(userId: string, repositoryId: string): Promise<GitCredentialProjection[]>
  revokeCredential(credentialId: string, userId: string, now: Date): Promise<GitCredentialProjection | null>
  touchCredential(credentialId: string, now: Date): Promise<void>
  recordAcceptedPush(receipt: AcceptedPushReceipt): Promise<boolean>
}

function credentialProjection(record: {
  id: string
  repositoryId: string
  allowedOperations: GitCredentialOperation[]
  createdAt: Date
  expiresAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}): GitCredentialProjection {
  return {
    credentialId: record.id,
    repositoryId: record.repositoryId,
    operations: record.allowedOperations,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
  }
}

export function createPrismaGitTransportRepository(prisma: PrismaClient): GitTransportRepository {
  return {
    async findAccess(repositoryId, userId) {
      const [user, repository] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, status: true },
        }),
        prisma.repository.findUnique({
          where: { id: repositoryId },
          select: {
            id: true,
            ownerId: true,
            repositoryType: true,
            status: true,
            storageStatus: true,
            storagePath: true,
            defaultBranch: true,
            reviewStatus: true,
            members: {
              where: { studentId: userId },
              select: { memberRole: true, status: true },
              take: 1,
            },
            team: {
              select: {
                leadStudentId: true,
                members: {
                  where: { studentId: userId },
                  select: { status: true },
                  take: 1,
                },
              },
            },
            projectTask: {
              select: {
                status: true,
                dueDate: true,
                class: {
                  select: {
                    instructorId: true,
                    status: true,
                    members: {
                      where: { studentId: userId },
                      select: { status: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        }),
      ])
      if (!user || !repository) return null
      return {
        repositoryId: repository.id,
        repositoryType: repository.repositoryType,
        ownerId: repository.ownerId,
        status: repository.status,
        storageStatus: repository.storageStatus,
        storagePath: repository.storagePath,
        defaultBranch: repository.defaultBranch,
        reviewStatus: repository.reviewStatus,
        user,
        repositoryMember: repository.members[0] ?? null,
        teamMember: repository.team?.members[0] ?? null,
        projectTask: repository.projectTask
          ? {
              status: repository.projectTask.status,
              dueDate: repository.projectTask.dueDate,
              class: {
                instructorId: repository.projectTask.class.instructorId,
                status: repository.projectTask.class.status,
                membership: repository.projectTask.class.members[0] ?? null,
              },
            }
          : null,
        teamLeadStudentId: repository.team?.leadStudentId ?? null,
      }
    },

    async createCredential(input) {
      const record = await prisma.gitCredential.create({
        data: {
          userId: input.userId,
          repositoryId: input.repositoryId,
          secretHash: input.secretHash,
          allowedOperations: input.operations,
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
        },
      })
      return credentialProjection(record)
    },

    async findCredential(credentialId) {
      const record = await prisma.gitCredential.findUnique({ where: { id: credentialId } })
      return record
        ? { ...credentialProjection(record), userId: record.userId, secretHash: record.secretHash }
        : null
    },

    async listCredentials(userId, repositoryId) {
      const records = await prisma.gitCredential.findMany({
        where: { userId, repositoryId },
        orderBy: { createdAt: 'desc' },
      })
      return records.map(credentialProjection)
    },

    async revokeCredential(credentialId, userId, now) {
      const updated = await prisma.gitCredential.updateMany({
        where: { id: credentialId, userId, revokedAt: null },
        data: { revokedAt: now },
      })
      if (updated.count !== 1) {
        const existing = await prisma.gitCredential.findFirst({ where: { id: credentialId, userId } })
        return existing ? credentialProjection(existing) : null
      }
      const record = await prisma.gitCredential.findUniqueOrThrow({ where: { id: credentialId } })
      return credentialProjection(record)
    },

    async touchCredential(credentialId, now) {
      await prisma.gitCredential.updateMany({
        where: { id: credentialId, revokedAt: null, expiresAt: { gt: now } },
        data: { lastUsedAt: now },
      })
    },

    async recordAcceptedPush(receipt) {
      try {
        await prisma.repositoryActivity.create({
          data: {
            repositoryId: receipt.repositoryId,
            userId: receipt.userId,
            actorType: 'USER',
            activityType: 'PUSH',
            branchName: receipt.branches.length === 1 ? receipt.branches[0] : null,
            metadataJson: {
              branches: receipt.branches,
              acceptedRefUpdateCount: receipt.refUpdateCount,
            },
            activityAt: new Date(receipt.acceptedAt),
            transportRequestId: receipt.operationId,
          },
        })
        return true
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          return false
        }
        throw error
      }
    },
  }
}
