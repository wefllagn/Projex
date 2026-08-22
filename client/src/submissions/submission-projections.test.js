import { describe, expect, it } from 'vitest'
import {
  projectPracticeRun,
  projectStudentAttemptState,
  projectStudentSubmission,
} from './submission-projections.js'

describe('student-safe submission projections', () => {
  it('allowlists practice fields and discards hidden evidence and scores', () => {
    const projected = projectPracticeRun({
      id: 'run-1',
      activityId: 'activity-1',
      status: 'succeeded',
      compilerOutput: 'safe compiler diagnostic',
      hiddenTestCount: 99,
      score: 100,
      sourceCode: 'PRIVATE-SOURCE',
      visibleTestOutcomes: [{
        name: 'Visible sample',
        order: 1,
        outcome: 'passed',
        expectedOutput: 'ok',
        actualOutput: 'ok',
        hiddenInput: 'HIDDEN-INPUT',
        points: 50,
      }],
    })

    expect(projected).toMatchObject({ id: 'run-1', status: 'succeeded' })
    expect(projected).not.toHaveProperty('hiddenTestCount')
    expect(projected).not.toHaveProperty('score')
    expect(projected).not.toHaveProperty('sourceCode')
    expect(projected.visibleTestOutcomes[0]).not.toHaveProperty('hiddenInput')
    expect(projected.visibleTestOutcomes[0]).not.toHaveProperty('points')
    expect(projected.visibleTestOutcomes[0].expectedOutput).toBe('ok')
  })

  it('drops outcomes explicitly identified as hidden before projecting diagnostics', () => {
    const projected = projectPracticeRun({
      visibleTestOutcomes: [
        { name: 'Visible sample', expectedOutput: 'VISIBLE', actualOutput: 'ACTUAL' },
        { name: 'Hidden sample', isHidden: true, expectedOutput: 'HIDDEN-EXPECTED', actualOutput: 'HIDDEN-ACTUAL' },
      ],
    })

    expect(projected.visibleTestOutcomes).toHaveLength(1)
    expect(projected.visibleTestOutcomes[0]).toMatchObject({ expectedOutput: 'VISIBLE' })
    expect(JSON.stringify(projected)).not.toContain('HIDDEN-EXPECTED')
    expect(JSON.stringify(projected)).not.toContain('HIDDEN-ACTUAL')
  })

  it('withholds every score and feedback field until the backend reports released', () => {
    const projected = projectStudentSubmission({
      id: 'submission-1',
      activityId: 'activity-1',
      status: 'assessed',
      gradeStatus: 'released',
      sourceCode: 'public class Main {}',
      finalScore: 90,
      totalPoints: 100,
      feedback: 'DRAFT-FEEDBACK-SECRET',
      originalAutomatedScore: 80,
      effectiveAutomatedScore: 85,
      instructorPoints: 5,
      correctionReason: 'CORRECTION-SECRET',
      hiddenTestCount: 4,
      hiddenTestResults: ['HIDDEN-RESULT'],
    })

    expect(projected.gradeStatus).toBe('pending')
    expect(projected).not.toHaveProperty('finalScore')
    expect(projected).not.toHaveProperty('totalPoints')
    expect(projected).not.toHaveProperty('feedback')
    expect(projected).not.toHaveProperty('originalAutomatedScore')
    expect(projected).not.toHaveProperty('correctionReason')
    expect(projected).not.toHaveProperty('hiddenTestCount')
  })

  it('admits only released final score and textual feedback from a released projection', () => {
    const projected = projectStudentSubmission({
      id: 'submission-1',
      activityId: 'activity-1',
      status: 'released',
      gradeStatus: 'released',
      finalScore: 90,
      totalPoints: 100,
      feedback: 'Released feedback',
      scoreCorrections: [{ reason: 'PRIVATE-REASON' }],
    })

    expect(projected).toMatchObject({
      gradeStatus: 'released',
      finalScore: 90,
      totalPoints: 100,
      feedback: 'Released feedback',
    })
    expect(projected).not.toHaveProperty('scoreCorrections')
  })

  it('allowlists attempt-state summaries without admitting source or assessment evidence', () => {
    const projected = projectStudentAttemptState({
      activityId: 'activity-1',
      activityStatus: 'PUBLISHED',
      dueState: 'OPEN',
      maxAttempts: 3,
      creditPolicy: 'HIGHEST',
      countingAttemptsUsed: 2,
      remainingOrdinaryAttempts: 1,
      ordinarySubmissionAllowed: true,
      nextAllowedSubmissionKind: 'ORDINARY',
      releasedAttempts: [{
        submissionId: 'submission-1',
        attemptLabel: 'Attempt 1',
        score: 75,
        totalPoints: 100,
        credited: true,
        sourceCode: 'PRIVATE-SOURCE',
        hiddenTests: ['PRIVATE-HIDDEN-TEST'],
      }],
      creditedResult: {
        submissionId: 'submission-1',
        attemptLabel: 'Attempt 1',
        score: 75,
        totalPoints: 100,
        correctionReason: 'PRIVATE-CORRECTION',
      },
      sourceCode: 'PRIVATE-SOURCE',
      assessment: { compilerOutput: 'PRIVATE-COMPILER-OUTPUT' },
    })

    expect(projected).toMatchObject({
      creditPolicy: 'HIGHEST',
      countingAttemptsUsed: 2,
      remainingOrdinaryAttempts: 1,
      creditedResult: { submissionId: 'submission-1', score: 75 },
    })
    const serialized = JSON.stringify(projected)
    expect(serialized).not.toContain('PRIVATE-SOURCE')
    expect(serialized).not.toContain('PRIVATE-HIDDEN-TEST')
    expect(serialized).not.toContain('PRIVATE-CORRECTION')
    expect(serialized).not.toContain('PRIVATE-COMPILER-OUTPUT')
  })
})
