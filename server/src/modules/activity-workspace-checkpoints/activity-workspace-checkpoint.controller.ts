import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { checkpointActivityParamsSchema, checkpointJobParamsSchema, createCheckpointSchema, idempotencyKeySchema } from './activity-workspace-checkpoint.schemas.js'
import type { ActivityWorkspaceCheckpointService } from './activity-workspace-checkpoint.service.js'

export function createActivityWorkspaceCheckpointController(service: ActivityWorkspaceCheckpointService) {
  return {
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(checkpointActivityParamsSchema, request.params)
        const input = parseRequest(createCheckpointSchema, request.body)
        const idempotencyKey = parseRequest(idempotencyKeySchema, request.header('Idempotency-Key'))
        const result = await service.create(request.auth!.user, activityId, input, idempotencyKey)
        response.status(result.idempotentReplay ? 200 : 202).json(successResponse(result.checkpoint, request.requestId, { idempotentReplay: result.idempotentReplay }))
      } catch (error) { next(error) }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId, checkpointId } = parseRequest(checkpointJobParamsSchema, request.params)
        response.status(200).json(successResponse(await service.get(request.auth!.user, activityId, checkpointId), request.requestId))
      } catch (error) { next(error) }
    },
  }
}
