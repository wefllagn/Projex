import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { createTestCaseController } from './test-case.controller.js'
import type { TestCaseService } from './test-case.service.js'

export function createTestCaseRouter(dependencies: {
  service: TestCaseService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createTestCaseController(dependencies.service)

  router.get(
    '/:activityId/test-cases',
    dependencies.requireAuthentication,
    controller.list,
  )
  router.put(
    '/:activityId/test-cases',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.replace,
  )

  return router
}
