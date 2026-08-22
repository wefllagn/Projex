import { Router } from 'express'
import pino from 'pino'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionRouter } from '../../src/modules/submissions/submission.routes.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const password = 'Phase6Integration1!'
const source =
  'public class Main { public static void main(String[] args) { java.util.Scanner s = new java.util.Scanner(System.in); System.out.println(s.nextInt() * 2); } }'

function csrfFrom(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))
  if (!csrfCookie) throw new Error('CSRF cookie missing from login response')
  return decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!)
}

function jsonMutation(test: Test, csrf: string): Test {
  return test
    .set('Content-Type', 'application/json')
    .set('X-CSRF-Token', csrf)
}

beforeEach(async () => {
  await cleanIntegrationDatabase(prisma)
})

afterAll(async () => prisma.$disconnect())

describe('Phase 6 HTTP and PostgreSQL workflow', () => {
  it('enforces auth/CSRF/roles and returns safe submission and practice projections', async () => {
    const passwordService = createPasswordService()
    const passwordHash = await passwordService.hash(password)
    const [admin, instructor, student] = await Promise.all([
      prisma.user.create({
        data: {
          fullName: 'Phase 6 API Administrator',
          email: 'phase6-api-admin@integration.test',
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Phase 6 API Instructor',
          email: 'phase6-api-instructor@integration.test',
          passwordHash,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Phase 6 API Student',
          email: 'phase6-api-student@integration.test',
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      }),
    ])
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await prisma.programmingActivity.create({
      data: {
        classId: classRecord.id,
        createdById: instructor.id,
        title: 'Phase 6 HTTP Activity',
        instructions: 'Double an integer.',
        dueDate: new Date(Date.now() + 86_400_000),
        entryClassName: 'Main',
        starterCode:
          'public class Main { public static void main(String[] args) {} }',
        maxAttempts: 2,
        totalPoints: 100,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        testCases: {
          create: [
            {
              name: 'Visible double',
              testCaseOrder: 1,
              inputData: '2\n',
              expectedOutput: '4\n',
              isHidden: false,
              points: 30,
            },
            {
              name: 'Hidden negative',
              testCaseOrder: 2,
              inputData: '-2\n',
              expectedOutput: '-4\n',
              isHidden: true,
              points: 40,
            },
          ],
        },
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
    const requireAuthentication = createAuthenticationMiddleware({
      repository: authRepository,
      tokenService,
    })
    const requireCsrf = createCsrfMiddleware(authService)
    const submissionService = createSubmissionService({
      repository: createPrismaSubmissionRepository(prisma),
      logger,
      config: {
        mode: 'local_process',
        sourceLimitBytes: 100_000,
        practiceRunTtlHours: 24,
        practiceRunsPerMinute: 5,
        practiceMaxActivePerActivity: 1,
      },
    })
    const emptyRouter = () => Router()
    const app = createApp({
      config: {
        frontendOrigin: 'http://localhost:5173',
        requestBodyLimit: '1mb',
      },
      databaseHealth: createPrismaDatabaseHealth(prisma),
      logger,
      featureRouters: {
        auth: createAuthRouter({
          authService,
          cookieConfig: {
            secure: false,
            sameSite: 'lax',
            accessMaxAgeMs: 15 * 60_000,
            refreshMaxAgeMs: 7 * 86_400_000,
          },
          requireAuthentication,
          requireLogoutAuthentication: requireAuthentication,
          requireCsrf,
        }),
        accountSetup: emptyRouter(),
        users: emptyRouter(),
        classes: emptyRouter(),
        activities: emptyRouter(),
        submissions: createSubmissionRouter({
          service: submissionService,
          requireAuthentication,
          requireCsrf,
        }),
      },
    })

    const studentAgent = request.agent(app)
    const studentLogin = await studentAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: student.email, password })
      .expect(200)
    const studentCsrf = csrfFrom(studentLogin)

    await jsonMutation(
      studentAgent.post(`/api/v1/activities/${activity.id}/submissions`),
      studentCsrf,
    )
      .set('Idempotency-Key', 'phase6-api-idempotency-0001')
      .send({ sourceCode: source })
      .expect(201)
      .expect((response) => {
        expect(response.body.meta.requestId).toEqual(expect.any(String))
        expect(response.body.meta.idempotentReplay).toBe(false)
        expect(response.body.data.attemptLabel).toBe('Attempt 1')
      })

    const replay = await jsonMutation(
      studentAgent.post(`/api/v1/activities/${activity.id}/submissions`),
      studentCsrf,
    )
      .set('Idempotency-Key', 'phase6-api-idempotency-0001')
      .send({ sourceCode: source })
      .expect(200)
    expect(replay.body.meta.idempotentReplay).toBe(true)
    const submissionId = replay.body.data.id as string

    const queue = createPostgresExecutionQueue(prisma)
    const claimed = await queue.claimNext({
      workerId: 'phase6-http-worker',
      now: new Date(),
      leaseMs: 60_000,
    })
    expect(claimed?.submissionId).toBe(submissionId)
    await queue.complete(
      claimed!,
      {
        compileStatus: 'SUCCESS',
        runtimeStatus: 'FAILED',
        compilerOutput: null,
        cases: [
          {
            id: claimed!.cases[0]!.id,
            status: 'PASSED',
            actualOutput: '4\n',
            errorMessage: null,
            executionTimeMs: 5,
            automatedPoints: 30,
          },
          {
            id: claimed!.cases[1]!.id,
            status: 'FAILED',
            actualOutput: '0\n',
            errorMessage: null,
            executionTimeMs: 5,
            automatedPoints: 0,
          },
        ],
      },
      new Date(),
    )

    const studentBeforeRelease = await studentAgent
      .get(`/api/v1/submissions/${submissionId}`)
      .expect(200)
    expect(studentBeforeRelease.body.data.visibleTestOutcomes).toHaveLength(1)
    expect(studentBeforeRelease.body.data.visibleTestOutcomes[0]).toMatchObject({
      name: 'Visible double',
      expectedOutput: '4\n',
      actualOutput: '4\n',
    })
    expect(studentBeforeRelease.body.data).not.toHaveProperty('finalScore')
    expect(JSON.stringify(studentBeforeRelease.body)).not.toContain('Hidden negative')

    const adminAgent = request.agent(app)
    const adminLogin = await adminAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: admin.email, password })
      .expect(200)
    const adminCsrf = csrfFrom(adminLogin)
    const current = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    await jsonMutation(
      adminAgent.post(`/api/v1/submissions/${submissionId}/score-corrections`),
      adminCsrf,
    )
      .send({
        newEffectiveScore: 35,
        reason: 'Administrators remain read-only in Phase 6.',
        expectedUpdatedAt: current.updatedAt.toISOString(),
      })
      .expect(403)

    const instructorAgent = request.agent(app)
    const instructorLogin = await instructorAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: instructor.email, password })
      .expect(200)
    const instructorCsrf = csrfFrom(instructorLogin)
    let instructorView = await instructorAgent
      .get(`/api/v1/submissions/${submissionId}`)
      .expect(200)
    expect(instructorView.body.data.assessment.testResults).toHaveLength(2)

    await jsonMutation(
      instructorAgent.post(
        `/api/v1/submissions/${submissionId}/score-corrections`,
      ),
      instructorCsrf,
    )
      .send({
        newEffectiveScore: 35,
        reason: 'The deterministic result requires a documented correction.',
        expectedUpdatedAt: instructorView.body.data.updatedAt,
      })
      .expect(201)
    instructorView = await instructorAgent
      .get(`/api/v1/submissions/${submissionId}`)
      .expect(200)
    await jsonMutation(
      instructorAgent.put(`/api/v1/submissions/${submissionId}/review`),
      instructorCsrf,
    )
      .send({
        instructorPoints: 20,
        feedbackText: 'Released feedback for the API integration workflow.',
        expectedUpdatedAt: instructorView.body.data.updatedAt,
      })
      .expect(200)
    instructorView = await instructorAgent
      .get(`/api/v1/submissions/${submissionId}`)
      .expect(200)
    await jsonMutation(
      instructorAgent.post(`/api/v1/submissions/${submissionId}/release`),
      instructorCsrf,
    )
      .send({ expectedUpdatedAt: instructorView.body.data.updatedAt })
      .expect(200)

    const studentReleased = await studentAgent
      .get(`/api/v1/submissions/${submissionId}`)
      .expect(200)
    expect(studentReleased.body.data).toMatchObject({
      finalScore: 55,
      totalPoints: 100,
      feedback: 'Released feedback for the API integration workflow.',
    })
    expect(JSON.stringify(studentReleased.body)).not.toContain('Hidden negative')

    await jsonMutation(
      studentAgent.post(`/api/v1/activities/${activity.id}/visible-test-runs`),
      studentCsrf,
    )
      .send({ sourceCode: source, stdin: 'client input is forbidden' })
      .expect(400)
    const practiceResponse = await jsonMutation(
      studentAgent.post(`/api/v1/activities/${activity.id}/visible-test-runs`),
      studentCsrf,
    )
      .send({ sourceCode: source })
      .expect(202)
    const practiceId = practiceResponse.body.data.id as string
    const practiceJob = await queue.claimNext({
      workerId: 'phase6-practice-worker',
      now: new Date(),
      leaseMs: 60_000,
    })
    expect(practiceJob?.cases).toHaveLength(1)
    await queue.complete(
      practiceJob!,
      {
        compileStatus: 'SUCCESS',
        runtimeStatus: 'PASSED',
        compilerOutput: null,
        cases: [
          {
            id: practiceJob!.cases[0]!.id,
            status: 'PASSED',
            actualOutput: '4\n',
            errorMessage: null,
            executionTimeMs: 5,
            automatedPoints: 0,
          },
        ],
      },
      new Date(),
    )
    const practiceResult = await studentAgent
      .get(`/api/v1/visible-test-runs/${practiceId}`)
      .expect(200)
    expect(practiceResult.body.data.visibleTestOutcomes).toHaveLength(1)
    expect(practiceResult.body.data.visibleTestOutcomes[0]).toMatchObject({
      name: 'Visible double',
      expectedOutput: '4\n',
      actualOutput: '4\n',
    })
    expect(JSON.stringify(practiceResult.body)).not.toContain('Hidden negative')
  })
})
