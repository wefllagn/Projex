import { Router, type RequestHandler } from 'express'
import type { UserDirectoryService } from './user-directory.service.js'
import { createUserDirectoryRouter } from './user-directory.routes.js'
import type { UserProvisioningService } from './user-provisioning.service.js'
import { createUserProvisioningRouter } from './user-provisioning.routes.js'

export function createUsersRouter(dependencies: {
  directoryService: UserDirectoryService
  provisioningService: UserProvisioningService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  router.use(
    createUserDirectoryRouter({
      service: dependencies.directoryService,
      requireAuthentication: dependencies.requireAuthentication,
    }),
  )
  router.use(
    createUserProvisioningRouter({
      service: dependencies.provisioningService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  return router
}
