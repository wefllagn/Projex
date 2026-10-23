import type { Prisma, PrismaClient } from '@prisma/client'

export interface ClaimedRepositoryCheckpointJob {
  id: string
  repositoryId: string
  activityId: string
  studentId: string
  sourceCode: string
  expectedHeadCommitHash: string | null
  entryFilePath: string
  storagePath: string
  defaultBranch: string
  workerId: string
  claimAttempt: number
  maxClaimAttempts: number
}

interface ClaimedRow {
  checkpoint_job_id: string
  repository_id: string
  activity_id: string
  student_id: string
  source_code: string
  expected_head_commit_hash: string | null
  entry_file_path: string
  storage_path: string
  default_branch: string
  claim_attempt: number
  max_claim_attempts: number
}

export interface RepositoryCheckpointQueue {
  claimNext(input: { workerId: string; now: Date; leaseMs: number }): Promise<ClaimedRepositoryCheckpointJob | null>
  complete(input: { job: ClaimedRepositoryCheckpointJob; commitHash: string; now: Date }): Promise<boolean>
  fail(input: { job: ClaimedRepositoryCheckpointJob; failureCode: string; conflict?: boolean; retryable?: boolean; now: Date }): Promise<'retry_queued' | 'failed' | 'conflicted' | 'stale'>
}

async function markExpiredExhausted(transaction: Prisma.TransactionClient, now: Date): Promise<void> {
  await transaction.$executeRaw`
    UPDATE "repository_checkpoint_jobs"
    SET "status" = 'FAILED', "completed_at" = ${now}, "lease_expires_at" = NULL,
        "worker_id" = NULL, "source_code" = '',
        "last_failure_code" = 'CHECKPOINT_LEASE_EXHAUSTED', "updated_at" = ${now}
    WHERE "status" = 'RUNNING' AND "lease_expires_at" <= ${now}
      AND "claim_attempt" >= "max_claim_attempts"
  `
}

export function createPostgresRepositoryCheckpointQueue(prisma: PrismaClient): RepositoryCheckpointQueue {
  return {
    claimNext(input) {
      return prisma.$transaction(async (transaction) => {
        await markExpiredExhausted(transaction, input.now)
        const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
        const rows = await transaction.$queryRaw<ClaimedRow[]>`
          WITH candidate AS (
            SELECT job."checkpoint_job_id"
            FROM "repository_checkpoint_jobs" job
            JOIN "repositories" repository ON repository."repository_id" = job."repository_id"
            WHERE ((job."status" = 'PENDING' AND job."available_at" <= ${input.now})
              OR (job."status" = 'RUNNING' AND job."lease_expires_at" <= ${input.now}))
              AND job."claim_attempt" < job."max_claim_attempts"
              AND repository."repository_type" = 'ACTIVITY_WORKSPACE'
              AND repository."storage_status" = 'READY'
              AND repository."storage_path" IS NOT NULL
            ORDER BY job."available_at", job."created_at", job."checkpoint_job_id"
            FOR UPDATE OF job SKIP LOCKED
            LIMIT 1
          )
          UPDATE "repository_checkpoint_jobs" AS job
          SET "status" = 'RUNNING', "claim_attempt" = job."claim_attempt" + 1,
              "claimed_at" = ${input.now}, "lease_expires_at" = ${leaseExpiresAt},
              "worker_id" = ${input.workerId}, "last_failure_code" = NULL,
              "updated_at" = ${input.now}
          FROM candidate, "repositories" repository
          WHERE job."checkpoint_job_id" = candidate."checkpoint_job_id"
            AND repository."repository_id" = job."repository_id"
          RETURNING job."checkpoint_job_id", job."repository_id", job."activity_id",
                    job."student_id", job."source_code", job."expected_head_commit_hash",
                    job."entry_file_path", repository."storage_path", repository."default_branch",
                    job."claim_attempt", job."max_claim_attempts"
        `
        const row = rows[0]
        return row ? {
          id: row.checkpoint_job_id,
          repositoryId: row.repository_id,
          activityId: row.activity_id,
          studentId: row.student_id,
          sourceCode: row.source_code,
          expectedHeadCommitHash: row.expected_head_commit_hash,
          entryFilePath: row.entry_file_path,
          storagePath: row.storage_path,
          defaultBranch: row.default_branch,
          workerId: input.workerId,
          claimAttempt: row.claim_attempt,
          maxClaimAttempts: row.max_claim_attempts,
        } : null
      })
    },

    complete(input) {
      return prisma.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw`
          UPDATE "repository_checkpoint_jobs"
          SET "status" = 'SUCCEEDED', "resulting_commit_hash" = ${input.commitHash},
              "completed_at" = ${input.now}, "worker_id" = NULL, "lease_expires_at" = NULL,
              "last_failure_code" = NULL, "source_code" = '', "updated_at" = ${input.now}
          WHERE "checkpoint_job_id" = ${input.job.id}::uuid
            AND "repository_id" = ${input.job.repositoryId}::uuid
            AND "status" = 'RUNNING' AND "worker_id" = ${input.job.workerId}
        `
        if (updated !== 1) return false
        await transaction.repositoryActivity.create({
          data: {
            repositoryId: input.job.repositoryId,
            userId: input.job.studentId,
            actorType: 'USER',
            activityType: 'COMMIT',
            commitHash: input.commitHash,
            branchName: input.job.defaultBranch,
            filePath: input.job.entryFilePath,
            message: 'Browser checkpoint saved',
            metadataJson: { checkpointJobId: input.job.id, source: 'BROWSER_CHECKPOINT' },
            activityAt: input.now,
          },
        })
        return true
      })
    },

    fail(input) {
      return prisma.$transaction(async (transaction) => {
        const current = (await transaction.$queryRaw<Array<{ status: string; worker_id: string | null; claim_attempt: number; max_claim_attempts: number }>>`
          SELECT "status", "worker_id", "claim_attempt", "max_claim_attempts"
          FROM "repository_checkpoint_jobs" WHERE "checkpoint_job_id" = ${input.job.id}::uuid
          FOR UPDATE
        `)[0]
        if (current?.status !== 'RUNNING' || current.worker_id !== input.job.workerId) return 'stale' as const
        const retry = input.retryable !== false && !input.conflict && current.claim_attempt < current.max_claim_attempts
        const status = input.conflict ? 'CONFLICTED' : retry ? 'PENDING' : 'FAILED'
        const availableAt = new Date(input.now.getTime() + 1_000)
        if (retry) {
          await transaction.$executeRaw`
            UPDATE "repository_checkpoint_jobs" SET "status" = ${status}::"repository_checkpoint_job_status",
              "available_at" = ${availableAt}, "worker_id" = NULL, "lease_expires_at" = NULL,
              "last_failure_code" = ${input.failureCode}, "updated_at" = ${input.now}
            WHERE "checkpoint_job_id" = ${input.job.id}::uuid
          `
        } else {
          await transaction.$executeRaw`
            UPDATE "repository_checkpoint_jobs" SET "status" = ${status}::"repository_checkpoint_job_status",
              "completed_at" = ${input.now}, "worker_id" = NULL, "lease_expires_at" = NULL,
              "last_failure_code" = ${input.failureCode}, "source_code" = '', "updated_at" = ${input.now}
            WHERE "checkpoint_job_id" = ${input.job.id}::uuid
          `
        }
        return input.conflict ? 'conflicted' as const : retry ? 'retry_queued' as const : 'failed' as const
      })
    },
  }
}
