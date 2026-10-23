import { toStudentTestCaseProjection, toManagerTestCaseProjection, type TestCaseRecord } from '../test-cases/test-case.types.js'
import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { createSubmissionService } from './submission.service.js'
import { createPrismaSubmissionRepository, type SubmissionRecord, type SubmissionRepository } from './submission.repository.js'
import type { PrismaClient } from '@prisma/client'
import { createActivitySchema, updateActivitySchema } from '../activities/activity.schemas.js'
const now = new Date('2026-10-20T12:00:00Z')
const student = { id: 'student', role: 'STUDENT', status: 'ACTIVE' } as SafeUserProfile
const teacher = { id: 'teacher', role: 'INSTRUCTOR', status: 'ACTIVE' } as SafeUserProfile
function submission(status = 'QUEUED') {
  return {
    id: 'submission', activityId: 'activity', studentId: 'student', activityTitleSnapshot: 'Practice', sourceCode: 'immutable source',
    gradingModeSnapshot: 'COMPLETION', totalPointsSnapshot: null, automatedMaximum: null, instructorMaximum: null, instructorPoints: null, originalAutomatedScore: null, releasedFinalScore: null,
    attemptNumber: 1, countsTowardAttemptLimit: true, submissionStatus: status, submittedAt: now, updatedAt: now,
    activity: { id: 'activity', creditPolicy: 'LATEST', status: 'PUBLISHED', class: { status: 'ACTIVE', instructorId: 'teacher', teachingStaff: [] } },
    student: { id: 'student', fullName: 'Fictional Student' }, scoreCorrections: [], feedback: { feedbackText: 'Private comment', releasedAt: status === 'RELEASED' ? now : null }, replacementResolutionUsed: null, failureResolution: null,
    execution: { compileStatus: 'FAILED', runtimeStatus: 'NOT_RUN', testCaseResults: [{ testNameSnapshot: 'Private case', isHiddenSnapshot: true, expectedOutputSnapshot: 'PRIVATE_TEST_SECRET', passStatus: 'PENDING' }], compilerOutput: 'Technical compilation feedback' },
  } as unknown as SubmissionRecord
}
function fixture(record = submission()) {
  const repository = { findById: vi.fn().mockResolvedValue(record), findCreditedSubmissionId: vi.fn().mockResolvedValue(null), list: vi.fn().mockResolvedValue({ submissions: [record], totalItems: 1, creditedSubmissionIds: new Set() }), createSubmission: vi.fn().mockResolvedValue({ kind: 'created', submission: record }), getStudentAttemptState: vi.fn() }
  return { repository, service: createSubmissionService({ repository: repository as unknown as SubmissionRepository, logger: pino({ enabled: false }), config: { mode: 'local_process', sourceLimitBytes: 100000, practiceRunTtlHours: 1, practiceRunsPerMinute: 5, practiceMaxActivePerActivity: 1 }, now: () => now }) }
}
describe('completion-based Ungraded contract', () => {
  it('keeps null case weights null in both authorized projections', () => {
    const record = { id: 'case', name: 'Example', points: null } as TestCaseRecord
    expect(toStudentTestCaseProjection(record).points).toBeNull()
    expect(toManagerTestCaseProjection(record).points).toBeNull()
  })
  it.each(['QUEUED', 'ASSESSING', 'ASSESSED', 'ASSESSMENT_FAILED', 'FAILED_RESOLVED'])('keeps accepted %s complete without exposing scores, private feedback or hidden tests', async status => {
    const { service } = fixture(submission(status))
    const result = await service.get(student, 'submission')
    expect(result).toMatchObject({ gradingMode: 'COMPLETION', completionState: 'COMPLETE', gradeStatus: 'ungraded' })
    for (const key of ['finalScore', 'totalPoints', 'scores', 'feedback']) expect(result).not.toHaveProperty(key)
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_TEST_SECRET|Private case|Private comment/)
  })
  it('releases only feedback to Students while Instructor scores remain absent', async () => {
    const { service } = fixture(submission('RELEASED'))
    expect(await service.get(student, 'submission')).toMatchObject({ completionState: 'COMPLETE', feedback: 'Private comment' })
    expect(await service.get(teacher, 'submission')).toMatchObject({ scores: null, completionState: 'COMPLETE' })
  })
  it('preserves idempotency and completion before the Java worker runs', async () => {
    const { repository, service } = fixture()
    const first = await service.create(student, 'activity', 'source', 'a'.repeat(32))
    repository.createSubmission.mockResolvedValue({ kind: 'replayed', submission: submission() })
    const replay = await service.create(student, 'activity', 'source', 'a'.repeat(32))
    expect(first.submission).toMatchObject({ completionState: 'COMPLETE' })
    expect(replay).toMatchObject({ idempotentReplay: true, submission: { id: 'submission', completionState: 'COMPLETE' } })
    expect(repository.createSubmission.mock.calls[0]).toEqual(repository.createSubmission.mock.calls[1])
  })
  it('derives completion from any accepted official attempt even after a non-counting replacement resolution', async () => {
    const { repository, service } = fixture()
    repository.getStudentAttemptState.mockResolvedValue({ activity: { id: 'activity', gradingMode: 'COMPLETION', status: 'PUBLISHED', classStatus: 'ACTIVE', maxAttempts: 3, creditPolicy: 'LATEST', dueDate: new Date('2099-01-01') }, countingAttemptsUsed: 0, acceptedAttempts: 1, availableReplacement: null, releasedAttempts: [] })
    expect(await service.getAttemptState(student, 'activity')).toMatchObject({ completionState: 'COMPLETE', countingAttemptsUsed: 0, creditedResult: null })
    repository.getStudentAttemptState.mockResolvedValue({ ...repository.getStudentAttemptState.mock.results[0]?.value, activity: { id: 'activity', gradingMode: 'COMPLETION', status: 'PUBLISHED', classStatus: 'ACTIVE', maxAttempts: 3, dueDate: new Date('2099-01-01'), creditPolicy: 'LATEST' }, acceptedAttempts: 0, countingAttemptsUsed: 0, availableReplacement: null, releasedAttempts: [] })
    expect(await service.getAttemptState(student, 'activity')).toMatchObject({ completionState: 'NOT_SUBMITTED' })
  })
  it('requires no academic points in Completion and retains numeric points for historical/default Graded work', () => {
    const base = { title: 'Java', instructions: 'Practice', dueDate: '2099-01-01T00:00:00Z', starterCode: 'class Main {}', maxAttempts: 3, totalPoints: 100 }
    expect(createActivitySchema.parse(base).gradingMode).toBe('GRADED')
    expect(createActivitySchema.safeParse({ ...base, gradingMode: 'COMPLETION' }).success).toBe(false)
    expect(createActivitySchema.parse({ ...base, gradingMode: 'COMPLETION', totalPoints: null }).totalPoints).toBeNull()
    expect(updateActivitySchema.safeParse({ expectedUpdatedAt: now.toISOString(), gradingMode: 'COMPLETION', totalPoints: null }).success).toBe(true)
  })
  it('releases a reviewed Completion record transactionally with a null final score', async () => {
    const record = submission('REVIEWED')
    const tx = { $queryRaw: vi.fn(), activitySubmission: { findUnique: vi.fn().mockResolvedValue(record), update: vi.fn() }, submissionFeedback: { update: vi.fn() } }
    const prisma = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } as unknown as PrismaClient
    const result = await createPrismaSubmissionRepository(prisma).release({ submissionId: record.id, instructorId: 'teacher', expectedUpdatedAt: now, now })
    expect(result.kind).toBe('updated')
    expect(tx.activitySubmission.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ submissionStatus: 'RELEASED', releasedFinalScore: null }) }))
    expect(tx.submissionFeedback.update).toHaveBeenCalledWith({ where: { submissionId: record.id }, data: { releasedAt: now, releasedById: 'teacher' } })
  })
  it('rejects score corrections and numeric review input for Ungraded records', async () => {
    const record = submission('ASSESSED')
    const tx = { $queryRaw: vi.fn(), activitySubmission: { findUnique: vi.fn().mockResolvedValue(record), update: vi.fn() } }
    const prisma = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } as unknown as PrismaClient
    const repository = createPrismaSubmissionRepository(prisma)
    expect(await repository.createCorrection({ submissionId: record.id, instructorId: 'teacher', correction: { expectedUpdatedAt: now, newEffectiveScore: 0, reason: 'Cannot assign a grade' }, now })).toMatchObject({ kind: 'score_out_of_bounds' })
    expect(await repository.saveReview({ submissionId: record.id, instructorId: 'teacher', review: { expectedUpdatedAt: now, instructorPoints: 0 }, now })).toMatchObject({ kind: 'score_out_of_bounds' })
    expect(tx.activitySubmission.update).not.toHaveBeenCalled()
  })
})
