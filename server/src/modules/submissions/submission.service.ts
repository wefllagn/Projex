import { createHash } from 'node:crypto'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  FailureResolutionInput,
  ReviewSubmissionInput,
  ScoreCorrectionInput,
  SubmissionListQuery,
  SubmissionTransitionInput,
} from './submission.schemas.js'
import type {
  PracticeRecord,
  SubmissionMutationResult,
  SubmissionRecord,
  SubmissionRepository,
} from './submission.repository.js'

export interface ExecutionFeatureConfig {
  mode: 'disabled' | 'local_process'
  sourceLimitBytes: number
  practiceRunTtlHours: number
  practiceRunsPerMinute: number
  practiceMaxActivePerActivity: number
}

export interface SubmissionService {
  create(
    caller: SafeUserProfile,
    activityId: string,
    sourceCode: string,
    idempotencyKey: string,
  ): Promise<{ submission: unknown; idempotentReplay: boolean }>
  list(
    caller: SafeUserProfile,
    activityId: string,
    query: SubmissionListQuery,
  ): Promise<{ submissions: unknown[]; pagination: PaginationMeta }>
  get(caller: SafeUserProfile, submissionId: string): Promise<unknown>
  correctScore(
    caller: SafeUserProfile,
    submissionId: string,
    input: ScoreCorrectionInput,
  ): Promise<unknown>
  review(
    caller: SafeUserProfile,
    submissionId: string,
    input: ReviewSubmissionInput,
  ): Promise<unknown>
  release(
    caller: SafeUserProfile,
    submissionId: string,
    input: SubmissionTransitionInput,
  ): Promise<unknown>
  retry(
    caller: SafeUserProfile,
    submissionId: string,
    input: SubmissionTransitionInput,
  ): Promise<unknown>
  resolveFailure(
    caller: SafeUserProfile,
    submissionId: string,
    input: FailureResolutionInput,
  ): Promise<unknown>
  createPracticeRun(
    caller: SafeUserProfile,
    activityId: string,
    sourceCode: string,
  ): Promise<unknown>
  getPracticeRun(caller: SafeUserProfile, runId: string): Promise<unknown>
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function error(statusCode: number, code: string, message: string): AppError {
  return new AppError({ statusCode, code, message })
}

function validateSource(sourceCode: string, limit: number): void {
  if (Buffer.byteLength(sourceCode, 'utf8') > limit) {
    throw error(413, 'SOURCE_CODE_TOO_LARGE', 'The source code exceeds the allowed size.')
  }
  if (sourceCode.includes('\0')) {
    throw error(400, 'SOURCE_CODE_INVALID', 'The source code contains unsupported characters.')
  }
}

function requireExecutionEnabled(config: ExecutionFeatureConfig): void {
  if (config.mode === 'disabled') {
    throw error(
      503,
      'EXECUTION_UNAVAILABLE',
      'Java execution is not available in this environment.',
    )
  }
}

function requireInstructor(caller: SafeUserProfile): void {
  if (caller.role !== 'INSTRUCTOR' || caller.status !== 'ACTIVE') {
    throw error(403, 'FORBIDDEN', 'You are not authorized to perform this action.')
  }
}

function mapMutation(result: SubmissionMutationResult): SubmissionRecord {
  if (result.kind === 'updated') return result.submission
  if (result.kind === 'not_found' || result.kind === 'forbidden') {
    throw error(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.')
  }
  if (result.kind === 'stale') {
    throw error(409, 'STALE_SUBMISSION_VERSION', 'The submission changed. Reload it before trying again.')
  }
  if (result.kind === 'score_out_of_bounds') {
    throw error(409, 'SCORE_OUT_OF_BOUNDS', 'The score component exceeds its approved bounds.')
  }
  if (result.kind === 'expiration_required') {
    throw error(409, 'REPLACEMENT_EXPIRATION_INVALID', 'A future replacement expiration is required.')
  }
  throw error(409, 'INVALID_SUBMISSION_TRANSITION', 'The submission transition is not allowed.')
}

function effectiveAutomatedScore(record: SubmissionRecord): number | null {
  const latest = record.scoreCorrections.at(-1)
  if (latest) return Number(latest.newEffectiveScore)
  return record.originalAutomatedScore === null
    ? null
    : Number(record.originalAutomatedScore)
}

function attemptLabel(record: SubmissionRecord): string {
  const replaced = record.replacementResolutionUsed?.failedSubmission.attemptNumber
  return replaced
    ? `Replacement attempt for Attempt ${replaced}`
    : `Attempt ${record.attemptNumber}`
}

function baseProjection(record: SubmissionRecord) {
  return {
    id: record.id,
    activityId: record.activityId,
    activityTitle: record.activityTitleSnapshot,
    attemptLabel: attemptLabel(record),
    replacementForAttemptNumber:
      record.replacementResolutionUsed?.failedSubmission.attemptNumber ?? null,
    submittedAt: record.submittedAt,
    status: record.submissionStatus.toLowerCase(),
    isLate: record.isLate,
    updatedAt: record.updatedAt,
  }
}

function studentProjection(record: SubmissionRecord) {
  const visibleResults =
    record.execution?.testCaseResults
      .filter((result) => !result.isHiddenSnapshot)
      .map((result) => ({
        name: result.testNameSnapshot,
        order: result.testOrderSnapshot,
        outcome: result.passStatus.toLowerCase(),
        actualOutput: result.actualOutput,
        errorMessage: result.errorMessage,
        executionTimeMs: result.executionTimeMs,
      })) ?? []
  const released = record.submissionStatus === 'RELEASED'
  return {
    ...baseProjection(record),
    sourceCode: record.sourceCode,
    visibleTestOutcomes: visibleResults,
    gradeStatus: released ? 'released' : 'pending',
    ...(released
      ? {
          finalScore: Number(record.releasedFinalScore),
          totalPoints: Number(record.totalPointsSnapshot),
          feedback: record.feedback?.feedbackText ?? null,
        }
      : {}),
    failureResolution: record.failureResolution
      ? {
          status: 'resolved',
          replacementGranted:
            record.failureResolution.resolutionType === 'REPLACEMENT_GRANTED',
          replacementAvailable:
            record.failureResolution.resolutionType === 'REPLACEMENT_GRANTED' &&
            !record.failureResolution.replacementSubmissionId &&
            record.failureResolution.replacementExpiresAt !== null &&
            record.failureResolution.replacementExpiresAt > new Date(),
          replacementExpiresAt:
            record.failureResolution.replacementExpiresAt ?? null,
        }
      : null,
  }
}

function instructorProjection(record: SubmissionRecord) {
  return {
    ...baseProjection(record),
    attemptNumber: record.attemptNumber,
    countsTowardAttemptLimit: record.countsTowardAttemptLimit,
    student: record.student,
    sourceCode: record.sourceCode,
    assessment: record.execution
      ? {
          compileStatus: record.execution.compileStatus.toLowerCase(),
          runtimeStatus: record.execution.runtimeStatus.toLowerCase(),
          compilerOutput: record.execution.compilerOutput,
          infrastructureFailureCode:
            record.execution.infrastructureFailureCode,
          startedAt: record.execution.startedAt,
          completedAt: record.execution.completedAt,
          testResults: record.execution.testCaseResults.map((result) => ({
            testCaseId: result.testCaseId,
            name: result.testNameSnapshot,
            order: result.testOrderSnapshot,
            input: result.inputSnapshot,
            expectedOutput: result.expectedOutputSnapshot,
            isHidden: result.isHiddenSnapshot,
            outcome: result.passStatus.toLowerCase(),
            actualOutput: result.actualOutput,
            errorMessage: result.errorMessage,
            automatedPoints: Number(result.automatedPoints),
            maximumPoints: Number(result.maximumPoints),
            executionTimeMs: result.executionTimeMs,
          })),
        }
      : null,
    scores: {
      originalAutomatedScore:
        record.originalAutomatedScore === null
          ? null
          : Number(record.originalAutomatedScore),
      effectiveAutomatedScore: effectiveAutomatedScore(record),
      automatedMaximum: Number(record.automatedMaximum),
      instructorPoints: Number(record.instructorPoints),
      instructorMaximum: Number(record.instructorMaximum),
      finalScore:
        record.submissionStatus === 'RELEASED'
          ? Number(record.releasedFinalScore)
          : null,
      totalPoints: Number(record.totalPointsSnapshot),
    },
    corrections: record.scoreCorrections.map((correction) => ({
      correctionNumber: correction.correctionNumber,
      originalAutomatedScore: Number(correction.originalAutomatedScore),
      previousEffectiveScore: Number(correction.previousEffectiveScore),
      newEffectiveScore: Number(correction.newEffectiveScore),
      reason: correction.reason,
      correctedById: correction.correctedById,
      correctedAt: correction.correctedAt,
    })),
    feedback: record.feedback
      ? {
          text: record.feedback.feedbackText,
          instructorId: record.feedback.instructorId,
          updatedAt: record.feedback.updatedAt,
          releasedAt: record.feedback.releasedAt,
        }
      : null,
    failureResolution: record.failureResolution,
  }
}

function adminProjection(record: SubmissionRecord) {
  return {
    ...baseProjection(record),
    attemptNumber: record.attemptNumber,
    countsTowardAttemptLimit: record.countsTowardAttemptLimit,
    student: { id: record.student.id, fullName: record.student.fullName },
    assessmentStatus: record.submissionStatus.toLowerCase(),
    releasedFinalScore:
      record.submissionStatus === 'RELEASED'
        ? Number(record.releasedFinalScore)
        : null,
    totalPoints: Number(record.totalPointsSnapshot),
  }
}

async function project(
  repository: SubmissionRepository,
  caller: SafeUserProfile,
  record: SubmissionRecord,
): Promise<unknown> {
  if (caller.role === 'ADMIN') return adminProjection(record)
  if (
    caller.role === 'INSTRUCTOR' &&
    record.activity.class.instructorId === caller.id
  ) {
    return instructorProjection(record)
  }
  if (
    caller.role === 'STUDENT' &&
    record.studentId === caller.id &&
    (await repository.list({
      activityId: record.activityId,
      callerId: caller.id,
      callerRole: caller.role,
      query: { page: 1, pageSize: 1 },
    })) !== null
  ) {
    return studentProjection(record)
  }
  throw error(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.')
}

function practiceProjection(record: PracticeRecord) {
  return {
    id: record.id,
    activityId: record.activityId,
    activityTitle: record.activity.title,
    status: record.status.toLowerCase(),
    compileStatus: record.compileStatus.toLowerCase(),
    runtimeStatus: record.runtimeStatus.toLowerCase(),
    compilerOutput: record.compilerOutput,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
    expiresAt: record.expiresAt,
    visibleTestOutcomes: record.cases.map((testCase) => ({
      name: testCase.testNameSnapshot,
      order: testCase.testOrderSnapshot,
      outcome: testCase.passStatus.toLowerCase(),
      actualOutput: testCase.actualOutput,
      errorMessage: testCase.errorMessage,
      executionTimeMs: testCase.executionTimeMs,
    })),
  }
}

export function createSubmissionService(dependencies: {
  repository: SubmissionRepository
  logger: Logger
  config: ExecutionFeatureConfig
  now?: () => Date
}): SubmissionService {
  const { repository, logger, config, now = () => new Date() } = dependencies
  return {
    async create(caller, activityId, sourceCode, idempotencyKey) {
      requireExecutionEnabled(config)
      if (caller.role !== 'STUDENT' || caller.status !== 'ACTIVE') {
        throw error(403, 'FORBIDDEN', 'You are not authorized to submit this activity.')
      }
      validateSource(sourceCode, config.sourceLimitBytes)
      const result = await repository.createSubmission({
        activityId,
        studentId: caller.id,
        sourceCode,
        sourceHash: sha256(sourceCode),
        idempotencyKeyHash: sha256(idempotencyKey),
        payloadHash: sha256(sourceCode),
        now: now(),
      })
      if (result.kind === 'idempotency_conflict') {
        throw error(409, 'DUPLICATE_SUBMISSION_REQUEST', 'The idempotency key was already used with different source code.')
      }
      if (result.kind === 'activity_not_found') {
        throw error(404, 'ACTIVITY_NOT_FOUND', 'Programming activity not found.')
      }
      if (result.kind === 'forbidden') {
        throw error(403, 'FORBIDDEN', 'You are not authorized to submit this activity.')
      }
      if (result.kind === 'activity_not_accepting') {
        throw error(409, 'ACTIVITY_NOT_ACCEPTING_SUBMISSIONS', 'The activity is not accepting submissions.')
      }
      if (result.kind === 'attempt_limit_reached') {
        throw error(409, 'ATTEMPT_LIMIT_REACHED', "This activity's usable attempt limit has been reached.")
      }
      if (result.kind === 'created') {
        logger.info(
          {
            event: 'submission.created',
            actorId: caller.id,
            activityId,
            submissionId: result.submission.id,
          },
          'submission created',
        )
      }
      return {
        submission: studentProjection(result.submission),
        idempotentReplay: result.kind === 'replayed',
      }
    },

    async list(caller, activityId, query) {
      const result = await repository.list({
        activityId,
        callerId: caller.id,
        callerRole: caller.role,
        query,
      })
      if (!result) throw error(404, 'ACTIVITY_NOT_FOUND', 'Programming activity not found.')
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        submissions: await Promise.all(
          result.submissions.map((record) => project(repository, caller, record)),
        ),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: result.totalItems,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      }
    },

    async get(caller, submissionId) {
      const record = await repository.findById(submissionId)
      if (!record) throw error(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.')
      return project(repository, caller, record)
    },

    async correctScore(caller, submissionId, input) {
      requireInstructor(caller)
      const record = mapMutation(
        await repository.createCorrection({
          submissionId,
          instructorId: caller.id,
          correction: input,
          now: now(),
        }),
      )
      logger.info(
        { event: 'submission.score_corrected', actorId: caller.id, submissionId },
        'submission automated score corrected',
      )
      return instructorProjection(record)
    },

    async review(caller, submissionId, input) {
      requireInstructor(caller)
      const record = mapMutation(
        await repository.saveReview({
          submissionId,
          instructorId: caller.id,
          review: input,
          now: now(),
        }),
      )
      logger.info(
        { event: 'submission.review_saved', actorId: caller.id, submissionId },
        'submission review saved',
      )
      return instructorProjection(record)
    },

    async release(caller, submissionId, input) {
      requireInstructor(caller)
      const record = mapMutation(
        await repository.release({
          submissionId,
          instructorId: caller.id,
          expectedUpdatedAt: input.expectedUpdatedAt,
          now: now(),
        }),
      )
      logger.info(
        { event: 'submission.released', actorId: caller.id, submissionId },
        'submission released',
      )
      return instructorProjection(record)
    },

    async retry(caller, submissionId, input) {
      requireExecutionEnabled(config)
      requireInstructor(caller)
      const record = mapMutation(
        await repository.retryAssessment({
          submissionId,
          instructorId: caller.id,
          expectedUpdatedAt: input.expectedUpdatedAt,
          now: now(),
        }),
      )
      logger.info(
        { event: 'submission.assessment_retried', actorId: caller.id, submissionId },
        'submission assessment retried',
      )
      return instructorProjection(record)
    },

    async resolveFailure(caller, submissionId, input) {
      requireInstructor(caller)
      const record = mapMutation(
        await repository.resolveFailure({
          submissionId,
          instructorId: caller.id,
          resolution: input,
          now: now(),
        }),
      )
      logger.info(
        {
          event: 'submission.infrastructure_failure_resolved',
          actorId: caller.id,
          submissionId,
          resolutionType: input.resolutionType,
        },
        'submission infrastructure failure resolved',
      )
      return instructorProjection(record)
    },

    async createPracticeRun(caller, activityId, sourceCode) {
      requireExecutionEnabled(config)
      if (caller.role !== 'STUDENT' || caller.status !== 'ACTIVE') {
        throw error(403, 'FORBIDDEN', 'You are not authorized to run these tests.')
      }
      validateSource(sourceCode, config.sourceLimitBytes)
      const createdAt = now()
      const result = await repository.createPractice({
        activityId,
        studentId: caller.id,
        sourceCode,
        sourceHash: sha256(sourceCode),
        now: createdAt,
        expiresAt: new Date(
          createdAt.getTime() + config.practiceRunTtlHours * 60 * 60 * 1000,
        ),
        runsPerMinute: config.practiceRunsPerMinute,
        maxActivePerActivity: config.practiceMaxActivePerActivity,
      })
      if (result.kind === 'activity_not_found') {
        throw error(404, 'ACTIVITY_NOT_FOUND', 'Programming activity not found.')
      }
      if (result.kind === 'forbidden') {
        throw error(403, 'FORBIDDEN', 'You are not authorized to run these tests.')
      }
      if (result.kind === 'activity_not_accepting') {
        throw error(409, 'ACTIVITY_NOT_ACCEPTING_EXECUTION', 'The activity is not accepting visible-test runs.')
      }
      if (result.kind === 'rate_limited') {
        throw error(429, 'RATE_LIMIT_EXCEEDED', 'Too many visible-test runs were requested.')
      }
      if (result.kind === 'capacity_unavailable') {
        throw error(503, 'EXECUTION_CAPACITY_UNAVAILABLE', 'A visible-test run is already processing.')
      }
      logger.info(
        {
          event: 'practice_execution.created',
          actorId: caller.id,
          activityId,
          practiceExecutionId: result.practice.id,
        },
        'visible-test run created',
      )
      return practiceProjection(result.practice)
    },

    async getPracticeRun(caller, runId) {
      const record = await repository.findPracticeById(runId)
      if (!record) throw error(404, 'PRACTICE_RUN_NOT_FOUND', 'Visible-test run not found.')
      if (caller.role === 'STUDENT' && record.studentId !== caller.id) {
        throw error(404, 'PRACTICE_RUN_NOT_FOUND', 'Visible-test run not found.')
      }
      if (
        caller.role === 'INSTRUCTOR' &&
        record.activity.class.instructorId !== caller.id
      ) {
        throw error(404, 'PRACTICE_RUN_NOT_FOUND', 'Visible-test run not found.')
      }
      return practiceProjection(record)
    },
  }
}
