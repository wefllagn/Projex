import { Router, type RequestHandler } from 'express'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import { browserCommitKey } from '../group-browser-commits/group-browser-commit.schemas.js'
import { browserRefInput, browserRefParams, browserRefJobParams, browserRefPreview } from './group-browser-ref.schemas.js'
import type { GroupBrowserRefService } from './group-browser-ref.service.js'

export function createGroupBrowserRefRouter(deps: {service:GroupBrowserRefService;requireAuthentication:RequestHandler;requireCsrf:RequestHandler}) {
  const router=Router()
  router.use('/repositories/:repositoryId/browser-refs',deps.requireAuthentication,requireAnyRole(['STUDENT']))
  router.get('/repositories/:repositoryId/browser-refs/preview',async(req,res,next)=>{
    try {
      const {repositoryId}=parseRequest(browserRefParams,req.params)
      const input=parseRequest(browserRefPreview,req.query)
      res.json(successResponse(await deps.service.preview(req.auth!.user,repositoryId,input.sourceBranchName,input.targetBranchName),req.requestId))
    } catch(error){next(error)}
  })
  router.post('/repositories/:repositoryId/browser-refs',requireJson,deps.requireCsrf,async(req,res,next)=>{
    try {
      const {repositoryId}=parseRequest(browserRefParams,req.params),input=parseRequest(browserRefInput,req.body),key=parseRequest(browserCommitKey,req.header('Idempotency-Key'))
      res.status(202).json(successResponse(await deps.service.create(req.auth!.user,repositoryId,input,key),req.requestId))
    } catch(error){next(error)}
  })
  router.get('/repositories/:repositoryId/browser-refs/:refJobId',async(req,res,next)=>{
    try {
      const {repositoryId,refJobId}=parseRequest(browserRefJobParams,req.params)
      res.json(successResponse(await deps.service.get(req.auth!.user,repositoryId,refJobId),req.requestId))
    } catch(error){next(error)}
  })
  return router
}
