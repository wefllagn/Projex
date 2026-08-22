const PRACTICE_PENDING = new Set(['queued', 'running'])
const SUBMISSION_PENDING = new Set(['queued', 'assessing'])

function nullableString(value) {
  return typeof value === 'string' ? value : null
}

function nullableNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function visibleOutcome(value = {}) {
  return {
    name: nullableString(value.name) ?? 'Visible test',
    order: nullableNumber(value.order) ?? 0,
    outcome: nullableString(value.outcome) ?? 'pending',
    expectedOutput: nullableString(value.expectedOutput),
    actualOutput: nullableString(value.actualOutput),
    errorMessage: nullableString(value.errorMessage),
    executionTimeMs: nullableNumber(value.executionTimeMs),
  }
}

function visibleOutcomes(value) {
  return Array.isArray(value)
    ? value.filter((outcome) => outcome?.isHidden !== true).map(visibleOutcome)
    : []
}

export function projectPracticeRun(value = {}) {
  return {
    id: nullableString(value.id),
    activityId: nullableString(value.activityId),
    activityTitle: nullableString(value.activityTitle),
    status: nullableString(value.status) ?? 'queued',
    compileStatus: nullableString(value.compileStatus) ?? 'pending',
    runtimeStatus: nullableString(value.runtimeStatus) ?? 'pending',
    compilerOutput: nullableString(value.compilerOutput),
    createdAt: nullableString(value.createdAt),
    completedAt: nullableString(value.completedAt),
    expiresAt: nullableString(value.expiresAt),
    visibleTestOutcomes: visibleOutcomes(value.visibleTestOutcomes),
  }
}

export function projectStudentSubmission(value = {}) {
  const status = nullableString(value.status) ?? 'queued'
  const released = status === 'released' && value.gradeStatus === 'released'
  const failure = value.failureResolution
  return {
    id: nullableString(value.id),
    activityId: nullableString(value.activityId),
    activityTitle: nullableString(value.activityTitle),
    attemptLabel: nullableString(value.attemptLabel) ?? 'Submission attempt',
    replacementForAttemptNumber: nullableNumber(value.replacementForAttemptNumber),
    submittedAt: nullableString(value.submittedAt),
    status,
    isLate: value.isLate === true,
    updatedAt: nullableString(value.updatedAt),
    sourceCode: nullableString(value.sourceCode) ?? '',
    visibleTestOutcomes: visibleOutcomes(value.visibleTestOutcomes),
    gradeStatus: released ? 'released' : 'pending',
    failureResolution: failure && typeof failure === 'object'
      ? {
          status: nullableString(failure.status),
          replacementGranted: failure.replacementGranted === true,
          replacementAvailable: failure.replacementAvailable === true,
          replacementExpiresAt: nullableString(failure.replacementExpiresAt),
        }
      : null,
    ...(released
      ? {
          finalScore: nullableNumber(value.finalScore),
          totalPoints: nullableNumber(value.totalPoints),
          feedback: nullableString(value.feedback),
        }
      : {}),
  }
}

export function isPracticePending(record) {
  return PRACTICE_PENDING.has(record?.status)
}

export function isSubmissionPending(record) {
  return SUBMISSION_PENDING.has(record?.status)
}
