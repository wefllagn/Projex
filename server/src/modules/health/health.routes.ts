import { Router } from 'express'
import { createHealthController } from './health.controller.js'
import type { HealthService } from './health.service.js'

export function createHealthRouter(healthService: HealthService): Router {
  const router = Router()
  router.get('/', createHealthController(healthService))
  return router
}
