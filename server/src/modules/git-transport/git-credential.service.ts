import type { GitCredentialOperation } from '@prisma/client'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { evaluateGitPermission } from './git-authorization.js'
import {
  generateGitCredentialSecret,
  hashGitCredentialSecret,
  verifyGitCredentialSecret,
} from './git-credential.crypto.js'
import type { GitTransportRepository } from './git-transport.repository.js'
import type {
  AuthenticatedGitRequest,
  GitCredentialProjection,
  IssuedGitCredential,
} from './git-transport.types.js'

function notFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'REPOSITORY_NOT_FOUND',
    message: 'Repository not found.',
  })
}

function authenticationFailed(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'GIT_AUTHENTICATION_FAILED',
    message: 'Git credentials are invalid or no longer authorized.',
  })
}

function operationDenied(): AppError {
  return new AppError({
    statusCode: 403,
    code: 'GIT_OPERATION_NOT_AUTHORIZED',
    message: 'The requested Git operation is not authorized.',
  })
}

function parseBasicAuthorization(value: string | undefined): { username: string; secret: string } {
  if (!value?.startsWith('Basic ')) throw authenticationFailed()
  const encoded = value.slice(6)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw authenticationFailed()
  }
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  if (separator <= 0 || separator !== decoded.lastIndexOf(':')) throw authenticationFailed()
  const username = decoded.slice(0, separator)
  const secret = decoded.slice(separator + 1)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(username)) {
    throw authenticationFailed()
  }
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(secret)) throw authenticationFailed()
  return { username, secret }
}

export interface GitCredentialService {
  issue(caller: SafeUserProfile, repositoryId: string, operations: GitCredentialOperation[]): Promise<IssuedGitCredential>
  list(caller: SafeUserProfile, repositoryId: string): Promise<GitCredentialProjection[]>
  revoke(caller: SafeUserProfile, credentialId: string): Promise<GitCredentialProjection>
  authenticate(input: {
    authorization: string | undefined
    repositoryId: string
    operation: GitCredentialOperation
  }): Promise<AuthenticatedGitRequest>
}

export function createGitCredentialService(dependencies: {
  repository: GitTransportRepository
  logger: Logger
  credentialTtlMinutes: number
  now?: () => Date
}): GitCredentialService {
  const { repository, logger, credentialTtlMinutes } = dependencies
  const now = dependencies.now ?? (() => new Date())

  async function currentAccess(caller: SafeUserProfile, repositoryId: string) {
    if (caller.status !== 'ACTIVE') throw notFound()
    const access = await repository.findAccess(repositoryId, caller.id)
    if (!access) throw notFound()
    return { access, permission: evaluateGitPermission(access, now()) }
  }

  return {
    async issue(caller, repositoryId, operations) {
      const current = now()
      const { permission } = await currentAccess(caller, repositoryId)
      for (const operation of operations) {
        if ((operation === 'READ' && !permission.read) || (operation === 'WRITE' && !permission.write)) {
          throw operationDenied()
        }
      }
      const secret = generateGitCredentialSecret()
      const projection = await repository.createCredential({
        userId: caller.id,
        repositoryId,
        secretHash: hashGitCredentialSecret(secret),
        operations,
        createdAt: current,
        expiresAt: new Date(current.getTime() + credentialTtlMinutes * 60_000),
      })
      logger.info(
        {
          event: 'git_credential.issued',
          actorId: caller.id,
          repositoryId,
          operations,
          expiresAt: projection.expiresAt,
        },
        'repository-scoped Git credential issued',
      )
      return { ...projection, username: projection.credentialId, secret }
    },

    async list(caller, repositoryId) {
      const { permission } = await currentAccess(caller, repositoryId)
      if (!permission.read) throw notFound()
      return repository.listCredentials(caller.id, repositoryId)
    },

    async revoke(caller, credentialId) {
      if (caller.status !== 'ACTIVE') throw notFound()
      const projection = await repository.revokeCredential(credentialId, caller.id, now())
      if (!projection) throw notFound()
      logger.info(
        { event: 'git_credential.revoked', actorId: caller.id, repositoryId: projection.repositoryId },
        'repository-scoped Git credential revoked',
      )
      return projection
    },

    async authenticate(input) {
      const { username, secret } = parseBasicAuthorization(input.authorization)
      const credential = await repository.findCredential(username)
      const current = now()
      if (
        !credential ||
        credential.repositoryId !== input.repositoryId ||
        credential.revokedAt ||
        credential.expiresAt.getTime() <= current.getTime() ||
        !credential.operations.includes(input.operation) ||
        !verifyGitCredentialSecret(secret, credential.secretHash)
      ) {
        throw authenticationFailed()
      }
      const access = await repository.findAccess(input.repositoryId, credential.userId)
      if (!access) throw authenticationFailed()
      const permission = evaluateGitPermission(access, current)
      if ((input.operation === 'READ' && !permission.read) || (input.operation === 'WRITE' && !permission.write)) {
        throw authenticationFailed()
      }
      await repository.touchCredential(credential.credentialId, current)
      return {
        credentialId: credential.credentialId,
        userId: credential.userId,
        repositoryId: credential.repositoryId,
        operation: input.operation,
        access,
        permission,
      }
    },
  }
}
