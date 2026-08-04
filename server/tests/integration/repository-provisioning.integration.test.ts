import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPostgresRepositoryProvisioningQueue } from '../../src/infrastructure/job-queue/repository-provisioning-queue.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import {
  cleanIntegrationDatabase,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

describe('PostgreSQL repository provisioning foundation', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = createIntegrationPrisma()
  })

  beforeEach(async () => {
    await cleanIntegrationDatabase(prisma)
  })

  afterAll(async () => {
    await cleanIntegrationDatabase(prisma)
    await prisma.$disconnect()
  })

  it('atomically creates one pending job with a new repository record', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaRepositoryRepository(prisma, {
      provisioningMaxAttempts: 4,
    })
    const created = await repository.createPersonal({
      ownerId: owner.id,
      repository: { repositoryName: 'Provision Me', description: null },
      now: new Date(),
    })
    expect(created.kind).toBe('ok')
    if (created.kind !== 'ok') return
    expect(created.repository.storageStatus).toBe('PENDING')
    const jobs = await prisma.repositoryProvisioningJob.findMany({
      where: { repositoryId: created.repository.id },
    })
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ status: 'PENDING', claimAttempt: 0, maxClaimAttempts: 4 })
  })

  it('backfills an existing pending repository idempotently', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = await prisma.repository.create({
      data: {
        ownerId: owner.id,
        repositoryType: 'PERSONAL',
        repositoryName: 'Phase 7 Existing Repository',
        slug: 'phase-7-existing-repository',
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        reviewStatus: 'WORKING',
        storagePath: null,
        storageStatus: 'PENDING',
        members: {
          create: {
            studentId: owner.id,
            memberRole: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
    })
    const backfill = () => prisma.$executeRaw`
      INSERT INTO "repository_provisioning_jobs" (
        "repository_id", "status", "claim_attempt", "max_claim_attempts",
        "available_at", "created_at", "updated_at"
      )
      SELECT
        "repository_id", 'PENDING', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "repositories"
      ON CONFLICT ("repository_id") DO NOTHING
    `
    await backfill()
    await backfill()
    expect(
      await prisma.repositoryProvisioningJob.count({ where: { repositoryId: repository.id } }),
    ).toBe(1)
  })

  it('leases a job once under concurrent claims and completes it atomically', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaRepositoryRepository(prisma)
    const created = await repository.createPersonal({
      ownerId: owner.id,
      repository: { repositoryName: 'Concurrent Provision', description: null },
      now: new Date(),
    })
    expect(created.kind).toBe('ok')
    if (created.kind !== 'ok') return
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const now = new Date()
    const claims = await Promise.all([
      queue.claimNext({ workerId: randomUUID(), now, leaseMs: 60_000 }),
      queue.claimNext({ workerId: randomUUID(), now, leaseMs: 60_000 }),
    ])
    const claimed = claims.filter((claim) => claim !== null)
    expect(claimed).toHaveLength(1)
    const job = claimed[0]!
    await expect(
      queue.complete({
        job,
        relativeRepositoryPath: `repositories/aa/bb/${created.repository.id}.git`,
        storageSizeBytes: 128,
        now: new Date(),
      }),
    ).resolves.toBe(true)
    const [stored, activities] = await Promise.all([
      prisma.repository.findUniqueOrThrow({ where: { id: created.repository.id } }),
      prisma.repositoryActivity.findMany({ where: { repositoryId: created.repository.id } }),
    ])
    expect(stored).toMatchObject({ storageStatus: 'READY', storageSizeBytes: 128n })
    expect(activities).toHaveLength(1)
    expect(activities[0]).toMatchObject({
      actorType: 'SYSTEM',
      userId: null,
      activityType: 'REPOSITORY_PROVISIONED',
    })
  })

  it('reclaims an expired lease without creating a second job', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaRepositoryRepository(prisma)
    const created = await repository.createPersonal({
      ownerId: owner.id,
      repository: { repositoryName: 'Lease Recovery', description: null },
      now: new Date(),
    })
    expect(created.kind).toBe('ok')
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const firstTime = new Date(Date.now() + 1_000)
    const first = await queue.claimNext({ workerId: randomUUID(), now: firstTime, leaseMs: 5_000 })
    expect(first).not.toBeNull()
    const second = await queue.claimNext({
      workerId: randomUUID(),
      now: new Date(firstTime.getTime() + 5_001),
      leaseMs: 5_000,
    })
    expect(second?.id).toBe(first?.id)
    expect(second?.claimAttempt).toBe(2)
    expect(await prisma.repositoryProvisioningJob.count()).toBe(1)
  })

  it('preserves the repository row when bounded retries are exhausted', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaRepositoryRepository(prisma, { provisioningMaxAttempts: 1 })
    const created = await repository.createPersonal({
      ownerId: owner.id,
      repository: { repositoryName: 'Failure Preservation', description: null },
      now: new Date(),
    })
    if (created.kind !== 'ok') throw new Error('Repository fixture failed.')
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const job = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 5_000 })
    if (!job) throw new Error('Job was not claimed.')
    await expect(
      queue.fail({ job, failureCode: 'TEST_INFRASTRUCTURE_FAILURE', now: new Date() }),
    ).resolves.toBe('failed')
    const stored = await prisma.repository.findUniqueOrThrow({ where: { id: created.repository.id } })
    expect(stored).toMatchObject({
      storageStatus: 'FAILED',
      storagePath: null,
      storageFailureCode: 'TEST_INFRASTRUCTURE_FAILURE',
    })
  })
})
