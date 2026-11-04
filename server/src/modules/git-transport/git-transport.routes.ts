import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import type { GitCredentialService } from './git-credential.service.js'
import { createGitTransportController } from './git-transport.controller.js'
import type { GitTransportService } from './git-transport.service.js'

export function createGitTransportRouter(dependencies: {
  credentialService: GitCredentialService
  transportService: GitTransportService
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createGitTransportController(dependencies)
  const mutation = [requireJson, dependencies.requireAuthentication, dependencies.requireCsrf]

  router.post('/repositories/:repositoryId/git-credentials', ...mutation, controller.issueCredential)
  router.get('/repositories/:repositoryId/git-credentials', dependencies.requireAuthentication, controller.listCredentials)
  router.post('/git-credentials/:credentialId/revoke', ...mutation, controller.revokeCredential)
  router.use(createGitProtocolRouter(dependencies))
  return router
}

/** Protocol routes only: never expose browser sessions or credential issuance here. */
export function createGitProtocolRouter(dependencies: {
  credentialService: GitCredentialService
  transportService: GitTransportService
}): Router {
  const router = Router()
  const controller = createGitTransportController(dependencies)
  router.get('/git/repositories/:repositoryId/info/refs', controller.infoRefs)
  router.post('/git/repositories/:repositoryId/git-upload-pack', controller.uploadPack)
  router.post('/git/repositories/:repositoryId/git-receive-pack', controller.receivePack)
  return router
}
