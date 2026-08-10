import pino from 'pino'
import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createGitCredentialService } from '../../src/modules/git-transport/git-credential.service.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma: PrismaClient = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
let now = new Date('2031-01-01T00:00:00.000Z')

function service(issuanceEnabled = true) {
  return createGitCredentialService({
    issuanceEnabled,
    repository: createPrismaGitTransportRepository(prisma),
    logger,
    credentialTtlMinutes: 15,
    now: () => now,
  })
}

async function readyPersonal(ownerId: string, suffix: string) {
  const repository = await prisma.repository.create({
    data: {
      ownerId,
      repositoryType: 'PERSONAL',
      repositoryName: `Personal ${suffix}`,
      slug: `personal-${suffix}`,
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      reviewStatus: 'WORKING',
      storageStatus: 'READY',
      storagePath: `repositories/aa/bb/${suffix}.git`,
      provisionedAt: now,
      storageVerifiedAt: now,
      storageSizeBytes: 1n,
      members: {
        create: { studentId: ownerId, memberRole: 'OWNER', status: 'ACTIVE' },
      },
    },
  })
  return repository
}

beforeEach(async () => {
  now = new Date('2031-01-01T00:00:00.000Z')
  await cleanIntegrationDatabase(prisma)
})

afterAll(async () => {
  await cleanIntegrationDatabase(prisma)
  await prisma.$disconnect()
})

describe('repository-scoped Git credentials', () => {
  it('fails closed before persistence when Smart HTTP is disabled while preserving list and revoke', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = await readyPersonal(owner.id, '00000000-0000-4000-8000-000000000000')
    const disabled = service(false)

    await expect(disabled.issue(owner, repository.id, ['READ'])).rejects.toMatchObject({
      code: 'GIT_SMART_HTTP_UNAVAILABLE',
    })
    await expect(prisma.gitCredential.count({ where: { repositoryId: repository.id } })).resolves.toBe(0)

    const issued = await service().issue(owner, repository.id, ['READ'])
    await expect(disabled.list(owner, repository.id)).resolves.toHaveLength(1)
    await expect(disabled.revoke(owner, issued.credentialId)).resolves.toMatchObject({
      credentialId: issued.credentialId,
      revokedAt: expect.any(Date),
    })
  })

  it('returns a secret once while storing only its hash and safe follow-up projection', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = await readyPersonal(owner.id, '11111111-1111-4111-8111-111111111111')
    const issued = await service().issue(owner, repository.id, ['READ', 'WRITE'])
    const stored = await prisma.gitCredential.findUniqueOrThrow({ where: { id: issued.credentialId } })
    expect(issued.secret.length).toBeGreaterThanOrEqual(40)
    expect(stored.secretHash).not.toBe(issued.secret)
    const listed = await service().list(owner, repository.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]).not.toHaveProperty('secret')
    expect(issued.expiresAt).toEqual(new Date(now.getTime() + 15 * 60_000))
  })

  it('accepts valid Basic credentials and rejects wrong scope, operation, expiry, and revocation', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const first = await readyPersonal(owner.id, '11111111-1111-4111-8111-111111111111')
    const second = await readyPersonal(owner.id, '22222222-2222-4222-8222-222222222222')
    const issued = await service().issue(owner, first.id, ['READ'])
    const authorization = `Basic ${Buffer.from(`${issued.username}:${issued.secret}`).toString('base64')}`
    await expect(service().authenticate({ authorization, repositoryId: first.id, operation: 'READ' }))
      .resolves.toMatchObject({ userId: owner.id, repositoryId: first.id })
    await expect(service().authenticate({ authorization, repositoryId: second.id, operation: 'READ' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
    await expect(service().authenticate({ authorization, repositoryId: first.id, operation: 'WRITE' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
    now = new Date(issued.expiresAt.getTime())
    await expect(service().authenticate({ authorization, repositoryId: first.id, operation: 'READ' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
    now = new Date('2031-01-01T00:00:00.000Z')
    await service().revoke(owner, issued.credentialId)
    await expect(service().authenticate({ authorization, repositoryId: first.id, operation: 'READ' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
  })

  it('rechecks account and membership authority after issuance', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = await readyPersonal(owner.id, '11111111-1111-4111-8111-111111111111')
    const issued = await service().issue(owner, repository.id, ['READ', 'WRITE'])
    const authorization = `Basic ${Buffer.from(`${issued.username}:${issued.secret}`).toString('base64')}`
    await prisma.user.update({ where: { id: owner.id }, data: { status: 'SUSPENDED' } })
    await expect(service().authenticate({ authorization, repositoryId: repository.id, operation: 'READ' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
    await prisma.user.update({ where: { id: owner.id }, data: { status: 'ACTIVE' } })
    await prisma.repositoryMember.update({
      where: { repositoryId_studentId: { repositoryId: repository.id, studentId: owner.id } },
      data: { status: 'REMOVED', removedAt: now },
    })
    await expect(service().authenticate({ authorization, repositoryId: repository.id, operation: 'READ' }))
      .rejects.toMatchObject({ code: 'GIT_AUTHENTICATION_FAILED' })
  })

  it('allows the owning instructor read-only source access and denies administrators', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const admin = await createActiveUser(prisma, 'ADMIN')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const projectTask = await prisma.projectTask.create({
      data: {
        classId: classRecord.id,
        createdById: instructor.id,
        title: 'Git transport project',
        instructions: 'Test source transport.',
        dueDate: new Date('2031-02-01T00:00:00.000Z'),
        maxTeamSize: 3,
        status: 'PUBLISHED',
        publishedAt: now,
      },
    })
    const repository = await prisma.$transaction(async (transaction) => {
      const team = await transaction.team.create({
        data: { projectTaskId: projectTask.id, leadStudentId: owner.id, name: 'Transport Team', normalizedName: 'transport team' },
      })
      await transaction.teamMember.create({ data: { teamId: team.id, projectTaskId: projectTask.id, studentId: owner.id, memberRole: 'LEAD', status: 'ACTIVE' } })
      const record = await transaction.repository.create({
        data: {
          projectTaskId: projectTask.id,
          teamId: team.id,
          ownerId: owner.id,
          repositoryType: 'CLASS_PROJECT',
          repositoryName: 'Transport Repository',
          slug: 'transport-repository',
          visibility: 'CLASS_ONLY',
          status: 'ACTIVE',
          reviewStatus: 'WORKING',
          storageStatus: 'READY',
          storagePath: 'repositories/aa/bb/33333333-3333-4333-8333-333333333333.git',
          provisionedAt: now,
          storageVerifiedAt: now,
          storageSizeBytes: 1n,
        },
      })
      await transaction.repositoryMember.create({ data: { repositoryId: record.id, studentId: owner.id, memberRole: 'OWNER', status: 'ACTIVE' } })
      return record
    })
    await expect(service().issue(instructor, repository.id, ['READ'])).resolves.toMatchObject({ operations: ['READ'] })
    await expect(service().issue(instructor, repository.id, ['WRITE'])).rejects.toMatchObject({ code: 'GIT_OPERATION_NOT_AUTHORIZED' })
    await expect(service().issue(admin, repository.id, ['READ'])).rejects.toMatchObject({ code: 'GIT_OPERATION_NOT_AUTHORIZED' })
  })
})
