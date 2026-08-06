import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import pino from 'pino'
import type { PrismaClient } from '@prisma/client'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createPrismaAdminRepository } from '../../src/modules/admin/admin.repository.js'
import { createAdminRouter } from '../../src/modules/admin/admin.routes.js'
import { createAdminService } from '../../src/modules/admin/admin.service.js'
import { createPrismaAdminOversightRepository } from '../../src/modules/admin/admin-oversight.repository.js'
import { adminAuditEventQuerySchema } from '../../src/modules/admin/admin-oversight.schemas.js'
import type { AdminOversightService } from '../../src/modules/admin/admin-oversight.service.js'
import { createAdminOversightService } from '../../src/modules/admin/admin-oversight.service.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import {
  cleanIntegrationDatabase,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const now = new Date('2031-01-10T08:00:00.000Z')
const reason = 'Approved bounded operational recovery after administrator review.'
const password = 'Phase9CIntegration1!'

function csrfFrom(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))
  if (!csrfCookie) throw new Error('CSRF cookie missing')
  return decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!)
}

function jsonMutation(test: Test, csrf: string): Test {
  return test.set('Content-Type', 'application/json').set('X-CSRF-Token', csrf)
}

describe('Phase 9C PostgreSQL controlled operations', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = createIntegrationPrisma()
  })
  beforeEach(async () => cleanIntegrationDatabase(prisma))
  afterAll(async () => {
    await cleanIntegrationDatabase(prisma)
    await prisma.$disconnect()
  })

  async function credentialFixture(expiresAt: Date) {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = await prisma.repository.create({
      data: {
        ownerId: owner.id,
        repositoryType: 'PERSONAL',
        repositoryName: 'Administrative Credential Fixture',
        slug: `admin-credential-${randomUUID()}`,
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        reviewStatus: 'WORKING',
        storageStatus: 'READY',
        storagePath: `repositories/test/${randomUUID()}.git`,
        provisionedAt: now,
        storageVerifiedAt: now,
        storageSizeBytes: 0n,
        members: { create: { studentId: owner.id, memberRole: 'OWNER', status: 'ACTIVE' } },
      },
    })
    const credential = await prisma.gitCredential.create({
      data: {
        userId: owner.id,
        repositoryId: repository.id,
        secretHash: 'deliberately-sensitive-verifier-that-must-never-be-returned',
        allowedOperations: ['READ', 'WRITE'],
        expiresAt,
      },
    })
    return { admin, owner, repository, credential }
  }

  async function failedJobFixture(overrides: {
    repositoryStatus?: 'ACTIVE' | 'ARCHIVED'
    storageStatus?: 'FAILED' | 'QUARANTINED'
    storagePath?: string | null
    jobStatus?: 'FAILED' | 'PENDING'
    claimAttempt?: number
    maxClaimAttempts?: number
    quarantineKey?: string | null
  } = {}) {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const completedAt = new Date(now.getTime() - 60_000)
    const claimedAt = new Date(now.getTime() - 120_000)
    const repository = await prisma.repository.create({
      data: {
        ownerId: owner.id,
        repositoryType: 'PERSONAL',
        repositoryName: 'Administrative Retry Fixture',
        slug: `admin-retry-${randomUUID()}`,
        visibility: 'PRIVATE',
        status: overrides.repositoryStatus ?? 'ACTIVE',
        archivedAt: overrides.repositoryStatus === 'ARCHIVED' ? now : null,
        reviewStatus: 'WORKING',
        storageStatus: overrides.storageStatus ?? 'FAILED',
        storagePath: overrides.storagePath ?? null,
        storageFailureCode: 'TEST_PROVISIONING_FAILURE',
        members: { create: { studentId: owner.id, memberRole: 'OWNER', status: 'ACTIVE' } },
        provisioningJob: {
          create: {
            status: overrides.jobStatus ?? 'FAILED',
            claimAttempt: overrides.claimAttempt ?? 3,
            maxClaimAttempts: overrides.maxClaimAttempts ?? 3,
            availableAt: claimedAt,
            claimedAt,
            completedAt: overrides.jobStatus === 'PENDING' ? null : completedAt,
            lastFailureCode: 'TEST_PROVISIONING_FAILURE',
            quarantineKey: overrides.quarantineKey ?? null,
          },
        },
      },
      include: { provisioningJob: true },
    })
    return { admin, owner, repository, job: repository.provisioningJob!, claimedAt, completedAt }
  }

  it('revokes active and expired credentials monotonically without leaking secrets', async () => {
    const active = await credentialFixture(new Date(now.getTime() + 60_000))
    const service = createAdminService({ repository: createPrismaAdminRepository(prisma), now: () => now })
    const results = await Promise.all([
      service.revokeGitCredential(active.admin, active.credential.id, { reason }, randomUUID()),
      service.revokeGitCredential(active.admin, active.credential.id, { reason }, randomUUID()),
    ])
    expect(results.map(({ changed }) => changed).sort()).toEqual([false, true])
    expect(results.every((result) => result.lifecycle === 'REVOKED')).toBe(true)
    expect(JSON.stringify(results)).not.toMatch(/secret|hash|verifier|deliberately-sensitive/i)
    expect(await prisma.adminAuditEvent.count({ where: { action: 'GIT_CREDENTIAL_REVOKED' } })).toBe(1)

    await cleanIntegrationDatabase(prisma)
    const expired = await credentialFixture(new Date(now.getTime() - 1))
    const expiredResult = await service.revokeGitCredential(
      expired.admin,
      expired.credential.id,
      { reason },
      randomUUID(),
    )
    expect(expiredResult).toMatchObject({ changed: true, lifecycle: 'REVOKED' })
    const audit = await prisma.adminAuditEvent.findFirstOrThrow()
    expect(audit.metadataJson).toMatchObject({ previousLifecycle: 'EXPIRED' })
  })

  it('rolls credential revocation back when audit persistence fails', async () => {
    const fixture = await credentialFixture(new Date(now.getTime() + 60_000))
    const repository = createPrismaAdminRepository(prisma, async () => {
      throw new Error('injected audit failure')
    })
    await expect(repository.revokeGitCredential({
      actorAdminId: fixture.admin.id,
      credentialId: fixture.credential.id,
      reason,
      requestId: randomUUID(),
      now,
    })).rejects.toThrow('injected audit failure')
    expect((await prisma.gitCredential.findUniqueOrThrow({ where: { id: fixture.credential.id } })).revokedAt).toBeNull()
    expect(await prisma.adminAuditEvent.count()).toBe(0)
  })

  it('permits defensive revocation when the credential owner and repository are inactive', async () => {
    const fixture = await credentialFixture(new Date(now.getTime() + 60_000))
    await prisma.$transaction([
      prisma.user.update({ where: { id: fixture.owner.id }, data: { status: 'SUSPENDED' } }),
      prisma.repository.update({
        where: { id: fixture.repository.id },
        data: { status: 'ARCHIVED', archivedAt: now },
      }),
    ])
    const service = createAdminService({ repository: createPrismaAdminRepository(prisma), now: () => now })
    await expect(service.revokeGitCredential(
      fixture.admin,
      fixture.credential.id,
      { reason },
      randomUUID(),
    )).resolves.toMatchObject({ changed: true, lifecycle: 'REVOKED' })
    expect(await prisma.adminAuditEvent.count({ where: { action: 'GIT_CREDENTIAL_REVOKED' } })).toBe(1)
  })

  it('enforces real cookie authentication and CSRF for both admin operations', async () => {
    const credential = await credentialFixture(new Date(now.getTime() + 60_000))
    const failed = await failedJobFixture()
    const passwordService = createPasswordService()
    await prisma.user.update({
      where: { id: credential.admin.id },
      data: { passwordHash: await passwordService.hash(password) },
    })
    const logger = pino({ level: 'silent' })
    const tokenService = createTokenService('x'.repeat(32), 15)
    const authRepository = createPrismaAuthRepository(prisma)
    const authService = createAuthService({
      repository: authRepository,
      passwordService,
      tokenService,
      logger,
      config: { refreshTokenTtlDays: 7 },
    })
    const requireAuthentication = createAuthenticationMiddleware({ repository: authRepository, tokenService })
    const requireCsrf = createCsrfMiddleware(authService)
    const adminService = createAdminService({
      repository: createPrismaAdminRepository(prisma),
      gitProvisioningRetryEnabled: true,
      logger,
      now: () => now,
    })
    const emptyRouter = () => Router()
    const oversightService = { overview: async () => ({ generatedAt: now }) } as unknown as AdminOversightService
    const app = createApp({
      config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' },
      databaseHealth: createPrismaDatabaseHealth(prisma),
      logger,
      featureRouters: {
        auth: createAuthRouter({
          authService,
          cookieConfig: { secure: false, sameSite: 'lax', accessMaxAgeMs: 900_000, refreshMaxAgeMs: 604_800_000 },
          requireAuthentication,
          requireLogoutAuthentication: requireAuthentication,
          requireCsrf,
        }),
        accountSetup: emptyRouter(),
        admin: createAdminRouter({ service: adminService, oversightService, requireAuthentication, requireCsrf }),
        users: emptyRouter(),
        classes: emptyRouter(),
        activities: emptyRouter(),
        submissions: emptyRouter(),
      },
    })

    await request(app)
      .post(`/api/v1/admin/operations/git-credentials/${credential.credential.id}/revoke`)
      .set('Content-Type', 'application/json')
      .send({ reason })
      .expect(401)
    const agent = request.agent(app)
    const login = await agent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: credential.admin.email, password })
      .expect(200)
    const csrf = csrfFrom(login)
    await agent
      .post(`/api/v1/admin/operations/git-credentials/${credential.credential.id}/revoke`)
      .set('Content-Type', 'application/json')
      .send({ reason })
      .expect(403)
    const revoked = await jsonMutation(
      agent.post(`/api/v1/admin/operations/git-credentials/${credential.credential.id}/revoke`),
      csrf,
    ).send({ reason }).expect(200)
    expect(revoked.body.data).toMatchObject({ changed: true, lifecycle: 'REVOKED' })
    expect(JSON.stringify(revoked.body)).not.toMatch(/secret|hash|verifier|cookie|authorization/i)

    const retried = await jsonMutation(
      agent.post(`/api/v1/admin/operations/repository-provisioning-jobs/${failed.job.id}/retry`),
      csrf,
    ).send({ reason, expectedUpdatedAt: failed.job.updatedAt.toISOString() }).expect(200)
    expect(retried.body.data).toMatchObject({ status: 'PENDING', maxClaimAttempts: 4 })
  })

  it('requeues the same exhausted failed job once and preserves diagnostic history', async () => {
    const fixture = await failedJobFixture()
    const service = createAdminService({
      repository: createPrismaAdminRepository(prisma),
      now: () => now,
      gitProvisioningRetryEnabled: true,
    })
    const result = await service.retryRepositoryProvisioningJob(
      fixture.admin,
      fixture.job.id,
      { reason, expectedUpdatedAt: fixture.job.updatedAt },
      randomUUID(),
    )
    expect(result).toMatchObject({
      jobId: fixture.job.id,
      status: 'PENDING',
      claimAttempt: 3,
      maxClaimAttempts: 4,
      queued: true,
    })
    const [job, repository, audit] = await Promise.all([
      prisma.repositoryProvisioningJob.findUniqueOrThrow({ where: { id: fixture.job.id } }),
      prisma.repository.findUniqueOrThrow({ where: { id: fixture.repository.id } }),
      prisma.adminAuditEvent.findFirstOrThrow(),
    ])
    expect(job).toMatchObject({
      status: 'PENDING',
      claimAttempt: 3,
      maxClaimAttempts: 4,
      claimedAt: fixture.claimedAt,
      completedAt: null,
      lastFailureCode: 'TEST_PROVISIONING_FAILURE',
    })
    expect(repository).toMatchObject({
      storageStatus: 'PENDING',
      storagePath: null,
      storageFailureCode: 'TEST_PROVISIONING_FAILURE',
    })
    expect(audit).toMatchObject({
      action: 'REPOSITORY_PROVISIONING_RETRY_QUEUED',
      targetId: fixture.job.id,
      reason,
    })
    const oversight = createAdminOversightService({
      repository: createPrismaAdminOversightRepository(prisma),
      databaseHealth: createPrismaDatabaseHealth(prisma),
      now: () => now,
    })
    const listed = await oversight.listAuditEvents(
      fixture.admin,
      adminAuditEventQuerySchema.parse({ action: 'REPOSITORY_PROVISIONING_RETRY_QUEUED' }),
    )
    expect(listed.items[0]?.metadata).toEqual({
      repositoryId: fixture.repository.id,
      claimAttempt: 3,
      previousMaxClaimAttempts: 3,
      newMaxClaimAttempts: 4,
      previousFailureCode: 'TEST_PROVISIONING_FAILURE',
      previousCompletedAt: fixture.completedAt.toISOString(),
    })
    expect(JSON.stringify(result)).not.toMatch(/failure|storagePath|quarantine|worker/i)
  })

  it('serializes concurrent retry requests and creates only one audit event', async () => {
    const fixture = await failedJobFixture()
    const service = createAdminService({
      repository: createPrismaAdminRepository(prisma),
      now: () => now,
      gitProvisioningRetryEnabled: true,
    })
    const settled = await Promise.allSettled([
      service.retryRepositoryProvisioningJob(
        fixture.admin,
        fixture.job.id,
        { reason, expectedUpdatedAt: fixture.job.updatedAt },
        randomUUID(),
      ),
      service.retryRepositoryProvisioningJob(
        fixture.admin,
        fixture.job.id,
        { reason, expectedUpdatedAt: fixture.job.updatedAt },
        randomUUID(),
      ),
    ])
    expect(settled.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    const rejected = settled.find(({ status }) => status === 'rejected')
    expect(rejected).toMatchObject({ reason: { code: 'STALE_PROVISIONING_JOB_VERSION' } })
    expect(await prisma.adminAuditEvent.count({ where: { action: 'REPOSITORY_PROVISIONING_RETRY_QUEUED' } })).toBe(1)
    expect((await prisma.repositoryProvisioningJob.findUniqueOrThrow({ where: { id: fixture.job.id } })).maxClaimAttempts).toBe(4)
  })

  it.each([
    ['quarantined storage', { storageStatus: 'QUARANTINED' as const, quarantineKey: 'quarantine/test' }, 'quarantined'],
    ['non-failed job', { jobStatus: 'PENDING' as const }, 'not_failed'],
    ['archived repository', { repositoryStatus: 'ARCHIVED' as const }, 'not_provisionable'],
    ['retry ceiling', { claimAttempt: 10, maxClaimAttempts: 10 }, 'retry_limit'],
  ])('rejects %s without changing state or writing an audit event', async (_label, overrides, expectedKind) => {
    const fixture = await failedJobFixture(overrides)
    const repository = createPrismaAdminRepository(prisma)
    await expect(repository.retryRepositoryProvisioningJob({
      actorAdminId: fixture.admin.id,
      jobId: fixture.job.id,
      reason,
      requestId: randomUUID(),
      expectedUpdatedAt: fixture.job.updatedAt,
      now,
    })).resolves.toMatchObject({ kind: expectedKind })
    expect(await prisma.adminAuditEvent.count()).toBe(0)
  })

  it('rolls retry state changes back when audit persistence fails', async () => {
    const fixture = await failedJobFixture()
    const repository = createPrismaAdminRepository(prisma, async () => {
      throw new Error('injected audit failure')
    })
    await expect(repository.retryRepositoryProvisioningJob({
      actorAdminId: fixture.admin.id,
      jobId: fixture.job.id,
      reason,
      requestId: randomUUID(),
      expectedUpdatedAt: fixture.job.updatedAt,
      now,
    })).rejects.toThrow('injected audit failure')
    expect(await prisma.repositoryProvisioningJob.findUniqueOrThrow({ where: { id: fixture.job.id } })).toMatchObject({
      status: 'FAILED',
      maxClaimAttempts: 3,
      completedAt: fixture.completedAt,
    })
    expect((await prisma.repository.findUniqueOrThrow({ where: { id: fixture.repository.id } })).storageStatus).toBe('FAILED')
    expect(await prisma.adminAuditEvent.count()).toBe(0)
  })
})
