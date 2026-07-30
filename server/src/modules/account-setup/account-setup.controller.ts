import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { completeAccountSetupSchema } from './account-setup.schemas.js'
import type { AccountSetupService } from './account-setup.service.js'

export function createAccountSetupController(service: AccountSetupService) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = parseRequest(completeAccountSetupSchema, request.body)
      await service.complete(input.setupToken, input.password)
      response
        .status(200)
        .json(successResponse({ setupCompleted: true }, request.requestId))
    } catch (error) {
      next(error)
    }
  }
}
