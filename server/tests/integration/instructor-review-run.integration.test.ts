import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const queue = createPostgresExecutionQueue(prisma)
const logger = pino({ level: 'silent' })
const now = new Date('2031-01-10T08:00:00.000Z')
let root: string | undefined
const source = 'public class Main { public static void main(String[] args) { java.util.Scanner s = new java.util.Scanner(System.in); System.out.println(s.nextInt() * 2); } }'
function submissions(mode: 'disabled' | 'local_process' = 'local_process') {
  return createSubmissionService({
    repository: createPrismaSubmissionRepository(prisma), logger,
    config: { mode, sourceLimitBytes: 100_000, practiceRunTtlHours: 24, practiceRunsPerMinute: 5, practiceMaxActivePerActivity: 1 },
    now: () => now,
  })
}
async function runner() {
  if (!root) root = await mkdtemp(path.join(os.tmpdir(), 'projex-review-rerun-'))
  return createJavaRunner({ javaExecutable: 'java', javacExecutable: 'javac', release: 17,
    jobRoot: root, compileTimeoutMs: 10_000, testTimeoutMs: 2_000,
    outputLimitBytes: 16_384, memoryLimitMb: 64 })
}
async function fixture(submittedSource = source) {
  const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
  const otherInstructor = await createActiveUser(prisma, 'INSTRUCTOR')
  const student = await createActiveUser(prisma, 'STUDENT')
  const admin = await createActiveUser(prisma, 'ADMIN')
  const classRecord = await createActiveClass(prisma, instructor.id)
  await createActiveMembership(prisma, classRecord.id, student.id)
  const activity = await prisma.programmingActivity.create({
    data: {
      classId: classRecord.id, createdById: instructor.id, title: 'Review rerun fixture',
      instructions: 'Double the integer input.', dueDate: new Date('2031-02-01T00:00:00Z'),
      entryClassName: 'Main', starterCode: 'public class Main {}',
      maxAttempts: 2, totalPoints: 100, status: 'PUBLISHED', publishedAt: now,
      testCases: { create: [
        { name: 'Visible', testCaseOrder: 1, inputData: '2\n', expectedOutput: '4\n', isHidden: false, points: 40 },
        { name: 'Hidden', testCaseOrder: 2, inputData: '-2\n', expectedOutput: '-4\n', isHidden: true, points: 40 },
      ] },
    },
  })
  const service = submissions()
  const created = await service.create(student, activity.id, submittedSource, 'instructor-review-run-fixture')
  const submissionId = (created.submission as { id: string }).id
  const job = await queue.claimNext({ workerId: 'official-test-worker', now, leaseMs: 30_000 })
  expect(job?.jobType).toBe('OFFICIAL_ASSESSMENT')
  const result = await (await runner()).execute({ sourceCode: job!.sourceCode, entryClassName: job!.entryClassName, cases: job!.cases })
  expect(await queue.complete(job!, result, now)).toBe(true)
  const assessed = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId } })
  const reviewed = await service.review(instructor, submissionId, { instructorPoints: 10, feedbackText: 'Reviewed synthetic solution.', expectedUpdatedAt: assessed.updatedAt }) as { updatedAt: Date }
  await service.release(instructor, submissionId, { expectedUpdatedAt: new Date(reviewed.updatedAt) })
  return { instructor, otherInstructor, student, admin, activity, submissionId, service }
}

beforeEach(async () => { await cleanIntegrationDatabase(prisma) })
afterAll(async () => {
  await cleanIntegrationDatabase(prisma)
  await prisma.$disconnect()
  if (root && path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('projex-review-rerun-')) {
    await rm(root, { recursive: true, force: true })
  }
})

