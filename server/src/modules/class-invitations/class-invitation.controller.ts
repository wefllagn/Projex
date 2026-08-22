import type { NextFunction, Request, Response } from 'express'
import { listResponse, successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  classInvitationClassParamsSchema,
  classInvitationListQuerySchema,
  classInvitationLookupSchema,
  classInvitationParamsSchema,
  createClassInvitationSchema,
} from './class-invitation.schemas.js'
import type { ClassInvitationService } from './class-invitation.service.js'

export function createClassInvitationController(service: ClassInvitationService) {
  return {
    lookup: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(classInvitationLookupSchema, request.body)
        response
          .status(200)
          .json(successResponse(await service.lookup(request.auth!.user, input), request.requestId))
      } catch (error) {
        next(error)
      }
    },
    create: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classInvitationClassParamsSchema, request.params)
        const input = parseRequest(createClassInvitationSchema, request.body)
        response
          .status(201)
          .json(successResponse(await service.create(request.auth!.user, classId, input), request.requestId))
      } catch (error) {
        next(error)
      }
    },
    listForClass: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { classId } = parseRequest(classInvitationClassParamsSchema, request.params)
        const query = parseRequest(classInvitationListQuerySchema, request.query)
        const result = await service.listForClass(request.auth!.user, classId, query)
        response
          .status(200)
          .json(listResponse(result.invitations, result.pagination, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    listForStudent: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = parseRequest(classInvitationListQuerySchema, request.query)
        const result = await service.listForStudent(request.auth!.user, query)
        response
          .status(200)
          .json(listResponse(result.invitations, result.pagination, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    accept: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { invitationId } = parseRequest(classInvitationParamsSchema, request.params)
        response
          .status(200)
          .json(successResponse(await service.accept(request.auth!.user, invitationId), request.requestId))
      } catch (error) {
        next(error)
      }
    },
    decline: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { invitationId } = parseRequest(classInvitationParamsSchema, request.params)
        response
          .status(200)
          .json(successResponse(await service.decline(request.auth!.user, invitationId), request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
