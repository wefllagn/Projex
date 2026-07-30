import { Router } from 'express'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { requireJson } from '../../middleware/require-json.js'
import { createAccountSetupController } from './account-setup.controller.js'
import type { AccountSetupService } from './account-setup.service.js'

export function createAccountSetupRouter(service: AccountSetupService): Router {
  const router = Router()
  const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    key: (request) => request.ip ?? 'unknown',
  })
  router.post('/complete', requireJson, limiter, createAccountSetupController(service))
  return router
}
