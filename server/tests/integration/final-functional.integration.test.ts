import type { ProgrammingActivity } from '@prisma/client'
import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { DEFAULT_GRADING_CONFIGURATION } from '../../src/modules/activities/weighted-grading.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createPrismaTestCaseRepository } from '../../src/modules/test-cases/test-case.repository.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'
import { createGradebookRouter, readGradebookOverview, readGradebookStudent } from '../../src/modules/gradebook/gradebook.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthenticationMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { ACCESS_COOKIE_NAME } from '../../src/modules/auth/auth.constants.js'
import { createErrorHandler } from '../../src/middleware/error-handler.js'
import { requestIdMiddleware } from '../../src/middleware/request-id.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma(), logger = pino({ level: 'silent' })
const now = new Date('2031-01-01T08:00:00Z')
const activities = () => createActivityService({ repository: createPrismaActivityRepository(prisma), classRepository: createPrismaClassRepository(prisma), logger, now: () => now })
const submissions = () => createSubmissionService({ repository: createPrismaSubmissionRepository(prisma), logger, now: () => now, config: { mode: 'local_process', sourceLimitBytes: 100000, practiceRunTtlHours: 1, practiceRunsPerMinute: 10, practiceMaxActivePerActivity: 1 } })
const definition = { title: 'Weighted Java Activity', instructions: 'Read a number and print it plus ten.', starterCode: 'public class Main {}', entryClassName: 'Main', language: 'JAVA' as const, maxAttempts: 3, creditPolicy: 'LATEST' as const, gradingMode: 'GRADED' as const, gradingPeriod: 'PRELIM' as const, gradingConfiguration: DEFAULT_GRADING_CONFIGURATION, totalPoints: 100, dueDate: new Date('2031-02-01') }
beforeEach(async () => { await cleanIntegrationDatabase(prisma) })
afterAll(async () => { await cleanIntegrationDatabase(prisma); await prisma.$disconnect() })

