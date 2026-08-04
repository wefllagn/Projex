import { lstat } from 'node:fs/promises'
import type { Logger } from 'pino'
import type {
  ClaimedRepositoryProvisioningJob,
  RepositoryProvisioningQueue,
} from '../../infrastructure/job-queue/repository-provisioning-queue.js'
import { GitInfrastructureError } from '../../infrastructure/git/git-errors.js'
import { RepositoryStorageError } from '../../infrastructure/storage/repository-storage.js'

interface GitRunner {
  initializeBare(repositoryPath: string): Promise<void>
  verifyEmptyBare(repositoryPath: string): Promise<void>
}

interface RepositoryStorage {
  pathsFor(repositoryId: string, provisioningJobId: string): {
    relativeRepositoryPath: string
    repositoryPath: string
    stagingPath: string
    quarantinePath: string
  }
  prepareStaging(
    paths: ReturnType<RepositoryStorage['pathsFor']>,
    marker: { version: 1; repositoryId: string; provisioningJobId: string },
  ): Promise<void>
  verifyMarker(
    directory: string,
    marker: { version: 1; repositoryId: string; provisioningJobId: string },
  ): Promise<void>
  publish(
    paths: ReturnType<RepositoryStorage['pathsFor']>,
    marker: { version: 1; repositoryId: string; provisioningJobId: string },
  ): Promise<void>
  quarantine(
    paths: ReturnType<RepositoryStorage['pathsFor']>,
    marker: { version: 1; repositoryId: string; provisioningJobId: string },
  ): Promise<string | null>
  measure(directory: string): Promise<number>
}

const QUARANTINE_FAILURES = new Set([
  'STORAGE_REPARSE_POINT_REJECTED',
  'STORAGE_ROOT_CANONICAL_MISMATCH',
  'STORAGE_MARKER_INVALID',
  'STORAGE_MARKER_MISMATCH',
  'STORAGE_PATH_ESCAPE',
  'UNSAFE_STORAGE_COMPONENT',
  'UNSUPPORTED_STORAGE_ENTRY',
  'GIT_REPOSITORY_NOT_BARE',
  'GIT_DEFAULT_BRANCH_INVALID',
  'GIT_REPOSITORY_NOT_EMPTY',
  'GIT_REPOSITORY_VERIFICATION_FAILED',
])

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

export function createRepositoryProvisioningService(dependencies: {
  queue: RepositoryProvisioningQueue
  git: GitRunner
  storage: RepositoryStorage
  logger: Logger
}) {
  const { queue, git, storage, logger } = dependencies

  async function process(job: ClaimedRepositoryProvisioningJob): Promise<void> {
    const paths = storage.pathsFor(job.repositoryId, job.id)
    const marker = {
      version: 1 as const,
      repositoryId: job.repositoryId,
      provisioningJobId: job.id,
    }
    try {
      if (await exists(paths.repositoryPath)) {
        await storage.verifyMarker(paths.repositoryPath, marker)
      } else {
        await storage.prepareStaging(paths, marker)
        await git.initializeBare(paths.stagingPath)
        await storage.verifyMarker(paths.stagingPath, marker)
        await git.verifyEmptyBare(paths.stagingPath)
        await storage.publish(paths, marker)
      }
      await storage.verifyMarker(paths.repositoryPath, marker)
      await git.verifyEmptyBare(paths.repositoryPath)
      const storageSizeBytes = await storage.measure(paths.repositoryPath)
      const completed = await queue.complete({
        job,
        relativeRepositoryPath: paths.relativeRepositoryPath,
        storageSizeBytes,
        now: new Date(),
      })
      logger.info(
        {
          event: completed
            ? 'repository_provisioning.completed'
            : 'repository_provisioning.stale_completion',
          repositoryId: job.repositoryId,
          provisioningJobId: job.id,
          workerId: job.workerId,
        },
        'repository provisioning completion processed',
      )
    } catch (error) {
      const failureCode =
        error instanceof RepositoryStorageError || error instanceof GitInfrastructureError
          ? error.code
          : 'REPOSITORY_PROVISIONING_INTERNAL_ERROR'
      const mustQuarantine = QUARANTINE_FAILURES.has(failureCode)
      let quarantineKey: string | null = null
      if (mustQuarantine) {
        try {
          quarantineKey = await storage.quarantine(paths, marker)
        } catch {
          // Preserve the original failure. An unsafe directory is never deleted or overwritten.
        }
      }
      const outcome = await queue.fail({
        job,
        failureCode,
        quarantined: mustQuarantine,
        quarantineKey,
        now: new Date(),
      })
      logger.warn(
        {
          event: 'repository_provisioning.failed',
          repositoryId: job.repositoryId,
          provisioningJobId: job.id,
          workerId: job.workerId,
          failureCode,
          outcome,
        },
        'repository provisioning failure processed',
      )
    }
  }

  return { process }
}
