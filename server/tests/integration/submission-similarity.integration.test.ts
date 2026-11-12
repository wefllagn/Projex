import { createHash, randomUUID } from 'node:crypto'
import type { ProgrammingActivity, User } from '@prisma/client'
import { Router } from 'express'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { ACCESS_COOKIE_NAME } from '../../src/modules/auth/auth.constants.js'
import { createAuthenticationMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionRouter } from '../../src/modules/submissions/submission.routes.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { SIMILARITY_LIMITS } from '../../src/modules/submissions/submission-similarity.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const tokenService = createTokenService('similarity-integration-test-key-123456', 15)
const starterCode = 'public class Main { public static void main(String[] args) {} }'
const solution = 'public class Main { public static void main(String[] args) { int sum = 0; for (int n = 1; n < 25; n++) { if (n % 2 == 0) sum += n * n; } System.out.println("source-private-marker: " + sum); } }'
const different = 'public class Main { public static void main(String[] args) { String word = "radar"; boolean palindrome = true; for (int i = 0; i < word.length() / 2; i++) { palindrome &= word.charAt(i) == word.charAt(word.length() - 1 - i); } System.out.println(palindrome); } }'

beforeEach(() => cleanIntegrationDatabase(prisma))
afterAll(() => prisma.$disconnect())

function appForSimilarity() {
  const requireAuthentication = createAuthenticationMiddleware({ repository: createPrismaAuthRepository(prisma), tokenService })
  const service = createSubmissionService({
    repository: createPrismaSubmissionRepository(prisma),
    logger,
    config: { mode: 'disabled', sourceLimitBytes: 100_000, practiceRunTtlHours: 24, practiceRunsPerMinute: 5, practiceMaxActivePerActivity: 1 },
  })
  return createApp({
    config: { frontendOrigin: 'http://127.0.0.1:5191', requestBodyLimit: '1mb' },
    databaseHealth: createPrismaDatabaseHealth(prisma),
    logger,
    featureRouters: {
      auth: Router(), accountSetup: Router(), users: Router(), classes: Router(), activities: Router(),
      submissions: createSubmissionRouter({
        service,
        requireAuthentication,
        requireCsrf: (_req, _res, next) => next(new Error('Unexpected mutation')),
      }),
    },
  })
}

async function cookie(user: User): Promise<string> {
  const session = await prisma.refreshSession.create({
    data: { userId: user.id, familyId: randomUUID(), tokenHash: randomUUID(), csrfTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600_000) },
  })
  const access = await tokenService.signAccessToken({ userId: user.id, role: user.role, sessionId: session.id })
  return ACCESS_COOKIE_NAME + '=' + access
}

function createActivity(classId: string, instructorId: string, title: string) {
  return prisma.programmingActivity.create({
    data: { classId, createdById: instructorId, title, instructions: 'Write a small Java program.', starterCode, dueDate: new Date(Date.now() + 60_000), status: 'PUBLISHED', publishedAt: new Date(), totalPoints: 100 },
  })
}

function submissionData(activity: ProgrammingActivity, studentId: string, attemptNumber: number, sourceCode: string) {
  return {
    activityId: activity.id, studentId, attemptNumber, sourceCode,
    sourceHash: createHash('sha256').update(sourceCode).digest('hex'),
    activityTitleSnapshot: activity.title, dueDateSnapshot: activity.dueDate, totalPointsSnapshot: 100,
    automatedMaximum: 70, instructorMaximum: 30,
  }
}

function academicState() {
  return Promise.all([
    prisma.activitySubmission.findMany({ orderBy: { id: 'asc' } }),
    prisma.submissionFeedback.findMany({ orderBy: { id: 'asc' } }),
    prisma.submissionExecution.findMany({ orderBy: { id: 'asc' } }),
    prisma.testCaseResult.findMany({ orderBy: { id: 'asc' } }),
    prisma.executionJob.findMany({ orderBy: { id: 'asc' } }),
    prisma.practiceExecution.findMany({ orderBy: { id: 'asc' } }),
    prisma.similarityResult.count(),
  ])
}

