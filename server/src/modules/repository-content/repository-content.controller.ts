import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  repositoryCommitParamsSchema,
  repositoryContentParamsSchema,
  repositoryDiffQuerySchema,
  repositoryFileQuerySchema,
  repositoryHistoryQuerySchema,
  repositoryTreeQuerySchema,
} from './repository-content.schemas.js'
import type { RepositoryContentService } from './repository-content.service.js'

export function createRepositoryContentController(service: RepositoryContentService) {
  return {
    summary: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        response.status(200).json(successResponse(await service.summary(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
    branches: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        response.status(200).json(successResponse(await service.branches(request.auth!.user, repositoryId), request.requestId))
      } catch (error) { next(error) }
    },
    history: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        const query = parseRequest(repositoryHistoryQuerySchema, request.query)
        const result = await service.history(request.auth!.user, repositoryId, query)
        response.status(200).json(listResponse(result.commits, result.pagination, request.requestId))
      } catch (error) { next(error) }
    },
    commit: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId, commitId } = parseRequest(repositoryCommitParamsSchema, request.params)
        response.status(200).json(successResponse(await service.commit(request.auth!.user, repositoryId, commitId), request.requestId))
      } catch (error) { next(error) }
    },
    tree: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        const query = parseRequest(repositoryTreeQuerySchema, request.query)
        response.status(200).json(successResponse(await service.tree(request.auth!.user, repositoryId, query), request.requestId))
      } catch (error) { next(error) }
    },
    file: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        const query = parseRequest(repositoryFileQuerySchema, request.query)
        response.status(200).json(successResponse(await service.file(request.auth!.user, repositoryId, query), request.requestId))
      } catch (error) { next(error) }
    },
    diff: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { repositoryId } = parseRequest(repositoryContentParamsSchema, request.params)
        const query = parseRequest(repositoryDiffQuerySchema, request.query)
        response.status(200).json(successResponse(await service.diff(request.auth!.user, repositoryId, query), request.requestId))
      } catch (error) { next(error) }
    },
  }
}
