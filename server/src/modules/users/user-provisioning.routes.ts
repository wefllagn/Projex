import { Router, type RequestHandler } from 'express'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole, requireRole } from '../auth/auth.authorization.js'
import { createUserProvisioningController } from './user-provisioning.controller.js'
import type { UserProvisioningService } from './user-provisioning.service.js'

export function createUserProvisioningRouter(dependencies: {
  service: UserProvisioningService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createUserProvisioningController(dependencies.service)
  const provisioningLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: (request) => request.auth?.user.id ?? request.ip ?? 'unknown',
  })
  const resendLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (request) => request.auth?.user.id ?? request.ip ?? 'unknown',
  })
  const protectedMutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
  ]

  router.post(
    '/students',
    ...protectedMutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    provisioningLimit,
    controller.student,
  )
  router.post(
    '/instructors',
    ...protectedMutation,
    requireRole('ADMIN'),
    provisioningLimit,
    controller.instructor,
  )
  router.post(
    '/:userId/resend-setup',
    ...protectedMutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    resendLimit,
    controller.resend,
  )
  router.patch(
    '/:userId/status',
    ...protectedMutation,
    requireRole('ADMIN'),
    controller.status,
  )

  return router
}
