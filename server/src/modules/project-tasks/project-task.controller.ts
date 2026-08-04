import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  classProjectTaskParamsSchema,
  createProjectTaskSchema,
  projectTaskListQuerySchema,
  projectTaskParamsSchema,
  projectTaskTransitionSchema,
  updateProjectTaskSchema,
} from './project-task.schemas.js'
import type { ProjectTaskService } from './project-task.service.js'

export function createProjectTaskController(service: ProjectTaskService) {
  return {
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classProjectTaskParamsSchema, request.params)
        const input = parseRequest(createProjectTaskSchema, request.body)
        const result = await service.create(request.auth!.user, classId, input)
        response.status(201).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    list: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classProjectTaskParamsSchema, request.params)
        const query = parseRequest(projectTaskListQuerySchema, request.query)
        const result = await service.list(request.auth!.user, classId, query)
        response.status(200).json(listResponse(result.projectTasks, result.pagination, request.requestId))
      } catch (error) { next(error) }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const result = await service.get(request.auth!.user, projectTaskId)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    update: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const input = parseRequest(updateProjectTaskSchema, request.body)
        const result = await service.update(request.auth!.user, projectTaskId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    publish: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const input = parseRequest(projectTaskTransitionSchema, request.body)
        const result = await service.publish(request.auth!.user, projectTaskId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    close: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const input = parseRequest(projectTaskTransitionSchema, request.body)
        const result = await service.close(request.auth!.user, projectTaskId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    archive: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const input = parseRequest(projectTaskTransitionSchema, request.body)
        const result = await service.archive(request.auth!.user, projectTaskId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    restore: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const input = parseRequest(projectTaskTransitionSchema, request.body)
        const result = await service.restore(request.auth!.user, projectTaskId, input)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    listTeams: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const result = await service.listTeams(request.auth!.user, projectTaskId)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
    monitoring: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { projectTaskId } = parseRequest(projectTaskParamsSchema, request.params)
        const result = await service.monitoring(request.auth!.user, projectTaskId)
        response.status(200).json(successResponse(result, request.requestId))
      } catch (error) { next(error) }
    },
  }
}
