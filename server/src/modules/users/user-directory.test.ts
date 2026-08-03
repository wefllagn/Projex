import { describe, expect, it } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  DirectoryUser,
  UserDirectoryRepository,
} from './user-directory.repository.js'
import { createUserDirectoryService } from './user-directory.service.js'

const admin: SafeUserProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Admin User',
  email: 'admin@projex.local',
  role: 'ADMIN',
  status: 'ACTIVE',
}

const directoryUser: DirectoryUser = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  fullName: 'Student User',
  email: 'student@slu.edu.ph',
  role: 'STUDENT',
  status: 'ACTIVE',
  createdAt: new Date('2026-07-30T00:00:00.000Z'),
  updatedAt: new Date('2026-07-30T00:00:00.000Z'),
}

function createRepository(): UserDirectoryRepository {
  return {
    async list() {
      return { users: [directoryUser], totalItems: 21 }
    },
    async findById(userId) {
      return userId === directoryUser.id ? directoryUser : null
    },
  }
}

describe('administrative user directory', () => {
  it('returns safe paginated directory records to an active admin', async () => {
    const service = createUserDirectoryService(createRepository())
    const result = await service.list(admin, {
      page: 2,
      pageSize: 20,
      search: 'student',
      role: 'STUDENT',
      status: 'ACTIVE',
    })
    expect(result.users).toEqual([directoryUser])
    expect(result.users[0]).not.toHaveProperty('passwordHash')
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    })
  })

  it('rejects global directory access from non-admin callers in the service', async () => {
    const service = createUserDirectoryService(createRepository())
    await expect(
      service.list(
        { ...admin, role: 'INSTRUCTOR' },
        { page: 1, pageSize: 20 },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('returns a safe not-found response', async () => {
    const service = createUserDirectoryService(createRepository())
    await expect(
      service.get(admin, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })
})
