import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  adminUserParamsSchema,
  revokeUserSessionsSchema,
} from './admin.schemas.js'
import type { AdminService } from './admin.service.js'

export function createAdminController(service: AdminService) {
  return {
    accountSummary: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { userId } = parseRequest(adminUserParamsSchema, request.params)
        const result = await service.accountSummary(request.auth!.user, userId)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    revokeUserSessions: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { userId } = parseRequest(adminUserParamsSchema, request.params)
        const input = parseRequest(revokeUserSessionsSchema, request.body)
        const result = await service.revokeUserSessions(
          request.auth!.user,
          userId,
          input,
          request.requestId,
        )
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
