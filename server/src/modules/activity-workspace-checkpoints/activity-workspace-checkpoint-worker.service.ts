import type { Logger } from 'pino'
import { GitCheckpointError } from '../../infrastructure/git/git-activity-checkpoint-writer.js'
import { GitInfrastructureError } from '../../infrastructure/git/git-errors.js'
import type { ClaimedRepositoryCheckpointJob, RepositoryCheckpointQueue } from '../../infrastructure/job-queue/repository-checkpoint-queue.js'
import { RepositoryStorageError } from '../../infrastructure/storage/repository-storage.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'

interface CheckpointWriter {
  write(input: {
    repositoryId: string
    checkpointId: string
    storagePath: string
    studentId: string
    sourceCode: string
    entryFilePath: string
    defaultBranch: string
    expectedHeadCommitHash: string | null
    beforePush?: () => Promise<void>
  }): Promise<{ commitHash: string }>
}

export function createActivityWorkspaceCheckpointWorkerService(dependencies: {
  queue: RepositoryCheckpointQueue
  writer: CheckpointWriter
  accessRepository: GitTransportRepository
  logger: Logger
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())
  return {
    async process(job: ClaimedRepositoryCheckpointJob): Promise<void> {
      try {
        const access = await dependencies.accessRepository.findAccess(job.repositoryId, job.studentId)
        if (!access || access.repositoryType !== 'ACTIVITY_WORKSPACE' || !evaluateGitPermission(access, now()).write) {
          await dependencies.queue.fail({ job, failureCode: 'CHECKPOINT_ACCESS_REVOKED', retryable: false, now: now() })
          return
        }
        const result = await dependencies.writer.write({
          ...job,
          checkpointId: job.id,
          beforePush: async () => {
            const currentAccess = await dependencies.accessRepository.findAccess(job.repositoryId, job.studentId)
            if (!currentAccess || currentAccess.repositoryType !== 'ACTIVITY_WORKSPACE' || !evaluateGitPermission(currentAccess, now()).write) {
              throw new GitCheckpointError('CHECKPOINT_ACCESS_REVOKED')
            }
          },
        })
        const completed = await dependencies.queue.complete({ job, commitHash: result.commitHash, now: now() })
        dependencies.logger.info({ event: completed ? 'activity_workspace.checkpoint_completed' : 'activity_workspace.checkpoint_stale', checkpointId: job.id, repositoryId: job.repositoryId }, 'activity workspace checkpoint processed')
      } catch (error) {
        const failureCode = error instanceof GitCheckpointError || error instanceof GitInfrastructureError || error instanceof RepositoryStorageError
          ? error.code
          : 'CHECKPOINT_INTERNAL_ERROR'
        const outcome = await dependencies.queue.fail({
          job,
          failureCode,
          conflict: error instanceof GitCheckpointError && error.conflict,
          retryable: !(error instanceof GitCheckpointError),
          now: now(),
        })
        dependencies.logger.warn({ event: 'activity_workspace.checkpoint_failed', checkpointId: job.id, repositoryId: job.repositoryId, failureCode, outcome }, 'activity workspace checkpoint failed')
      }
    },
  }
}
