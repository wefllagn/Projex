import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'
import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTopicService } from '../../src/modules/activities/topic.service.js'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { cleanIntegrationDatabase, createIntegrationPrisma, createActiveUser, createActiveClass, createActiveMembership } from './database.js'
const prisma = createIntegrationPrisma(), logger = pino({ enabled: false })
const now = new Date('2031-01-01T00:00:00Z')
const topics = createTopicService(prisma)
const activities = createActivityService({ repository: createPrismaActivityRepository(prisma), classRepository: createPrismaClassRepository(prisma), logger, now: () => now })
const submissions = createSubmissionService({ repository: createPrismaSubmissionRepository(prisma), logger, config: { mode: 'local_process', sourceLimitBytes: 100000, practiceRunTtlHours: 24, practiceRunsPerMinute: 5, practiceMaxActivePerActivity: 1 }, now: () => now })
beforeEach(() => cleanIntegrationDatabase(prisma))
afterAll(() => prisma.$disconnect())
async function fixture() {
  const instructor = await createActiveUser(prisma, 'INSTRUCTOR'), student = await createActiveUser(prisma, 'STUDENT'), other = await createActiveUser(prisma, 'INSTRUCTOR'), co = await createActiveUser(prisma, 'INSTRUCTOR')
  const classRecord = await createActiveClass(prisma, instructor.id)
  await createActiveMembership(prisma, classRecord.id, student.id)
  await prisma.classTeachingStaff.create({ data: { classId: classRecord.id, instructorId: co.id, invitedById: instructor.id, status: 'ACTIVE', acceptedAt: now } })
  return { instructor, student, other, co, classRecord }
}
async function draft(classId: string, createdById: string, topicId: string | null, completion = false) {
  return prisma.programmingActivity.create({ data: { classId, createdById, topicId, title: 'Java practice', instructions: 'Practice Java', dueDate: new Date('2031-02-01'), starterCode: 'class Main {}', gradingMode: completion ? 'COMPLETION' : 'GRADED', totalPoints: completion ? null : 100, testCases: { create: [{ name: 'Visible example', testCaseOrder: 1, expectedOutput: '42', isHidden: false, points: completion ? null : 100 }] } } })
}
describe('persistent Classwork and Ungraded integration', () => {
  it('retains existing Graded case weights when an ordinary draft field is saved', async () => {
    const f = await fixture(), item = await draft(f.classRecord.id, f.instructor.id, null)
    const before = await prisma.testCase.findMany({ where: { activityId: item.id } })
    await activities.update(f.instructor, item.id, { title: 'Updated title', gradingMode: 'GRADED', totalPoints: 100, expectedUpdatedAt: item.updatedAt })
    expect(await prisma.testCase.findMany({ where: { activityId: item.id } })).toEqual(before)
  })
  it('shares persisted manual order with authorized roles and hides draft-only Topic names and counts from Students', async () => {
    const f = await fixture()
    const one = await topics.change(f.instructor, f.classRecord.id, { action: 'create', expectedVersion: 0, name: 'First' })
    const two = await topics.change(f.co, f.classRecord.id, { action: 'create', expectedVersion: 1, name: 'Draft-only private topic' })
    const item = await draft(f.classRecord.id, f.instructor.id, one.createdId!)
    await draft(f.classRecord.id, f.instructor.id, two.createdId!)
    await activities.publish(f.instructor, item.id, { expectedUpdatedAt: item.updatedAt })
    await topics.change(f.co, f.classRecord.id, { action: 'up', topicId: two.createdId, expectedVersion: 2 })
    expect((await topics.list(f.instructor, f.classRecord.id, 1)).topics.map(t => t.name)).toEqual(['Draft-only private topic', 'First'])
    const visible = await topics.list(f.student, f.classRecord.id, 1)
    expect(visible.topics.map(t => t.name)).toEqual(['First'])
    await expect(topics.list(f.other, f.classRecord.id, 1)).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    await expect(topics.change(f.student, f.classRecord.id, { action: 'create', expectedVersion: 3, name: 'Forbidden' })).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    await expect(topics.change(f.co, f.classRecord.id, { action: 'remove', topicId: one.createdId, expectedVersion: 0 })).rejects.toMatchObject({ code: 'STALE_TOPIC_VERSION' })
  })
  it('removes only a Topic, preserves Activities and test evidence, and never moves a Topic when Activity content changes', async () => {
    const f = await fixture()
    const topic = await topics.change(f.instructor, f.classRecord.id, { action: 'create', name: 'Java', expectedVersion: 0 })
    const item = await draft(f.classRecord.id, f.instructor.id, topic.createdId!)
    const before = await prisma.testCase.findMany({ where: { activityId: item.id } })
    await topics.change(f.co, f.classRecord.id, { action: 'remove', topicId: topic.createdId, expectedVersion: 1 })
    expect(await prisma.programmingActivity.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ topicId: null, title: item.title })
    expect(await prisma.testCase.findMany({ where: { activityId: item.id } })).toEqual(before)
    expect(await prisma.classTopic.count({ where: { classId: f.classRecord.id } })).toBe(0)
  })
  it.each([{ label: 'compilation error', source: 'class Main { broken syntax }', expected: 'STUDENT_ERROR' }, { label: 'successful Java', source: 'class Main { public static void main(String[] args) { System.out.print(42); } }', expected: 'SUCCESS' }])('establishes completion before real $label processing, preserves idempotency and releases comments separately', async ({ source, expected }) => {
    const f = await fixture(), item = await draft(f.classRecord.id, f.instructor.id, null, true)
    const published = await activities.publish(f.instructor, item.id, { expectedUpdatedAt: item.updatedAt })
    const first = await submissions.create(f.student, item.id, source, 'completion-idempotency-key')
    const accepted = first.submission as { id: string; completionState: string }
    expect(accepted.completionState).toBe('COMPLETE')
    expect((await submissions.getAttemptState(f.student, item.id)) as object).toMatchObject({ completionState: 'COMPLETE', countingAttemptsUsed: 1 })
    expect((await submissions.create(f.student, item.id, source, 'completion-idempotency-key')).idempotentReplay).toBe(true)
    await expect(activities.update(f.instructor, item.id, { gradingMode: 'GRADED', totalPoints: 100, expectedUpdatedAt: published.updatedAt })).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    const queue = createPostgresExecutionQueue(prisma)
    const job = await queue.claimNext({ workerId: 'completion-test', now, leaseMs: 60000 })
    expect(job?.submissionId).toBe(accepted.id)
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-completion-'))
    try {
      const result = await createJavaRunner({ javaExecutable: 'java', javacExecutable: 'javac', release: 17, jobRoot: root, compileTimeoutMs: 10000, testTimeoutMs: 2000, outputLimitBytes: 16384, memoryLimitMb: 64 }).execute(job!)
      expect(result.compileStatus).toBe(expected)
      await queue.complete(job!, result, new Date(now.getTime() + 1000))
    } finally { if (path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('projex-completion-')) await rm(root, { recursive: true, force: true }) }
    const assessed = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: accepted.id } })
    expect(assessed).toMatchObject({ originalAutomatedScore: null, totalPointsSnapshot: null, instructorPoints: null })
    const reviewed = await submissions.review(f.co, accepted.id, { feedbackText: 'Try again with balanced braces.', expectedUpdatedAt: assessed.updatedAt }) as { updatedAt: Date }
    expect(await submissions.get(f.student, accepted.id)).not.toHaveProperty('feedback')
    await submissions.release(f.instructor, accepted.id, { expectedUpdatedAt: reviewed.updatedAt })
    expect(await submissions.get(f.student, accepted.id)).toMatchObject({ completionState: 'COMPLETE', feedback: 'Try again with balanced braces.' })
    expect(await submissions.get(f.student, accepted.id)).not.toHaveProperty('finalScore')
    expect(await prisma.activitySubmission.count({ where: { activityId: item.id } })).toBe(1)
  })
  it('rejects cross-Class Topic assignment at both API service and database constraints', async () => {
    const f = await fixture(), foreignClass = await createActiveClass(prisma, f.other.id)
    const topic = await topics.change(f.other, foreignClass.id, { action: 'create', expectedVersion: 0, name: 'Foreign topic' })
    const item = await draft(f.classRecord.id, f.instructor.id, null)
    await expect(activities.update(f.instructor, item.id, { topicId: topic.createdId, expectedUpdatedAt: item.updatedAt })).rejects.toMatchObject({ code: 'TOPIC_NOT_FOUND' })
    await expect(prisma.programmingActivity.update({ where: { id: item.id }, data: { topicId: topic.createdId } })).rejects.toMatchObject({ code: 'P2003' })
    await expect(prisma.programmingActivity.update({ where: { id: item.id }, data: { gradingMode: 'COMPLETION', totalPoints: 0 } })).rejects.toBeDefined()
  })
})
