import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { createProjectTaskController } from './project-task.controller.js'
import type { ProjectTaskService } from './project-task.service.js'

export function createClassProjectTaskRouter(dependencies: {
  service: ProjectTaskService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createProjectTaskController(dependencies.service)
  router.post(
    '/:classId/project-tasks',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireRole('INSTRUCTOR'),
    controller.create,
  )
  router.get('/:classId/project-tasks', dependencies.requireAuthentication, controller.list)
  return router
}
