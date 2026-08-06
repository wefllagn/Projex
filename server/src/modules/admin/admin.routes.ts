import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { createAdminController } from './admin.controller.js'
import type { AdminService } from './admin.service.js'

export function createAdminRouter(dependencies: {
  service: AdminService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createAdminController(dependencies.service)
  const activeAdmin = [dependencies.requireAuthentication, requireRole('ADMIN')]

  router.get('/users/:userId/account-summary', ...activeAdmin, controller.accountSummary)
  router.post(
    '/users/:userId/sessions/revoke',
    requireJson,
    ...activeAdmin,
    dependencies.requireCsrf,
    controller.revokeUserSessions,
  )
  return router
}
