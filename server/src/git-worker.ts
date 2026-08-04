import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import { createPrismaClient } from './infrastructure/database/prisma.js'
import { createGitCommandRunner } from './infrastructure/git/git-command-runner.js'
import { createPostgresRepositoryProvisioningQueue } from './infrastructure/job-queue/repository-provisioning-queue.js'
import { createLogger } from './infrastructure/logging/logger.js'
import { createRepositoryStorage } from './infrastructure/storage/repository-storage.js'
import { createRepositoryProvisioningService } from './modules/repositories/repository-provisioning.service.js'

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
