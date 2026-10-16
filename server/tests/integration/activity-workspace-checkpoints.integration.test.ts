import { randomUUID } from 'node:crypto'
import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPostgresRepositoryCheckpointQueue } from '../../src/infrastructure/job-queue/repository-checkpoint-queue.js'
import { createPrismaActivityWorkspaceCheckpointRepository } from '../../src/modules/activity-workspace-checkpoints/activity-workspace-checkpoint.repository.js'
import { createActivityWorkspaceCheckpointService } from '../../src/modules/activity-workspace-checkpoints/activity-workspace-checkpoint.service.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const now = new Date('2030-10-01T00:00:00.000Z')

async function fixture() {
  const instructor = await createActiveUser(prisma, 'INSTRUCTOR', 'Checkpoint Instructor')
  const student = await createActiveUser(prisma, 'STUDENT', 'Checkpoint Student')
  const classRecord = await createActiveClass(prisma, instructor.id, 'Checkpoint Class')
  await createActiveMembership(prisma, classRecord.id, student.id)
  const activity = await prisma.programmingActivity.create({
    data: {
      classId: classRecord.id,
      createdById: instructor.id,
      title: 'Checkpoint Activity',
      instructions: 'Save unfinished Java work without submitting it.',
      dueDate: new Date('2030-10-02T00:00:00.000Z'),
      language: 'JAVA',
      entryClassName: 'Main',
      starterCode: 'public class Main {}',
      maxAttempts: 3,
      totalPoints: 100,
      status: 'PUBLISHED',
      publishedAt: now,
    },
  })
  const repositoryId = randomUUID()
  const repository = await prisma.repository.create({
    data: {
      id: repositoryId,
      activityId: activity.id,
      ownerId: student.id,
      repositoryType: 'ACTIVITY_WORKSPACE',
      repositoryName: 'Checkpoint Activity Workspace',
      slug: `checkpoint-${repositoryId}`,
      storagePath: `repositories/${repositoryId}/repository.git`,
      storageStatus: 'READY',
      provisionedAt: now,
      storageVerifiedAt: now,
      storageSizeBytes: 0n,
      visibility: 'PRIVATE',
      members: { create: { studentId: student.id, memberRole: 'OWNER', status: 'ACTIVE' } },
    },
  })
  const checkpointRepository = createPrismaActivityWorkspaceCheckpointRepository(prisma)
  const service = createActivityWorkspaceCheckpointService({
    enabled: true,
    sourceLimitBytes: 100_000,
    repository: checkpointRepository,
    accessRepository: createPrismaGitTransportRepository(prisma),
    logger,
    now: () => now,
  })
  return { activity, repository, service, student }
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL Activity Workspace checkpoints', () => {
  it('persists one idempotent active checkpoint and rejects conflicting reuse or concurrency', async () => {
    const { activity, repository, service, student } = await fixture()
    const input = { sourceCode: 'public class Main { int value = 1; }', expectedHeadCommitHash: null }

    const created = await service.create(student, activity.id, input, 'checkpoint:integration-replay')
    const replay = await service.create(student, activity.id, input, 'checkpoint:integration-replay')

    expect(created).toMatchObject({ idempotentReplay: false, checkpoint: { status: 'PENDING', repositoryId: repository.id } })
    expect(replay).toMatchObject({ idempotentReplay: true, checkpoint: { checkpointId: created.checkpoint.checkpointId } })
    expect(await prisma.repositoryCheckpointJob.count()).toBe(1)
    await expect(service.create(student, activity.id, {
      ...input,
      sourceCode: 'public class Main { int value = 2; }',
    }, 'checkpoint:integration-replay')).rejects.toMatchObject({ code: 'DUPLICATE_CHECKPOINT_REQUEST' })
    await expect(service.create(student, activity.id, input, 'checkpoint:integration-concurrent')).rejects.toMatchObject({ code: 'CHECKPOINT_IN_PROGRESS' })
    expect(await prisma.repositoryCheckpointJob.count({ where: { repositoryId: repository.id, status: { in: ['PENDING', 'RUNNING'] } } })).toBe(1)
    expect(await prisma.activitySubmission.count()).toBe(0)
  })

  it('persists valid retry, success, and conflict queue transitions', async () => {
    const { activity, repository, service, student } = await fixture()
    const queue = createPostgresRepositoryCheckpointQueue(prisma)
    await service.create(student, activity.id, {
      sourceCode: 'public class Main { int value = 1; }',
      expectedHeadCommitHash: null,
    }, 'checkpoint:integration-transition')

    const firstClaim = await queue.claimNext({ workerId: 'worker-1', now, leaseMs: 10_000 })
    expect(firstClaim).toMatchObject({ repositoryId: repository.id, workerId: 'worker-1', claimAttempt: 1 })
    expect(await prisma.repositoryCheckpointJob.findUniqueOrThrow({ where: { id: firstClaim!.id } })).toMatchObject({
      status: 'RUNNING', workerId: 'worker-1', claimAttempt: 1, completedAt: null,
    })

    await expect(queue.fail({
      job: firstClaim!, failureCode: 'TRANSIENT_TEST_FAILURE', retryable: true,
      now: new Date(now.getTime() + 1),
    })).resolves.toBe('retry_queued')
    expect(await prisma.repositoryCheckpointJob.findUniqueOrThrow({ where: { id: firstClaim!.id } })).toMatchObject({
      status: 'PENDING', workerId: null, leaseExpiresAt: null, completedAt: null,
    })

    const secondClaim = await queue.claimNext({ workerId: 'worker-2', now: new Date(now.getTime() + 2_000), leaseMs: 10_000 })
    const commitHash = 'a'.repeat(40)
    await expect(queue.complete({ job: secondClaim!, commitHash, now: new Date(now.getTime() + 3_000) })).resolves.toBe(true)
    expect(await prisma.repositoryCheckpointJob.findUniqueOrThrow({ where: { id: secondClaim!.id } })).toMatchObject({
      status: 'SUCCEEDED', resultingCommitHash: commitHash, workerId: null, leaseExpiresAt: null,
      sourceCode: '',
    })

    await service.create(student, activity.id, {
      sourceCode: 'public class Main { int value = 2; }',
      expectedHeadCommitHash: commitHash,
    }, 'checkpoint:integration-conflict')
    const conflictedClaim = await queue.claimNext({ workerId: 'worker-3', now: new Date(now.getTime() + 4_000), leaseMs: 10_000 })
    await expect(queue.fail({
      job: conflictedClaim!, failureCode: 'CHECKPOINT_HEAD_CHANGED', conflict: true, retryable: false,
      now: new Date(now.getTime() + 5_000),
    })).resolves.toBe('conflicted')
    expect(await prisma.repositoryCheckpointJob.findUniqueOrThrow({ where: { id: conflictedClaim!.id } })).toMatchObject({
      status: 'CONFLICTED', resultingCommitHash: null, workerId: null, leaseExpiresAt: null,
      sourceCode: '',
    })
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: repository.id, activityType: 'COMMIT' } })).toBe(1)
    expect(await prisma.activitySubmission.count()).toBe(0)
  })

  it('rejects invalid attempt, lease, completion, and successful-result states at the database boundary', async () => {
    const { activity, service, student } = await fixture()
    const created = await service.create(student, activity.id, {
      sourceCode: 'public class Main {}', expectedHeadCommitHash: null,
    }, 'checkpoint:integration-constraints')
    const checkpointId = created.checkpoint.checkpointId

    await expect(prisma.$executeRaw`UPDATE "repository_checkpoint_jobs" SET "max_claim_attempts" = 0 WHERE "checkpoint_job_id" = ${checkpointId}::uuid`).rejects.toThrow()
    await expect(prisma.$executeRaw`UPDATE "repository_checkpoint_jobs" SET "status" = 'RUNNING' WHERE "checkpoint_job_id" = ${checkpointId}::uuid`).rejects.toThrow()
    await expect(prisma.$executeRaw`UPDATE "repository_checkpoint_jobs" SET "worker_id" = 'invalid' WHERE "checkpoint_job_id" = ${checkpointId}::uuid`).rejects.toThrow()
    await expect(prisma.$executeRaw`UPDATE "repository_checkpoint_jobs" SET "status" = 'FAILED' WHERE "checkpoint_job_id" = ${checkpointId}::uuid`).rejects.toThrow()
    await expect(prisma.$executeRaw`UPDATE "repository_checkpoint_jobs" SET "status" = 'SUCCEEDED', "completed_at" = ${now} WHERE "checkpoint_job_id" = ${checkpointId}::uuid`).rejects.toThrow()
    expect(await prisma.repositoryCheckpointJob.findUniqueOrThrow({ where: { id: checkpointId } })).toMatchObject({
      status: 'PENDING', claimAttempt: 0, maxClaimAttempts: 3, workerId: null,
      leaseExpiresAt: null, completedAt: null, resultingCommitHash: null,
    })
  })
})
