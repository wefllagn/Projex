import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  activityIdParamsSchema,
  activityListQuerySchema,
  activityTransitionSchema,
  classActivityParamsSchema,
  createActivitySchema,
  updateActivitySchema,
} from './activity.schemas.js'
import type { ActivityService } from './activity.service.js'

export function createActivityController(service: ActivityService) {
  return {
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classActivityParamsSchema, request.params)
        const input = parseRequest(createActivitySchema, request.body)
        const activity = await service.create(request.auth!.user, classId, input)
        response.status(201).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classActivityParamsSchema, request.params)
        const query = parseRequest(activityListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, classId, query)
        response
          .status(200)
          .json(
            listResponse(result.activities, result.pagination, request.requestId),
          )
      } catch (error) {
        next(error)
      }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const activity = await service.get(request.auth!.user, activityId)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    update: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(updateActivitySchema, request.body)
        const activity = await service.update(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    publish: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(activityTransitionSchema, request.body)
        const activity = await service.publish(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    close: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(activityTransitionSchema, request.body)
        const activity = await service.close(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    reopen: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(activityTransitionSchema, request.body)
        const activity = await service.reopen(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    archive: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(activityTransitionSchema, request.body)
        const activity = await service.archive(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    restore: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { activityId } = parseRequest(activityIdParamsSchema, request.params)
        const input = parseRequest(activityTransitionSchema, request.body)
        const activity = await service.restore(request.auth!.user, activityId, input)
        response.status(200).json(successResponse(activity, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
