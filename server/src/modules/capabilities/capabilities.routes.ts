import { Router } from 'express'
import { successResponse } from '../../shared/http/response.js'
import type { PublicCapabilities } from './capabilities.service.js'

export function createCapabilitiesRouter(service: { get(): PublicCapabilities }): Router {
  const router = Router()
  router.get('/', (request, response) => response.status(200).json(successResponse(service.get(), request.requestId)))
  return router
}
