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

function preventSetupCredentialCaching(response: Response): void {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Pragma', 'no-cache')
}

function manualSetupResponse(manualSetupLink: {
  setupLink: string
  expiresAt: Date
} | null) {
  return manualSetupLink
    ? {
        manualSetup: {
          setupLink: manualSetupLink.setupLink,
          expiresAt: manualSetupLink.expiresAt,
        },
      }
    : {}
}

export function createUserProvisioningController(service: UserProvisioningService) {
  return {
    student: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(provisionStudentSchema, request.body)
        const result = await service.provisionStudent(
          request.auth!.user,
          input,
          request.requestId,
        )
        preventSetupCredentialCaching(response)
        response.status(201).json(successResponse({
          ...result.user,
          ...manualSetupResponse(result.manualSetupLink),
        }, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    instructor: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(provisionInstructorSchema, request.body)
        const result = await service.provisionInstructor(
          request.auth!.user,
          input,
          request.requestId,
        )
        preventSetupCredentialCaching(response)
        response.status(201).json(successResponse({
          ...result.user,
          ...manualSetupResponse(result.manualSetupLink),
        }, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    resend: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { userId } = parseRequest(userIdParamsSchema, request.params)
        const manualSetupLink = await service.resendSetup(
          request.auth!.user,
          userId,
          request.requestId,
        )
        preventSetupCredentialCaching(response)
        response
          .status(200)
          .json(successResponse({
            setupLinkSent: true,
            ...manualSetupResponse(manualSetupLink),
          }, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    status: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { userId } = parseRequest(userIdParamsSchema, request.params)
        const input = parseRequest(updateUserStatusSchema, request.body)
        const user = await service.updateStatus(
          request.auth!.user,
          userId,
          input,
          request.requestId,
        )
        response.status(200).json(successResponse(user, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
