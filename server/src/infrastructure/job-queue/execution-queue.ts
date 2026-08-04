import { Prisma, type PrismaClient } from '@prisma/client'
import type {
  JavaAssessmentResult,
  JavaCaseInput,
} from '../java/java-runner.js'

export interface ClaimedExecutionJob {
  id: string
  jobType: 'OFFICIAL_ASSESSMENT' | 'VISIBLE_TEST_RUN'
  submissionId: string | null
  practiceExecutionId: string | null
  workerId: string
  sourceCode: string
  entryClassName: string
  cases: JavaCaseInput[]
}

interface ClaimedRow {
  execution_job_id: string
  job_type: ClaimedExecutionJob['jobType']
  submission_id: string | null
  practice_execution_id: string | null
}

export interface ExecutionQueue {
  claimNext(input: {
    workerId: string
    now: Date
    leaseMs: number
  }): Promise<ClaimedExecutionJob | null>
  complete(
    job: ClaimedExecutionJob,
    result: JavaAssessmentResult,
    now: Date,
  ): Promise<boolean>
  failInfrastructure(
    job: ClaimedExecutionJob,
    failureCode: string,
    now: Date,
  ): Promise<'retry_queued' | 'failed' | 'stale'>
  cleanupExpiredPractice(now: Date): Promise<number>
}

async function markExpiredExhausted(
  transaction: Prisma.TransactionClient,
  now: Date,
): Promise<void> {
  const exhausted = await transaction.$queryRaw<ClaimedRow[]>`
    SELECT "execution_job_id", "job_type", "submission_id", "practice_execution_id"
    FROM "execution_jobs"
    WHERE "status" = 'RUNNING'
      AND "lease_expires_at" <= ${now}
      AND "claim_attempt" >= "max_claim_attempts"
    FOR UPDATE SKIP LOCKED
  `
  for (const row of exhausted) {
    await transaction.executionJob.update({
      where: { id: row.execution_job_id },
      data: {
        status: 'FAILED',
        completedAt: now,
        leaseExpiresAt: null,
        lastFailureCode: 'WORKER_LEASE_EXHAUSTED',
      },
    })
    if (row.submission_id) {
      await transaction.activitySubmission.update({
        where: { id: row.submission_id },
        data: { submissionStatus: 'ASSESSMENT_FAILED', updatedAt: now },
      })
      await transaction.submissionExecution.update({
        where: { submissionId: row.submission_id },
        data: {
          compileStatus: 'INFRASTRUCTURE_ERROR',
          infrastructureFailureCode: 'WORKER_LEASE_EXHAUSTED',
          completedAt: now,
        },
      })
    } else if (row.practice_execution_id) {
      await transaction.practiceExecution.update({
        where: { id: row.practice_execution_id },
        data: {
          status: 'FAILED',
          compileStatus: 'INFRASTRUCTURE_ERROR',
          completedAt: now,
        },
      })
    }
  }
}

