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
    isCreditedResult: released && value.isCreditedResult === true,
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

export function projectStudentAttemptState(value = {}) {
  const credited = value.creditedResult && typeof value.creditedResult === 'object'
    ? value.creditedResult
    : null
  const replacement = value.replacement && typeof value.replacement === 'object'
    ? value.replacement
    : null
  return {
    activityId: nullableString(value.activityId),
    activityStatus: nullableString(value.activityStatus),
    dueState: nullableString(value.dueState),
    maxAttempts: nullableNumber(value.maxAttempts) ?? 0,
    creditPolicy: value.creditPolicy === 'HIGHEST' ? 'HIGHEST' : 'LATEST',
    countingAttemptsUsed: nullableNumber(value.countingAttemptsUsed) ?? 0,
    remainingOrdinaryAttempts: nullableNumber(value.remainingOrdinaryAttempts) ?? 0,
    ordinarySubmissionAllowed: value.ordinarySubmissionAllowed === true,
    replacementAvailable: value.replacementAvailable === true,
    replacement: replacement
      ? {
          expiresAt: nullableString(replacement.expiresAt),
          forAttemptLabel: nullableString(replacement.forAttemptLabel),
        }
      : null,
    nextAllowedSubmissionKind: ['ORDINARY', 'REPLACEMENT'].includes(value.nextAllowedSubmissionKind)
      ? value.nextAllowedSubmissionKind
      : 'NONE',
    submissionBlockedReason: nullableString(value.submissionBlockedReason),
    releasedAttempts: Array.isArray(value.releasedAttempts)
      ? value.releasedAttempts.map((attempt) => ({
          submissionId: nullableString(attempt.submissionId),
          attemptLabel: nullableString(attempt.attemptLabel) ?? 'Submission attempt',
          replacementForAttemptNumber: nullableNumber(attempt.replacementForAttemptNumber),
          submittedAt: nullableString(attempt.submittedAt),
          releasedAt: nullableString(attempt.releasedAt),
          score: nullableNumber(attempt.score),
          totalPoints: nullableNumber(attempt.totalPoints),
          credited: attempt.credited === true,
        }))
      : [],
    creditedResult: credited
      ? {
          submissionId: nullableString(credited.submissionId),
          attemptLabel: nullableString(credited.attemptLabel) ?? 'Submission attempt',
          score: nullableNumber(credited.score),
          totalPoints: nullableNumber(credited.totalPoints),
        }
      : null,
    observedAt: nullableString(value.observedAt),
  }
}

export function isPracticePending(record) {
  return PRACTICE_PENDING.has(record?.status)
}

export function isSubmissionPending(record) {
  return SUBMISSION_PENDING.has(record?.status)
}
