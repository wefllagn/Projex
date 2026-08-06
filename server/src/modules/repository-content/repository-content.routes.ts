import { Router, type RequestHandler } from 'express'
import { createRepositoryContentController } from './repository-content.controller.js'
import type { RepositoryContentService } from './repository-content.service.js'

export function createRepositoryContentRouter(dependencies: {
  service: RepositoryContentService
  requireAuthentication: RequestHandler
}): Router {
  const router = Router()
  const controller = createRepositoryContentController(dependencies.service)
  const authenticated = dependencies.requireAuthentication

  router.get('/repositories/:repositoryId/source/summary', authenticated, controller.summary)
  router.get('/repositories/:repositoryId/source/branches', authenticated, controller.branches)
  router.get('/repositories/:repositoryId/source/commits', authenticated, controller.history)
  router.get('/repositories/:repositoryId/source/commits/:commitId', authenticated, controller.commit)
  router.get('/repositories/:repositoryId/source/tree', authenticated, controller.tree)
  router.get('/repositories/:repositoryId/source/file', authenticated, controller.file)
  router.get('/repositories/:repositoryId/source/diff', authenticated, controller.diff)
  return router
}
