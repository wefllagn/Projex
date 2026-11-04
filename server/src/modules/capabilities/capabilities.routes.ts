import { Router } from 'express'
import { successResponse } from '../../shared/http/response.js'
import type { PublicCapabilities } from './capabilities.service.js'

export function createCapabilitiesRouter(service: { get(): PublicCapabilities | Promise<PublicCapabilities> }): Router {
  const router = Router()
  router.get('/', async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json(successResponse(await service.get(), request.requestId))
  })
  return router
}
