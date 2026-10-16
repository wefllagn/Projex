import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { createActivityWorkspaceCheckpointController } from './activity-workspace-checkpoint.controller.js'
import type { ActivityWorkspaceCheckpointService } from './activity-workspace-checkpoint.service.js'

export function createActivityWorkspaceCheckpointRouter(dependencies: {
  service: ActivityWorkspaceCheckpointService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createActivityWorkspaceCheckpointController(dependencies.service)
  const student = [dependencies.requireAuthentication, requireAnyRole(['STUDENT'])]
  router.post('/activities/:activityId/repository/checkpoints', requireJson, ...student, dependencies.requireCsrf, controller.create)
  router.get('/activities/:activityId/repository/checkpoints/:checkpointId', ...student, controller.get)
  return router
}
