import type {
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client'
import type { UserDirectoryQuery } from './user-directory.schemas.js'

export interface DirectoryUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export interface UserDirectoryPage {
  users: DirectoryUser[]
  totalItems: number
}

export interface UserDirectoryRepository {
  list(query: UserDirectoryQuery): Promise<UserDirectoryPage>
  findById(userId: string): Promise<DirectoryUser | null>
}

const directoryUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createPrismaUserDirectoryRepository(
  prisma: PrismaClient,
): UserDirectoryRepository {
  return {
    async list(query) {
      const where: Prisma.UserWhereInput = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  fullName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      }
      const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          select: directoryUserSelect,
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.user.count({ where }),
      ])
      return { users, totalItems }
    },
    findById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: directoryUserSelect,
      })
    },
  }
}
