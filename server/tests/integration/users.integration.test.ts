import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import pino from 'pino'
import { createAccountSetupService } from '../../src/modules/account-setup/account-setup.service.js'
import { createPrismaAccountSetupRepository } from '../../src/modules/account-setup/account-setup.repository.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaUserDirectoryRepository } from '../../src/modules/users/user-directory.repository.js'
import { createUserDirectoryService } from '../../src/modules/users/user-directory.service.js'
import { createPrismaUserProvisioningRepository } from '../../src/modules/users/user-provisioning.repository.js'
import { createUserProvisioningService } from '../../src/modules/users/user-provisioning.service.js'
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

  it('keeps manual setup links Admin-only and raw-token-free through reissue and completion', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const tokenService = createTokenService('i'.repeat(64), 15)
    let currentTime = new Date('2031-01-10T08:00:00.000Z')
    const provisioning = createUserProvisioningService({
      repository: createPrismaUserProvisioningRepository(prisma),
      tokenService,
      emailClient: { async send() { return {} } },
      logger: pino({ level: 'silent' }),
      frontendOrigin: 'http://192.0.2.20:5173',
      setupTokenTtlHours: 24,
      now: () => currentTime,
    })

    const provisioned = await provisioning.provisionStudent(admin, {
      fullName: 'Manual Setup Student',
      universityEmail: 'manual.setup@integration.test',
    }, '77777777-7777-4777-8777-777777777777')
    const firstLink = provisioned.manualSetupLink!.setupLink
    const firstRawToken = decodeURIComponent(new URL(firstLink).hash.replace(/^#token=/, ''))
    const firstPersisted = await prisma.accountSetupToken.findFirstOrThrow({
      where: { userId: provisioned.user.id },
      select: { tokenHash: true, invalidatedAt: true, usedAt: true },
    })
    expect(firstPersisted).toEqual({
      tokenHash: tokenService.hashOpaqueToken(firstRawToken),
      invalidatedAt: null,
      usedAt: null,
    })
    expect(JSON.stringify(firstPersisted)).not.toContain(firstRawToken)

    currentTime = new Date('2031-01-10T08:06:00.000Z')
    const reissued = await provisioning.resendSetup(
      admin,
      provisioned.user.id,
      '88888888-8888-4888-8888-888888888888',
    )
    const secondRawToken = decodeURIComponent(
      new URL(reissued!.setupLink).hash.replace(/^#token=/, ''),
    )
    expect(secondRawToken).not.toBe(firstRawToken)
    const persistedTokens = await prisma.accountSetupToken.findMany({
      where: { userId: provisioned.user.id },
      orderBy: { createdAt: 'asc' },
      select: { tokenHash: true, invalidatedAt: true, usedAt: true },
    })
    expect(persistedTokens).toHaveLength(2)
    expect(persistedTokens[0]?.invalidatedAt).toEqual(currentTime)
    expect(persistedTokens[1]?.tokenHash).toBe(tokenService.hashOpaqueToken(secondRawToken))

    const setup = createAccountSetupService({
      repository: createPrismaAccountSetupRepository(prisma),
      passwordService: createPasswordService(),
      tokenService,
      logger: pino({ level: 'silent' }),
      now: () => currentTime,
    })
    await expect(setup.complete(firstRawToken, 'ValidPassword1!')).rejects.toMatchObject({
      code: 'SETUP_TOKEN_INVALID',
    })
    await expect(setup.complete(secondRawToken, 'ValidPassword1!')).resolves.toBeUndefined()
    await expect(setup.complete(secondRawToken, 'AnotherPassword2!')).rejects.toMatchObject({
      code: 'SETUP_TOKEN_INVALID',
    })
    await expect(
      provisioning.resendSetup(
        admin,
        provisioned.user.id,
        '99999999-9999-4999-8999-999999999999',
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_SETUP_PENDING' })

    const directory = createUserDirectoryService(
      createPrismaUserDirectoryRepository(prisma),
    )
    const safeRecord = await directory.get(admin, provisioned.user.id)
    expect(safeRecord.status).toBe('ACTIVE')
    expect(Object.keys(safeRecord).sort()).toEqual(
      ['createdAt', 'email', 'fullName', 'id', 'role', 'status', 'updatedAt'].sort(),
    )
  })
})
