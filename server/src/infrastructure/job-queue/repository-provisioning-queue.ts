import type { Prisma, PrismaClient } from '@prisma/client'

export interface ClaimedRepositoryProvisioningJob {
  id: string
  repositoryId: string
  workerId: string
  claimAttempt: number
  maxClaimAttempts: number
}

interface ClaimedRow {
  provisioning_job_id: string
  repository_id: string
  claim_attempt: number
  max_claim_attempts: number
}

export interface RepositoryProvisioningQueue {
  claimNext(input: {
    workerId: string
    now: Date
    leaseMs: number
  }): Promise<ClaimedRepositoryProvisioningJob | null>
  complete(input: {
    job: ClaimedRepositoryProvisioningJob
    relativeRepositoryPath: string
    storageSizeBytes: number
    now: Date
  }): Promise<boolean>
  fail(input: {
    job: ClaimedRepositoryProvisioningJob
    failureCode: string
    quarantined?: boolean
    quarantineKey?: string | null
    now: Date
  }): Promise<'retry_queued' | 'failed' | 'quarantined' | 'stale'>
}

async function markExpiredExhausted(
  transaction: Prisma.TransactionClient,
  now: Date,
): Promise<void> {
  const exhausted = await transaction.$queryRaw<Array<{ repository_id: string }>>`
    UPDATE "repository_provisioning_jobs"
    SET "status" = 'FAILED',
        "completed_at" = ${now},
        "lease_expires_at" = NULL,
        "worker_id" = NULL,
        "last_failure_code" = 'PROVISIONING_LEASE_EXHAUSTED',
        "updated_at" = ${now}
    WHERE "status" = 'RUNNING'
      AND "lease_expires_at" <= ${now}
      AND "claim_attempt" >= "max_claim_attempts"
    RETURNING "repository_id"
  `
  if (exhausted.length > 0) {
    await transaction.repository.updateMany({
      where: { id: { in: exhausted.map((row) => row.repository_id) } },
      data: {
        storageStatus: 'FAILED',
        storageFailureCode: 'PROVISIONING_LEASE_EXHAUSTED',
      },
    })
  }
}

export function createPostgresRepositoryProvisioningQueue(
  prisma: PrismaClient,
): RepositoryProvisioningQueue {
  return {
    claimNext(input) {
      return prisma.$transaction(async (transaction) => {
        await markExpiredExhausted(transaction, input.now)
        const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
        const rows = await transaction.$queryRaw<ClaimedRow[]>`
          WITH candidate AS (
            SELECT "provisioning_job_id"
            FROM "repository_provisioning_jobs"
            WHERE (
              ("status" = 'PENDING' AND "available_at" <= ${input.now})
              OR ("status" = 'RUNNING' AND "lease_expires_at" <= ${input.now})
            )
              AND "claim_attempt" < "max_claim_attempts"
            ORDER BY "available_at", "created_at", "provisioning_job_id"
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "repository_provisioning_jobs" AS job
          SET "status" = 'RUNNING',
              "claim_attempt" = job."claim_attempt" + 1,
              "claimed_at" = ${input.now},
              "lease_expires_at" = ${leaseExpiresAt},
              "worker_id" = ${input.workerId},
              "last_failure_code" = NULL,
              "updated_at" = ${input.now}
          FROM candidate
          WHERE job."provisioning_job_id" = candidate."provisioning_job_id"
          RETURNING job."provisioning_job_id", job."repository_id",
                    job."claim_attempt", job."max_claim_attempts"
        `
        const row = rows[0]
        if (!row) return null
        await transaction.repository.update({
          where: { id: row.repository_id },
          data: { storageStatus: 'PROVISIONING', storageFailureCode: null },
        })
        return {
          id: row.provisioning_job_id,
          repositoryId: row.repository_id,
          workerId: input.workerId,
          claimAttempt: row.claim_attempt,
          maxClaimAttempts: row.max_claim_attempts,
        }
      })
    },

    complete(input) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.repositoryProvisioningJob.findUnique({
          where: { id: input.job.id },
          select: { status: true, workerId: true, repositoryId: true },
        })
        if (
          current?.status !== 'RUNNING' ||
          current.workerId !== input.job.workerId ||
          current.repositoryId !== input.job.repositoryId
        ) {
          return false
        }
        await transaction.repository.update({
          where: { id: input.job.repositoryId },
          data: {
            storageStatus: 'READY',
            storagePath: input.relativeRepositoryPath,
            provisionedAt: input.now,
            storageVerifiedAt: input.now,
            storageSizeBytes: BigInt(input.storageSizeBytes),
            storageFailureCode: null,
          },
        })
        await transaction.repositoryProvisioningJob.update({
          where: { id: input.job.id },
          data: {
            status: 'SUCCEEDED',
            completedAt: input.now,
            workerId: null,
            leaseExpiresAt: null,
            lastFailureCode: null,
          },
        })
        await transaction.repositoryActivity.create({
          data: {
            repositoryId: input.job.repositoryId,
            userId: null,
            actorType: 'SYSTEM',
            activityType: 'REPOSITORY_PROVISIONED',
            activityAt: input.now,
            metadataJson: { provisioningJobId: input.job.id },
          },
        })
        return true
      })
    },

    fail(input) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.repositoryProvisioningJob.findUnique({
          where: { id: input.job.id },
        })
        if (current?.status !== 'RUNNING' || current.workerId !== input.job.workerId) {
          return 'stale' as const
        }
        const quarantined = input.quarantined === true
        const retry = !quarantined && current.claimAttempt < current.maxClaimAttempts
        await transaction.repositoryProvisioningJob.update({
          where: { id: current.id },
          data: retry
            ? {
                status: 'PENDING',
                availableAt: new Date(input.now.getTime() + current.claimAttempt * 1_000),
                claimedAt: null,
                leaseExpiresAt: null,
                workerId: null,
                lastFailureCode: input.failureCode,
              }
            : {
                status: 'FAILED',
                completedAt: input.now,
                leaseExpiresAt: null,
                workerId: null,
                lastFailureCode: input.failureCode,
                quarantineKey: input.quarantineKey ?? null,
              },
        })
        await transaction.repository.update({
          where: { id: input.job.repositoryId },
          data: {
            storageStatus: quarantined ? 'QUARANTINED' : retry ? 'PENDING' : 'FAILED',
            storageFailureCode: input.failureCode,
          },
        })
        return quarantined ? ('quarantined' as const) : retry ? ('retry_queued' as const) : ('failed' as const)
      })
    },
  }
}
