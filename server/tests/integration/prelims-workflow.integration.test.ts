import { randomBytes, randomUUID } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { Router } from 'express'
import pino from 'pino'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createActivityRouter } from '../../src/modules/activities/activity.routes.js'
import { createClassActivityRouter } from '../../src/modules/activities/class-activity.routes.js'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createTestCaseRouter } from '../../src/modules/test-cases/test-case.routes.js'
import { createPrismaTestCaseRepository } from '../../src/modules/test-cases/test-case.repository.js'
import { createTestCaseService } from '../../src/modules/test-cases/test-case.service.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionRouter } from '../../src/modules/submissions/submission.routes.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createIntegrationPrisma } from './database.js'
import { requireTestDatabaseUrl } from './test-database-url.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
let worker: ChildProcess | undefined
let root: string | undefined

async function stopWorker() {
  const child = worker
  worker = undefined
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))
  child.kill('SIGTERM')
  await exited
}
beforeEach(async () => { await stopWorker(); await cleanIntegrationDatabase(prisma) })
afterAll(async () => {
  await stopWorker()
  await cleanIntegrationDatabase(prisma)
  await prisma.$disconnect()
  if (root && path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('projex-i2-workflow-')) {
    await rm(root, { recursive: true, force: true })
  }
})

function csrf(response: Response) {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const cookie = cookies.find((item) => item.startsWith('projex_csrf='))
  if (!cookie) throw new Error('Synthetic login did not return CSRF protection')
  return decodeURIComponent(cookie.split(';')[0]!.slice('projex_csrf='.length))
}
const mutation = (test: Test, token: string) => test.set('Content-Type', 'application/json').set('X-CSRF-Token', token)