describe('final functional grading and Student-centered Gradebook', () => {
  it('runs real Java against weighted visible/hidden tests, snapshots awards, corrects, reviews and locks the released result', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT')
    const cls = await createActiveClass(prisma, instructor.id); await createActiveMembership(prisma, cls.id, student.id)
    const service = activities(), cases = createPrismaTestCaseRepository(prisma)
    let activity = await service.create(instructor, cls.id, definition)
    expect(activity.rubricCriteria).toMatchObject([{ name: 'Readability', maximumPoints: 15 }, { name: 'Organization', maximumPoints: 10 }, { name: 'Documentation', maximumPoints: 5 }])
    await cases.replace({ activityId: activity.id, expectedUpdatedAt: activity.updatedAt, now, testCases: ['NORMAL', 'HIGH', 'NORMAL'].map((importance, index) => ({ name: `Case ${index + 1}`, inputData: `${index + 1}\n`, expectedOutput: index === 1 ? '12' : '999', isHidden: index === 1, importance: importance as 'NORMAL' | 'HIGH' })) })
    expect((await prisma.testCase.findMany({ where: { activityId: activity.id }, orderBy: { testCaseOrder: 'asc' } })).map(row => Number(row.points))).toEqual([17.5, 35, 17.5])
    activity = await service.get(instructor, activity.id) as typeof activity
    activity = await service.publish(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt })
    await expect(service.update(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt, gradingConfiguration: DEFAULT_GRADING_CONFIGURATION })).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    const source = 'import java.util.Scanner; public class Main { public static void main(String[] a) { Scanner s=new Scanner(System.in); System.out.println(s.nextInt()+10); } }'
    const review = submissions(), created = await review.create(student, activity.id, source, 'final-weighted-official-01')
    const id = (created.submission as { id: string }).id
    const queue = createPostgresExecutionQueue(prisma), job = await queue.claimNext({ workerId: 'final-java-proof', now, leaseMs: 60000 })
    const root = await mkdtemp(path.join(os.tmpdir(), 'origin-weighted-java-'))
    try {
      const runner = createJavaRunner({ javaExecutable: process.env.JAVA_EXECUTABLE ?? 'java', javacExecutable: process.env.JAVAC_EXECUTABLE ?? 'javac', release: 17, jobRoot: root, compileTimeoutMs: 10000, testTimeoutMs: 1000, outputLimitBytes: 16384, memoryLimitMb: 64 })
      const result = await runner.execute(job!)
      expect(result.cases.map(row => row.automatedPoints)).toEqual([0, 35, 0])
      await queue.complete(job!, result, now)
    } finally { await rm(root, { recursive: true, force: true }) }
    let record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(Number(record.originalAutomatedScore)).toBe(35)
    expect(record.gradingConfigurationSnapshot).toEqual(DEFAULT_GRADING_CONFIGURATION)
    expect(record.rubricSnapshot).toEqual(activity.rubricCriteria)
    const studentBefore = await review.get(student, id)
    expect(studentBefore).not.toHaveProperty('finalScore')
    expect(studentBefore).toMatchObject({ visibleTestOutcomes: [{ name: 'Case 1' }, { name: 'Case 3' }] })
    expect(JSON.stringify(studentBefore)).not.toContain('"name":"Case 2"')
    await review.correctScore(instructor, id, { newEffectiveScore: 40, reason: 'Verified the saved source and corrected evidence.', expectedUpdatedAt: record.updatedAt })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    const criteria = activity.rubricCriteria as Array<{ id: string }>
    const rubricScores = criteria.map((criterion, index) => ({ criterionId: criterion.id, points: [12, 9, 5][index]! }))
    await review.review(instructor, id, { rubricScores, feedbackText: 'Reviewed using the three manual criteria.', expectedUpdatedAt: record.updatedAt })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(Number(record.instructorPoints)).toBe(26)
    await review.release(instructor, id, { expectedUpdatedAt: record.updatedAt })
    expect(await review.get(student, id)).toMatchObject({ finalScore: 66, totalPoints: 100 })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    await expect(review.correctScore(instructor, id, { newEffectiveScore: 50, reason: 'Must not change a released grade.', expectedUpdatedAt: record.updatedAt })).rejects.toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' })
    await expect(review.review(instructor, id, { rubricScores, expectedUpdatedAt: record.updatedAt })).rejects.toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' })
    expect((await readGradebookOverview(prisma, student, cls.id, now)).rows[0]!.periods[0]).toMatchObject({ earned: 66, possible: 100, percentage: 66, releasedCount: 1, activityCount: 1, provisional: false })
  })

  it('recalculates weighted drafts atomically and keeps legacy drafts and stale saves unchanged', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), cls = await createActiveClass(prisma, instructor.id), service = activities(), cases = createPrismaTestCaseRepository(prisma)
    let activity = await service.create(instructor, cls.id, definition)
    await cases.replace({ activityId: activity.id, expectedUpdatedAt: activity.updatedAt, now, testCases: [1, 2, 3].map(value => ({ name: `Case ${value}`, expectedOutput: '1', inputData: null, isHidden: false, importance: 'NORMAL' })) })
    const stale = activity.updatedAt
    activity = await service.get(instructor, activity.id) as typeof activity
    activity = await service.update(instructor, activity.id, { totalPoints: 50, gradingConfiguration: { version: 1, percentages: { correctness: 80, readability: 10, organization: 10, documentation: 0 } }, expectedUpdatedAt: activity.updatedAt })
    expect(activity.rubricCriteria).toMatchObject([{ name: 'Readability', maximumPoints: 5 }, { name: 'Organization', maximumPoints: 5 }])
    expect((await prisma.testCase.findMany({ where: { activityId: activity.id }, orderBy: { testCaseOrder: 'asc' } })).map(row => Number(row.points))).toEqual([13.34, 13.33, 13.33])
    await expect(service.update(instructor, activity.id, { totalPoints: 200, expectedUpdatedAt: stale })).rejects.toMatchObject({ code: 'STALE_ACTIVITY_VERSION' })
    expect(Number((await prisma.testCase.aggregate({ where: { activityId: activity.id }, _sum: { points: true } }))._sum.points)).toBe(40)
    activity = await service.update(instructor, activity.id, { gradingMode: 'COMPLETION', totalPoints: null, expectedUpdatedAt: activity.updatedAt })
    expect(activity.rubricCriteria).toBeNull()
    expect((await prisma.testCase.findMany({ where: { activityId: activity.id } })).every(row => row.points === null)).toBe(true)
    activity = await service.update(instructor, activity.id, { gradingMode: 'GRADED', totalPoints: 50, expectedUpdatedAt: activity.updatedAt })
    expect(activity.rubricCriteria).toMatchObject([{ maximumPoints: 5 }, { maximumPoints: 5 }])
    const legacy = await service.create(instructor, cls.id, { ...definition, gradingConfiguration: undefined })
    expect(legacy.gradingConfiguration).toBeNull()
    await expect(service.update(instructor, legacy.id, { gradingConfiguration: DEFAULT_GRADING_CONFIGURATION, expectedUpdatedAt: legacy.updatedAt })).rejects.toMatchObject({ code: 'GRADING_MODEL_IMMUTABLE' })
  })

  it('releases fractional Correctness plus manual points without floating-point overflow', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT'), cls = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, cls.id, student.id)
    const service = activities()
    let activity = await service.create(instructor, cls.id, { ...definition, totalPoints: 0.3, gradingConfiguration: { version: 1, percentages: { correctness: 33.33, readability: 33.33, organization: 16.67, documentation: 16.67 } } })
    await createPrismaTestCaseRepository(prisma).replace({ activityId: activity.id, expectedUpdatedAt: activity.updatedAt, now, testCases: [{ name: 'One', inputData: null, expectedOutput: '1', isHidden: false, importance: 'NORMAL' }] })
    activity = await service.get(instructor, activity.id) as typeof activity
    activity = await service.publish(instructor, activity.id, { expectedUpdatedAt: activity.updatedAt })
    const review = submissions(), created = await review.create(student, activity.id, 'class Main {}', 'fractional-weighted-release')
    const id = (created.submission as { id: string }).id
    const queue = createPostgresExecutionQueue(prisma), job = await queue.claimNext({ workerId: 'decimal-proof', now, leaseMs: 60000 })
    await queue.complete(job!, { compileStatus: 'SUCCESS', runtimeStatus: 'PASSED', compilerOutput: null, cases: job!.cases.map(row => ({ id: row.id, status: 'PASSED', actualOutput: '1', errorMessage: null, executionTimeMs: 1, automatedPoints: row.maximumPoints! })) }, now)
    let record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(Number(record.originalAutomatedScore)).toBe(0.1)
    const criteria = activity.rubricCriteria as Array<{ id: string; maximumPoints: number }>
    await review.review(instructor, id, { rubricScores: criteria.map(row => ({ criterionId: row.id, points: row.maximumPoints })), expectedUpdatedAt: record.updatedAt })
    record = await prisma.activitySubmission.findUniqueOrThrow({ where: { id } })
    expect(Number(record.instructorPoints)).toBe(0.2)
    await review.release(instructor, id, { expectedUpdatedAt: record.updatedAt })
    expect(await review.get(student, id)).toMatchObject({ finalScore: 0.3, totalPoints: 0.3 })
  })

  it('summarizes a 48-Student, 15-Activity Class with exact points, provisional coverage, attempt policies and private drill-down', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), outsider = await createActiveUser(prisma, 'INSTRUCTOR'), cls = await createActiveClass(prisma, instructor.id)
    const students = await Promise.all(Array.from({ length: 48 }, (_, index) => createActiveUser(prisma, 'STUDENT', `Student ${String(index + 1).padStart(2, '0')}`)))
    await prisma.classMember.createMany({ data: students.map(student => ({ classId: cls.id, studentId: student.id, status: 'ACTIVE' as const })) })
    const records: ProgrammingActivity[] = []
    for (const period of ['PRELIM', 'MIDTERM', 'FINAL']) for (let index = 0; index < 5; index++) records.push(await prisma.programmingActivity.create({ data: { classId: cls.id, createdById: instructor.id, title: `${period} ${index + 1}`, gradingPeriod: period, totalPoints: period === 'PRELIM' && index === 1 ? 50 : 100, creditPolicy: index === 0 ? 'HIGHEST' : 'LATEST', status: 'PUBLISHED', publishedAt: now, dueDate: new Date(index === 2 ? '2030-12-01' : '2031-02-01'), instructions: 'Gradebook fixture.', starterCode: 'class Main {}' } }))
    const makeSubmission = (studentId: string, activity: typeof records[number], status: 'RELEASED' | 'REVIEWED' | 'QUEUED' | 'ASSESSED' | 'ASSESSMENT_FAILED' | 'FAILED_RESOLVED', score: number | null = null, attemptNumber = 1) => ({ studentId, activityId: activity.id, attemptNumber, sourceCode: 'class Main {}', sourceHash: createHash('sha256').update(randomUUID()).digest('hex'), activityTitleSnapshot: activity.title, dueDateSnapshot: activity.dueDate, totalPointsSnapshot: activity.totalPoints, automatedMaximum: activity.totalPoints, instructorMaximum: 0, originalAutomatedScore: score ?? 0, submissionStatus: status, releasedFinalScore: score, ...(status === 'RELEASED' ? { releasedAt: now, reviewedAt: now } : status === 'REVIEWED' ? { reviewedAt: now } : {}) })
    await prisma.activitySubmission.createMany({ data: students.flatMap((student, index) => [makeSubmission(student.id, records[0]!, 'RELEASED', 90), makeSubmission(student.id, records[1]!, 'RELEASED', 45), ...records.slice(10).map(activity => makeSubmission(student.id, activity, 'RELEASED', index === 0 ? 0 : 80))]) })
    await prisma.activitySubmission.createMany({ data: [makeSubmission(students[0]!.id, records[0]!, 'REVIEWED', null, 2), makeSubmission(students[0]!.id, records[0]!, 'RELEASED', 80, 3), makeSubmission(students[0]!.id, records[3]!, 'QUEUED'), makeSubmission(students[0]!.id, records[4]!, 'REVIEWED'), makeSubmission(students[0]!.id, records[5]!, 'ASSESSMENT_FAILED'), makeSubmission(students[0]!.id, records[6]!, 'ASSESSED'), makeSubmission(students[0]!.id, records[7]!, 'REVIEWED'), makeSubmission(students[0]!.id, records[8]!, 'FAILED_RESOLVED')] })
    const overview = await readGradebookOverview(prisma, instructor, cls.id, now)
    expect(overview.rows).toHaveLength(48)
    expect(overview.rows[0]!.periods[0]).toMatchObject({ earned: 135, possible: 150, percentage: 90, releasedCount: 2, activityCount: 5, provisional: true, outstandingAttemptCount: 1 })
    expect(overview.rows[0]!.periods[2]).toMatchObject({ earned: 0, possible: 500, percentage: 0, releasedCount: 5, activityCount: 5, provisional: false })
    const detail = await readGradebookStudent(prisma, instructor, cls.id, students[0]!.id, now)
    expect(detail.periods[0]!.activities.find(row => row.activityId === records[0]!.id)).toMatchObject({ earned: 90, attemptNumber: 1, hasUnreleasedAttempt: true, outstandingAttemptStatus: 'REVIEWED_UNRELEASED' })
    expect(detail.periods[0]!.activities.map(row => row.status)).toEqual(expect.arrayContaining(['MISSING', 'RELEASED', 'PENDING', 'REVIEWED_UNRELEASED']))
    expect(detail.periods[1]!.activities.map(row => row.status)).toEqual(expect.arrayContaining(['FAILED_ASSESSMENT', 'AWAITING_REVIEW', 'REVIEWED_UNRELEASED', 'FAILURE_RESOLVED', 'NOT_SUBMITTED']))
    expect((await readGradebookOverview(prisma, students[0]!, cls.id, now)).rows).toHaveLength(1)
    await expect(readGradebookStudent(prisma, students[0]!, cls.id, students[1]!.id, now)).rejects.toMatchObject({ statusCode: 404 })
    await expect(readGradebookOverview(prisma, outsider, cls.id, now)).rejects.toMatchObject({ statusCode: 404 })
    const tokenService = createTokenService('final-functional-auth-secret-'.repeat(3), 15)
    const session = await prisma.refreshSession.create({ data: { userId: students[0]!.id, familyId: randomUUID(), tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(now.getTime() + 86400000), createdAt: now } })
    const cookie = `${ACCESS_COOKIE_NAME}=${await tokenService.signAccessToken({ userId: students[0]!.id, role: 'STUDENT', sessionId: session.id })}`
    const app = express(); app.use(cookieParser()); app.use(requestIdMiddleware); app.use(createGradebookRouter({ prisma, requireAuthentication: createAuthenticationMiddleware({ repository: createPrismaAuthRepository(prisma), tokenService, now: () => now }) })); app.use(createErrorHandler(logger))
    const response = await request(app).get(`/classes/${cls.id}/gradebook/overview`).set('Cookie', cookie).expect(200)
    expect(JSON.stringify(response.body)).not.toContain(students[1]!.id)
    await request(app).get(`/classes/${cls.id}/gradebook/students/${students[1]!.id}`).set('Cookie', cookie).expect(404)
    await request(app).get(`/classes/${cls.id}/gradebook/overview?studentId=${students[1]!.id}`).set('Cookie', cookie).expect(400)
    await request(app).get(`/classes/${cls.id}/gradebook/overview`).expect(401)
  })
})
