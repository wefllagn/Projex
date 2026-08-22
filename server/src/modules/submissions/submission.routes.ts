import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { createSubmissionController } from './submission.controller.js'
import type { SubmissionService } from './submission.service.js'

export function createSubmissionRouter(dependencies: {
  service: SubmissionService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createSubmissionController(dependencies.service)
  const studentMutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireAnyRole(['STUDENT']),
  ]
  const instructorMutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireAnyRole(['INSTRUCTOR']),
  ]

  router.post(
    '/activities/:activityId/submissions',
    ...studentMutation,
    controller.create,
  )
  router.get(
    '/activities/:activityId/submissions',
    dependencies.requireAuthentication,
    controller.list,
  )
  router.get(
    '/activities/:activityId/attempt-state',
    dependencies.requireAuthentication,
    requireAnyRole(['STUDENT']),
    controller.getAttemptState,
  )
  router.post(
    '/activities/:activityId/visible-test-runs',
    ...studentMutation,
    controller.createPractice,
  )
  router.get(
    '/visible-test-runs/:runId',
    dependencies.requireAuthentication,
    controller.getPractice,
  )
  router.get(
    '/submissions/:submissionId',
    dependencies.requireAuthentication,
    controller.get,
  )
  router.post(
    '/submissions/:submissionId/score-corrections',
    ...instructorMutation,
    controller.correctScore,
  )
  router.put(
    '/submissions/:submissionId/review',
    ...instructorMutation,
    controller.review,
  )
  router.post(
    '/submissions/:submissionId/release',
    ...instructorMutation,
    controller.release,
  )
  router.post(
    '/submissions/:submissionId/assessment/retry',
    ...instructorMutation,
    controller.retry,
  )
  router.post(
    '/submissions/:submissionId/assessment/resolve-failure',
    ...instructorMutation,
    controller.resolveFailure,
  )

  return router
}
