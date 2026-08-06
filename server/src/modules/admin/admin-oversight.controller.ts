import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import type { AdminOversightService } from './admin-oversight.service.js'
import {
  adminActivityQuerySchema,
  adminAuditEventQuerySchema,
  adminClassQuerySchema,
  adminExecutionJobQuerySchema,
  adminGitCredentialQuerySchema,
  adminProjectTaskQuerySchema,
  adminProvisioningJobQuerySchema,
  adminRepositoryQuerySchema,
  adminSubmissionQuerySchema,
} from './admin-oversight.schemas.js'

export function createAdminOversightController(service: AdminOversightService) {
  const listed = <T>(response: Response, request: Request, result: { items: T[]; pagination: Parameters<typeof listResponse<T>>[1] }) => {
    response.status(200).json(listResponse(result.items, result.pagination, request.requestId))
  }

  return {
    overview: async (request: Request, response: Response, next: NextFunction) => {
      try {
        response.status(200).json(successResponse(await service.overview(request.auth!.user), request.requestId))
      } catch (error) { next(error) }
    },
    classes: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listClasses(request.auth!.user, parseRequest(adminClassQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    activities: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listActivities(request.auth!.user, parseRequest(adminActivityQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    submissions: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listSubmissions(request.auth!.user, parseRequest(adminSubmissionQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    projectTasks: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listProjectTasks(request.auth!.user, parseRequest(adminProjectTaskQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    repositories: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listRepositories(request.auth!.user, parseRequest(adminRepositoryQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    health: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await service.health(request.auth!.user)
        response.status(result.statusCode).json(successResponse(result.data, request.requestId))
      }
      catch (error) { next(error) }
    },
    storage: async (request: Request, response: Response, next: NextFunction) => {
      try { response.status(200).json(successResponse(await service.storage(request.auth!.user), request.requestId)) }
      catch (error) { next(error) }
    },
    executionJobs: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listExecutionJobs(request.auth!.user, parseRequest(adminExecutionJobQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    provisioningJobs: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listProvisioningJobs(request.auth!.user, parseRequest(adminProvisioningJobQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    gitCredentials: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listGitCredentials(request.auth!.user, parseRequest(adminGitCredentialQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
    auditEvents: async (request: Request, response: Response, next: NextFunction) => {
      try { listed(response, request, await service.listAuditEvents(request.auth!.user, parseRequest(adminAuditEventQuerySchema, request.query))) }
      catch (error) { next(error) }
    },
  }
}
