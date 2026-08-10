import express, { type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { createClassMemberRouter } from './class-member.routes.js'
import type {
  ClassMemberService,
  DetailedRosterMember,
} from './class-member.service.js'

const classId = '11111111-1111-4111-8111-111111111111'
const memberId = '22222222-2222-4222-8222-222222222222'
const studentId = '33333333-3333-4333-8333-333333333333'
const updatedAt = new Date('2031-02-03T04:05:06.000Z')

const admin: SafeUserProfile = {
  id: '44444444-4444-4444-8444-444444444444',
  fullName: 'Admin User',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

const student: SafeUserProfile = {
  id: studentId,
  fullName: 'Student User',
  email: 'student@integration.test',
  role: 'STUDENT',
  status: 'ACTIVE',
}

const detailedMember: DetailedRosterMember = {
  memberId,
  userId: studentId,
  fullName: student.fullName,
  email: student.email,
  userStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  joinedAt: new Date('2031-01-01T00:00:00.000Z'),
  updatedAt,
  removedAt: null,
  lastActivatedAt: new Date('2031-01-01T00:00:00.000Z'),
}

function createApp(caller: SafeUserProfile, service: ClassMemberService) {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  const authenticate: RequestHandler = (req, _res, next) => {
    req.auth = {
      user: caller,
      session: {
        id: '55555555-5555-4555-8555-555555555555',
        userId: caller.id,
        familyId: '66666666-6666-4666-8666-666666666666',
        tokenHash: 'not-returned',
        csrfTokenHash: 'not-returned',
        expiresAt: new Date('2031-12-31T00:00:00.000Z'),
        revokedAt: null,
        replacedBySessionId: null,
      },
    }
    next()
  }
  const pass: RequestHandler = (_req, _res, next) => next()
  app.use(
    '/api/v1/classes',
    createClassMemberRouter({
      service,
      requireAuthentication: authenticate,
      requireCsrf: pass,
    }),
  )
  app.use(createErrorHandler(pino({ level: 'silent' })))
  return app
}

function createService(overrides: Partial<ClassMemberService> = {}) {
  const service: ClassMemberService = {
    async join() {
      throw new Error('not used')
    },
    async list(caller) {
      return {
        members:
          caller.role === 'STUDENT'
            ? [{ userId: studentId, fullName: student.fullName }]
            : [detailedMember],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }
    },
    async update() {
      return detailedMember
    },
    ...overrides,
  }
  return service
}

describe('class member HTTP contracts', () => {
  it('exposes updatedAt in the detailed administrator roster projection', async () => {
    const response = await request(createApp(admin, createService()))
      .get(`/api/v1/classes/${classId}/members`)
      .expect(200)

    expect(response.body.data[0]).toMatchObject({
      memberId,
      updatedAt: updatedAt.toISOString(),
    })
  })

  it('keeps the student roster projection limited to userId and fullName', async () => {
    const response = await request(createApp(student, createService()))
      .get(`/api/v1/classes/${classId}/members`)
      .expect(200)

    expect(response.body.data[0]).toEqual({
      userId: studentId,
      fullName: student.fullName,
    })
  })

  it('accepts the current roster version for an administrative transition', async () => {
    const update = vi.fn<ClassMemberService['update']>(async () => ({
      ...detailedMember,
      membershipStatus: 'REMOVED',
      updatedAt: new Date('2031-02-03T05:05:06.000Z'),
      removedAt: new Date('2031-02-03T05:05:06.000Z'),
    }))
    const response = await request(createApp(admin, createService({ update })))
      .patch(`/api/v1/classes/${classId}/members/${memberId}`)
      .send({
        status: 'REMOVED',
        reason: 'Approved administrative roster correction.',
        expectedUpdatedAt: updatedAt.toISOString(),
      })
      .expect(200)

    expect(update).toHaveBeenCalledWith(
      admin,
      classId,
      memberId,
      expect.objectContaining({ expectedUpdatedAt: updatedAt }),
      expect.any(String),
    )
    expect(response.body.data.membershipStatus).toBe('REMOVED')
  })

  it('returns STALE_CLASS_MEMBER_VERSION for a stale roster version', async () => {
    const update = vi.fn<ClassMemberService['update']>(async () => {
      throw new AppError({
        statusCode: 409,
        code: 'STALE_CLASS_MEMBER_VERSION',
        message: 'The class membership changed. Reload it before trying again.',
      })
    })
    const response = await request(createApp(admin, createService({ update })))
      .patch(`/api/v1/classes/${classId}/members/${memberId}`)
      .send({
        status: 'REMOVED',
        reason: 'Approved administrative roster correction.',
        expectedUpdatedAt: updatedAt.toISOString(),
      })
      .expect(409)

    expect(response.body.error).toMatchObject({
      code: 'STALE_CLASS_MEMBER_VERSION',
    })
  })
})
