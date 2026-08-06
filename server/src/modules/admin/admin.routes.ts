import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireActiveUser, requireRole } from '../auth/auth.authorization.js'
import { createAdminController } from './admin.controller.js'
import { createAdminOversightController } from './admin-oversight.controller.js'
import type { AdminOversightService } from './admin-oversight.service.js'
import type { AdminService } from './admin.service.js'

export function createAdminRouter(dependencies: {
  service: AdminService
  oversightService: AdminOversightService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createAdminController(dependencies.service)
  const oversight = createAdminOversightController(dependencies.oversightService)
  const activeAdmin = [dependencies.requireAuthentication, requireRole('ADMIN'), requireActiveUser]

  router.get('/overview', ...activeAdmin, oversight.overview)
  router.get('/academic/classes', ...activeAdmin, oversight.classes)
  router.get('/academic/activities', ...activeAdmin, oversight.activities)
  router.get('/academic/submissions', ...activeAdmin, oversight.submissions)
  router.get('/academic/project-tasks', ...activeAdmin, oversight.projectTasks)
  router.get('/academic/repositories', ...activeAdmin, oversight.repositories)
  router.get('/operations/health', ...activeAdmin, oversight.health)
  router.get('/operations/storage', ...activeAdmin, oversight.storage)
  router.get('/operations/execution-jobs', ...activeAdmin, oversight.executionJobs)
  router.get('/operations/repository-provisioning-jobs', ...activeAdmin, oversight.provisioningJobs)
  router.get('/operations/git-credentials', ...activeAdmin, oversight.gitCredentials)
  router.get('/audit-events', ...activeAdmin, oversight.auditEvents)

  router.get('/users/:userId/account-summary', ...activeAdmin, controller.accountSummary)
  router.post(
    '/users/:userId/sessions/revoke',
    requireJson,
    ...activeAdmin,
    dependencies.requireCsrf,
    controller.revokeUserSessions,
  )
  return router
}
