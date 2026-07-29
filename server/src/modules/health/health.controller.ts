import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import type { HealthService } from './health.service.js'

export function createHealthController(healthService: HealthService) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const data = await healthService.check()
      response.status(200).json(successResponse(data, request.requestId))
    } catch (error) {
      next(error)
    }
  }
}
