import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

export type RepositoryCheckpointJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CONFLICTED'

export interface CheckpointProjection {
  id: string
  repositoryId: string
  activityId: string
  status: RepositoryCheckpointJobStatus
  expectedHeadCommitHash: string | null
  resultingCommitHash: string | null
  entryFilePath: string
  failureCode: string | null
  createdAt: Date
  completedAt: Date | null
}

export type CreateCheckpointResult =
  | { kind: 'created'; checkpoint: CheckpointProjection }
  | { kind: 'replay'; checkpoint: CheckpointProjection }
  | { kind: 'idempotency_conflict' }
  | { kind: 'active_conflict' }

export interface ActivityWorkspaceCheckpointRepository {
  findWorkspace(activityId: string, studentId: string): Promise<{
    repositoryId: string
    entryClassName: string
  } | null>
  createCheckpoint(input: {
    repositoryId: string
    activityId: string
    studentId: string
    sourceCode: string
    sourceHash: string
    idempotencyKeyHash: string
    expectedHeadCommitHash: string | null
    entryFilePath: string
    now: Date
  }): Promise<CreateCheckpointResult>
  findCheckpoint(checkpointId: string, activityId: string, studentId: string): Promise<CheckpointProjection | null>
}

interface StoredCheckpointRow {
  checkpoint_job_id: string
  repository_id: string
  activity_id: string
  status: RepositoryCheckpointJobStatus
  source_hash: string
  expected_head_commit_hash: string | null
  resulting_commit_hash: string | null
  entry_file_path: string
  last_failure_code: string | null
  created_at: Date
  completed_at: Date | null
}

function projectRow(record: StoredCheckpointRow): CheckpointProjection {
  return {
    id: record.checkpoint_job_id,
    repositoryId: record.repository_id,
    activityId: record.activity_id,
    status: record.status,
    expectedHeadCommitHash: record.expected_head_commit_hash,
    resultingCommitHash: record.resulting_commit_hash,
    entryFilePath: record.entry_file_path,
    failureCode: record.last_failure_code,
    createdAt: record.created_at,
    completedAt: record.completed_at,
  }
}

export function createPrismaActivityWorkspaceCheckpointRepository(
  prisma: PrismaClient,
): ActivityWorkspaceCheckpointRepository {
  return {
    async findWorkspace(activityId, studentId) {
      const repository = await prisma.repository.findFirst({
        where: {
          activityId,
          ownerId: studentId,
          repositoryType: 'ACTIVITY_WORKSPACE',
        },
        select: { id: true, activity: { select: { entryClassName: true } } },
      })
      if (!repository?.activity) return null
      return { repositoryId: repository.id, entryClassName: repository.activity.entryClassName }
    },

    async createCheckpoint(input) {
      const existing = (await prisma.$queryRaw<StoredCheckpointRow[]>`
        SELECT "checkpoint_job_id", "repository_id", "activity_id", "status", "source_hash",
               "expected_head_commit_hash", "resulting_commit_hash", "entry_file_path",
               "last_failure_code", "created_at", "completed_at"
        FROM "repository_checkpoint_jobs"
        WHERE "student_id" = ${input.studentId}::uuid AND "activity_id" = ${input.activityId}::uuid
          AND "idempotency_key_hash" = ${input.idempotencyKeyHash}
        LIMIT 1
      `)[0]
      if (existing) {
        return existing.source_hash === input.sourceHash
          && existing.expected_head_commit_hash === input.expectedHeadCommitHash
          ? { kind: 'replay', checkpoint: projectRow(existing) }
          : { kind: 'idempotency_conflict' }
      }
      try {
        const id = randomUUID()
        const checkpoint = (await prisma.$queryRaw<StoredCheckpointRow[]>`
          INSERT INTO "repository_checkpoint_jobs" (
            "checkpoint_job_id", "repository_id", "activity_id", "student_id", "source_code",
            "source_hash", "idempotency_key_hash", "expected_head_commit_hash", "entry_file_path",
            "available_at", "created_at", "updated_at"
          ) VALUES (
            ${id}::uuid, ${input.repositoryId}::uuid, ${input.activityId}::uuid, ${input.studentId}::uuid,
            ${input.sourceCode}, ${input.sourceHash}, ${input.idempotencyKeyHash}, ${input.expectedHeadCommitHash},
            ${input.entryFilePath}, ${input.now}, ${input.now}, ${input.now}
          )
          RETURNING "checkpoint_job_id", "repository_id", "activity_id", "status", "source_hash",
                    "expected_head_commit_hash", "resulting_commit_hash", "entry_file_path",
                    "last_failure_code", "created_at", "completed_at"
        `)[0]!
        return { kind: 'created', checkpoint: projectRow(checkpoint) }
      } catch (error) {
        const replay = (await prisma.$queryRaw<StoredCheckpointRow[]>`
          SELECT "checkpoint_job_id", "repository_id", "activity_id", "status", "source_hash",
                 "expected_head_commit_hash", "resulting_commit_hash", "entry_file_path",
                 "last_failure_code", "created_at", "completed_at"
          FROM "repository_checkpoint_jobs"
          WHERE "student_id" = ${input.studentId}::uuid AND "activity_id" = ${input.activityId}::uuid
            AND "idempotency_key_hash" = ${input.idempotencyKeyHash}
          LIMIT 1
        `)[0]
        if (replay) return replay.source_hash === input.sourceHash && replay.expected_head_commit_hash === input.expectedHeadCommitHash
          ? { kind: 'replay', checkpoint: projectRow(replay) }
          : { kind: 'idempotency_conflict' }
        const active = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS(
            SELECT 1 FROM "repository_checkpoint_jobs"
            WHERE "repository_id" = ${input.repositoryId}::uuid AND "status" IN ('PENDING', 'RUNNING')
          ) AS "exists"
        `
        if (active[0]?.exists) return { kind: 'active_conflict' }
        throw error
      }
    },

    async findCheckpoint(checkpointId, activityId, studentId) {
      const record = (await prisma.$queryRaw<StoredCheckpointRow[]>`
        SELECT "checkpoint_job_id", "repository_id", "activity_id", "status", "source_hash",
               "expected_head_commit_hash", "resulting_commit_hash", "entry_file_path",
               "last_failure_code", "created_at", "completed_at"
        FROM "repository_checkpoint_jobs"
        WHERE "checkpoint_job_id" = ${checkpointId}::uuid AND "activity_id" = ${activityId}::uuid
          AND "student_id" = ${studentId}::uuid
        LIMIT 1
      `)[0]
      return record ? projectRow(record) : null
    },
  }
}
