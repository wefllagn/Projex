import express, { type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { createUserProvisioningRouter } from './user-provisioning.routes.js'
import type { UserProvisioningService } from './user-provisioning.service.js'

const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Admin User',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}
const instructor: SafeUserProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  fullName: 'Instructor User',
  email: 'instructor@integration.test',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const pendingStudent: SafeUserProfile = {
  id: '33333333-3333-4333-8333-333333333333',
  fullName: 'Pending Student',
  email: 'student@integration.test',
  role: 'STUDENT',
  status: 'SETUP_PENDING',
}
const expiresAt = new Date('2031-01-11T08:00:00.000Z')
const setupLink =
  'http://192.0.2.20:5173/account-setup#token=manual-test-token-that-is-long-enough'

function createApp(caller: SafeUserProfile, service: UserProvisioningService) {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  const authenticate: RequestHandler = (req, _res, next) => {
    req.auth = {
      user: caller,
      session: {
        id: '44444444-4444-4444-8444-444444444444',
        userId: caller.id,
        familyId: '55555555-5555-4555-8555-555555555555',
        tokenHash: 'not-returned',
        csrfTokenHash: 'not-returned',
        expiresAt: new Date('2031-01-10T09:00:00.000Z'),
        revokedAt: null,
        replacedBySessionId: null,
      },
    }
    next()
  }
  const pass: RequestHandler = (_req, _res, next) => next()
  app.use('/api/v1/users', createUserProvisioningRouter({
    service,
    requireAuthentication: authenticate,
    requireCsrf: pass,
  }))
  app.use(createErrorHandler(pino({ level: 'silent' })))
  return app
}

function service(overrides: Partial<UserProvisioningService> = {}) {
  return {
    provisionStudent: vi.fn().mockResolvedValue({
      user: pendingStudent,
      manualSetupLink: { setupLink, expiresAt },
    }),
    provisionInstructor: vi.fn(),
    resendSetup: vi.fn().mockResolvedValue({ setupLink, expiresAt }),
    updateStatus: vi.fn(),
    ...overrides,
  } as UserProvisioningService
}

describe('manual account setup-link HTTP contracts', () => {
  it('returns a no-store setup link to the provisioning administrator', async () => {
    const response = await request(createApp(admin, service()))
      .post('/api/v1/users/students')
      .send({
        fullName: pendingStudent.fullName,
        universityEmail: pendingStudent.email,
      })
      .expect(201)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers.pragma).toBe('no-cache')
    expect(response.body).toMatchObject({
      data: {
        id: pendingStudent.id,
        status: 'SETUP_PENDING',
        manualSetup: {
          setupLink,
          expiresAt: expiresAt.toISOString(),
        },
      },
      meta: { requestId: expect.any(String) },
    })
  })

  it('does not add a manual setup credential to an instructor response', async () => {
    const instructorService = service({
      provisionStudent: vi.fn().mockResolvedValue({
        user: pendingStudent,
        manualSetupLink: null,
      }),
    })
    const response = await request(createApp(instructor, instructorService))
      .post('/api/v1/users/students')
      .send({
        fullName: pendingStudent.fullName,
        universityEmail: pendingStudent.email,
        classId: '66666666-6666-4666-8666-666666666666',
      })
      .expect(201)

    expect(response.body.data).not.toHaveProperty('manualSetup')
    expect(JSON.stringify(response.body)).not.toContain('#token=')
  })

  it('denies a Student before setup-link issuance is called', async () => {
    const provisioningService = service()
    const response = await request(createApp(
      { ...pendingStudent, status: 'ACTIVE' },
      provisioningService,
    ))
      .post('/api/v1/users/students')
      .send({
        fullName: 'Another Student',
        universityEmail: 'another.student@integration.test',
      })
      .expect(403)

    expect(response.body.error.code).toBe('FORBIDDEN')
    expect(provisioningService.provisionStudent).not.toHaveBeenCalled()
    expect(JSON.stringify(response.body)).not.toContain('#token=')
  })

  it('returns a newly issued link only from the explicit pending-account action', async () => {
    const response = await request(createApp(admin, service()))
      .post(`/api/v1/users/${pendingStudent.id}/resend-setup`)
      .send({})
      .expect(200)

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.data).toEqual({
      setupLinkSent: true,
      manualSetup: {
        setupLink,
        expiresAt: expiresAt.toISOString(),
      },
    })
  })
})