describe('I2.1 authenticated checkout HTTP / PostgreSQL / separate real Java worker', () => {
  it.each(['LATEST', 'HIGHEST'] as const)('%s preserves academic lifecycle, privacy and immutable attempts', async (creditPolicy) => {
    const passwordService = createPasswordService()
    const password = `I2!${randomBytes(24).toString('hex')}`
    const passwordHash = await passwordService.hash(password)
    const instructor = await prisma.user.create({ data: { fullName: 'I2 Test Instructor', email: `i2-instructor-${randomUUID()}@integration.test`, role: 'INSTRUCTOR', status: 'ACTIVE', passwordHash } })
    const student = await prisma.user.create({ data: { fullName: 'I2 Test Student', email: `i2-student-${randomUUID()}@integration.test`, role: 'STUDENT', status: 'ACTIVE', passwordHash } })
    const outsider = await prisma.user.create({ data: { fullName: 'I2 Test Outsider', email: `i2-outsider-${randomUUID()}@integration.test`, role: 'STUDENT', status: 'ACTIVE', passwordHash } })
    const classRecord = await createActiveClass(prisma, instructor.id, 'Disposable I2 workflow fixture')
    await createActiveMembership(prisma, classRecord.id, student.id)
    let now = new Date()
    const dueDate = new Date(now.getTime() + 3_600_000).toISOString()
    const repository = createPrismaAuthRepository(prisma)
    const tokenService = createTokenService(randomBytes(32).toString('hex'), 15)
    const authService = createAuthService({ repository, passwordService, tokenService, logger, config: { refreshTokenTtlDays: 7 } })
    const requireAuthentication = createAuthenticationMiddleware({ repository, tokenService })
    const requireCsrf = createCsrfMiddleware(authService)
    const activityRepository = createPrismaActivityRepository(prisma)
    const activityService = createActivityService({ repository: activityRepository, classRepository: createPrismaClassRepository(prisma), logger, now: () => now })
    const testCaseService = createTestCaseService({ repository: createPrismaTestCaseRepository(prisma), activityRepository, logger, now: () => now })
    const submissionService = createSubmissionService({ repository: createPrismaSubmissionRepository(prisma), logger, now: () => now, config: { mode: 'local_process', sourceLimitBytes: 100_000, practiceRunTtlHours: 24, practiceRunsPerMinute: 20, practiceMaxActivePerActivity: 1 } })
    const activities = Router()
    activities.use(createActivityRouter({ service: activityService, requireAuthentication, requireCsrf }))
    activities.use(createTestCaseRouter({ service: testCaseService, requireAuthentication, requireCsrf }))
    const app = createApp({ config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' }, databaseHealth: createPrismaDatabaseHealth(prisma), logger, featureRouters: {
      auth: createAuthRouter({ authService, requireAuthentication, requireLogoutAuthentication: requireAuthentication, requireCsrf, cookieConfig: { secure: false, sameSite: 'lax', accessMaxAgeMs: 900_000, refreshMaxAgeMs: 604_800_000 } }),
      accountSetup: Router(), users: Router(),
      classes: createClassActivityRouter({ service: activityService, requireAuthentication, requireCsrf }),
      activities, submissions: createSubmissionRouter({ service: submissionService, requireAuthentication, requireCsrf }),
    } })
    const teacher = request.agent(app), learner = request.agent(app), other = request.agent(app)
    const teacherToken = csrf(await teacher.post('/api/v1/auth/login').send({ email: instructor.email, password }).expect(200))
    const learnerToken = csrf(await learner.post('/api/v1/auth/login').send({ email: student.email, password }).expect(200))
    const otherToken = csrf(await other.post('/api/v1/auth/login').send({ email: outsider.email, password }).expect(200))
    expect((await learner.get('/api/v1/auth/me').expect(200)).body.data.role).toBe('STUDENT')
    expect((await teacher.get('/api/v1/auth/me').expect(200)).body.data.role).toBe('INSTRUCTOR')

    let activity = (await mutation(teacher.post(`/api/v1/classes/${classRecord.id}/activities`), teacherToken).send({
      title: `Store checkout (${creditPolicy})`, instructions: 'Calculate gross purchase, discount, amount due and change; print four specified two-decimal lines.', dueDate,
      entryClassName: 'AlingNenaStore', starterCode: 'public class AlingNenaStore { public static void main(String[] args) {} }', maxAttempts: 3, totalPoints: 100, creditPolicy,
    }).expect(201)).body.data
    const activityId = activity.id as string
    await learner.get(`/api/v1/activities/${activityId}`).expect(404)
    const replacement = await mutation(teacher.put(`/api/v1/activities/${activityId}/test-cases`), teacherToken).send({ expectedUpdatedAt: activity.updatedAt, testCases: [
      { name: 'Visible checkout', inputData: 'notebook\n4\n12.50\n20\n100.00\n', expectedOutput: 'Total Purchase Amount: 50.00\nTotal Discount: 10.00\nAmount To Be Paid: 40.00\nChange: 60.00', isHidden: false, points: 40 },
      { name: 'Sensitive hidden checkout fixture', inputData: 'hidden-product\n3\n2.25\n0\n10.00\n', expectedOutput: 'Total Purchase Amount: 6.75\nTotal Discount: 0.00\nAmount To Be Paid: 6.75\nChange: 3.25', isHidden: true, points: 40 },
    ] }).expect(200)
    activity = (await mutation(teacher.post(`/api/v1/activities/${activityId}/publish`), teacherToken).send({ expectedUpdatedAt: replacement.body.data.activityUpdatedAt }).expect(200)).body.data
    const publishedAt = activity.publishedAt
    expect((await learner.get(`/api/v1/activities/${activityId}/test-cases`).expect(200)).body.data).toHaveLength(1)
    await other.get(`/api/v1/activities/${activityId}`).expect(404)
    const source = await readFile(new URL('../java/fixtures/AlingNenaStore.java', import.meta.url), 'utf8')
    if (!root) root = await mkdtemp(path.join(os.tmpdir(), 'projex-i2-workflow-'))
    const testUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL)
    // Run the production worker entry point as another process, with only test targets.
    worker = spawn(process.execPath, ['--import', 'tsx', 'src/worker.ts'], { cwd: process.cwd(), shell: false, stdio: 'ignore', env: {
      ...process.env, NODE_ENV: 'test', DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl,
      ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'), FRONTEND_ORIGIN: 'http://localhost:5173', HOST: '127.0.0.1',
      LOG_LEVEL: 'silent', MAIL_TRANSPORT: 'preview', JAVA_EXECUTION_MODE: 'local_process', JAVA_JOB_ROOT: root,
      JAVA_EXECUTABLE: 'java', JAVAC_EXECUTABLE: 'javac', JAVA_RELEASE: '17', EXECUTION_WORKER_POLL_MS: '100',
      GIT_EXECUTION_MODE: 'disabled', GIT_SMART_HTTP_ENABLED: 'false',
    } })
    let workerFailed = false
    worker.on('error', () => { workerFailed = true })
    async function waitFor(get: () => Promise<Response>, finished: (response: Response) => boolean) {
      const end = Date.now() + 30_000
      while (Date.now() < end) {
        if (workerFailed || worker?.exitCode !== null) throw new Error('Disposable test Java worker stopped unexpectedly')
        const response = await get()
        if (finished(response)) return response
        await delay(100)
      }
      throw new Error('Timed out awaiting disposable assessment; no private diagnostic emitted')
    }
    for (const [variant, expectedOutcome] of [[source, 'passed'], [source.replace('cash - due', 'cash - gross'), 'failed'], [source.replace('double gross = quantity * price;', 'double gross = quantity * price'), 'error']] as const) {
      const run = await mutation(learner.post(`/api/v1/activities/${activityId}/visible-test-runs`), learnerToken).send({ sourceCode: variant }).expect(202)
      const result = await waitFor(() => learner.get(`/api/v1/visible-test-runs/${run.body.data.id}`).expect(200), (response) => ['succeeded','failed','timeout'].includes(response.body.data.status))
      expect(result.body.data.visibleTestOutcomes[0].outcome).toBe(expectedOutcome)
      expect(result.body.data.visibleTestOutcomes).toHaveLength(1)
      expect(JSON.stringify(result.body)).not.toContain('Sensitive hidden')
      expect(result.body.data).not.toHaveProperty('finalScore')
    }
    expect((await learner.get(`/api/v1/activities/${activityId}/attempt-state`).expect(200)).body.data.countingAttemptsUsed).toBe(0)
    await mutation(other.post(`/api/v1/activities/${activityId}/submissions`), otherToken).set('Idempotency-Key',randomUUID()).send({ sourceCode: source }).expect(403)
    await mutation(learner.post(`/api/v1/activities/${activityId}/publish`), learnerToken).send({ expectedUpdatedAt: activity.updatedAt }).expect(403)
    const ids: string[] = []
    const snapshots = [source, source, source.replace('cash - due', 'cash - gross')]
    for (const variant of snapshots) {
      const key = randomUUID()
      const response = await mutation(learner.post(`/api/v1/activities/${activityId}/submissions`), learnerToken).set('Idempotency-Key',key).send({ sourceCode: variant }).expect(201)
      ids.push(response.body.data.id)
      const replay = await mutation(learner.post(`/api/v1/activities/${activityId}/submissions`), learnerToken).set('Idempotency-Key',key).send({ sourceCode: variant }).expect(200)
      expect(replay.body.data.id).toBe(response.body.data.id)
      await waitFor(() => teacher.get(`/api/v1/submissions/${response.body.data.id}`).expect(200), (item) => item.body.data.status === 'assessed')
    }
    await mutation(learner.post(`/api/v1/activities/${activityId}/submissions`), learnerToken).set('Idempotency-Key',randomUUID()).send({ sourceCode: source }).expect(409)
    // Complete accepted review after closing, then release out of attempt order.
    activity = (await mutation(teacher.post(`/api/v1/activities/${activityId}/close`),teacherToken).send({ expectedUpdatedAt: activity.updatedAt }).expect(200)).body.data
    await mutation(learner.post(`/api/v1/activities/${activityId}/visible-test-runs`),learnerToken).send({ sourceCode: source }).expect(409)
    for (const index of [1,0,2]) {
      const id = ids[index]!
      const before = (await teacher.get(`/api/v1/submissions/${id}`).expect(200)).body.data
      const reviewed = await mutation(teacher.put(`/api/v1/submissions/${id}/review`), teacherToken).send({ instructorPoints: 10, feedbackText: 'Synthetic review: arithmetic and formatting checked.', expectedUpdatedAt: before.updatedAt }).expect(200)
      const privateView = (await learner.get(`/api/v1/submissions/${id}`).expect(200)).body.data
      expect(privateView).not.toHaveProperty('finalScore')
      expect(privateView).not.toHaveProperty('feedback')
      expect(JSON.stringify(privateView)).not.toContain('Sensitive hidden')
      await mutation(teacher.post(`/api/v1/submissions/${id}/release`),teacherToken).send({ expectedUpdatedAt: reviewed.body.data.updatedAt }).expect(200)
      if (index === 0) {
        const middle = (await learner.get(`/api/v1/activities/${activityId}/attempt-state`).expect(200)).body.data
        expect(middle.creditedResult.submissionId).toBe(ids[1])
      }
      await other.get(`/api/v1/submissions/${id}`).expect(404)
    }
    const state = (await learner.get(`/api/v1/activities/${activityId}/attempt-state`).expect(200)).body.data
    expect(state).toMatchObject({ countingAttemptsUsed: 3, remainingOrdinaryAttempts: 0 })
    expect(state.creditedResult.submissionId).toBe(creditPolicy === 'LATEST' ? ids[2] : ids[1])
    expect(state.creditedResult.score).toBe(creditPolicy === 'LATEST' ? 50 : 90)
    for (const [index,id] of ids.entries()) {
      const stored = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
      expect(stored.sourceCode).toBe(snapshots[index])
      expect(stored.attemptNumber).toBe(index+1)
      const released = (await learner.get(`/api/v1/submissions/${id}`).expect(200)).body.data
      expect(released.finalScore).toBe(index === 2 ? 50 : 90)
      expect(released.feedback).toContain('Synthetic review')
      expect(JSON.stringify(released)).not.toContain('Sensitive hidden')
      expect(released).not.toHaveProperty('assessment')
      await mutation(teacher.put(`/api/v1/submissions/${id}/review`),teacherToken).send({ instructorPoints: 0, expectedUpdatedAt: released.updatedAt }).expect(409)
    }
    const stale = activity.updatedAt
    activity = (await mutation(teacher.post(`/api/v1/activities/${activityId}/reopen`),teacherToken).send({ expectedUpdatedAt: stale }).expect(200)).body.data
    expect(activity).toMatchObject({ status: 'PUBLISHED', dueDate, publishedAt, closedAt: null })
    expect((await learner.get(`/api/v1/activities/${activityId}/attempt-state`).expect(200)).body.data.countingAttemptsUsed).toBe(3)
    const conflict = await mutation(teacher.post(`/api/v1/activities/${activityId}/close`),teacherToken).send({ expectedUpdatedAt: stale }).expect(409)
    expect(conflict.body.error.code).toBe('STALE_ACTIVITY_VERSION')
    now = new Date(dueDate)
    expect((await learner.get(`/api/v1/activities/${activityId}`).expect(200)).body.data.dueState).toBe('PAST_DUE')
    await mutation(learner.post(`/api/v1/activities/${activityId}/visible-test-runs`),learnerToken).send({ sourceCode: source }).expect(409)
    expect((await learner.get(`/api/v1/activities/${activityId}/attempt-state`).expect(200)).body.data.ordinarySubmissionAllowed).toBe(false)
    await mutation(teacher.post('/api/v1/auth/logout'),teacherToken).send({}).expect(200)
    await mutation(learner.post('/api/v1/auth/logout'),learnerToken).send({}).expect(200)
    await mutation(other.post('/api/v1/auth/logout'),otherToken).send({}).expect(200)
    await stopWorker()
    expect(await readdir(root)).toEqual([])
  }, 90_000)
})
