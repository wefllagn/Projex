import { describe, expect, it } from 'vitest'
import {
  canCorrectOrReview,
  canRelease,
  canResolveAssessmentFailure,
  isInstructorSubmissionPending,
  projectInstructorSubmission,
  projectInstructorSubmissionSummary,
} from './instructor-submission-projections.js'

describe('instructor submission projection', () => {
  it('keeps queue summaries free of source, assessment, and review evidence', () => {
    const projected = projectInstructorSubmissionSummary({
      id: 'submission-1',
      activityId: 'activity-1',
      creditPolicy: 'HIGHEST',
      isCreditedResult: true,
      student: { id: 'student-1', fullName: 'Safe Student', email: 'safe@example.edu' },
      sourceCode: 'PRIVATE-SOURCE',
      assessment: { testResults: [{ input: 'HIDDEN-INPUT' }] },
      corrections: [{ reason: 'PRIVATE-REASON' }],
      feedback: { text: 'PRIVATE-FEEDBACK' },
    })

    expect(projected).toMatchObject({ id: 'submission-1', activityId: 'activity-1', creditPolicy: 'HIGHEST', isCreditedResult: true })
    expect(projected).not.toHaveProperty('sourceCode')
    expect(projected).not.toHaveProperty('assessment')
    expect(projected).not.toHaveProperty('corrections')
    expect(projected).not.toHaveProperty('feedback')
  })

  it('allowlists instructor evidence while preserving hidden-test visibility', () => {
    const projected = projectInstructorSubmission({
      id: 'submission-1',
      activityId: 'activity-1',
      attemptLabel: 'Replacement attempt for Attempt 2',
      attemptNumber: 3,
      countsTowardAttemptLimit: false,
      status: 'assessed',
      updatedAt: '2026-08-10T00:00:00.000Z',
      student: { id: 'student-1', fullName: 'Safe Student', email: 'safe@example.edu', passwordHash: 'never' },
      sourceCode: 'public class Main {}',
      assessment: {
        compileStatus: 'succeeded',
        runtimeStatus: 'succeeded',
        workerId: 'private-host',
        testResults: [{
          testCaseId: 'test-1',
          name: 'Hidden boundary',
          order: 1,
          input: 'private input',
          expectedOutput: 'private expected',
          isHidden: true,
          outcome: 'passed',
          actualOutput: 'private expected',
          automatedPoints: 20,
          maximumPoints: 20,
          internalCommand: 'never',
        }],
      },
      scores: { originalAutomatedScore: 70, effectiveAutomatedScore: 68, automatedMaximum: 80, instructorPoints: 10, instructorMaximum: 20, finalScore: null, totalPoints: 100 },
      corrections: [{ correctionNumber: 1, originalAutomatedScore: 70, previousEffectiveScore: 70, newEffectiveScore: 68, reason: 'Evidence correction.', correctedById: 'instructor-1', correctedAt: '2026-08-10T01:00:00.000Z', secret: 'never' }],
      feedback: { text: 'Private draft', instructorId: 'instructor-1', updatedAt: '2026-08-10T01:00:00.000Z', releasedAt: null, arbitrary: 'never' },
      passwordHash: 'never',
      storagePath: 'never',
    })

    expect(projected.attemptLabel).toBe('Replacement attempt for Attempt 2')
    expect(projected.countsTowardAttemptLimit).toBe(false)
    expect(projected.assessment.testResults[0]).toEqual(expect.objectContaining({ isHidden: true, input: 'private input' }))
    expect(projected.scores).toEqual(expect.objectContaining({ originalAutomatedScore: 70, effectiveAutomatedScore: 68 }))
    expect(projected.corrections).toHaveLength(1)
    expect(projected.feedback.text).toBe('Private draft')
    expect(JSON.stringify(projected)).not.toContain('passwordHash')
    expect(JSON.stringify(projected)).not.toContain('storagePath')
    expect(JSON.stringify(projected)).not.toContain('private-host')
    expect(JSON.stringify(projected)).not.toContain('internalCommand')
  })

  it('derives lifecycle capabilities only from authoritative status', () => {
    expect(isInstructorSubmissionPending({ status: 'queued' })).toBe(true)
    expect(isInstructorSubmissionPending({ status: 'assessed' })).toBe(false)
    expect(canCorrectOrReview({ status: 'assessed' })).toBe(true)
    expect(canCorrectOrReview({ status: 'released' })).toBe(false)
    expect(canRelease({ status: 'reviewed' })).toBe(true)
    expect(canRelease({ status: 'assessed', scores: { finalScore: 100 } })).toBe(false)
    expect(canResolveAssessmentFailure({ status: 'assessment_failed', failureResolution: null })).toBe(true)
    expect(canResolveAssessmentFailure({ status: 'failed_resolved', failureResolution: {} })).toBe(false)
  })
})
