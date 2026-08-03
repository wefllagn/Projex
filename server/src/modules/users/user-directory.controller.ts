import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  userDirectoryParamsSchema,
  userDirectoryQuerySchema,
} from './user-directory.schemas.js'
import type { UserDirectoryService } from './user-directory.service.js'

export function createUserDirectoryController(service: UserDirectoryService) {
  return {
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = parseRequest(userDirectoryQuerySchema, request.query)
        const result = await service.list(request.auth!.user, query)
        response
          .status(200)
          .json(
            listResponse(
              result.users,
              result.pagination,
              request.requestId,
            ),
          )
      } catch (error) {
        next(error)
      }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { userId } = parseRequest(
          userDirectoryParamsSchema,
          request.params,
        )
        const user = await service.get(request.auth!.user, userId)
        response.status(200).json(successResponse(user, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
