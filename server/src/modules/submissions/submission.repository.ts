import {
  Prisma,
  type PrismaClient,
  type UserRole,
} from '@prisma/client'
import type {
  FailureResolutionInput,
  ReviewSubmissionInput,
  ScoreCorrectionInput,
  SubmissionListQuery,
} from './submission.schemas.js'
import { isOrdinarySubmissionOpen } from '../activities/activity.types.js'
import {
  selectCreditedReleasedAttempt,
  type AttemptCreditPolicyValue,
} from './submission-credit.js'

export const submissionInclude = {
  activity: {
    select: {
      id: true,
      classId: true,
      title: true,
      status: true,
      totalPoints: true,
      creditPolicy: true,
      class: { select: { id: true, instructorId: true, status: true } },
    },
  },
  student: { select: { id: true, fullName: true, email: true } },
  execution: {
    include: {
      testCaseResults: { orderBy: { testOrderSnapshot: 'asc' as const } },
    },
  },
  executionJob: true,
  scoreCorrections: { orderBy: { correctionNumber: 'asc' as const } },
  feedback: true,
  failureResolution: true,
  replacementResolutionUsed: {
    include: {
      failedSubmission: { select: { id: true, attemptNumber: true } },
    },
  },
} as const

export type SubmissionRecord = Prisma.ActivitySubmissionGetPayload<{
  include: typeof submissionInclude
}>

export const practiceInclude = {
  activity: {
    select: {
      id: true,
      classId: true,
      title: true,
      status: true,
      class: { select: { id: true, instructorId: true, status: true } },
    },
  },
  cases: { orderBy: { testOrderSnapshot: 'asc' as const } },
  executionJob: true,
} as const

export type PracticeRecord = Prisma.PracticeExecutionGetPayload<{
  include: typeof practiceInclude
}>

const releasedAttemptSelect = {
  id: true,
  attemptNumber: true,
  submittedAt: true,
  releasedAt: true,
  releasedFinalScore: true,
  totalPointsSnapshot: true,
  replacementResolutionUsed: {
    select: {
      failedSubmission: { select: { attemptNumber: true } },
    },
  },
} as const

export type ReleasedAttemptRecord = Prisma.ActivitySubmissionGetPayload<{
  select: typeof releasedAttemptSelect
}>

export interface StudentAttemptStateRecord {
  activity: {
    id: string
    status: 'PUBLISHED' | 'CLOSED'
    dueDate: Date
    maxAttempts: number
    creditPolicy: AttemptCreditPolicyValue
    classStatus: 'ACTIVE' | 'ARCHIVED'
  }
  countingAttemptsUsed: number
  availableReplacement: {
    replacementExpiresAt: Date
    failedAttemptNumber: number
  } | null
  releasedAttempts: ReleasedAttemptRecord[]
}

export type CreateSubmissionResult =
  | { kind: 'created'; submission: SubmissionRecord }
  | { kind: 'replayed'; submission: SubmissionRecord }
  | { kind: 'idempotency_conflict' }
  | { kind: 'activity_not_found' }
  | { kind: 'forbidden' }
  | { kind: 'activity_not_accepting' }
  | { kind: 'attempt_limit_reached' }

export type CreatePracticeResult =
  | { kind: 'created'; practice: PracticeRecord }
  | { kind: 'activity_not_found' }
  | { kind: 'forbidden' }
  | { kind: 'activity_not_accepting' }
  | { kind: 'rate_limited' }
  | { kind: 'capacity_unavailable' }

export type SubmissionMutationResult =
  | { kind: 'updated'; submission: SubmissionRecord }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'invalid_state' }
  | { kind: 'stale' }
  | { kind: 'score_out_of_bounds' }
  | { kind: 'expiration_required' }

