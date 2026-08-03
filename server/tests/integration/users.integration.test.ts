import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaUserDirectoryRepository } from '../../src/modules/users/user-directory.repository.js'
import { createUserDirectoryService } from '../../src/modules/users/user-directory.service.js'
import {
  cleanIntegrationDatabase,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL user directory', () => {
  it('persists users and applies filters, pagination, and safe projections', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const ada = await createActiveUser(prisma, 'STUDENT', 'Ada Student')
    const grace = await createActiveUser(prisma, 'STUDENT', 'Grace Student')
    await createActiveUser(prisma, 'INSTRUCTOR', 'Student Support Instructor')
    const service = createUserDirectoryService(
      createPrismaUserDirectoryRepository(prisma),
    )

    expect(await prisma.user.count()).toBe(4)

    const firstPage = await service.list(admin, {
      page: 1,
      pageSize: 1,
      search: 'Student',
      role: 'STUDENT',
      status: 'ACTIVE',
    })
    const secondPage = await service.list(admin, {
      page: 2,
      pageSize: 1,
      search: 'Student',
      role: 'STUDENT',
      status: 'ACTIVE',
    })

    expect(firstPage.users).toHaveLength(1)
    expect(firstPage.users[0]?.id).toBe(ada.id)
    expect(firstPage.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    })
    expect(secondPage.users).toHaveLength(1)
    expect(secondPage.users[0]?.id).toBe(grace.id)
    expect(secondPage.pagination).toMatchObject({
      page: 2,
      totalItems: 2,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    })

    const persisted = await service.get(admin, grace.id)
    expect(Object.keys(persisted).sort()).toEqual(
      ['createdAt', 'email', 'fullName', 'id', 'role', 'status', 'updatedAt'].sort(),
    )
    expect(persisted).toMatchObject({
      id: grace.id,
      fullName: 'Grace Student',
      email: grace.email,
      role: 'STUDENT',
      status: 'ACTIVE',
    })
    expect(firstPage.users[0]).not.toHaveProperty('passwordHash')
    expect(persisted).not.toHaveProperty('passwordHash')
  })
})
