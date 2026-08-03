import { Router, type RequestHandler } from 'express'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole, requireRole } from '../auth/auth.authorization.js'
import { createClassMemberController } from './class-member.controller.js'
import type { ClassMemberService } from './class-member.service.js'

export function createClassMemberRouter(dependencies: {
  service: ClassMemberService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createClassMemberController(dependencies.service)
  const joinLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    key: (request) =>
      `${request.auth?.user.id ?? 'unknown'}:${request.ip ?? 'unknown'}`,
  })

  router.post(
    '/join',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireRole('STUDENT'),
    joinLimit,
    controller.join,
  )
  router.get(
    '/:classId/members',
    dependencies.requireAuthentication,
    controller.list,
  )
  router.patch(
    '/:classId/members/:memberId',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.update,
  )

  return router
}
