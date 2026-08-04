import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { createProjectTaskController } from './project-task.controller.js'
import type { ProjectTaskService } from './project-task.service.js'

export function createProjectTaskRouter(dependencies: {
  service: ProjectTaskService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createProjectTaskController(dependencies.service)
  const instructorMutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireRole('INSTRUCTOR'),
  ]
  router.get('/:projectTaskId', dependencies.requireAuthentication, controller.get)
  router.patch('/:projectTaskId', ...instructorMutation, controller.update)
  router.post('/:projectTaskId/publish', ...instructorMutation, controller.publish)
  router.post('/:projectTaskId/close', ...instructorMutation, controller.close)
  router.post('/:projectTaskId/archive', ...instructorMutation, controller.archive)
  router.post('/:projectTaskId/restore', ...instructorMutation, controller.restore)
  router.get('/:projectTaskId/teams', dependencies.requireAuthentication, controller.listTeams)
  router.get('/:projectTaskId/monitoring', dependencies.requireAuthentication, controller.monitoring)
  return router
}
