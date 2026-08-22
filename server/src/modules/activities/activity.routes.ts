import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { createActivityController } from './activity.controller.js'
import type { ActivityService } from './activity.service.js'

export function createActivityRouter(dependencies: {
  service: ActivityService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createActivityController(dependencies.service)
  const mutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireRole('INSTRUCTOR'),
  ]

  router.get('/:activityId', dependencies.requireAuthentication, controller.get)
  router.patch('/:activityId', ...mutation, controller.update)
  router.post('/:activityId/publish', ...mutation, controller.publish)
  router.post('/:activityId/close', ...mutation, controller.close)
  router.post('/:activityId/reopen', ...mutation, controller.reopen)
  router.post('/:activityId/archive', ...mutation, controller.archive)
  router.post('/:activityId/restore', ...mutation, controller.restore)

  return router
}
