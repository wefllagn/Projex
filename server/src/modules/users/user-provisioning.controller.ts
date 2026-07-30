import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  provisionInstructorSchema,
  provisionStudentSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './user-provisioning.schemas.js'
import type { UserProvisioningService } from './user-provisioning.service.js'

export function createUserProvisioningController(service: UserProvisioningService) {
  return {
    student: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(provisionStudentSchema, request.body)
        const user = await service.provisionStudent(request.auth!.user, input)
        response.status(201).json(successResponse(user, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    instructor: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(provisionInstructorSchema, request.body)
        const user = await service.provisionInstructor(request.auth!.user, input)
        response.status(201).json(successResponse(user, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    resend: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { userId } = parseRequest(userIdParamsSchema, request.params)
        await service.resendSetup(request.auth!.user, userId)
        response
          .status(200)
          .json(successResponse({ setupLinkSent: true }, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    status: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { userId } = parseRequest(userIdParamsSchema, request.params)
        const { status } = parseRequest(updateUserStatusSchema, request.body)
        const user = await service.updateStatus(request.auth!.user, userId, status)
        response.status(200).json(successResponse(user, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
