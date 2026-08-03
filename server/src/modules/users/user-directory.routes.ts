import { Router, type RequestHandler } from 'express'
import { requireRole } from '../auth/auth.authorization.js'
import { createUserDirectoryController } from './user-directory.controller.js'
import type { UserDirectoryService } from './user-directory.service.js'

export function createUserDirectoryRouter(dependencies: {
  service: UserDirectoryService
  requireAuthentication: RequestHandler
}): Router {
  const router = Router()
  const controller = createUserDirectoryController(dependencies.service)

  router.get(
    '/',
    dependencies.requireAuthentication,
    requireRole('ADMIN'),
    controller.list,
  )
  router.get(
    '/:userId',
    dependencies.requireAuthentication,
    requireRole('ADMIN'),
    controller.get,
  )

  return router
}
