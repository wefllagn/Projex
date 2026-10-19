import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import { createPrismaClient } from './infrastructure/database/prisma.js'
import { createGitCommandRunner } from './infrastructure/git/git-command-runner.js'
import { createPostgresRepositoryProvisioningQueue } from './infrastructure/job-queue/repository-provisioning-queue.js'
import { createPostgresRepositoryCheckpointQueue } from './infrastructure/job-queue/repository-checkpoint-queue.js'
import { createLogger } from './infrastructure/logging/logger.js'
import { createRepositoryStorage } from './infrastructure/storage/repository-storage.js'
import { createRepositoryProvisioningService } from './modules/repositories/repository-provisioning.service.js'
import { createGitActivityCheckpointWriter } from './infrastructure/git/git-activity-checkpoint-writer.js'
import { createPrismaGitTransportRepository } from './modules/git-transport/git-transport.repository.js'
import { createActivityWorkspaceCheckpointWorkerService } from './modules/activity-workspace-checkpoints/activity-workspace-checkpoint-worker.service.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  if (env.gitExecutionMode !== 'local_process') {
    process.stderr.write('Git provisioning worker is disabled.\n')
    process.exitCode = 1
    return
  }
  const logger = createLogger(env.logLevel)
  const prisma = createPrismaClient(env.databaseUrl)
  const queue = createPostgresRepositoryProvisioningQueue(prisma)
  const checkpointQueue = createPostgresRepositoryCheckpointQueue(prisma)
  const git = createGitCommandRunner({
    executable: env.gitExecutable,
    timeoutMs: env.gitCommandTimeoutMs,
    outputLimitBytes: env.gitOutputLimitBytes,
  })
  const version = await git.detectVersion()
  const storage = createRepositoryStorage({
    root: env.gitStorageRoot,
    repositorySizeLimitBytes: env.gitRepositorySizeLimitBytes,
  })
  const service = createRepositoryProvisioningService({ queue, git, storage, logger })
  const checkpointService = createActivityWorkspaceCheckpointWorkerService({
    queue: checkpointQueue,
    writer: createGitActivityCheckpointWriter({
      git,
      resolveRepository: (repositoryId, storagePath) => storage.resolveManagedRepository(repositoryId, storagePath),
    }),
    accessRepository: createPrismaGitTransportRepository(prisma),
    logger,
  })
  const workerId = randomUUID()
  let stopping = false
  const stop = () => {
    stopping = true
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  logger.info(
    { event: 'git_worker.started', workerId, gitVersion: version.raw },
    'Git provisioning worker started',
  )
  try {
    while (!stopping) {
      const job = await queue.claimNext({
        workerId,
        now: new Date(),
        leaseMs: env.gitProvisioningJobLeaseMs,
      })
      if (!job) {
        const checkpoint = await checkpointQueue.claimNext({
          workerId,
          now: new Date(),
          leaseMs: env.gitProvisioningJobLeaseMs,
        })
        if (checkpoint) {
          logger.info({ event: 'activity_workspace.checkpoint_claimed', checkpointId: checkpoint.id, repositoryId: checkpoint.repositoryId, workerId, claimAttempt: checkpoint.claimAttempt }, 'activity workspace checkpoint claimed')
          await checkpointService.process(checkpoint)
          continue
        }
        await delay(env.gitProvisioningWorkerPollMs)
        continue
      }
      logger.info(
        {
          event: 'repository_provisioning.claimed',
          repositoryId: job.repositoryId,
          provisioningJobId: job.id,
          workerId,
          claimAttempt: job.claimAttempt,
        },
        'repository provisioning job claimed',
      )
      await service.process(job)
      const checkpoint = await checkpointQueue.claimNext({
        workerId,
        now: new Date(),
        leaseMs: env.gitProvisioningJobLeaseMs,
      })
      if (checkpoint) {
        logger.info({ event: 'activity_workspace.checkpoint_claimed', checkpointId: checkpoint.id, repositoryId: checkpoint.repositoryId, workerId, claimAttempt: checkpoint.claimAttempt }, 'activity workspace checkpoint claimed')
        await checkpointService.process(checkpoint)
      }
    }
  } finally {
    await prisma.$disconnect()
    logger.info({ event: 'git_worker.stopped', workerId }, 'Git provisioning worker stopped')
  }
}

bootstrap().catch((error: unknown) => {
  if (error instanceof EnvironmentValidationError) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write('Git provisioning worker failed to start.\n')
  }
  process.exitCode = 1
})
