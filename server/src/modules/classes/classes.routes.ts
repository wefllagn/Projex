import { Router, type RequestHandler } from 'express'
import { createClassMemberRouter } from '../class-members/class-member.routes.js'
import type { ClassMemberService } from '../class-members/class-member.service.js'
import { createClassRouter } from './class.routes.js'
import type { ClassService } from './class.service.js'

export function createClassesRouter(dependencies: {
  classService: ClassService
  classMemberService: ClassMemberService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  router.use(
    createClassMemberRouter({
      service: dependencies.classMemberService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  router.use(
    createClassRouter({
      service: dependencies.classService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  return router
}
