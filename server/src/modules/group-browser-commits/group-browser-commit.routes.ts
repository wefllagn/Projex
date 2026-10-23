import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import { browserCommitInput, browserCommitParams, browserCommitJobParams, browserCommitKey } from './group-browser-commit.schemas.js'
import type { GroupBrowserCommitService } from './group-browser-commit.service.js'

export function createGroupBrowserCommitRouter(deps: { service: GroupBrowserCommitService; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }) {
  const router = Router()
  router.use('/repositories/:repositoryId/browser-commits', deps.requireAuthentication, requireAnyRole(['STUDENT']))
  router.post('/repositories/:repositoryId/browser-commits', requireJson, deps.requireCsrf, async (req,res,next) => {
    try {
      const { repositoryId } = parseRequest(browserCommitParams, req.params)
      const input = parseRequest(browserCommitInput, req.body)
      const key = parseRequest(browserCommitKey, req.header('Idempotency-Key'))
      res.status(202).json(successResponse(await deps.service.create(req.auth!.user, repositoryId, input, key), req.requestId))
    } catch (error) { next(error) }
  })
  router.get('/repositories/:repositoryId/browser-commits/:commitJobId', async (req,res,next) => {
    try {
      const { repositoryId, commitJobId } = parseRequest(browserCommitJobParams, req.params)
      res.json(successResponse(await deps.service.get(req.auth!.user, repositoryId, commitJobId), req.requestId))
    } catch (error) { next(error) }
  })
  return router
}
