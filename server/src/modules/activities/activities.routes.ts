import { Router, type RequestHandler } from 'express'
import { createTestCaseRouter } from '../test-cases/test-case.routes.js'
import type { TestCaseService } from '../test-cases/test-case.service.js'
import { createActivityRouter } from './activity.routes.js'
import type { ActivityService } from './activity.service.js'

export function createActivitiesRouter(dependencies: {
  activityService: ActivityService
  testCaseService: TestCaseService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  router.use(
    createTestCaseRouter({
      service: dependencies.testCaseService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  router.use(
    createActivityRouter({
      service: dependencies.activityService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  return router
}