export function createPostgresExecutionQueue(prisma: PrismaClient): ExecutionQueue {
  return {
    claimNext(input) {
      return prisma.$transaction(async (transaction) => {
        await markExpiredExhausted(transaction, input.now)
        const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
        const rows = await transaction.$queryRaw<ClaimedRow[]>`
          WITH candidate AS (
            SELECT "execution_job_id"
            FROM "execution_jobs"
            WHERE (
              ("status" = 'QUEUED' AND "available_at" <= ${input.now})
              OR ("status" = 'RUNNING' AND "lease_expires_at" <= ${input.now})
            )
              AND "claim_attempt" < "max_claim_attempts"
            ORDER BY "available_at" ASC, "created_at" ASC, "execution_job_id" ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "execution_jobs" AS job
          SET "status" = 'RUNNING',
              "claim_attempt" = job."claim_attempt" + 1,
              "claimed_at" = ${input.now},
              "lease_expires_at" = ${leaseExpiresAt},
              "worker_id" = ${input.workerId},
              "updated_at" = ${input.now}
          FROM candidate
          WHERE job."execution_job_id" = candidate."execution_job_id"
          RETURNING job."execution_job_id", job."job_type",
                    job."submission_id", job."practice_execution_id"
        `
        const row = rows[0]
        if (!row) return null

        if (row.submission_id) {
          const submission = await transaction.activitySubmission.update({
            where: { id: row.submission_id },
            data: { submissionStatus: 'ASSESSING', updatedAt: input.now },
            include: {
              activity: { select: { entryClassName: true } },
              execution: {
                include: {
                  testCaseResults: {
                    orderBy: { testOrderSnapshot: 'asc' },
                  },
                },
              },
            },
          })
          await transaction.submissionExecution.update({
            where: { submissionId: submission.id },
            data: { startedAt: input.now, completedAt: null },
          })
          return {
            id: row.execution_job_id,
            jobType: 'OFFICIAL_ASSESSMENT',
            submissionId: submission.id,
            practiceExecutionId: null,
            workerId: input.workerId,
            sourceCode: submission.sourceCode,
            entryClassName: submission.activity.entryClassName,
            cases: submission.execution!.testCaseResults.map((testCase) => ({
              id: testCase.id,
              input: testCase.inputSnapshot,
              expectedOutput: testCase.expectedOutputSnapshot,
              maximumPoints: Number(testCase.maximumPoints),
            })),
          }
        }

        const practice = await transaction.practiceExecution.update({
          where: { id: row.practice_execution_id! },
          data: { status: 'RUNNING', startedAt: input.now, completedAt: null },
          include: { cases: { orderBy: { testOrderSnapshot: 'asc' } } },
        })
        return {
          id: row.execution_job_id,
          jobType: 'VISIBLE_TEST_RUN',
          submissionId: null,
          practiceExecutionId: practice.id,
          workerId: input.workerId,
          sourceCode: practice.sourceCode,
          entryClassName: practice.entryClassName,
          cases: practice.cases.map((testCase) => ({
            id: testCase.id,
            input: testCase.inputSnapshot,
            expectedOutput: testCase.expectedOutputSnapshot,
          })),
        }
      })
    },

    complete(job, result, now) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.executionJob.findUnique({
          where: { id: job.id },
          select: { status: true, workerId: true },
        })
        if (current?.status !== 'RUNNING' || current.workerId !== job.workerId) {
          return false
        }
        if (job.submissionId) {
          const execution = await transaction.submissionExecution.findUniqueOrThrow({
            where: { submissionId: job.submissionId },
            select: { id: true },
          })
          for (const testCase of result.cases) {
            await transaction.testCaseResult.update({
              where: { id: testCase.id },
              data: {
                passStatus: testCase.status,
                actualOutput: testCase.actualOutput,
                errorMessage: testCase.errorMessage,
                automatedPoints: new Prisma.Decimal(testCase.automatedPoints),
                executionTimeMs: testCase.executionTimeMs,
              },
            })
          }
          const aggregate = await transaction.testCaseResult.aggregate({
            where: { executionId: execution.id },
            _sum: { automatedPoints: true },
          })
          await transaction.submissionExecution.update({
            where: { submissionId: job.submissionId },
            data: {
              compileStatus: result.compileStatus,
              runtimeStatus: result.runtimeStatus,
              compilerOutput: result.compilerOutput,
              infrastructureFailureCode: null,
              completedAt: now,
            },
          })
          await transaction.activitySubmission.update({
            where: { id: job.submissionId },
            data: {
              submissionStatus: 'ASSESSED',
              originalAutomatedScore:
                aggregate._sum.automatedPoints ?? new Prisma.Decimal(0),
              updatedAt: now,
            },
          })
        } else {
          for (const testCase of result.cases) {
            await transaction.practiceExecutionCase.update({
              where: { id: testCase.id },
              data: {
                passStatus: testCase.status,
                actualOutput: testCase.actualOutput,
                errorMessage: testCase.errorMessage,
                executionTimeMs: testCase.executionTimeMs,
              },
            })
          }
          await transaction.practiceExecution.update({
            where: { id: job.practiceExecutionId! },
            data: {
              status:
                result.runtimeStatus === 'TIMEOUT' ? 'TIMEOUT' : 'SUCCEEDED',
              compileStatus: result.compileStatus,
              runtimeStatus: result.runtimeStatus,
              compilerOutput: result.compilerOutput,
              completedAt: now,
            },
          })
        }
        await transaction.executionJob.update({
          where: { id: job.id },
          data: {
            status: 'SUCCEEDED',
            completedAt: now,
            leaseExpiresAt: null,
            updatedAt: now,
          },
        })
        return true
      })
    },

    failInfrastructure(job, failureCode, now) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.executionJob.findUnique({
          where: { id: job.id },
        })
        if (current?.status !== 'RUNNING' || current.workerId !== job.workerId) {
          return 'stale' as const
        }
        const retry = current.claimAttempt < current.maxClaimAttempts
        await transaction.executionJob.update({
          where: { id: current.id },
          data: retry
            ? {
                status: 'QUEUED',
                availableAt: new Date(now.getTime() + current.claimAttempt * 1_000),
                claimedAt: null,
                leaseExpiresAt: null,
                workerId: null,
                lastFailureCode: failureCode,
                updatedAt: now,
              }
            : {
                status: 'FAILED',
                completedAt: now,
                leaseExpiresAt: null,
                lastFailureCode: failureCode,
                updatedAt: now,
              },
        })
        if (job.submissionId) {
          await transaction.activitySubmission.update({
            where: { id: job.submissionId },
            data: {
              submissionStatus: retry ? 'QUEUED' : 'ASSESSMENT_FAILED',
              updatedAt: now,
            },
          })
          await transaction.submissionExecution.update({
            where: { submissionId: job.submissionId },
            data: {
              compileStatus: retry ? 'PENDING' : 'INFRASTRUCTURE_ERROR',
              runtimeStatus: 'NOT_RUN',
              infrastructureFailureCode: failureCode,
              completedAt: retry ? null : now,
            },
          })
        } else {
          await transaction.practiceExecution.update({
            where: { id: job.practiceExecutionId! },
            data: {
              status: retry ? 'QUEUED' : 'FAILED',
              compileStatus: retry ? 'PENDING' : 'INFRASTRUCTURE_ERROR',
              runtimeStatus: 'NOT_RUN',
              completedAt: retry ? null : now,
            },
          })
        }
        return retry ? ('retry_queued' as const) : ('failed' as const)
      })
    },

    async cleanupExpiredPractice(now) {
      const result = await prisma.practiceExecution.deleteMany({
        where: {
          expiresAt: { lte: now },
          status: { in: ['SUCCEEDED', 'FAILED', 'TIMEOUT'] },
        },
      })
      return result.count
    },
  }
}
