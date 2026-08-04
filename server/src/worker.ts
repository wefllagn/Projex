import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { EnvironmentValidationError, loadEnv } from './config/env.js'
import { createPrismaClient } from './infrastructure/database/prisma.js'
import { createPostgresExecutionQueue } from './infrastructure/job-queue/execution-queue.js'
import {
  createJavaRunner,
  JavaInfrastructureError,
} from './infrastructure/java/java-runner.js'
import { createLogger } from './infrastructure/logging/logger.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  if (env.javaExecutionMode !== 'local_process') {
    process.stderr.write('Java worker is disabled.\n')
    process.exitCode = 1
    return
  }
  const logger = createLogger(env.logLevel)
  const prisma = createPrismaClient(env.databaseUrl)
  const queue = createPostgresExecutionQueue(prisma)
  const runner = createJavaRunner({
    javaExecutable: env.javaExecutable,
    javacExecutable: env.javacExecutable,
    release: env.javaRelease,
    jobRoot: env.javaJobRoot,
    compileTimeoutMs: env.javaCompileTimeoutMs,
    testTimeoutMs: env.javaTestTimeoutMs,
    outputLimitBytes: env.javaOutputLimitBytes,
    memoryLimitMb: env.javaMemoryLimitMb,
  })
  const workerId = randomUUID()
  let stopping = false
  let iteration = 0
  const stop = () => {
    stopping = true
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  logger.info({ event: 'execution_worker.started', workerId }, 'execution worker started')
  try {
    while (!stopping) {
      const now = new Date()
      if (iteration % 60 === 0) {
        const deleted = await queue.cleanupExpiredPractice(now)
        if (deleted > 0) {
          logger.info(
            { event: 'practice_execution.expired_cleanup', deleted },
            'expired practice executions removed',
          )
        }
      }
      iteration += 1
      const job = await queue.claimNext({
        workerId,
        now,
        leaseMs: env.executionJobLeaseMs,
      })
      if (!job) {
        await delay(env.executionWorkerPollMs)
        continue
      }
      logger.info(
        {
          event: 'execution_job.claimed',
          executionJobId: job.id,
          jobType: job.jobType,
          workerId,
        },
        'execution job claimed',
      )
      try {
        const result = await runner.execute({
          sourceCode: job.sourceCode,
          entryClassName: job.entryClassName,
          cases: job.cases,
        })
        const completed = await queue.complete(job, result, new Date())
        logger.info(
          {
            event: completed
              ? 'execution_job.completed'
              : 'execution_job.stale_completion',
            executionJobId: job.id,
            jobType: job.jobType,
            workerId,
          },
          'execution job completion processed',
        )
      } catch (workerError) {
        const failureCode =
          workerError instanceof JavaInfrastructureError
            ? workerError.code
            : 'INTERNAL_WORKER_ERROR'
        const outcome = await queue.failInfrastructure(
          job,
          failureCode,
          new Date(),
        )
        logger.warn(
          {
            event: 'execution_job.infrastructure_failure',
            executionJobId: job.id,
            jobType: job.jobType,
            failureCode,
            outcome,
            workerId,
          },
          'execution job infrastructure failure',
        )
      }
    }
  } finally {
    await prisma.$disconnect()
    logger.info({ event: 'execution_worker.stopped', workerId }, 'execution worker stopped')
  }
}

bootstrap().catch((workerError: unknown) => {
  if (workerError instanceof EnvironmentValidationError) {
    process.stderr.write(`${workerError.message}\n`)
  } else {
    process.stderr.write('Execution worker failed to start.\n')
  }
  process.exitCode = 1
})
