import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { createRepositoryController } from './repository.controller.js'
import type { RepositoryService } from './repository.service.js'

export function createRepositoryRouter(dependencies: {
  service: RepositoryService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createRepositoryController(dependencies.service)
  const mutation = [requireJson, dependencies.requireAuthentication, dependencies.requireCsrf]

  router.post('/project-tasks/:projectTaskId/repositories', ...mutation, controller.createClassProject)
  router.post('/repositories/personal', ...mutation, controller.createPersonal)
  router.get('/repositories', dependencies.requireAuthentication, controller.list)
  router.get('/repositories/:repositoryId', dependencies.requireAuthentication, controller.get)
  router.patch('/repositories/:repositoryId', ...mutation, controller.update)
  router.post('/repositories/:repositoryId/ready-for-review', ...mutation, controller.readyForReview)
  router.post('/repositories/:repositoryId/request-changes', ...mutation, controller.requestChanges)
  router.post('/repositories/:repositoryId/approve', ...mutation, controller.approve)
  router.post('/repositories/:repositoryId/archive', ...mutation, controller.archive)
  router.post('/repositories/:repositoryId/restore', ...mutation, controller.restore)
  router.get('/repositories/:repositoryId/members', dependencies.requireAuthentication, controller.listMembers)
  router.patch('/repositories/:repositoryId/members/:memberId', ...mutation, controller.transitionMember)
  router.post('/repositories/:repositoryId/invitations', ...mutation, controller.createInvitation)
  router.get('/repositories/:repositoryId/invitations', dependencies.requireAuthentication, controller.listRepositoryInvitations)
  router.get('/repository-invitations', dependencies.requireAuthentication, controller.listReceivedInvitations)
  router.post('/repository-invitations/:invitationId/accept', ...mutation, controller.acceptInvitation)
  router.post('/repository-invitations/:invitationId/decline', ...mutation, controller.declineInvitation)
  router.post('/repository-invitations/:invitationId/revoke', ...mutation, controller.revokeInvitation)
  router.get('/repositories/:repositoryId/feedback', dependencies.requireAuthentication, controller.listFeedback)
  router.post('/repositories/:repositoryId/feedback-drafts', ...mutation, controller.createFeedbackDraft)
  router.patch('/repository-feedback/:feedbackId', ...mutation, controller.updateFeedbackDraft)
  return router
}
