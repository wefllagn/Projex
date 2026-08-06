import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassService } from '../../src/modules/classes/class.service.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
let currentNow = new Date('2031-01-10T08:00:00.000Z')

function service(mode: 'disabled' | 'local_process' = 'local_process') {
  return createSubmissionService({
    repository: createPrismaSubmissionRepository(prisma),
    logger,
    config: {
      mode,
      sourceLimitBytes: 100_000,
      practiceRunTtlHours: 24,
      practiceRunsPerMinute: 5,
      practiceMaxActivePerActivity: 1,
    },
    now: () => currentNow,
  })
}

async function publishedActivity(input: {
  instructorId: string
  classId: string
  maxAttempts?: number
  dueDate?: Date
}) {
  return prisma.programmingActivity.create({
    data: {
      classId: input.classId,
      createdById: input.instructorId,
      title: 'Phase 6 Java Activity',
      instructions: 'Read one integer and print its doubled value.',
      dueDate: input.dueDate ?? new Date('2031-02-01T00:00:00.000Z'),
      entryClassName: 'Main',
      starterCode: 'public class Main { public static void main(String[] args) {} }',
      maxAttempts: input.maxAttempts ?? 2,
      totalPoints: 100,
      status: 'PUBLISHED',
      publishedAt: currentNow,
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
    include: { testCases: { orderBy: { testCaseOrder: 'asc' } } },
  })
}

const source =
  'public class Main { public static void main(String[] args) { java.util.Scanner s = new java.util.Scanner(System.in); System.out.println(s.nextInt() * 2); } }'

beforeEach(async () => {
  currentNow = new Date('2031-01-10T08:00:00.000Z')
  await cleanIntegrationDatabase(prisma)
})
afterAll(async () => prisma.$disconnect())

describe('Phase 6 PostgreSQL submissions and assessment', () => {
  it('scopes idempotency by student and activity without consuming duplicate attempts', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const firstStudent = await createActiveUser(prisma, 'STUDENT')
    const secondStudent = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const firstMembership = await createActiveMembership(
      prisma,
      classRecord.id,
      firstStudent.id,
    )
    await createActiveMembership(prisma, classRecord.id, secondStudent.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
    })
    const submissions = service()
    const key = 'submission-request-0001'

    const first = await submissions.create(firstStudent, activity.id, source, key)
    const replay = await submissions.create(firstStudent, activity.id, source, key)
    expect(first.idempotentReplay).toBe(false)
    expect(replay).toMatchObject({
      idempotentReplay: true,
      submission: { id: (first.submission as { id: string }).id },
    })
    await expect(
      submissions.create(firstStudent, activity.id, `${source}\n// changed`, key),
    ).rejects.toMatchObject({ code: 'DUPLICATE_SUBMISSION_REQUEST' })

    await expect(
      submissions.create(secondStudent, activity.id, source, key),
    ).resolves.toMatchObject({ idempotentReplay: false })
    expect(await prisma.activitySubmission.count()).toBe(2)
    expect(await prisma.submissionIdempotency.count()).toBe(2)

    await prisma.classMember.update({
      where: { id: firstMembership.id },
      data: { status: 'REMOVED', removedAt: currentNow },
    })
    await expect(
      submissions.create(firstStudent, activity.id, source, key),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('serializes attempt allocation and atomically consumes one replacement grant', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
      maxAttempts: 1,
    })
    const submissions = service()
    const first = await submissions.create(
      student,
      activity.id,
      source,
      'submission-request-first',
    )
    const firstId = (first.submission as { id: string }).id
    await expect(
      submissions.create(
        student,
        activity.id,
        source,
        'submission-request-blocked',
      ),
    ).rejects.toMatchObject({ code: 'ATTEMPT_LIMIT_REACHED' })

    await prisma.$transaction([
      prisma.executionJob.update({
        where: { submissionId: firstId },
        data: { status: 'FAILED', completedAt: currentNow, lastFailureCode: 'JAVA_RUNTIME_UNAVAILABLE' },
      }),
      prisma.submissionExecution.update({
        where: { submissionId: firstId },
        data: {
          compileStatus: 'INFRASTRUCTURE_ERROR',
          infrastructureFailureCode: 'JAVA_RUNTIME_UNAVAILABLE',
          startedAt: currentNow,
          completedAt: currentNow,
        },
      }),
      prisma.activitySubmission.update({
        where: { id: firstId },
        data: { submissionStatus: 'ASSESSMENT_FAILED', updatedAt: currentNow },
      }),
    ])
    const failed = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: firstId },
    })
    const expiration = new Date('2031-03-01T00:00:00.000Z')
    await submissions.resolveFailure(instructor, firstId, {
      resolutionType: 'REPLACEMENT_GRANTED',
      reason: 'The configured Java runtime was unavailable after all retries.',
      replacementExpiresAt: expiration,
      expectedUpdatedAt: failed.updatedAt,
    })
    await prisma.programmingActivity.update({
      where: { id: activity.id },
      data: { status: 'CLOSED', closedAt: currentNow },
    })
    currentNow = new Date('2031-02-10T00:00:00.000Z')

    const results = await Promise.allSettled([
      submissions.create(
        student,
        activity.id,
        source,
        'submission-replacement-a',
      ),
      submissions.create(
        student,
        activity.id,
        source,
        'submission-replacement-b',
      ),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const records = await prisma.activitySubmission.findMany({
      where: { activityId: activity.id, studentId: student.id },
      orderBy: { attemptNumber: 'asc' },
    })
    expect(records).toHaveLength(2)
    expect(records.map((record) => record.attemptNumber)).toEqual([1, 2])
    expect(records.map((record) => record.countsTowardAttemptLimit)).toEqual([
      false,
      true,
    ])
    const resolution = await prisma.submissionFailureResolution.findUniqueOrThrow({
      where: { failedSubmissionId: firstId },
    })
    expect(resolution.replacementSubmissionId).toBe(records[1]!.id)
    expect(resolution.replacementConsumedAt).not.toBeNull()
  })

  it('preserves hidden results, applies bounded corrections, and releases only the final projection', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
    })
    const submissions = service()
    const created = await submissions.create(
      student,
      activity.id,
      source,
      'submission-assessment-one',
    )
    const submissionId = (created.submission as { id: string }).id
    const queue = createPostgresExecutionQueue(prisma)
    const claimed = await queue.claimNext({
      workerId: 'integration-worker',
      now: currentNow,
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
            executionTimeMs: 10,
            automatedPoints: 30,
          },
          {
            id: claimed!.cases[1]!.id,
            status: 'FAILED',
            actualOutput: '0\n',
            errorMessage: null,
            executionTimeMs: 10,
            automatedPoints: 0,
          },
        ],
      },
      currentNow,
    )

    const beforeRelease = (await submissions.get(student, submissionId)) as Record<
      string,
      unknown
    >
    expect(beforeRelease.visibleTestOutcomes).toHaveLength(1)
    expect(beforeRelease).not.toHaveProperty('finalScore')
    expect(JSON.stringify(beforeRelease)).not.toContain('Hidden negative')
    expect(JSON.stringify(beforeRelease)).not.toContain('testCaseId')

    let record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    currentNow = new Date(currentNow.getTime() + 1_000)
    await submissions.correctScore(instructor, submissionId, {
      newEffectiveScore: 35,
      reason: 'The deterministic checker comparison required a documented correction.',
      expectedUpdatedAt: record.updatedAt,
    })
    record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    currentNow = new Date(currentNow.getTime() + 1_000)
    await expect(
      submissions.correctScore(instructor, submissionId, {
        newEffectiveScore: 71,
        reason: 'This deliberately exceeds the automated maximum for validation.',
        expectedUpdatedAt: record.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'SCORE_OUT_OF_BOUNDS' })
    await submissions.correctScore(instructor, submissionId, {
      newEffectiveScore: 32,
      reason: 'A second documented review supersedes the prior effective score.',
      expectedUpdatedAt: record.updatedAt,
    })
    record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    currentNow = new Date(currentNow.getTime() + 1_000)
    await submissions.review(instructor, submissionId, {
      instructorPoints: 20,
      feedbackText: 'The solution is correct after the documented checker correction.',
      expectedUpdatedAt: record.updatedAt,
    })
    record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    currentNow = new Date(currentNow.getTime() + 1_000)
    await submissions.release(instructor, submissionId, {
      expectedUpdatedAt: record.updatedAt,
    })

    const released = (await submissions.get(student, submissionId)) as Record<
      string,
      unknown
    >
    expect(released).toMatchObject({ finalScore: 52, totalPoints: 100 })
    expect(JSON.stringify(released)).not.toContain('Hidden negative')
    const corrections = await prisma.submissionScoreCorrection.findMany({
      where: { submissionId },
      orderBy: { correctionNumber: 'asc' },
    })
    expect(corrections).toHaveLength(2)
    expect(corrections.map((correction) => correction.correctionNumber)).toEqual([
      1,
      2,
    ])
    expect(Number(corrections[1]!.originalAutomatedScore)).toBe(30)
    expect(Number(corrections[1]!.previousEffectiveScore)).toBe(35)
    expect(Number(corrections[1]!.newEffectiveScore)).toBe(32)

    record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    await expect(
      submissions.correctScore(instructor, submissionId, {
        newEffectiveScore: 30,
        reason: 'Released submissions remain immutable during this phase.',
        expectedUpdatedAt: record.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' })

    const otherInstructor = await createActiveUser(prisma, 'INSTRUCTOR')
    await expect(
      submissions.review(otherInstructor, submissionId, {
        instructorPoints: 0,
        expectedUpdatedAt: record.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_NOT_FOUND' })
    const administrator = await createActiveUser(prisma, 'ADMIN')
    await expect(
      submissions.correctScore(administrator, submissionId, {
        newEffectiveScore: 30,
        reason: 'Administrators have read-only submission access in Phase 6.',
        expectedUpdatedAt: record.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('retries infrastructure failures on the same immutable submission before resolution', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
    })
    const submissions = service()
    const created = await submissions.create(
      student,
      activity.id,
      source,
      'submission-infrastructure-retry',
    )
    const submissionId = (created.submission as { id: string }).id
    const queue = createPostgresExecutionQueue(prisma)

    for (let claimNumber = 1; claimNumber <= 3; claimNumber += 1) {
      currentNow = new Date(currentNow.getTime() + claimNumber * 2_000)
      const claimed = await queue.claimNext({
        workerId: `retry-worker-${claimNumber}`,
        now: currentNow,
        leaseMs: 60_000,
      })
      expect(claimed?.submissionId).toBe(submissionId)
      const outcome = await queue.failInfrastructure(
        claimed!,
        'JAVA_RUNTIME_UNAVAILABLE',
        currentNow,
      )
      expect(outcome).toBe(claimNumber < 3 ? 'retry_queued' : 'failed')
    }

    let record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    expect(record).toMatchObject({
      submissionStatus: 'ASSESSMENT_FAILED',
      countsTowardAttemptLimit: true,
      attemptNumber: 1,
    })
    expect(await prisma.activitySubmission.count()).toBe(1)

    currentNow = new Date(currentNow.getTime() + 1_000)
    await submissions.retry(instructor, submissionId, {
      expectedUpdatedAt: record.updatedAt,
    })
    const retriedJob = await prisma.executionJob.findUniqueOrThrow({
      where: { submissionId },
    })
    expect(retriedJob).toMatchObject({ status: 'QUEUED', maxClaimAttempts: 4 })
    expect(await prisma.activitySubmission.count()).toBe(1)

    currentNow = new Date(currentNow.getTime() + 1_000)
    const finalClaim = await queue.claimNext({
      workerId: 'retry-worker-final',
      now: currentNow,
      leaseMs: 60_000,
    })
    await expect(
      queue.failInfrastructure(
        finalClaim!,
        'JAVA_RUNTIME_UNAVAILABLE',
        currentNow,
      ),
    ).resolves.toBe('failed')

    record = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    currentNow = new Date(currentNow.getTime() + 1_000)
    await submissions.resolveFailure(instructor, submissionId, {
      resolutionType: 'REPLACEMENT_GRANTED',
      reason: 'The local Java runtime remained unavailable after all retries.',
      replacementExpiresAt: new Date(currentNow.getTime() + 86_400_000),
      expectedUpdatedAt: record.updatedAt,
    })
    const resolved = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    expect(resolved).toMatchObject({
      submissionStatus: 'FAILED_RESOLVED',
      countsTowardAttemptLimit: false,
      attemptNumber: 1,
    })
    expect(await prisma.submissionFailureResolution.count()).toBe(1)
  })

  it('expires unused replacement grants without losing immutable failure history', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
      maxAttempts: 1,
    })
    const submissions = service()
    const created = await submissions.create(
      student,
      activity.id,
      source,
      'submission-expiring-replacement',
    )
    const submissionId = (created.submission as { id: string }).id
    await prisma.$transaction([
      prisma.executionJob.update({
        where: { submissionId },
        data: {
          status: 'FAILED',
          completedAt: currentNow,
          lastFailureCode: 'JAVA_RUNTIME_UNAVAILABLE',
        },
      }),
      prisma.submissionExecution.update({
        where: { submissionId },
        data: {
          compileStatus: 'INFRASTRUCTURE_ERROR',
          infrastructureFailureCode: 'JAVA_RUNTIME_UNAVAILABLE',
          startedAt: currentNow,
          completedAt: currentNow,
        },
      }),
      prisma.activitySubmission.update({
        where: { id: submissionId },
        data: { submissionStatus: 'ASSESSMENT_FAILED', updatedAt: currentNow },
      }),
    ])
    let failed = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    const expiresAt = new Date(currentNow.getTime() + 60_000)
    await submissions.resolveFailure(instructor, submissionId, {
      resolutionType: 'REPLACEMENT_GRANTED',
      reason: 'A temporary infrastructure failure requires a bounded replacement.',
      replacementExpiresAt: expiresAt,
      expectedUpdatedAt: failed.updatedAt,
    })
    const closedActivity = await prisma.programmingActivity.update({
      where: { id: activity.id },
      data: { status: 'CLOSED', closedAt: currentNow },
    })

    const activityService = createActivityService({
      repository: createPrismaActivityRepository(prisma),
      classRepository: createPrismaClassRepository(prisma),
      logger,
      now: () => currentNow,
    })
    const classService = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      now: () => currentNow,
    })
    await expect(
      activityService.archive(instructor, activity.id, {
        expectedUpdatedAt: closedActivity.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_HAS_UNFINISHED_SUBMISSION_WORK' })
    await expect(
      classService.archive(instructor, classRecord.id),
    ).rejects.toMatchObject({ code: 'CLASS_HAS_UNFINISHED_SUBMISSION_WORK' })

    currentNow = new Date(expiresAt.getTime() + 1)
    await expect(
      submissions.create(
        student,
        activity.id,
        source,
        'submission-expired-replacement',
      ),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_ACCEPTING_SUBMISSIONS' })

    await expect(
      activityService.archive(instructor, activity.id, {
        expectedUpdatedAt: closedActivity.updatedAt,
      }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' })
    await expect(classService.archive(instructor, classRecord.id)).resolves.toMatchObject({
      status: 'ARCHIVED',
    })

    failed = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId },
    })
    const resolution = await prisma.submissionFailureResolution.findUniqueOrThrow({
      where: { failedSubmissionId: submissionId },
    })
    expect(failed).toMatchObject({
      submissionStatus: 'FAILED_RESOLVED',
      countsTowardAttemptLimit: false,
      sourceCode: source,
    })
    expect(resolution).toMatchObject({
      replacementSubmissionId: null,
      replacementConsumedAt: null,
      replacementExpiresAt: expiresAt,
    })
  })

  it('runs practice against visible snapshots only without creating an attempt or score', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
    })
    const submissions = service()
    const practice = (await submissions.createPracticeRun(
      student,
      activity.id,
      source,
    )) as { id: string }
    expect(await prisma.activitySubmission.count()).toBe(0)
    const practiceCases = await prisma.practiceExecutionCase.findMany({
      where: { practiceExecutionId: practice.id },
    })
    expect(practiceCases).toHaveLength(1)
    expect(practiceCases[0]!.testNameSnapshot).toBe('Visible double')
    await expect(
      submissions.getPracticeRun(admin, practice.id),
    ).rejects.toMatchObject({ code: 'PRACTICE_RUN_NOT_FOUND', statusCode: 404 })
    await expect(
      submissions.createPracticeRun(student, activity.id, source),
    ).rejects.toMatchObject({ code: 'EXECUTION_CAPACITY_UNAVAILABLE' })
    await expect(
      service('disabled').createPracticeRun(student, activity.id, source),
    ).rejects.toMatchObject({ code: 'EXECUTION_UNAVAILABLE' })
  })

  it('blocks archive until released work is terminal and permits it afterward', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const activity = await publishedActivity({
      instructorId: instructor.id,
      classId: classRecord.id,
    })
    const submissions = service()
    const created = await submissions.create(
      student,
      activity.id,
      source,
      'submission-archive-check',
    )
    const activityRepository = createPrismaActivityRepository(prisma)
    const activityService = createActivityService({
      repository: activityRepository,
      classRepository: createPrismaClassRepository(prisma),
      logger,
      now: () => currentNow,
    })
    await expect(
      activityService.archive(instructor, activity.id, {
        expectedUpdatedAt: activity.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_HAS_UNFINISHED_SUBMISSION_WORK' })

    const submissionId = (created.submission as { id: string }).id
    await prisma.$transaction([
      prisma.executionJob.update({
        where: { submissionId },
        data: { status: 'SUCCEEDED', completedAt: currentNow },
      }),
      prisma.submissionExecution.update({
        where: { submissionId },
        data: {
          compileStatus: 'STUDENT_ERROR',
          runtimeStatus: 'NOT_RUN',
          startedAt: currentNow,
          completedAt: currentNow,
        },
      }),
      prisma.activitySubmission.update({
        where: { id: submissionId },
        data: {
          submissionStatus: 'RELEASED',
          originalAutomatedScore: 0,
          releasedFinalScore: 0,
          reviewedAt: currentNow,
          releasedAt: currentNow,
          updatedAt: currentNow,
        },
      }),
    ])
    await expect(
      activityService.archive(instructor, activity.id, {
        expectedUpdatedAt: activity.updatedAt,
      }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' })
  })
})
