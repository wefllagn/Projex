import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../shared/errors/app-error.js'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import type { GitCredentialService } from './git-credential.service.js'
import {
  gitCredentialParamsSchema,
  gitInfoRefsQuerySchema,
  gitRepositoryParamsSchema,
  issueGitCredentialSchema,
} from './git-transport.schemas.js'
import type { GitTransportService } from './git-transport.service.js'

function forwardGitError(error: unknown, response: Response, next: NextFunction): void {
  if (response.headersSent) {
    response.destroy()
    return
  }
  if (error instanceof AppError && error.statusCode === 401) {
    response.setHeader('WWW-Authenticate', 'Basic realm="Projex Git", charset="UTF-8"')
  }
  next(error)
}

export function createGitTransportController(dependencies: {
  credentialService: GitCredentialService
  transportService: GitTransportService
}) {
  return {
    issueCredential: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(gitRepositoryParamsSchema, request.params)
        const { operations } = parseRequest(issueGitCredentialSchema, request.body)
        const issued = await dependencies.credentialService.issue(request.auth!.user, repositoryId, operations)
        response.status(201).json(successResponse(issued, request.requestId))
      } catch (error) { next(error) }
    },
    listCredentials: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(gitRepositoryParamsSchema, request.params)
        const credentials = await dependencies.credentialService.list(request.auth!.user, repositoryId)
        response.status(200).json(successResponse(credentials, request.requestId))
      } catch (error) { next(error) }
    },
    revokeCredential: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { credentialId } = parseRequest(gitCredentialParamsSchema, request.params)
        const credential = await dependencies.credentialService.revoke(request.auth!.user, credentialId)
        response.status(200).json(successResponse(credential, request.requestId))
      } catch (error) { next(error) }
    },
    infoRefs: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(gitRepositoryParamsSchema, request.params)
        const { service } = parseRequest(gitInfoRefsQuerySchema, request.query)
        await dependencies.transportService.handle({ request, response, repositoryId, routeSuffix: 'info/refs', service })
      } catch (error) { forwardGitError(error, response, next) }
    },
    uploadPack: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(gitRepositoryParamsSchema, request.params)
        await dependencies.transportService.handle({ request, response, repositoryId, routeSuffix: 'git-upload-pack' })
      } catch (error) { forwardGitError(error, response, next) }
    },
    receivePack: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(gitRepositoryParamsSchema, request.params)
        await dependencies.transportService.handle({ request, response, repositoryId, routeSuffix: 'git-receive-pack' })
      } catch (error) { forwardGitError(error, response, next) }
    },
  }
}