export interface SubmissionRepository {
  createSubmission(input: {
    activityId: string
    studentId: string
    sourceCode: string
    sourceHash: string
    idempotencyKeyHash: string
    payloadHash: string
    now: Date
  }): Promise<CreateSubmissionResult>
  list(input: {
    activityId: string
    callerId: string
    callerRole: UserRole
    query: SubmissionListQuery
  }): Promise<{
    submissions: SubmissionRecord[]
    totalItems: number
    creditedSubmissionIds: Set<string>
  } | null>
  findById(submissionId: string): Promise<SubmissionRecord | null>
  findCreditedSubmissionId(
    activityId: string,
    studentId: string,
  ): Promise<string | null>
  getStudentAttemptState(input: {
    activityId: string
    studentId: string
    now: Date
  }): Promise<StudentAttemptStateRecord | null>
  createCorrection(input: {
    submissionId: string
    instructorId: string
    correction: ScoreCorrectionInput
    now: Date
  }): Promise<SubmissionMutationResult>
  saveReview(input: {
    submissionId: string
    instructorId: string
    review: ReviewSubmissionInput
    now: Date
  }): Promise<SubmissionMutationResult>
  release(input: {
    submissionId: string
    instructorId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<SubmissionMutationResult>
  retryAssessment(input: {
    submissionId: string
    instructorId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<SubmissionMutationResult>
  resolveFailure(input: {
    submissionId: string
    instructorId: string
    resolution: FailureResolutionInput
    now: Date
  }): Promise<SubmissionMutationResult>
  createPractice(input: {
    activityId: string
    studentId: string
    sourceCode: string
    sourceHash: string
    now: Date
    expiresAt: Date
    runsPerMinute: number
    maxActivePerActivity: number
  }): Promise<CreatePracticeResult>
  findPracticeById(runId: string): Promise<PracticeRecord | null>
}

async function lockScope(
  transaction: Prisma.TransactionClient,
  scope: string,
): Promise<void> {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))::text AS lock_result
  `
}

async function lockSubmission(
  transaction: Prisma.TransactionClient,
  submissionId: string,
): Promise<void> {
  await transaction.$queryRaw`
    SELECT "submission_id"
    FROM "activity_submissions"
    WHERE "submission_id" = ${submissionId}::uuid
    FOR UPDATE
  `
}

function nextUpdatedAt(expected: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expected.getTime() + 1))
}

function effectiveScore(record: SubmissionRecord): number | null {
  const latest = record.scoreCorrections.at(-1)
  if (latest) return Number(latest.newEffectiveScore)
  return record.originalAutomatedScore === null
    ? null
    : Number(record.originalAutomatedScore)
}

function creditedIdsByStudent(
  policy: AttemptCreditPolicyValue,
  candidates: Array<ReleasedAttemptRecord & { studentId: string }>,
): Set<string> {
  const byStudent = new Map<string, Array<ReleasedAttemptRecord & { studentId: string }>>()
  for (const candidate of candidates) {
    const current = byStudent.get(candidate.studentId) ?? []
    current.push(candidate)
    byStudent.set(candidate.studentId, current)
  }
  return new Set(
    [...byStudent.values()]
      .map((records) =>
        selectCreditedReleasedAttempt(
          policy,
          records.map((record) => ({
            ...record,
            releasedFinalScore: Number(record.releasedFinalScore),
          })),
        )?.id,
      )
      .filter((id): id is string => Boolean(id)),
  )
}

function canInstructorMutate(
  record: SubmissionRecord,
  instructorId: string,
): boolean {
  return (
    record.activity.class.instructorId === instructorId &&
    record.activity.class.status === 'ACTIVE' &&
    record.activity.status !== 'ARCHIVED'
  )
}

async function loadSubmission(
  transaction: Prisma.TransactionClient,
  submissionId: string,
): Promise<SubmissionRecord | null> {
  return transaction.activitySubmission.findUnique({
    where: { id: submissionId },
    include: submissionInclude,
  })
}

export function createPrismaSubmissionRepository(
  prisma: PrismaClient,
): SubmissionRepository {
  return {
    createSubmission(input) {
      return prisma.$transaction(
        async (transaction) => {
          await lockScope(
            transaction,
            `submission:${input.activityId}:${input.studentId}`,
          )

          await transaction.$queryRaw`
            SELECT activity."activity_id", class_record."class_id"
            FROM "programming_activities" AS activity
            JOIN "classes" AS class_record ON class_record."class_id" = activity."class_id"
            WHERE activity."activity_id" = ${input.activityId}::uuid
            FOR SHARE OF activity, class_record
          `

          const activity = await transaction.programmingActivity.findUnique({
            where: { id: input.activityId },
            include: {
              class: {
                include: {
                  members: {
                    where: { studentId: input.studentId },
                    take: 1,
                    select: { status: true },
                  },
                },
              },
              testCases: { orderBy: { testCaseOrder: 'asc' } },
            },
          })
          if (!activity) return { kind: 'activity_not_found' } as const
          const student = await transaction.user.findUnique({
            where: { id: input.studentId },
            select: { role: true, status: true },
          })
          if (
            !student ||
            student.role !== 'STUDENT' ||
            student.status !== 'ACTIVE' ||
            activity.class.members[0]?.status !== 'ACTIVE'
          ) {
            return { kind: 'forbidden' } as const
          }
          if (activity.class.status !== 'ACTIVE') {
            return { kind: 'activity_not_accepting' } as const
          }

          const replay = await transaction.submissionIdempotency.findUnique({
            where: {
              studentId_activityId_keyHash: {
                studentId: input.studentId,
                activityId: input.activityId,
                keyHash: input.idempotencyKeyHash,
              },
            },
            select: { payloadHash: true, submissionId: true },
          })
          if (replay) {
            if (replay.payloadHash !== input.payloadHash) {
              return { kind: 'idempotency_conflict' } as const
            }
            return {
              kind: 'replayed',
              submission: (await loadSubmission(
                transaction,
                replay.submissionId,
              ))!,
            } as const
          }

          const availableReplacement =
            await transaction.submissionFailureResolution.findFirst({
              where: {
                resolutionType: 'REPLACEMENT_GRANTED',
                replacementSubmissionId: null,
                replacementExpiresAt: { gt: input.now },
                failedSubmission: {
                  activityId: input.activityId,
                  studentId: input.studentId,
                },
              },
              orderBy: [{ resolvedAt: 'asc' }, { id: 'asc' }],
            })

          if (!availableReplacement) {
            if (!isOrdinarySubmissionOpen(activity.status, activity.dueDate, input.now)) {
              return { kind: 'activity_not_accepting' } as const
            }
          } else if (
            activity.status !== 'PUBLISHED' &&
            activity.status !== 'CLOSED'
          ) {
            return { kind: 'activity_not_accepting' } as const
          }

          const [countingAttempts, aggregate] = await Promise.all([
            transaction.activitySubmission.count({
              where: {
                activityId: input.activityId,
                studentId: input.studentId,
                countsTowardAttemptLimit: true,
              },
            }),
            transaction.activitySubmission.aggregate({
              where: {
                activityId: input.activityId,
                studentId: input.studentId,
              },
              _max: { attemptNumber: true },
            }),
          ])
          if (!availableReplacement && countingAttempts >= activity.maxAttempts) {
            return { kind: 'attempt_limit_reached' } as const
          }

          const automatedMaximum = activity.testCases.reduce(
            (total, testCase) => total + Number(testCase.points),
            0,
          )
          const totalPoints = Number(activity.totalPoints)
          const attemptNumber = (aggregate._max.attemptNumber ?? 0) + 1
          const submission = await transaction.activitySubmission.create({
            data: {
              activityId: activity.id,
              studentId: input.studentId,
              attemptNumber,
              sourceCode: input.sourceCode,
              sourceHash: input.sourceHash,
              activityTitleSnapshot: activity.title,
              dueDateSnapshot: activity.dueDate,
              totalPointsSnapshot: activity.totalPoints,
              automatedMaximum: new Prisma.Decimal(automatedMaximum),
              instructorMaximum: new Prisma.Decimal(
                totalPoints - automatedMaximum,
              ),
              submittedAt: input.now,
              updatedAt: input.now,
              submissionStatus: 'QUEUED',
              isLate: input.now.getTime() >= activity.dueDate.getTime(),
              countsTowardAttemptLimit: true,
              execution: {
                create: {
                  testCaseResults: {
                    create: activity.testCases.map((testCase) => ({
                      testCaseId: testCase.id,
                      testNameSnapshot: testCase.name,
                      testOrderSnapshot: testCase.testCaseOrder,
                      inputSnapshot: testCase.inputData,
                      expectedOutputSnapshot: testCase.expectedOutput,
                      isHiddenSnapshot: testCase.isHidden,
                      maximumPoints: testCase.points,
                    })),
                  },
                },
              },
              executionJob: {
                create: { jobType: 'OFFICIAL_ASSESSMENT' },
              },
              idempotency: {
                create: {
                  studentId: input.studentId,
                  activityId: activity.id,
                  keyHash: input.idempotencyKeyHash,
                  payloadHash: input.payloadHash,
                },
              },
            },
            select: { id: true },
          })

          if (availableReplacement) {
            await transaction.submissionFailureResolution.update({
              where: { id: availableReplacement.id },
              data: {
                replacementSubmissionId: submission.id,
                replacementConsumedAt: input.now,
              },
            })
          }

          return {
            kind: 'created',
            submission: (await loadSubmission(transaction, submission.id))!,
          } as const
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    },

    async list(input) {
      const activity = await prisma.programmingActivity.findUnique({
        where: { id: input.activityId },
        select: {
          creditPolicy: true,
          class: {
            select: {
              instructorId: true,
              members: {
                where: { studentId: input.callerId },
                take: 1,
                select: { status: true },
              },
            },
          },
        },
      })
      if (!activity) return null
      const permitted =
        input.callerRole === 'ADMIN' ||
        (input.callerRole === 'INSTRUCTOR' &&
          activity.class.instructorId === input.callerId) ||
        (input.callerRole === 'STUDENT' &&
          activity.class.members[0]?.status === 'ACTIVE')
      if (!permitted) return null
      const where: Prisma.ActivitySubmissionWhereInput = {
        activityId: input.activityId,
        ...(input.callerRole === 'STUDENT'
          ? { studentId: input.callerId }
          : {}),
        ...(input.query.status
          ? { submissionStatus: input.query.status }
          : {}),
      }
      return prisma.$transaction(
        async (transaction) => {
          const [submissions, totalItems] = await Promise.all([
            transaction.activitySubmission.findMany({
              where,
              include: submissionInclude,
              orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
              skip: (input.query.page - 1) * input.query.pageSize,
              take: input.query.pageSize,
            }),
            transaction.activitySubmission.count({ where }),
          ])
          const studentIds = [
            ...new Set(submissions.map((record) => record.studentId)),
          ]
          const releasedCandidates = studentIds.length
            ? await transaction.activitySubmission.findMany({
                where: {
                  activityId: input.activityId,
                  studentId: { in: studentIds },
                  submissionStatus: 'RELEASED',
                  releasedFinalScore: { not: null },
                },
                select: { ...releasedAttemptSelect, studentId: true },
              })
            : []
          return {
            submissions,
            totalItems,
            creditedSubmissionIds: creditedIdsByStudent(
              activity.creditPolicy,
              releasedCandidates,
            ),
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      )
    },

    findById(submissionId) {
      return prisma.activitySubmission.findUnique({
        where: { id: submissionId },
        include: submissionInclude,
      })
    },

    async findCreditedSubmissionId(activityId, studentId) {
      const activity = await prisma.programmingActivity.findUnique({
        where: { id: activityId },
        select: { creditPolicy: true },
      })
      if (!activity) return null
      const candidates = await prisma.activitySubmission.findMany({
        where: {
          activityId,
          studentId,
          submissionStatus: 'RELEASED',
          releasedFinalScore: { not: null },
        },
        select: releasedAttemptSelect,
      })
      return (
        selectCreditedReleasedAttempt(
          activity.creditPolicy,
          candidates.map((record) => ({
            ...record,
            releasedFinalScore: Number(record.releasedFinalScore),
          })),
        )?.id ?? null
      )
    },

    getStudentAttemptState(input) {
      return prisma.$transaction(
        async (transaction) => {
          const [student, activity] = await Promise.all([
            transaction.user.findUnique({
              where: { id: input.studentId },
              select: { role: true, status: true },
            }),
            transaction.programmingActivity.findUnique({
              where: { id: input.activityId },
              select: {
                id: true,
                status: true,
                dueDate: true,
                maxAttempts: true,
                creditPolicy: true,
                class: {
                  select: {
                    status: true,
                    members: {
                      where: { studentId: input.studentId },
                      take: 1,
                      select: { status: true },
                    },
                  },
                },
              },
            }),
          ])
          if (
            !student ||
            student.role !== 'STUDENT' ||
            student.status !== 'ACTIVE' ||
            !activity ||
            (activity.status !== 'PUBLISHED' && activity.status !== 'CLOSED') ||
            activity.class.members[0]?.status !== 'ACTIVE'
          ) {
            return null
          }

          const [countingAttemptsUsed, replacement, releasedAttempts] =
            await Promise.all([
              transaction.activitySubmission.count({
                where: {
                  activityId: input.activityId,
                  studentId: input.studentId,
                  countsTowardAttemptLimit: true,
                },
              }),
              transaction.submissionFailureResolution.findFirst({
                where: {
                  resolutionType: 'REPLACEMENT_GRANTED',
                  replacementSubmissionId: null,
                  replacementExpiresAt: { gt: input.now },
                  failedSubmission: {
                    activityId: input.activityId,
                    studentId: input.studentId,
                  },
                },
                orderBy: [{ resolvedAt: 'asc' }, { id: 'asc' }],
                select: {
                  replacementExpiresAt: true,
                  failedSubmission: { select: { attemptNumber: true } },
                },
              }),
              transaction.activitySubmission.findMany({
                where: {
                  activityId: input.activityId,
                  studentId: input.studentId,
                  submissionStatus: 'RELEASED',
                  releasedFinalScore: { not: null },
                },
                select: releasedAttemptSelect,
                orderBy: [{ attemptNumber: 'asc' }],
              }),
            ])

          return {
            activity: {
              id: activity.id,
              status: activity.status,
              dueDate: activity.dueDate,
              maxAttempts: activity.maxAttempts,
              creditPolicy: activity.creditPolicy,
              classStatus: activity.class.status,
            },
            countingAttemptsUsed,
            availableReplacement:
              replacement?.replacementExpiresAt
                ? {
                    replacementExpiresAt: replacement.replacementExpiresAt,
                    failedAttemptNumber:
                      replacement.failedSubmission.attemptNumber,
                  }
                : null,
            releasedAttempts,
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      )
    },

    createCorrection(input) {
      return prisma.$transaction(async (transaction) => {
        await lockSubmission(transaction, input.submissionId)
        const record = await loadSubmission(transaction, input.submissionId)
        if (!record) return { kind: 'not_found' } as const
        if (!canInstructorMutate(record, input.instructorId)) {
          return { kind: 'forbidden' } as const
        }
        if (record.updatedAt.getTime() !== input.correction.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (
          record.submissionStatus !== 'ASSESSED' &&
          record.submissionStatus !== 'REVIEWED'
        ) {
          return { kind: 'invalid_state' } as const
        }
        const original = record.originalAutomatedScore
        const previous = effectiveScore(record)
        if (original === null || previous === null) {
          return { kind: 'invalid_state' } as const
        }
        if (input.correction.newEffectiveScore > Number(record.automatedMaximum)) {
          return { kind: 'score_out_of_bounds' } as const
        }
        await transaction.submissionScoreCorrection.create({
          data: {
            submissionId: record.id,
            correctionNumber: record.scoreCorrections.length + 1,
            originalAutomatedScore: original,
            previousEffectiveScore: new Prisma.Decimal(previous),
            newEffectiveScore: new Prisma.Decimal(
              input.correction.newEffectiveScore,
            ),
            reason: input.correction.reason,
            correctedById: input.instructorId,
            correctedAt: input.now,
          },
        })
        await transaction.activitySubmission.update({
          where: { id: record.id },
          data: {
            updatedAt: nextUpdatedAt(
              input.correction.expectedUpdatedAt,
              input.now,
            ),
          },
        })
        return {
          kind: 'updated',
          submission: (await loadSubmission(transaction, record.id))!,
        } as const
      })
    },

    saveReview(input) {
      return prisma.$transaction(async (transaction) => {
        await lockSubmission(transaction, input.submissionId)
        const record = await loadSubmission(transaction, input.submissionId)
        if (!record) return { kind: 'not_found' } as const
        if (!canInstructorMutate(record, input.instructorId)) {
          return { kind: 'forbidden' } as const
        }
        if (record.updatedAt.getTime() !== input.review.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (
          record.submissionStatus !== 'ASSESSED' &&
          record.submissionStatus !== 'REVIEWED'
        ) {
          return { kind: 'invalid_state' } as const
        }
        if (input.review.instructorPoints > Number(record.instructorMaximum)) {
          return { kind: 'score_out_of_bounds' } as const
        }
        if (input.review.feedbackText !== undefined) {
          if (input.review.feedbackText.length === 0) {
            await transaction.submissionFeedback.deleteMany({
              where: { submissionId: record.id, releasedAt: null },
            })
          } else {
            await transaction.submissionFeedback.upsert({
              where: { submissionId: record.id },
              create: {
                submissionId: record.id,
                instructorId: input.instructorId,
                feedbackText: input.review.feedbackText,
                createdAt: input.now,
                updatedAt: input.now,
              },
              update: {
                instructorId: input.instructorId,
                feedbackText: input.review.feedbackText,
                updatedAt: input.now,
              },
            })
          }
        }
        await transaction.activitySubmission.update({
          where: { id: record.id },
          data: {
            instructorPoints: new Prisma.Decimal(input.review.instructorPoints),
            submissionStatus: 'REVIEWED',
            reviewedAt: input.now,
            updatedAt: nextUpdatedAt(input.review.expectedUpdatedAt, input.now),
          },
        })
        return {
          kind: 'updated',
          submission: (await loadSubmission(transaction, record.id))!,
        } as const
      })
    },

    release(input) {
      return prisma.$transaction(async (transaction) => {
        await lockSubmission(transaction, input.submissionId)
        const record = await loadSubmission(transaction, input.submissionId)
        if (!record) return { kind: 'not_found' } as const
        if (!canInstructorMutate(record, input.instructorId)) {
          return { kind: 'forbidden' } as const
        }
        if (record.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (record.submissionStatus !== 'REVIEWED') {
          return { kind: 'invalid_state' } as const
        }
        const automated = effectiveScore(record)
        if (automated === null) return { kind: 'invalid_state' } as const
        const finalScore = automated + Number(record.instructorPoints)
        if (finalScore > Number(record.totalPointsSnapshot)) {
          return { kind: 'score_out_of_bounds' } as const
        }
        await transaction.activitySubmission.update({
          where: { id: record.id },
          data: {
            submissionStatus: 'RELEASED',
            releasedFinalScore: new Prisma.Decimal(finalScore),
            releasedAt: input.now,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (record.feedback) {
          await transaction.submissionFeedback.update({
            where: { submissionId: record.id },
            data: { releasedAt: input.now, releasedById: input.instructorId },
          })
        }
        return {
          kind: 'updated',
          submission: (await loadSubmission(transaction, record.id))!,
        } as const
      })
    },

    retryAssessment(input) {
      return prisma.$transaction(async (transaction) => {
        await lockSubmission(transaction, input.submissionId)
        const record = await loadSubmission(transaction, input.submissionId)
        if (!record) return { kind: 'not_found' } as const
        if (!canInstructorMutate(record, input.instructorId)) {
          return { kind: 'forbidden' } as const
        }
        if (record.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (
          record.submissionStatus !== 'ASSESSMENT_FAILED' ||
          record.failureResolution ||
          !record.executionJob ||
          record.executionJob.status !== 'FAILED'
        ) {
          return { kind: 'invalid_state' } as const
        }
        await transaction.testCaseResult.updateMany({
          where: { executionId: record.execution!.id },
          data: {
            passStatus: 'PENDING',
            actualOutput: null,
            errorMessage: null,
            automatedPoints: 0,
            executionTimeMs: null,
          },
        })
        await transaction.submissionExecution.update({
          where: { submissionId: record.id },
          data: {
            compileStatus: 'PENDING',
            runtimeStatus: 'NOT_RUN',
            compilerOutput: null,
            infrastructureFailureCode: null,
            startedAt: null,
            completedAt: null,
          },
        })
        await transaction.executionJob.update({
          where: { submissionId: record.id },
          data: {
            status: 'QUEUED',
            maxClaimAttempts: Math.min(
              record.executionJob.maxClaimAttempts + 1,
              10,
            ),
            availableAt: input.now,
            claimedAt: null,
            leaseExpiresAt: null,
            completedAt: null,
            workerId: null,
          },
        })
        await transaction.activitySubmission.update({
          where: { id: record.id },
          data: {
            submissionStatus: 'QUEUED',
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        return {
          kind: 'updated',
          submission: (await loadSubmission(transaction, record.id))!,
        } as const
      })
    },

    resolveFailure(input) {
      return prisma.$transaction(async (transaction) => {
        await lockSubmission(transaction, input.submissionId)
        const record = await loadSubmission(transaction, input.submissionId)
        if (!record) return { kind: 'not_found' } as const
        if (!canInstructorMutate(record, input.instructorId)) {
          return { kind: 'forbidden' } as const
        }
        if (record.updatedAt.getTime() !== input.resolution.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (
          record.submissionStatus !== 'ASSESSMENT_FAILED' ||
          record.failureResolution ||
          record.executionJob?.status !== 'FAILED'
        ) {
          return { kind: 'invalid_state' } as const
        }
        const expiresAt = input.resolution.replacementExpiresAt
        if (
          input.resolution.resolutionType === 'REPLACEMENT_GRANTED' &&
          (!expiresAt || expiresAt.getTime() <= input.now.getTime())
        ) {
          return { kind: 'expiration_required' } as const
        }
        await transaction.submissionFailureResolution.create({
          data: {
            failedSubmissionId: record.id,
            resolutionType: input.resolution.resolutionType,
            reason: input.resolution.reason,
            resolvedById: input.instructorId,
            resolvedAt: input.now,
            replacementExpiresAt: expiresAt ?? null,
          },
        })
        await transaction.activitySubmission.update({
          where: { id: record.id },
          data: {
            submissionStatus: 'FAILED_RESOLVED',
            countsTowardAttemptLimit:
              input.resolution.resolutionType !== 'REPLACEMENT_GRANTED',
            updatedAt: nextUpdatedAt(
              input.resolution.expectedUpdatedAt,
              input.now,
            ),
          },
        })
        return {
          kind: 'updated',
          submission: (await loadSubmission(transaction, record.id))!,
        } as const
      })
    },

    createPractice(input) {
      return prisma.$transaction(
        async (transaction) => {
          await lockScope(
            transaction,
            `practice:${input.activityId}:${input.studentId}`,
          )
          await transaction.$queryRaw`
            SELECT activity."activity_id", class_record."class_id"
            FROM "programming_activities" AS activity
            JOIN "classes" AS class_record ON class_record."class_id" = activity."class_id"
            WHERE activity."activity_id" = ${input.activityId}::uuid
            FOR SHARE OF activity, class_record
          `
          const activity = await transaction.programmingActivity.findUnique({
            where: { id: input.activityId },
            include: {
              class: {
                include: {
                  members: {
                    where: { studentId: input.studentId },
                    take: 1,
                    select: { status: true },
                  },
                },
              },
              testCases: {
                where: { isHidden: false },
                orderBy: { testCaseOrder: 'asc' },
              },
            },
          })
          if (!activity) return { kind: 'activity_not_found' } as const
          const student = await transaction.user.findUnique({
            where: { id: input.studentId },
            select: { role: true, status: true },
          })
          if (
            !student ||
            student.role !== 'STUDENT' ||
            student.status !== 'ACTIVE' ||
            activity.class.members[0]?.status !== 'ACTIVE'
          ) {
            return { kind: 'forbidden' } as const
          }
          if (
            activity.class.status !== 'ACTIVE' ||
            !isOrdinarySubmissionOpen(activity.status, activity.dueDate, input.now)
          ) {
            return { kind: 'activity_not_accepting' } as const
          }
          const minuteAgo = new Date(input.now.getTime() - 60_000)
          const [active, recent] = await Promise.all([
            transaction.practiceExecution.count({
              where: {
                activityId: input.activityId,
                studentId: input.studentId,
                status: { in: ['QUEUED', 'RUNNING'] },
              },
            }),
            transaction.practiceExecution.count({
              where: {
                studentId: input.studentId,
                createdAt: { gte: minuteAgo },
              },
            }),
          ])
          if (active >= input.maxActivePerActivity) {
            return { kind: 'capacity_unavailable' } as const
          }
          if (recent >= input.runsPerMinute) {
            return { kind: 'rate_limited' } as const
          }
          if (activity.testCases.length === 0) {
            return { kind: 'activity_not_accepting' } as const
          }
          const practice = await transaction.practiceExecution.create({
            data: {
              activityId: activity.id,
              studentId: input.studentId,
              sourceCode: input.sourceCode,
              sourceHash: input.sourceHash,
              entryClassName: activity.entryClassName,
              createdAt: input.now,
              expiresAt: input.expiresAt,
              cases: {
                create: activity.testCases.map((testCase) => ({
                  testCaseId: testCase.id,
                  testNameSnapshot: testCase.name,
                  testOrderSnapshot: testCase.testCaseOrder,
                  inputSnapshot: testCase.inputData,
                  expectedOutputSnapshot: testCase.expectedOutput,
                })),
              },
              executionJob: { create: { jobType: 'VISIBLE_TEST_RUN' } },
            },
            select: { id: true },
          })
          return {
            kind: 'created',
            practice: await transaction.practiceExecution.findUniqueOrThrow({
              where: { id: practice.id },
              include: practiceInclude,
            }),
          } as const
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    },

    findPracticeById(runId) {
      return prisma.practiceExecution.findUnique({
        where: { id: runId },
        include: practiceInclude,
      })
    },
  }
}
