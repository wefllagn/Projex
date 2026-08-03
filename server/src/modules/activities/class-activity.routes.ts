import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { createActivityController } from './activity.controller.js'
import type { ActivityService } from './activity.service.js'

export function createClassActivityRouter(dependencies: {
  service: ActivityService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createActivityController(dependencies.service)

  router.post(
    '/:classId/activities',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.create,
  )
  router.get(
    '/:classId/activities',
    dependencies.requireAuthentication,
    controller.list,
  )

  return router
}