describe('instructor similarity API', () => {
  it('ranks same-activity official attempts, enforces current teaching access, and preserves academic records', async () => {
    const primary = await createActiveUser(prisma, 'INSTRUCTOR', 'Primary Instructor')
    const coInstructor = await createActiveUser(prisma, 'INSTRUCTOR', 'Co-Instructor')
    const unrelated = await createActiveUser(prisma, 'INSTRUCTOR', 'Unrelated Instructor')
    const admin = await createActiveUser(prisma, 'ADMIN')
    const referenceStudent = await createActiveUser(prisma, 'STUDENT', 'Reference Student')
    const similar = await createActiveUser(prisma, 'STUDENT', 'Similar Student')
    const distinct = await createActiveUser(prisma, 'STUDENT', 'Distinct Student')
    const practiceOnly = await createActiveUser(prisma, 'STUDENT', 'Practice Only')
    const otherOnly = await createActiveUser(prisma, 'STUDENT', 'Other Activity Only')
    const classRecord = await createActiveClass(prisma, primary.id)
    for (const student of [referenceStudent, similar, distinct, practiceOnly, otherOnly]) {
      await createActiveMembership(prisma, classRecord.id, student.id)
    }
    await prisma.classTeachingStaff.create({
      data: { classId: classRecord.id, instructorId: coInstructor.id, invitedById: primary.id, status: 'ACTIVE', acceptedAt: new Date() },
    })
    const activity = await createActivity(classRecord.id, primary.id, 'Synthetic Java activity')
    const other = await createActivity(classRecord.id, primary.id, 'Separate Java activity')
    const now = new Date()
    const reference = await prisma.activitySubmission.create({
      data: {
        ...submissionData(activity, referenceStudent.id, 1, solution),
        submissionStatus: 'RELEASED', originalAutomatedScore: 70, instructorPoints: 20,
        releasedFinalScore: 90, reviewedAt: now, releasedAt: now,
      },
    })
    const olderPeer = await prisma.activitySubmission.create({ data: submissionData(activity, similar.id, 1, different) })
    const newestPeer = await prisma.activitySubmission.create({
      data: submissionData(activity, similar.id, 2, solution.replace('int sum', '/* comment */ int   sum')),
    })
    const differentPeer = await prisma.activitySubmission.create({ data: submissionData(activity, distinct.id, 1, different) })
    await prisma.activitySubmission.createMany({
      data: [submissionData(activity, referenceStudent.id, 2, solution), submissionData(other, otherOnly.id, 1, solution)],
    })
    await prisma.practiceExecution.create({
      data: { activityId: activity.id, studentId: practiceOnly.id, sourceCode: solution, sourceHash: reference.sourceHash, entryClassName: 'Main', expiresAt: new Date(Date.now() + 60_000) },
    })
    await prisma.submissionFeedback.create({
      data: { submissionId: reference.id, instructorId: primary.id, releasedById: primary.id, releasedAt: now, feedbackText: 'Private feedback fixture' },
    })
    const hidden = await prisma.testCase.create({
      data: {
        activityId: activity.id, name: 'Hidden fixture', testCaseOrder: 1, isHidden: true,
        inputData: 'private-hidden-test', expectedOutput: 'private-hidden-expected', points: 70,
      },
    })
    const execution = await prisma.submissionExecution.create({
      data: { submissionId: reference.id, compileStatus: 'SUCCESS', runtimeStatus: 'PASSED' },
    })
    await prisma.testCaseResult.create({
      data: {
        executionId: execution.id, testCaseId: hidden.id, testNameSnapshot: hidden.name, testOrderSnapshot: 1,
        inputSnapshot: hidden.inputData, expectedOutputSnapshot: hidden.expectedOutput,
        isHiddenSnapshot: true, passStatus: 'PASSED', maximumPoints: 70, automatedPoints: 70,
      },
    })
    await prisma.executionJob.create({ data: { submissionId: reference.id, jobType: 'OFFICIAL_ASSESSMENT', status: 'SUCCEEDED' } })

    const api = request(appForSimilarity())
    const path = '/api/v1/submissions/' + reference.id + '/similarity'
    const primaryCookie = await cookie(primary)
    const coCookie = await cookie(coInstructor)
    const before = await academicState()
    await api.get(path).expect(401)
    await api.get(path).set('Cookie', await cookie(referenceStudent)).expect(403)
    await api.get(path).set('Cookie', await cookie(admin)).expect(403)
    await api.get(path).set('Cookie', await cookie(unrelated)).expect(404)

    const response = await api.get(path).set('Cookie', primaryCookie).expect(200).expect('Cache-Control', 'private, no-store')
    const data = response.body.data
    expect(data).toMatchObject({ status: 'ready', submissionId: reference.id, activityId: activity.id, candidateCount: 2, comparedCount: 2 })
    expect(data.matches.map((match: { submissionId: string }) => match.submissionId)).toEqual([newestPeer.id, differentPeer.id])
    expect(data.matches[0]).toMatchObject({ attemptNumber: 2, studentName: similar.fullName, percentage: 100 })
    expect(data.matches[1].percentage).toBeLessThan(25)
    expect(response.text).not.toMatch(/sourceCode|sourceHash|source-private-marker|private-hidden-(?:test|expected)|Private feedback fixture/)
    expect(response.text).not.toContain(olderPeer.id)

    const co = await api.get(path).set('Cookie', coCookie).expect(200)
    expect(co.body.data).toEqual(data)
    await prisma.classTeachingStaff.updateMany({ where: { classId: classRecord.id, instructorId: coInstructor.id }, data: { status: 'REMOVED', removedAt: now } })
    await api.get(path).set('Cookie', coCookie).expect(404)
    await prisma.class.update({ where: { id: classRecord.id }, data: { status: 'ARCHIVED', archivedAt: now, classCodeActive: false } })
    await api.get(path).set('Cookie', primaryCookie).expect(200)
    expect(await academicState()).toEqual(before)
  })

  it('returns no partial scores for oversized cohorts and rate-limits repeated comparisons', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const activity = await createActivity(classRecord.id, instructor.id, 'Large synthetic cohort')
    const reference = await prisma.activitySubmission.create({ data: submissionData(activity, student.id, 1, solution) })
    const peers = await prisma.user.createManyAndReturn({
      data: Array.from({ length: SIMILARITY_LIMITS.peers + 1 }, (_, index) => ({
        fullName: 'Synthetic Peer ' + index, email: 'similarity-peer-' + index + '@integration.test',
        passwordHash: 'test-fixture-hash', role: 'STUDENT', status: 'ACTIVE',
      })),
      select: { id: true },
    })
    await prisma.activitySubmission.createMany({ data: peers.map((peer) => submissionData(activity, peer.id, 1, solution)) })
    const api = request(appForSimilarity())
    const instructorCookie = await cookie(instructor)
    const path = '/api/v1/submissions/' + reference.id + '/similarity'
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await api.get(path).set('Cookie', instructorCookie).expect(200)
      expect(response.body.data).toMatchObject({ status: 'workload_limit', matches: [] })
    }
    await api.get(path).set('Cookie', instructorCookie).expect(429).expect('Cache-Control', 'private, no-store')
  })
})
