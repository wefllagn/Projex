import express, { type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminRepository } from './admin.repository.js'
import type { AdminOversightService } from './admin-oversight.service.js'
import { createAdminRouter } from './admin.routes.js'
import { createAdminService } from './admin.service.js'

const fixedNow = new Date('2031-01-10T08:00:00.000Z')
const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Admin User',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

function createApp(caller: SafeUserProfile) {
  const repository: AdminRepository = {
    async findAccountSummary(userId) {
      return {
        user: {
          id: userId,
          fullName: 'Target User',
          email: 'target@integration.test',
          role: 'STUDENT',
          status: 'ACTIVE',
          createdAt: fixedNow,
          updatedAt: fixedNow,
          passwordChangedAt: fixedNow,
          lastLoginAt: null,
          accountSetupTokens: [],
          classMemberships: [],
        },
        sessions: { active: 0, revoked: 0, expired: 0 },
      }
    },
    async revokeUserSessions() {
      return { kind: 'revoked', revokedSessionCount: 0, revokedAt: fixedNow }
    },
  }
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  const authenticate: RequestHandler = (req, _res, next) => {
    req.auth = {
      user: caller,
      session: {
        id: '22222222-2222-4222-8222-222222222222',
        userId: caller.id,
        familyId: '33333333-3333-4333-8333-333333333333',
        tokenHash: 'not-returned',
        csrfTokenHash: 'not-returned',
        expiresAt: new Date(fixedNow.getTime() + 60_000),
        revokedAt: null,
        replacedBySessionId: null,
      },
    }
    next()
  }
  const pass: RequestHandler = (_req, _res, next) => next()
  const oversightService = {
    overview: async () => ({ generatedAt: fixedNow }),
  } as unknown as AdminOversightService
  app.use(
    '/api/v1/admin',
    createAdminRouter({
      service: createAdminService({ repository, now: () => fixedNow }),
      oversightService,
      requireAuthentication: authenticate,
      requireCsrf: pass,
    }),
  )
  app.use(createErrorHandler(pino({ level: 'silent' })))
  return app
}

describe('Phase 9A admin HTTP contracts', () => {
  it('returns the standard safe success envelope for account summary', async () => {
    const response = await request(createApp(admin))
      .get('/api/v1/admin/users/44444444-4444-4444-8444-444444444444/account-summary')
      .expect(200)
    expect(response.body).toMatchObject({
      data: {
        userId: '44444444-4444-4444-8444-444444444444',
        universityEmail: 'target@integration.test',
      },
      meta: { requestId: expect.any(String) },
    })
    expect(JSON.stringify(response.body)).not.toMatch(/tokenHash|csrfTokenHash/i)
  })

  it('denies an instructor at the route boundary', async () => {
    const response = await request(
      createApp({ ...admin, role: 'INSTRUCTOR' }),
    )
      .get('/api/v1/admin/users/44444444-4444-4444-8444-444444444444/account-summary')
      .expect(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects missing and unbounded revocation reasons', async () => {
    await request(createApp(admin))
      .post('/api/v1/admin/users/44444444-4444-4444-8444-444444444444/sessions/revoke')
      .send({})
      .expect(400)
    await request(createApp(admin))
      .post('/api/v1/admin/users/44444444-4444-4444-8444-444444444444/sessions/revoke')
      .send({ reason: 'x'.repeat(501) })
      .expect(400)
  })
})
