import { createHash } from 'node:crypto'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'
import type { ActivityWorkspaceCheckpointRepository, CheckpointProjection } from './activity-workspace-checkpoint.repository.js'
import type { CreateCheckpointInput } from './activity-workspace-checkpoint.schemas.js'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function response(checkpoint: CheckpointProjection) {
  return {
    checkpointId: checkpoint.id,
    repositoryId: checkpoint.repositoryId,
    activityId: checkpoint.activityId,
    status: checkpoint.status,
    expectedHeadCommitHash: checkpoint.expectedHeadCommitHash,
    resultingCommitHash: checkpoint.resultingCommitHash,
    entryFilePath: checkpoint.entryFilePath,
    failureCode: checkpoint.failureCode,
    createdAt: checkpoint.createdAt.toISOString(),
    completedAt: checkpoint.completedAt?.toISOString() ?? null,
  }
}

export function createActivityWorkspaceCheckpointService(dependencies: {
  enabled: boolean
  sourceLimitBytes: number
  repository: ActivityWorkspaceCheckpointRepository
  accessRepository: GitTransportRepository
  logger: Logger
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())

  async function requireWritableWorkspace(caller: SafeUserProfile, activityId: string) {
    if (!dependencies.enabled) throw new AppError({ statusCode: 503, code: 'GIT_CHECKPOINT_UNAVAILABLE', message: 'Git Workspace checkpoints are unavailable in this environment.' })
    if (caller.status !== 'ACTIVE' || caller.role !== 'STUDENT') throw new AppError({ statusCode: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Activity Workspace was not found.' })
    const workspace = await dependencies.repository.findWorkspace(activityId, caller.id)
    if (!workspace) throw new AppError({ statusCode: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Activity Workspace was not found.' })
    const access = await dependencies.accessRepository.findAccess(workspace.repositoryId, caller.id)
    if (!access || access.repositoryType !== 'ACTIVITY_WORKSPACE' || !evaluateGitPermission(access, now()).write) {
      throw new AppError({ statusCode: 409, code: 'ACTIVITY_WORKSPACE_NOT_WRITABLE', message: 'The Activity Workspace is not accepting checkpoints.' })
    }
    return workspace
  }

  return {
    async create(caller: SafeUserProfile, activityId: string, input: CreateCheckpointInput, idempotencyKey: string) {
      const workspace = await requireWritableWorkspace(caller, activityId)
      if (Buffer.byteLength(input.sourceCode, 'utf8') > dependencies.sourceLimitBytes) {
        throw new AppError({ statusCode: 413, code: 'SOURCE_CODE_TOO_LARGE', message: 'The source code exceeds the allowed size.' })
      }
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(workspace.entryClassName)) {
        throw new AppError({ statusCode: 409, code: 'ACTIVITY_ENTRY_FILE_INVALID', message: 'The activity entry file is not valid for a Git checkpoint.' })
      }
      const result = await dependencies.repository.createCheckpoint({
        repositoryId: workspace.repositoryId,
        activityId,
        studentId: caller.id,
        sourceCode: input.sourceCode,
        sourceHash: sha256(input.sourceCode),
        idempotencyKeyHash: sha256(idempotencyKey),
        expectedHeadCommitHash: input.expectedHeadCommitHash,
        entryFilePath: `${workspace.entryClassName}.java`,
        now: now(),
      })
      if (result.kind === 'idempotency_conflict') throw new AppError({ statusCode: 409, code: 'DUPLICATE_CHECKPOINT_REQUEST', message: 'This checkpoint key was already used for different source.' })
      if (result.kind === 'active_conflict') throw new AppError({ statusCode: 409, code: 'CHECKPOINT_IN_PROGRESS', message: 'Another Git Workspace checkpoint is still processing.' })
      dependencies.logger.info({ event: 'activity_workspace.checkpoint_queued', actorId: caller.id, activityId, repositoryId: workspace.repositoryId, checkpointId: result.checkpoint.id }, 'activity workspace checkpoint queued')
      return { checkpoint: response(result.checkpoint), idempotentReplay: result.kind === 'replay' }
    },

    async get(caller: SafeUserProfile, activityId: string, checkpointId: string) {
      if (caller.status !== 'ACTIVE' || caller.role !== 'STUDENT') throw new AppError({ statusCode: 404, code: 'CHECKPOINT_NOT_FOUND', message: 'Checkpoint was not found.' })
      const checkpoint = await dependencies.repository.findCheckpoint(checkpointId, activityId, caller.id)
      if (!checkpoint) throw new AppError({ statusCode: 404, code: 'CHECKPOINT_NOT_FOUND', message: 'Checkpoint was not found.' })
      return response(checkpoint)
    },
  }
}

export type ActivityWorkspaceCheckpointService = ReturnType<typeof createActivityWorkspaceCheckpointService>
