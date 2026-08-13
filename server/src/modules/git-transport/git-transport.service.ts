import { randomUUID } from 'node:crypto'
import type { GitCredentialOperation } from '@prisma/client'
import type { Request, Response } from 'express'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { GitCredentialService } from './git-credential.service.js'
import type { GitTransportRepository } from './git-transport.repository.js'
import type { AcceptedPushReceipt } from './git-transport.types.js'

interface StorageResolver {
  resolveManagedRepositoryLocation(
    repositoryId: string,
    relativeRepositoryPath: string,
  ): Promise<{ repositoryPath: string; canonicalLocator: string }>
}

interface SmartHttpBackend {
  initialize?(): Promise<void>
  recover?(onAcceptedPush: (receipt: AcceptedPushReceipt) => Promise<void>): Promise<number>
  execute(input: {
    request: Request
    response: Response
    repositoryPath: string
    relativeRepositoryPath: string
    routeSuffix: 'info/refs' | 'git-upload-pack' | 'git-receive-pack'
    queryString: string
    authentication: Awaited<ReturnType<GitCredentialService['authenticate']>>
    operationId: string
    onAcceptedPush(receipt: AcceptedPushReceipt): Promise<void>
  }): Promise<void>
}

export interface GitTransportService {
  initialize(): Promise<void>
  handle(input: {
    request: Request
    response: Response
    repositoryId: string
    routeSuffix: 'info/refs' | 'git-upload-pack' | 'git-receive-pack'
    service?: 'git-upload-pack' | 'git-receive-pack'
  }): Promise<void>
}

function isLoopback(address: string | undefined): boolean {
  return Boolean(
    address &&
    (address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'),
  )
}

function unavailable(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'GIT_SMART_HTTP_UNAVAILABLE',
    message: 'Git Smart HTTP is unavailable.',
  })
}

export function createGitTransportService(dependencies: {
  enabled: boolean
  credentialService: GitCredentialService
  repository: GitTransportRepository
  storage: StorageResolver
  backend: SmartHttpBackend
  logger: Logger
}): GitTransportService {
  const { credentialService, repository, storage, backend, logger } = dependencies

  const recordAcceptedPush = async (receipt: AcceptedPushReceipt) => {
    const created = await repository.recordAcceptedPush(receipt)
    logger.info(
      {
        event: 'repository.git_push_accepted',
        actorId: receipt.userId,
        repositoryId: receipt.repositoryId,
        acceptedRefUpdateCount: receipt.refUpdateCount,
        activityCreated: created,
      },
      'authenticated Git push accepted',
    )
  }

  return {
    async initialize() {
      if (!dependencies.enabled) return
      await backend.initialize?.()
      await backend.recover?.(recordAcceptedPush)
    },
    async handle(input) {
      if (!dependencies.enabled || !isLoopback(input.request.socket.remoteAddress)) throw unavailable()
      const operation: GitCredentialOperation =
        input.routeSuffix === 'git-receive-pack' || input.service === 'git-receive-pack'
          ? 'WRITE'
          : 'READ'
      if (
        input.routeSuffix === 'info/refs' && !input.service ||
        input.routeSuffix === 'git-upload-pack' && input.service ||
        input.routeSuffix === 'git-receive-pack' && input.service
      ) {
        throw new AppError({ statusCode: 400, code: 'GIT_REQUEST_INVALID', message: 'Git request is invalid.' })
      }
      const expectedContentType = input.routeSuffix === 'git-upload-pack'
        ? 'application/x-git-upload-pack-request'
        : input.routeSuffix === 'git-receive-pack'
          ? 'application/x-git-receive-pack-request'
          : null
      if (expectedContentType && input.request.header('content-type')?.split(';')[0]?.trim() !== expectedContentType) {
        throw new AppError({ statusCode: 415, code: 'GIT_CONTENT_TYPE_INVALID', message: 'Git request content type is invalid.' })
      }
      const authentication = await credentialService.authenticate({
        authorization: input.request.header('authorization'),
        repositoryId: input.repositoryId,
        operation,
      })
      const persistedLocator = authentication.access.storagePath
      if (authentication.access.storageStatus !== 'READY' || !persistedLocator) {
        throw unavailable()
      }
      const { repositoryPath, canonicalLocator } = await storage.resolveManagedRepositoryLocation(
        input.repositoryId,
        persistedLocator,
      )
      const operationId = randomUUID()
      await backend.execute({
        request: input.request,
        response: input.response,
        repositoryPath,
        relativeRepositoryPath: canonicalLocator,
        routeSuffix: input.routeSuffix,
        queryString: input.service ? `service=${input.service}` : '',
        authentication,
        operationId,
        onAcceptedPush: recordAcceptedPush,
      })
    },
  }
}
