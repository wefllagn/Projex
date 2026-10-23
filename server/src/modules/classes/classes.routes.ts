import { createTopicRouter } from '../activities/topic.routes.js'
import type { TopicService } from '../activities/topic.service.js'
import { Router, type RequestHandler } from 'express'
import { createClassActivityRouter } from '../activities/class-activity.routes.js'
import type { ActivityService } from '../activities/activity.service.js'
import { createClassMemberRouter } from '../class-members/class-member.routes.js'
import type { ClassMemberService } from '../class-members/class-member.service.js'
import { createClassProjectTaskRouter } from '../project-tasks/class-project-task.routes.js'
import type { ProjectTaskService } from '../project-tasks/project-task.service.js'
import { createClassRouter } from './class.routes.js'
import type { ClassService } from './class.service.js'

export function createClassesRouter(dependencies: {
  topicService?: TopicService
  classService: ClassService
  classMemberService: ClassMemberService
  activityService: ActivityService
  projectTaskService: ProjectTaskService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  if (dependencies.topicService) router.use(createTopicRouter({ ...dependencies, service: dependencies.topicService }))
  router.use(
    createClassProjectTaskRouter({
      service: dependencies.projectTaskService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
  router.use(
    createClassActivityRouter({
      service: dependencies.activityService,
      requireAuthentication: dependencies.requireAuthentication,
      requireCsrf: dependencies.requireCsrf,
    }),
  )
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
