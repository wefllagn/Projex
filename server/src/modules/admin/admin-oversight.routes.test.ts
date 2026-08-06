import express, { type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminService } from './admin.service.js'
import type { AdminOversightService } from './admin-oversight.service.js'
import { createAdminRouter } from './admin.routes.js'

const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Admin User',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

function createApp(caller: SafeUserProfile, oversightService: AdminOversightService) {
  const app = express()
  app.use(requestIdMiddleware)
  const authenticate: RequestHandler = (request, _response, next) => {
    request.auth = {
      user: caller,
      session: {
        id: '22222222-2222-4222-8222-222222222222',
        userId: caller.id,
        familyId: '33333333-3333-4333-8333-333333333333',
        tokenHash: 'not-returned',
        csrfTokenHash: 'not-returned',
        expiresAt: new Date('2031-01-11T00:00:00.000Z'),
        revokedAt: null,
        replacedBySessionId: null,
      },
    }
    next()
  }
  const pass: RequestHandler = (_request, _response, next) => next()
  app.use('/api/v1/admin', createAdminRouter({
    service: {} as AdminService,
    oversightService,
    requireAuthentication: authenticate,
    requireCsrf: pass,
  }))
  app.use(createErrorHandler(pino({ level: 'silent' })))
  return app
}

function service(): AdminOversightService {
  return {
    overview: vi.fn(async () => ({ generatedAt: new Date('2031-01-10T00:00:00.000Z') })),
    listClasses: vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })),
  } as unknown as AdminOversightService
}

describe('Phase 9B admin oversight HTTP contracts', () => {
  it('returns standard success and list envelopes', async () => {
    const app = createApp(admin, service())
    expect((await request(app).get('/api/v1/admin/overview').expect(200)).body).toMatchObject({
      data: { generatedAt: expect.any(String) }, meta: { requestId: expect.any(String) },
    })
    expect((await request(app).get('/api/v1/admin/academic/classes').expect(200)).body).toMatchObject({
      data: [], pagination: { pageSize: 20 }, meta: { requestId: expect.any(String) },
    })
  })

  it.each([
    ['INSTRUCTOR', 'ACTIVE'],
    ['STUDENT', 'ACTIVE'],
    ['ADMIN', 'INACTIVE'],
    ['ADMIN', 'SUSPENDED'],
  ] as const)('denies %s/%s callers at the route boundary', async (role, status) => {
    await request(createApp({ ...admin, role, status }, service()))
      .get('/api/v1/admin/overview')
      .expect(403)
  })

  it('rejects unbounded pagination and unsupported filters', async () => {
    const app = createApp(admin, service())
    await request(app).get('/api/v1/admin/academic/classes?pageSize=101').expect(400)
    await request(app).get('/api/v1/admin/academic/classes?status=DELETED').expect(400)
    await request(app).get('/api/v1/admin/academic/classes?unexpected=true').expect(400)
  })
})
