import { Router, type RequestHandler } from 'express'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { createClassInvitationController } from './class-invitation.controller.js'
import type { ClassInvitationService } from './class-invitation.service.js'

export function createClassInvitationRouter(dependencies: {
  service: ClassInvitationService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createClassInvitationController(dependencies.service)
  const mutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
  ]
  const lookupLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: (request) =>
      `${request.auth?.user.id ?? 'unknown'}:${request.ip ?? 'unknown'}`,
  })

  router.post(
    '/class-invitations/lookup',
    ...mutation,
    requireRole('INSTRUCTOR'),
    lookupLimit,
    controller.lookup,
  )
  router.post(
    '/classes/:classId/invitations',
    ...mutation,
    requireRole('INSTRUCTOR'),
    controller.create,
  )
  router.get(
    '/classes/:classId/invitations',
    dependencies.requireAuthentication,
    requireRole('INSTRUCTOR'),
    controller.listForClass,
  )
  router.get(
    '/class-invitations',
    dependencies.requireAuthentication,
    requireRole('STUDENT'),
    controller.listForStudent,
  )
  router.post(
    '/class-invitations/:invitationId/accept',
    ...mutation,
    requireRole('STUDENT'),
    controller.accept,
  )
  router.post(
    '/class-invitations/:invitationId/decline',
    ...mutation,
    requireRole('STUDENT'),
    controller.decline,
  )

  return router
}
