import type { SafeUserProfile } from '../auth/auth.types.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type {
  DirectoryUser,
  UserDirectoryRepository,
} from './user-directory.repository.js'
import type { UserDirectoryQuery } from './user-directory.schemas.js'

export interface UserDirectoryResult {
  users: DirectoryUser[]
  pagination: PaginationMeta
}

export interface UserDirectoryService {
  list(
    caller: SafeUserProfile,
    query: UserDirectoryQuery,
  ): Promise<UserDirectoryResult>
  get(caller: SafeUserProfile, userId: string): Promise<DirectoryUser>
}

function requireActiveAdmin(caller: SafeUserProfile): void {
  if (caller.role !== 'ADMIN' || caller.status !== 'ACTIVE') {
    throw new AppError({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You are not authorized to perform this action.',
    })
  }
}

export function createUserDirectoryService(
  repository: UserDirectoryRepository,
): UserDirectoryService {
  return {
    async list(caller, query) {
      requireActiveAdmin(caller)
      const result = await repository.list(query)
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        users: result.users,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: result.totalItems,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      }
    },
    async get(caller, userId) {
      requireActiveAdmin(caller)
      const user = await repository.findById(userId)
      if (!user) {
        throw new AppError({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
          message: 'User not found.',
        })
      }
      return user
    },
  }
}
