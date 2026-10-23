import { randomUUID, createHash } from 'node:crypto'
import express from 'express'
import cookieParser from 'cookie-parser'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createPrismaTestCaseRepository } from '../../src/modules/test-cases/test-case.repository.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createPasswordRecoveryService, createPasswordRecoveryRouter } from '../../src/modules/password-recovery/password-recovery.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAccountSetupRepository } from '../../src/modules/account-setup/account-setup.repository.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createAuthenticationMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { ACCESS_COOKIE_NAME } from '../../src/modules/auth/auth.constants.js'
import { createErrorHandler } from '../../src/middleware/error-handler.js'
import { requestIdMiddleware } from '../../src/middleware/request-id.js'
import { readGradebook, createGradebookRouter } from '../../src/modules/gradebook/gradebook.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma(), logger = pino({ level: 'silent' })
let now = new Date('2031-01-01T08:00:00Z')
const criteria = [{ id: randomUUID(), name: 'Readability', maximumPoints: 10 }, { id: randomUUID(), name: 'Organization', maximumPoints: 20 }]
const tokens = createTokenService('rc-test-secret-'.repeat(5), 15), passwords = createPasswordService()
const submissionService = () => createSubmissionService({ repository: createPrismaSubmissionRepository(prisma), logger, now: () => now, config: { mode: 'local_process', sourceLimitBytes: 100000, practiceRunTtlHours: 1, practiceRunsPerMinute: 10, practiceMaxActivePerActivity: 1 } })
const auth = () => createAuthenticationMiddleware({ repository: createPrismaAuthRepository(prisma), tokenService: tokens, now: () => now })
async function cookie(user: { id: string; role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' }) {
  const session = await prisma.refreshSession.create({ data: { userId: user.id, familyId: randomUUID(), tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(now.getTime() + 86400000), createdAt: now } })
  return `${ACCESS_COOKIE_NAME}=${await tokens.signAccessToken({ userId: user.id, role: user.role, sessionId: session.id })}`
}
function recoveryDependencies() { return { prisma, tokenService: tokens, passwordService: passwords, logger, frontendOrigin: 'http://rc.localhost:5204', now: () => now } }
function raw(link: string) { return new URLSearchParams(new URL(link).hash.slice(1)).get('token')! }
beforeEach(async () => { await cleanIntegrationDatabase(prisma); now = new Date('2031-01-01T08:00:00Z') })
afterAll(async () => { await cleanIntegrationDatabase(prisma); await prisma.$disconnect() })

describe('Origin functional release contracts', () => {
  it('rejects an old-password login already being verified when recovery resets the account', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN'), student = await createActiveUser(prisma, 'STUDENT')
    await prisma.user.update({ where: { id: student.id }, data: { passwordHash: await passwords.hash('OldPassword1!') } })
    const recovery = createPasswordRecoveryService(recoveryDependencies()), issued = await recovery.issue(admin, student.id, randomUUID())
    const repository = createPrismaAuthRepository(prisma)
    const delayedPasswords = { ...passwords, verify: async (hash: string, password: string) => {
      const valid = await passwords.verify(hash, password)
      await recovery.complete(raw(issued.setupLink), 'NewPassword1!')
      return valid
    } }
    const dependencies = { repository, passwordService: delayedPasswords, tokenService: tokens, logger, config: { refreshTokenTtlDays: 7 }, now: () => now }
    await expect(createAuthService(dependencies).login(student.email, 'OldPassword1!', {})).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(await prisma.refreshSession.count({ where: { userId: student.id, revokedAt: null } })).toBe(0)
    await expect(createAuthService({ ...dependencies, passwordService: passwords }).login(student.email, 'NewPassword1!', {})).resolves.toMatchObject({ profile: { id: student.id } })
  })

  it('clears numeric rubric configuration when a draft becomes completion-based and preserves feedback-only release', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT')
    const cls = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, cls.id, student.id)
    const activities = createActivityService({ repository: createPrismaActivityRepository(prisma), classRepository: createPrismaClassRepository(prisma), logger, now: () => now })
    let activity = await activities.create(instructor, cls.id, { title: 'Changed to completion', instructions: 'Complete the exercise.', starterCode: 'class Main {}', entryClassName: 'Main', language: 'JAVA', maxAttempts: 1, creditPolicy: 'LATEST', gradingMode: 'GRADED', gradingPeriod: 'PRELIM', rubricCriteria: criteria, totalPoints: 100, dueDate: new Date('2031-02-01') })
    activity = await activities.update(instructor, activity.id, { gradingMode: 'COMPLETION', totalPoints: null, expectedUpdatedAt: activity.updatedAt })
    expect(activity.rubricCriteria).toBeNull()
    const tests = await createPrismaTestCaseRepository(prisma).replace({ activityId: activity.id, expectedUpdatedAt: activity.updatedAt, now, testCases: [{ name: 'Visible', inputData: null, expectedOutput: '', isHidden: false, points: null }] })
    expect(tests.kind).toBe('updated')
    activity = await activities.get(instructor, activity.id) as typeof activity
    activity = await activities.publish(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt })
    const service = submissionService(), created = await service.create(student, activity.id, 'class Main {}', 'rc-completion-switch-one')
    const id = (created.submission as { id: string }).id
    let record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(record.rubricSnapshot).toBeNull()
    const queue = createPostgresExecutionQueue(prisma), job = await queue.claimNext({ workerId: 'rc-completion', now, leaseMs: 60000 })
    await queue.complete(job!, { compileStatus: 'SUCCESS', runtimeStatus: 'PASSED', compilerOutput: null, cases: [{ id: job!.cases[0]!.id, status: 'PASSED', actualOutput: '', errorMessage: null, executionTimeMs: 1, automatedPoints: 0 }] }, now)
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    await service.review(instructor, id, { feedbackText: 'Completed and reviewed.', expectedUpdatedAt: record.updatedAt })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    await service.release(instructor, id, { expectedUpdatedAt: record.updatedAt })
    expect(await service.get(student, id)).toMatchObject({ gradingMode: 'COMPLETION', feedback: 'Completed and reviewed.' })
    expect((await readGradebook(prisma, student, cls.id, 'PRELIM', now)).rows[0]).toMatchObject({ earned: 0, possible: 0, percentage: null, scores: [{ status: 'UNGRADED' }] })
  })

  it('validates rubric allocation, freezes rules, snapshots criteria, persists corrections and individual review scores, then locks release', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT')
    const cls = await createActiveClass(prisma, instructor.id); await createActiveMembership(prisma, cls.id, student.id)
    const activities = createActivityService({ repository: createPrismaActivityRepository(prisma), classRepository: createPrismaClassRepository(prisma), logger, now: () => now })
    let activity = await activities.create(instructor, cls.id, { title: 'Rubric Activity', instructions: 'Print 1', starterCode: 'public class Main {}', entryClassName: 'Main', language: 'JAVA', maxAttempts: 3, creditPolicy: 'LATEST', gradingMode: 'GRADED', gradingPeriod: 'PRELIM', rubricCriteria: [], totalPoints: 100, dueDate: new Date('2031-02-01') })
    const tests = await createPrismaTestCaseRepository(prisma).replace({ activityId: activity.id, expectedUpdatedAt: activity.updatedAt, now, testCases: [{ name: 'Visible', inputData: null, expectedOutput: '1', isHidden: false, points: 70 }] })
    expect(tests.kind).toBe('updated')
    activity = await activities.get(instructor, activity.id) as typeof activity
    await expect(activities.publish(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt })).rejects.toMatchObject({ code: 'ACTIVITY_NOT_PUBLISHABLE' })
    activity = await activities.update(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt, rubricCriteria: criteria })
    activity = await activities.publish(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt })
    await expect(activities.update(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt, rubricCriteria: [] })).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    const service = submissionService(), source = 'public class Main { public static void main(String[] args) { System.out.println(1); } }'
    const created = await service.create(student, activity.id, source, 'rc-rubric-submission-one')
    const id = (created.submission as { id: string }).id, queue = createPostgresExecutionQueue(prisma)
    const job = await queue.claimNext({ workerId: 'rc-review', now, leaseMs: 60000 })
    expect(job?.submissionId).toBe(id)
    await queue.complete(job!, { compileStatus: 'SUCCESS', runtimeStatus: 'PASSED', compilerOutput: null, cases: [{ id: job!.cases[0]!.id, status: 'PASSED', actualOutput: '1', errorMessage: null, executionTimeMs: 1, automatedPoints: 70 }] }, now)
    let record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(record.rubricSnapshot).toEqual(criteria)
    expect(Number(record.automatedMaximum)).toBe(70); expect(Number(record.instructorMaximum)).toBe(30)
    await expect(service.correctScore(instructor, id, { newEffectiveScore: 71, reason: 'Exceeds maximum deliberately.', expectedUpdatedAt: record.updatedAt })).rejects.toMatchObject({ code: 'SCORE_OUT_OF_BOUNDS' })
    await service.correctScore(instructor, id, { newEffectiveScore: 65, reason: 'Verified source and original evidence.', expectedUpdatedAt: record.updatedAt })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    const version = record.updatedAt
    await expect(service.review(instructor, id, { rubricScores: [{ criterionId: criteria[0]!.id, points: 11 }, { criterionId: criteria[1]!.id, points: 18 }], expectedUpdatedAt: version })).rejects.toMatchObject({ code: 'SCORE_OUT_OF_BOUNDS' })
    await service.review(instructor, id, { rubricScores: [{ criterionId: criteria[0]!.id, points: 8 }, { criterionId: criteria[1]!.id, points: 18 }], feedbackText: 'Reviewed each criterion.', expectedUpdatedAt: version })
    expect(await service.get(instructor, id)).toMatchObject({ scores: { originalAutomatedScore: 70, effectiveAutomatedScore: 65, instructorPoints: 26, finalScore: null }, corrections: [{ newEffectiveScore: 65 }], rubricScores: [{ criterionId: criteria[0]!.id, points: 8 }, { criterionId: criteria[1]!.id, points: 18 }] })
    await expect(service.review(instructor, id, { instructorPoints: 0, expectedUpdatedAt: version })).rejects.toMatchObject({ code: 'STALE_SUBMISSION_VERSION' })
    expect(await service.get(student, id)).not.toHaveProperty('scores')
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    const concurrentReviews = await Promise.allSettled([1, 2].map(() => service.review(instructor, id, { rubricScores: [{ criterionId: criteria[0]!.id, points: 8 }, { criterionId: criteria[1]!.id, points: 18 }], expectedUpdatedAt: record.updatedAt })))
    expect(concurrentReviews.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(concurrentReviews.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'STALE_SUBMISSION_VERSION' } })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    await service.release(instructor, id, { expectedUpdatedAt: record.updatedAt })
    expect(await service.get(student, id)).toMatchObject({ finalScore: 91, totalPoints: 100, feedback: 'Reviewed each criterion.' })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    await expect(service.correctScore(instructor, id, { newEffectiveScore: 60, reason: 'No post-release edits allowed.', expectedUpdatedAt: record.updatedAt })).rejects.toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' })
    await expect(service.review(instructor, id, { rubricScores: [], expectedUpdatedAt: record.updatedAt })).rejects.toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' })
    expect((await readGradebook(prisma, student, cls.id, 'PRELIM', now)).rows[0]).toMatchObject({ earned: 91, possible: 100, percentage: 91 })
  })

  it('aggregates only credited released results, preserves pending/missing/ungraded/unassigned, and excludes other Students server-side', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT', 'Own Student'), other = await createActiveUser(prisma, 'STUDENT', 'Private Other Student'), outsider = await createActiveUser(prisma, 'STUDENT')
    const cls = await createActiveClass(prisma, instructor.id); await createActiveMembership(prisma, cls.id, student.id); await createActiveMembership(prisma, cls.id, other.id)
    async function activity(title: string, totalPoints: number | null = 100, gradingPeriod: string | null = 'PRELIM', policy: 'LATEST' | 'HIGHEST' = 'LATEST') { return prisma.programmingActivity.create({ data: { classId: cls.id, createdById: instructor.id, title, instructions: 'Legacy compatible', starterCode: 'class Main {}', dueDate: new Date('2030-01-01'), maxAttempts: 3, totalPoints, gradingMode: totalPoints === null ? 'COMPLETION' : 'GRADED', gradingPeriod, creditPolicy: policy, publishedAt: now, status: 'PUBLISHED' } }) }
    async function attempt(activityId: string, total: number, value: number, number: number, status: 'RELEASED' | 'REVIEWED' = 'RELEASED') { return prisma.activitySubmission.create({ data: { activityId, studentId: student.id, attemptNumber: number, sourceCode: 'class Main {}', sourceHash: createHash('sha256').update(activityId+number).digest('hex'), activityTitleSnapshot: 'Saved', dueDateSnapshot: now, totalPointsSnapshot: total, automatedMaximum: total, instructorMaximum: 0, instructorPoints: 0, originalAutomatedScore: value, submissionStatus: status, ...(status === 'RELEASED' ? { releasedFinalScore: value, releasedAt: now, reviewedAt: now } : {}) } }) }
    const a = await activity('First', 100, 'PRELIM', 'HIGHEST'), b = await activity('Second', 50), pending = await activity('Unreleased'), missing = await activity('Missing'), ungraded = await activity('Practice', null), legacy = await activity('Legacy', 100, null)
    await attempt(a.id,100,90,1); await attempt(a.id,100,80,2); await attempt(a.id,100,99,3,'REVIEWED'); await attempt(b.id,50,45,1); await attempt(pending.id,100,99,1,'REVIEWED')
    const own = await readGradebook(prisma, student, cls.id, 'PRELIM', now)
    expect(own.rows).toHaveLength(1); expect(own.rows[0]).toMatchObject({ studentId: student.id, earned: 135, possible: 150, percentage: 90 })
    expect(own.rows[0]!.scores.find(row => row.activityId === a.id)).toMatchObject({ earned: 90, hasUnreleasedAttempt: true })
    expect(own.rows[0]!.scores.find(row => row.activityId === pending.id)?.status).toBe('UNRELEASED')
    expect(own.rows[0]!.scores.find(row => row.activityId === missing.id)?.status).toBe('MISSING')
    expect(own.rows[0]!.scores.find(row => row.activityId === ungraded.id)?.status).toBe('UNGRADED')
    expect(JSON.stringify(own)).not.toContain(other.id); expect(JSON.stringify(own)).not.toContain('Private Other Student'); expect(JSON.stringify(own)).not.toContain('originalAutomatedScore')
    expect((await readGradebook(prisma, instructor, cls.id, 'PRELIM', now)).rows).toHaveLength(2)
    expect((await readGradebook(prisma, student, cls.id, 'UNASSIGNED', now)).activities.map(row => row.id)).toEqual([legacy.id])
    await expect(readGradebook(prisma, outsider, cls.id, 'PRELIM', now)).rejects.toMatchObject({ statusCode: 404 })
    const app = express(); app.use(cookieParser()); app.use(requestIdMiddleware); app.use(createGradebookRouter({ prisma, requireAuthentication: auth() })); app.use(createErrorHandler(logger))
    const selfCookie = await cookie(student)
    const response = await request(app).get(`/classes/${cls.id}/gradebook?period=PRELIM`).set('Cookie', selfCookie).expect(200)
    expect(response.body.data.rows).toHaveLength(1)
    await request(app).get(`/classes/${cls.id}/gradebook?period=PRELIM&studentId=${other.id}`).set('Cookie', selfCookie).expect(400)
    await request(app).get(`/classes/${cls.id}/gradebook`).expect(401)
  })

  it('issues Admin-only private recovery links, expires/replaces/consumes them, and invalidates authenticated sessions', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN'), instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT')
    const app = express(); app.use(cookieParser()); app.use(express.json()); app.use(requestIdMiddleware)
    app.use(createPasswordRecoveryRouter({ ...recoveryDependencies(), requireAuthentication: auth(), requireCsrf: (req, res, next) => { if (req.header('X-CSRF-Token') !== 'rc-csrf') res.status(403).json({ error: 'denied' }); else next() } }))
    app.get('/me', auth(), (req,res) => res.json({ userId: req.auth!.user.id })); app.use(createErrorHandler(logger))
    const adminCookie = await cookie(admin), studentCookie = await cookie(student), instructorCookie = await cookie(instructor)
    await request(app).post(`/users/${student.id}/password-recovery`).set('Cookie', studentCookie).set('X-CSRF-Token','rc-csrf').send({}).expect(403)
    await request(app).post(`/users/${student.id}/password-recovery`).set('Cookie', instructorCookie).set('X-CSRF-Token','rc-csrf').send({}).expect(403)
    await request(app).post(`/users/${student.id}/password-recovery`).set('Cookie', adminCookie).send({}).expect(403)
    const issued = await request(app).post(`/users/${student.id}/password-recovery`).set('Cookie',adminCookie).set('X-CSRF-Token','rc-csrf').send({}).expect(201)
    expect(issued.headers['cache-control']).toBe('no-store')
    const service = createPasswordRecoveryService(recoveryDependencies()), token1 = raw(issued.body.data.setupLink)
    const cls = await createActiveClass(prisma, instructor.id)
    const membership = await createActiveMembership(prisma, cls.id, student.id)
    const pending = await createActiveUser(prisma, 'STUDENT')
    await prisma.user.update({ where: { id: pending.id }, data: { status: 'SETUP_PENDING' } })
    await expect(service.issue(admin, pending.id, randomUUID())).rejects.toMatchObject({ code: 'RECOVERY_NOT_AVAILABLE' })
    const setupToken = tokens.createOpaqueToken()
    await prisma.accountSetupToken.create({ data: { userId: pending.id, tokenHash: tokens.hashOpaqueToken(setupToken), expiresAt: new Date(now.getTime() + 3600000) } })
    await expect(service.complete(setupToken, 'NewPassword1!')).rejects.toMatchObject({ code: 'RECOVERY_TOKEN_INVALID' })
    expect(await createPrismaAccountSetupRepository(prisma).completeSetup({ tokenHash: tokens.hashOpaqueToken(token1), passwordHash: 'unused', completedAt: now })).toBeNull()
    const newer = await service.issue(admin, student.id, randomUUID()), token2 = raw(newer.setupLink)
    await expect(service.complete(token1, 'NewPassword1!')).rejects.toMatchObject({ code: 'RECOVERY_TOKEN_INVALID' })
    await request(app).get('/me').set('Cookie',studentCookie).expect(200)
    await request(app).post('/password-recovery/complete').send({ setupToken: token2, password: 'NewPassword1!', confirmPassword: 'NewPassword1!' }).expect(200)
    await request(app).get('/me').set('Cookie',studentCookie).expect(401)
    await request(app).post('/password-recovery/complete').send({ setupToken: token2, password: 'NewPassword1!', confirmPassword: 'NewPassword1!' }).expect(400)
    expect(await prisma.classMember.findUnique({ where: { id: membership.id } })).toMatchObject({ studentId: student.id, classId: cls.id, status: 'ACTIVE' })
    const user = await prisma.user.findUniqueOrThrow({ where: { id: student.id } })
    expect(await passwords.verify(user.passwordHash!, 'NewPassword1!')).toBe(true); expect(user.fullName).toBe(student.fullName); expect(user.status).toBe('ACTIVE'); expect(user.role).toBe('STUDENT')
    const audit = await prisma.adminAuditEvent.findMany({ where: { action: 'USER_PASSWORD_RECOVERY_ISSUED' } })
    expect(audit).toHaveLength(2); expect(JSON.stringify(audit)).not.toContain(token1); expect(JSON.stringify(audit)).not.toContain(token2)
    await expect(service.issue(admin, admin.id, randomUUID())).rejects.toMatchObject({ code: 'RECOVERY_NOT_AVAILABLE' })
    const expires = await service.issue(admin, instructor.id, randomUUID()); now = new Date(now.getTime()+3600001)
    await expect(service.complete(raw(expires.setupLink), 'NewPassword1!')).rejects.toMatchObject({ code: 'RECOVERY_TOKEN_INVALID' })
    const concurrent = await service.issue(admin, instructor.id, randomUUID())
    const outcomes = await Promise.allSettled([service.complete(raw(concurrent.setupLink), 'NewPassword1!'),service.complete(raw(concurrent.setupLink), 'NewPassword2!')])
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1)
  })
})
