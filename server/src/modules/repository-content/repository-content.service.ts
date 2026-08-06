import type { Logger } from 'pino'
import {
  GitRepositoryReadError,
  type GitRepositoryReader,
} from '../../infrastructure/git/git-repository-reader.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'
import type { GitTransportAccess } from '../git-transport/git-transport.types.js'
import type {
  RepositoryDiffQuery,
  RepositoryFileQuery,
  RepositoryHistoryQuery,
  RepositoryTreeQuery,
} from './repository-content.schemas.js'

interface StorageResolver {
  resolveManagedRepository(repositoryId: string, relativeRepositoryPath: string): Promise<string>
}

function notFound(): AppError {
  return new AppError({ statusCode: 404, code: 'REPOSITORY_NOT_FOUND', message: 'Repository not found.' })
}

function inspectionUnavailable(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'GIT_INSPECTION_UNAVAILABLE',
    message: 'Repository source inspection is unavailable.',
  })
}

function mapGitError(error: unknown): never {
  if (!(error instanceof GitRepositoryReadError)) throw error
  if (['GIT_REVISION_NOT_FOUND', 'GIT_CONTENT_NOT_FOUND'].includes(error.code)) {
    throw new AppError({
      statusCode: 404,
      code: error.code,
      message: error.code === 'GIT_REVISION_NOT_FOUND'
        ? 'The requested Git revision was not found.'
        : 'The requested repository content was not found.',
    })
  }
  if (['GIT_BRANCH_INVALID', 'GIT_COMMIT_INVALID', 'GIT_PATH_INVALID'].includes(error.code)) {
    throw new AppError({ statusCode: 400, code: 'VALIDATION_FAILED', message: 'Request validation failed.' })
  }
  if (error.code === 'GIT_BINARY_FILE_UNSUPPORTED') {
    throw new AppError({
      statusCode: 415,
      code: error.code,
      message: 'Binary repository content cannot be viewed as text.',
    })
  }
  if (['GIT_FILE_LIMIT_EXCEEDED', 'GIT_CHANGED_FILE_LIMIT_EXCEEDED', 'GIT_BRANCH_LIMIT_EXCEEDED', 'GIT_OUTPUT_LIMIT_EXCEEDED'].includes(error.code)) {
    throw new AppError({
      statusCode: 413,
      code: error.code,
      message: 'Repository inspection output exceeded its configured limit.',
    })
  }
  throw new AppError({
    statusCode: 503,
    code: 'GIT_INSPECTION_FAILED',
    message: 'Repository source inspection is temporarily unavailable.',
  })
}

export function createRepositoryContentService(dependencies: {
  enabled: boolean
  accessRepository: GitTransportRepository
  storage: StorageResolver
  reader: GitRepositoryReader
  logger: Logger
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())

  async function readableRepository(caller: SafeUserProfile, repositoryId: string) {
    if (!dependencies.enabled) throw inspectionUnavailable()
    if (caller.status !== 'ACTIVE') throw notFound()
    const access = await dependencies.accessRepository.findAccess(repositoryId, caller.id)
    if (!access || !evaluateGitPermission(access, now()).read) throw notFound()
    if (access.storageStatus !== 'READY' || !access.storagePath) throw inspectionUnavailable()
    const repositoryPath = await dependencies.storage
      .resolveManagedRepository(repositoryId, access.storagePath)
      .catch(() => { throw inspectionUnavailable() })
    return { access, repositoryPath }
  }

  async function inspect<T>(
    caller: SafeUserProfile,
    repositoryId: string,
    operation: string,
    action: (
      repositoryPath: string,
      defaultBranch: string,
      access: GitTransportAccess,
    ) => Promise<T>,
  ): Promise<T> {
    const { access, repositoryPath } = await readableRepository(caller, repositoryId)
    try {
      const result = await action(repositoryPath, access.defaultBranch, access)
      dependencies.logger.info(
        { event: 'repository.source_inspected', actorId: caller.id, repositoryId, operation },
        'authorized repository source inspection completed',
      )
      return result
    } catch (error) {
      return mapGitError(error)
    }
  }

  return {
    summary(caller: SafeUserProfile, repositoryId: string) {
      return inspect(caller, repositoryId, 'summary', async (repositoryPath, defaultBranch, access) => ({
        repositoryId,
        repositoryStatus: access.status,
        storageStatus: access.storageStatus,
        ...(await dependencies.reader.summary(repositoryPath, defaultBranch)),
      }))
    },

    branches(caller: SafeUserProfile, repositoryId: string) {
      return inspect(caller, repositoryId, 'branches', (repositoryPath, defaultBranch) =>
        dependencies.reader.branches(repositoryPath, defaultBranch))
    },

    history(caller: SafeUserProfile, repositoryId: string, query: RepositoryHistoryQuery) {
      return inspect(caller, repositoryId, 'history', async (repositoryPath, defaultBranch) => {
        const result = await dependencies.reader.history(repositoryPath, { defaultBranch, ...query, pageSize: query.limit })
        const totalPages = result.totalItems === 0 ? 0 : Math.ceil(result.totalItems / query.limit)
        const pagination: PaginationMeta = {
          page: query.page,
          pageSize: query.limit,
          totalItems: result.totalItems,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1 && totalPages > 0,
        }
        return { commits: result.commits, pagination }
      })
    },

    commit(caller: SafeUserProfile, repositoryId: string, commitId: string) {
      return inspect(caller, repositoryId, 'commit', (repositoryPath) =>
        dependencies.reader.commit(repositoryPath, commitId))
    },

    tree(caller: SafeUserProfile, repositoryId: string, query: RepositoryTreeQuery) {
      return inspect(caller, repositoryId, 'tree', (repositoryPath, defaultBranch) =>
        dependencies.reader.tree(repositoryPath, { defaultBranch, ...query }))
    },

    file(caller: SafeUserProfile, repositoryId: string, query: RepositoryFileQuery) {
      return inspect(caller, repositoryId, 'file', (repositoryPath, defaultBranch) =>
        dependencies.reader.file(repositoryPath, { defaultBranch, ...query }))
    },

    diff(caller: SafeUserProfile, repositoryId: string, query: RepositoryDiffQuery) {
      return inspect(caller, repositoryId, 'diff', (repositoryPath) =>
        dependencies.reader.diff(repositoryPath, query))
    },
  }
}

export type RepositoryContentService = ReturnType<typeof createRepositoryContentService>
