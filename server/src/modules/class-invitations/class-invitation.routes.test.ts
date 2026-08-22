import express, { type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { createClassInvitationRouter } from './class-invitation.routes.js'
import type { ClassInvitationService } from './class-invitation.service.js'

const instructor: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Synthetic Instructor',
  email: 'instructor@integration.test',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const student: SafeUserProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  fullName: 'Synthetic Student',
  email: 'student@integration.test',
  role: 'STUDENT',
  status: 'ACTIVE',
}
const admin: SafeUserProfile = {
  ...instructor,
  id: '33333333-3333-4333-8333-333333333333',
  role: 'ADMIN',
}
const classId = '44444444-4444-4444-8444-444444444444'
const invitationId = '55555555-5555-4555-8555-555555555555'

function service(): ClassInvitationService {
  return {
    lookup: vi.fn().mockResolvedValue({ eligibility: 'ELIGIBLE' }),
    create: vi.fn().mockResolvedValue({ invitationId }),
    listForClass: vi.fn().mockResolvedValue({
      invitations: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    }),
    listForStudent: vi.fn().mockResolvedValue({
      invitations: [],
      pagination: { page: 1, pageSize: 3, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    }),
    accept: vi.fn().mockResolvedValue({ invitation: { invitationId } }),
    decline: vi.fn().mockResolvedValue({ invitationId }),
  } as unknown as ClassInvitationService
}

function app(caller: SafeUserProfile, invitationService: ClassInvitationService) {
  const application = express()
  application.use(requestIdMiddleware)
  application.use(express.json())
  const authenticate: RequestHandler = (request, _response, next) => {
    request.auth = {
      user: caller,
      session: {
        id: '66666666-6666-4666-8666-666666666666',
        userId: caller.id,
        familyId: '77777777-7777-4777-8777-777777777777',
        tokenHash: 'not-returned',
        csrfTokenHash: 'not-returned',
        expiresAt: new Date('2031-01-01T00:00:00.000Z'),
        revokedAt: null,
        replacedBySessionId: null,
      },
    }
    next()
  }
  const pass: RequestHandler = (_request, _response, next) => next()
  application.use('/api/v1', createClassInvitationRouter({
    service: invitationService,
    requireAuthentication: authenticate,
    requireCsrf: pass,
  }))
  application.use(createErrorHandler(pino({ level: 'silent' })))
  return application
}

describe('class invitation HTTP role boundary', () => {
  it('routes instructor lookup and creation through the exact-email contract', async () => {
    const invitationService = service()
    await request(app(instructor, invitationService))
      .post('/api/v1/class-invitations/lookup')
      .send({ universityEmail: 'STUDENT@INTEGRATION.TEST', classId })
      .expect(200)
    await request(app(instructor, invitationService))
      .post(`/api/v1/classes/${classId}/invitations`)
      .send({ universityEmail: 'student@integration.test' })
      .expect(201)

    expect(invitationService.lookup).toHaveBeenCalledWith(instructor, {
      universityEmail: 'student@integration.test',
      classId,
    })
    expect(invitationService.create).toHaveBeenCalledWith(instructor, classId, {
      universityEmail: 'student@integration.test',
    })
  })

  it('denies students and administrators before instructor invitation creation', async () => {
    for (const caller of [student, admin]) {
      const invitationService = service()
      const response = await request(app(caller, invitationService))
        .post(`/api/v1/classes/${classId}/invitations`)
        .send({ universityEmail: 'student@integration.test' })
        .expect(403)
      expect(response.body.error.code).toBe('FORBIDDEN')
      expect(invitationService.create).not.toHaveBeenCalled()
    }
  })

  it('allows only students to list and respond to their invitations', async () => {
    const studentService = service()
    await request(app(student, studentService))
      .get('/api/v1/class-invitations?page=1&pageSize=3')
      .expect(200)
    await request(app(student, studentService))
      .post(`/api/v1/class-invitations/${invitationId}/accept`)
      .send({})
      .expect(200)
    expect(studentService.listForStudent).toHaveBeenCalled()
    expect(studentService.accept).toHaveBeenCalledWith(student, invitationId)

    const instructorService = service()
    await request(app(instructor, instructorService))
      .post(`/api/v1/class-invitations/${invitationId}/decline`)
      .send({})
      .expect(403)
    expect(instructorService.decline).not.toHaveBeenCalled()
  })
})