describe('Instructor review rerun in guarded PostgreSQL and real Java', () => {
  it('reruns immutable source and saved stdin without changing a released result', async () => {
    const { instructor, otherInstructor, student, admin, activity, submissionId, service } = await fixture()
    const before = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId }, include: { execution: { include: { testCaseResults: true } } },
    })
    const queued = await service.createReviewRun(instructor, submissionId) as { id: string; status: string; testOutcomes: Array<{ isHidden: boolean }> }
    expect(queued.status).toBe('queued')
    expect(queued.testOutcomes.map((item) => item.isHidden)).toEqual([false, true])
    expect(await prisma.reviewExecution.count()).toBe(1)
    await expect(service.createReviewRun(instructor, submissionId)).rejects.toMatchObject({ statusCode: 503, code: 'EXECUTION_CAPACITY_UNAVAILABLE' })
    const job = await queue.claimNext({ workerId: 'review-test-worker', now, leaseMs: 30_000 })
    expect(job).toMatchObject({ jobType: 'INSTRUCTOR_REVIEW_RUN', submissionId: null, practiceExecutionId: null, reviewExecutionId: queued.id, sourceCode: source })
    expect(job?.cases.map((item) => item.input)).toEqual(['2\n', '-2\n'])
    const result = await (await runner()).execute({ sourceCode: job!.sourceCode, entryClassName: job!.entryClassName, cases: job!.cases })
    expect(await queue.complete(job!, result, now)).toBe(true)
    const completed = await service.getReviewRun(instructor, submissionId, queued.id) as { status: string; compileStatus: string; runtimeStatus: string; testOutcomes: Array<{ outcome: string; actualOutput: string }> }
    expect(completed).toMatchObject({ status: 'succeeded', compileStatus: 'success', runtimeStatus: 'passed' })
    expect(completed.testOutcomes.map((item) => [item.outcome, item.actualOutput])).toEqual([['passed', '4\n'], ['passed', '-4\n']])
    const after = await prisma.activitySubmission.findUniqueOrThrow({
      where: { id: submissionId }, include: { execution: { include: { testCaseResults: true } } },
    })
    expect(after).toEqual(before)
    expect((await service.getAttemptState(student, activity.id) as { countingAttemptsUsed: number }).countingAttemptsUsed).toBe(1)
    await expect(service.createReviewRun(student, submissionId)).rejects.toMatchObject({ statusCode: 403 })
    await expect(service.getReviewRun(student, submissionId, queued.id)).rejects.toMatchObject({ statusCode: 403 })
    await expect(service.getReviewRun(admin, submissionId, queued.id)).rejects.toMatchObject({ statusCode: 403 })
    await expect(service.createReviewRun(otherInstructor, submissionId)).rejects.toMatchObject({ statusCode: 404 })
    await expect(service.getReviewRun(otherInstructor, submissionId, queued.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(service.getReviewRun(instructor, activity.id, queued.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(submissions('disabled').createReviewRun(instructor, submissionId)).rejects.toMatchObject({ statusCode: 503, code: 'EXECUTION_UNAVAILABLE' })
    await prisma.programmingActivity.update({ where: { id: activity.id }, data: { status: 'ARCHIVED', archivedAt: now } })
    await expect(service.createReviewRun(instructor, submissionId)).rejects.toMatchObject({ statusCode: 404 })
    expect((await service.getReviewRun(instructor, submissionId, queued.id) as { id: string }).id).toBe(queued.id)
    expect(await readdir(root!)).toEqual([])
  }, 60_000)

  it('keeps infrastructure failure isolated from official assessment and score', async () => {
    const { instructor, submissionId, service } = await fixture()
    const before = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { execution: true } })
    const created = await service.createReviewRun(instructor, submissionId) as { id: string }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const job = await queue.claimNext({ workerId: 'failing-review-worker', now: new Date(now.getTime() + (attempt - 1) * 2_000), leaseMs: 1_000 })
      expect(job?.reviewExecutionId).toBe(created.id)
      expect(await queue.failInfrastructure(job!, 'JAVA_RUNTIME_UNAVAILABLE', new Date(now.getTime() + (attempt - 1) * 2_000))).toBe(attempt === 3 ? 'failed' : 'retry_queued')
    }
    expect((await service.getReviewRun(instructor, submissionId, created.id) as { status: string; compileStatus: string })).toMatchObject({ status: 'failed', compileStatus: 'infrastructure_error' })
    const after = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { execution: true } })
    expect(after).toEqual(before)
  }, 60_000)

  it('returns fresh compiler errors without changing the submitted source or released result', async () => {
    const invalid = source.replace('System.out.println(s.nextInt() * 2);', 'System.out.println(s.nextInt() * 2)')
    const { instructor, submissionId, service } = await fixture(invalid)
    const before = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId } })
    const created = await service.createReviewRun(instructor, submissionId) as { id: string }
    const job = await queue.claimNext({ workerId: 'compiler-review-worker', now, leaseMs: 30_000 })
    expect(job?.sourceCode).toBe(invalid)
    const result = await (await runner()).execute({ sourceCode: job!.sourceCode, entryClassName: job!.entryClassName, cases: job!.cases })
    expect(await queue.complete(job!, result, now)).toBe(true)
    const run = await service.getReviewRun(instructor, submissionId, created.id) as { compileStatus: string; compilerOutput: string }
    expect(run.compileStatus).toBe('student_error')
    expect(run.compilerOutput).toContain('Main.java:')
    expect(run.compilerOutput).not.toContain(root!)
    expect(await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId } })).toEqual(before)
  }, 60_000)
})
