import { randomUUID } from 'node:crypto'
import { lstat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadEnv } from '../../src/config/env.js'
import { createGitCommandRunner } from '../../src/infrastructure/git/git-command-runner.js'
import { createPostgresRepositoryProvisioningQueue } from '../../src/infrastructure/job-queue/repository-provisioning-queue.js'
import { createLogger } from '../../src/infrastructure/logging/logger.js'
import { createRepositoryStorage } from '../../src/infrastructure/storage/repository-storage.js'
import { createPrismaAdminRepository } from '../../src/modules/admin/admin.repository.js'
import { createAdminService } from '../../src/modules/admin/admin.service.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import { createRepositoryProvisioningService } from '../../src/modules/repositories/repository-provisioning.service.js'
import {
  cleanIntegrationDatabase,
  createActiveUser,
  createIntegrationPrisma,
} from '../integration/database.js'

describe('real Git repository provisioning', () => {
  let prisma: PrismaClient
  const env = loadEnv()
  const git = createGitCommandRunner({
    executable: env.gitExecutable,
    timeoutMs: env.gitCommandTimeoutMs,
    outputLimitBytes: env.gitOutputLimitBytes,
  })
  const storage = createRepositoryStorage({
    root: env.gitStorageRoot,
    repositorySizeLimitBytes: env.gitRepositorySizeLimitBytes,
  })
  const logger = createLogger('silent')

  beforeAll(async () => {
    prisma = createIntegrationPrisma()
    const version = await git.detectVersion()
    expect(version.raw).toMatch(/^\d+\.\d+\.\d+\.windows\.\d+$/)
    expect(version.windowsBuild).not.toBeNull()
  })

  beforeEach(async () => {
    await cleanIntegrationDatabase(prisma)
  })

  afterAll(async () => {
    await cleanIntegrationDatabase(prisma)
    await prisma.$disconnect()
  })

  async function fixture(maxClaimAttempts?: number) {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaRepositoryRepository(
      prisma,
      maxClaimAttempts ? { provisioningMaxAttempts: maxClaimAttempts } : undefined,
    )
    const created = await repository.createPersonal({
      ownerId: owner.id,
      repository: { repositoryName: 'Real Git Fixture', description: null },
      now: new Date(),
    })
    if (created.kind !== 'ok') throw new Error('Repository fixture creation failed.')
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const job = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60_000 })
    if (!job) throw new Error('Provisioning job fixture was not claimable.')
    const service = createRepositoryProvisioningService({ queue, git, storage, logger })
    return { created: created.repository, job, queue, service }
  }

  async function exists(target: string): Promise<boolean> {
    try {
      await lstat(target)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw error
    }
  }

  it('creates exactly one verified empty bare repository with HEAD on main', async () => {
    const { created, job, service } = await fixture()
    await service.process(job)
    const stored = await prisma.repository.findUniqueOrThrow({
      where: { id: created.id },
      include: { provisioningJob: true, activities: true },
    })
    expect(stored.storageStatus).toBe('READY')
    expect(stored.storagePath).toBe(
      path.join('repositories', created.id.slice(0, 2), created.id.slice(2, 4), `${created.id}.git`),
    )
    expect(stored.provisioningJob?.status).toBe('SUCCEEDED')
    expect(stored.activities).toHaveLength(1)
    expect(stored.activities[0]).toMatchObject({
      actorType: 'SYSTEM',
      userId: null,
      activityType: 'REPOSITORY_PROVISIONED',
    })
    const repositoryPath = path.join(env.gitStorageRoot, stored.storagePath!)
    await expect(git.verifyEmptyBare(repositoryPath)).resolves.toBeUndefined()
  })

  it('recovers after the final directory is published before database completion', async () => {
    const { created, job, service } = await fixture()
    const paths = storage.pathsFor(created.id, job.id)
    const marker = { version: 1 as const, repositoryId: created.id, provisioningJobId: job.id }
    await storage.prepareStaging(paths, marker)
    await git.initializeBare(paths.stagingPath)
    await git.verifyEmptyBare(paths.stagingPath)
    await storage.publish(paths, marker)
    await service.process(job)
    const stored = await prisma.repository.findUniqueOrThrow({ where: { id: created.id } })
    expect(stored.storageStatus).toBe('READY')
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: created.id } })).toBe(1)
  })

  it('quarantines owned staging when an unexpected final directory would be overwritten', async () => {
    const { created, job, service } = await fixture()
    const paths = storage.pathsFor(created.id, job.id)
    await mkdir(paths.repositoryPath, { recursive: true })
    await writeFile(path.join(paths.repositoryPath, 'unexpected.txt'), 'do not overwrite')
    await service.process(job)
    const [stored, storedJob] = await Promise.all([
      prisma.repository.findUniqueOrThrow({ where: { id: created.id } }),
      prisma.repositoryProvisioningJob.findUniqueOrThrow({ where: { id: job.id } }),
    ])
    expect(stored.storageStatus).toBe('QUARANTINED')
    expect(stored.storagePath).toBeNull()
    expect(storedJob.status).toBe('FAILED')
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: created.id } })).toBe(0)
  })

  it('performs no filesystem work while an administrator queues one bounded retry, then provisions through the worker', async () => {
    const { created, job, queue, service } = await fixture(1)
    await expect(queue.fail({
      job,
      failureCode: 'TEST_TRANSIENT_GIT_FAILURE',
      now: new Date(),
    })).resolves.toBe('failed')
    const failed = await prisma.repositoryProvisioningJob.findUniqueOrThrow({ where: { id: job.id } })
    const paths = storage.pathsFor(created.id, job.id)
    expect(await exists(paths.repositoryPath)).toBe(false)
    expect(await exists(paths.stagingPath)).toBe(false)

    const admin = await createActiveUser(prisma, 'ADMIN')
    const adminService = createAdminService({
      repository: createPrismaAdminRepository(prisma),
      gitProvisioningRetryEnabled: true,
    })
    await expect(adminService.retryRepositoryProvisioningJob(
      admin,
      job.id,
      {
        reason: 'Approved bounded retry after confirming a transient Git failure.',
        expectedUpdatedAt: failed.updatedAt,
      },
      randomUUID(),
    )).resolves.toMatchObject({ status: 'PENDING', maxClaimAttempts: 2 })
    expect(await exists(paths.repositoryPath)).toBe(false)
    expect(await exists(paths.stagingPath)).toBe(false)

    const retried = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60_000 })
    expect(retried).not.toBeNull()
    await service.process(retried!)
    const stored = await prisma.repository.findUniqueOrThrow({
      where: { id: created.id },
      include: { provisioningJob: true, activities: true },
    })
    expect(stored.storageStatus).toBe('READY')
    expect(stored.provisioningJob).toMatchObject({
      status: 'SUCCEEDED',
      claimAttempt: 2,
      maxClaimAttempts: 2,
    })
    expect(stored.activities.filter(({ activityType }) => activityType === 'REPOSITORY_PROVISIONED')).toHaveLength(1)
    await expect(git.verifyEmptyBare(paths.repositoryPath)).resolves.toBeUndefined()
  })
})
