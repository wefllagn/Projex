const PENDING_STATUSES = new Set(['queued', 'assessing'])
const REVIEWABLE_STATUSES = new Set(['assessed', 'reviewed'])

function string(value, fallback = null) {
  return typeof value === 'string' ? value : fallback
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function assessmentResult(value = {}) {
  return {
    testCaseId: string(value.testCaseId),
    name: string(value.name, 'Assessment case'),
    order: number(value.order) ?? 0,
    input: string(value.input),
    expectedOutput: string(value.expectedOutput, ''),
    isHidden: value.isHidden === true,
    outcome: string(value.outcome, 'pending'),
    actualOutput: string(value.actualOutput),
    errorMessage: string(value.errorMessage),
    automatedPoints: number(value.automatedPoints) ?? 0,
    maximumPoints: number(value.maximumPoints) ?? 0,
    executionTimeMs: number(value.executionTimeMs),
  }
}

function correction(value = {}) {
  return {
    correctionNumber: number(value.correctionNumber),
    originalAutomatedScore: number(value.originalAutomatedScore),
    previousEffectiveScore: number(value.previousEffectiveScore),
    newEffectiveScore: number(value.newEffectiveScore),
    reason: string(value.reason, ''),
    correctedById: string(value.correctedById),
    correctedAt: string(value.correctedAt),
  }
}

function failureResolution(value) {
  if (!value || typeof value !== 'object') return null
  return {
    resolutionType: string(value.resolutionType),
    reason: string(value.reason, ''),
    resolvedById: string(value.resolvedById),
    resolvedAt: string(value.resolvedAt),
    replacementExpiresAt: string(value.replacementExpiresAt),
    replacementSubmissionId: string(value.replacementSubmissionId),
    replacementConsumedAt: string(value.replacementConsumedAt),
  }
}

export function projectInstructorSubmissionSummary(value = {}) {
  const student = value.student && typeof value.student === 'object'
    ? value.student
    : {}
  return {
    id: string(value.id),
    activityId: string(value.activityId),
    activityTitle: string(value.activityTitle, 'Programming activity'),
    attemptLabel: string(value.attemptLabel, 'Submission attempt'),
    replacementForAttemptNumber: number(value.replacementForAttemptNumber),
    submittedAt: string(value.submittedAt),
    status: string(value.status, 'queued'),
    isLate: value.isLate === true,
    updatedAt: string(value.updatedAt),
    creditPolicy: value.creditPolicy === 'HIGHEST' ? 'HIGHEST' : 'LATEST',
    isCreditedResult: value.isCreditedResult === true,
    student: {
      id: string(student.id),
      fullName: string(student.fullName, 'Student'),
      email: string(student.email),
    },
  }
}

export function projectInstructorSubmission(value = {}) {
  const scores = value.scores && typeof value.scores === 'object'
    ? value.scores
    : {}
  const assessment = value.assessment && typeof value.assessment === 'object'
    ? value.assessment
    : null
  const feedback = value.feedback && typeof value.feedback === 'object'
    ? value.feedback
    : null

  return {
    ...projectInstructorSubmissionSummary(value),
    attemptNumber: number(value.attemptNumber),
    countsTowardAttemptLimit: value.countsTowardAttemptLimit === true,
    sourceCode: string(value.sourceCode, ''),
    assessment: assessment
      ? {
          compileStatus: string(assessment.compileStatus, 'pending'),
          runtimeStatus: string(assessment.runtimeStatus, 'not_run'),
          compilerOutput: string(assessment.compilerOutput),
          infrastructureFailureCode: string(assessment.infrastructureFailureCode),
          startedAt: string(assessment.startedAt),
          completedAt: string(assessment.completedAt),
          testResults: Array.isArray(assessment.testResults)
            ? assessment.testResults.map(assessmentResult)
            : [],
        }
      : null,
    scores: {
      originalAutomatedScore: number(scores.originalAutomatedScore),
      effectiveAutomatedScore: number(scores.effectiveAutomatedScore),
      automatedMaximum: number(scores.automatedMaximum) ?? 0,
      instructorPoints: number(scores.instructorPoints) ?? 0,
      instructorMaximum: number(scores.instructorMaximum) ?? 0,
      finalScore: number(scores.finalScore),
      totalPoints: number(scores.totalPoints) ?? 0,
    },
    corrections: Array.isArray(value.corrections)
      ? value.corrections.map(correction)
      : [],
    feedback: feedback
      ? {
          text: string(feedback.text, ''),
          instructorId: string(feedback.instructorId),
          updatedAt: string(feedback.updatedAt),
          releasedAt: string(feedback.releasedAt),
        }
      : null,
    failureResolution: failureResolution(value.failureResolution),
  }
}

export function isInstructorSubmissionPending(record) {
  return PENDING_STATUSES.has(record?.status)
}

export function canCorrectOrReview(record) {
  return REVIEWABLE_STATUSES.has(record?.status)
}

export function canRelease(record) {
  return record?.status === 'reviewed'
}

export function canResolveAssessmentFailure(record) {
  return record?.status === 'assessment_failed' && !record?.failureResolution
}
