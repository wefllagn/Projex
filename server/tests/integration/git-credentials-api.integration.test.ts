import { Router } from 'express'
import pino from 'pino'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createGitCredentialService } from '../../src/modules/git-transport/git-credential.service.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import { createGitTransportRouter } from '../../src/modules/git-transport/git-transport.routes.js'
import type { GitTransportService } from '../../src/modules/git-transport/git-transport.service.js'
import { cleanIntegrationDatabase, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const password = 'Phase8BCredential1!'

function csrfFrom(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))
  if (!csrfCookie) throw new Error('CSRF cookie missing')
  return decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!)
}

function jsonMutation(test: Test, csrf: string): Test {
  return test.set('Content-Type', 'application/json').set('X-CSRF-Token', csrf)
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('Git credential HTTP API', () => {
  it('enforces cookie auth and CSRF while returning the secret only on issuance', async () => {
    const passwordService = createPasswordService()
    const user = await prisma.user.create({
      data: {
        fullName: 'Git Credential Student',
        email: 'git-credential-student@integration.test',
        passwordHash: await passwordService.hash(password),
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const repository = await prisma.repository.create({
      data: {
        ownerId: user.id,
        repositoryType: 'PERSONAL',
        repositoryName: 'Credential API Repository',
        slug: 'credential-api-repository',
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        reviewStatus: 'WORKING',
        storageStatus: 'READY',
        storagePath: 'repositories/aa/bb/credential-api.git',
        provisionedAt: new Date(),
        storageVerifiedAt: new Date(),
        storageSizeBytes: 1n,
        members: { create: { studentId: user.id, memberRole: 'OWNER', status: 'ACTIVE' } },
      },
    })
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
    const credentialService = createGitCredentialService({
      repository: createPrismaGitTransportRepository(prisma),
      logger,
      credentialTtlMinutes: 15,
    })
    const transportService: GitTransportService = { initialize: vi.fn(), handle: vi.fn() }
    const emptyRouter = () => Router()
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
        users: emptyRouter(),
        classes: emptyRouter(),
        activities: emptyRouter(),
        submissions: emptyRouter(),
        gitTransport: createGitTransportRouter({ credentialService, transportService, requireAuthentication, requireCsrf }),
      },
    })

    await request(app)
      .post(`/api/v1/repositories/${repository.id}/git-credentials`)
      .set('Content-Type', 'application/json')
      .send({ operations: ['READ'] })
      .expect(401)

    const agent = request.agent(app)
    const login = await agent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password })
      .expect(200)
    const csrf = csrfFrom(login)
    await agent
      .post(`/api/v1/repositories/${repository.id}/git-credentials`)
      .set('Content-Type', 'application/json')
      .send({ operations: ['READ'] })
      .expect(403)
    const issued = await jsonMutation(
      agent.post(`/api/v1/repositories/${repository.id}/git-credentials`),
      csrf,
    ).send({ operations: ['READ', 'WRITE'] }).expect(201)
    expect(issued.body.data.secret).toEqual(expect.any(String))
    expect(issued.body.data.username).toBe(issued.body.data.credentialId)

    const listed = await agent
      .get(`/api/v1/repositories/${repository.id}/git-credentials`)
      .expect(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0]).not.toHaveProperty('secret')
    expect(listed.body.meta.requestId).toEqual(expect.any(String))

    const revoked = await jsonMutation(
      agent.post(`/api/v1/git-credentials/${issued.body.data.credentialId}/revoke`),
      csrf,
    ).send({}).expect(200)
    expect(revoked.body.data.revokedAt).toEqual(expect.any(String))
  })
})
