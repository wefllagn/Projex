import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { createClassController } from './class.controller.js'
import type { ClassService } from './class.service.js'

export function createClassRouter(dependencies: {
  service: ClassService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createClassController(dependencies.service)
  const authenticated = [dependencies.requireAuthentication]
  const mutation = [
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
  ]

  router.post(
    '/',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.create,
  )
  router.get('/', ...authenticated, controller.list)
  router.get('/:classId', ...authenticated, controller.get)
  router.patch(
    '/:classId',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.update,
  )
  router.post(
    '/:classId/archive',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.archive,
  )
  router.post(
    '/:classId/restore',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.restore,
  )
  router.get(
    '/:classId/join-code',
    ...authenticated,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.getJoinCode,
  )
  router.post(
    '/:classId/join-code/rotate',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.rotateJoinCode,
  )
  router.post(
    '/:classId/join-code/revoke',
    ...mutation,
    requireAnyRole(['INSTRUCTOR', 'ADMIN']),
    controller.revokeJoinCode,
  )

  return router
}
