import { Router, type RequestHandler } from 'express'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { isWellFormedText } from '../../shared/source-text.js'
import { createPrismaSubmissionRepository } from '../submissions/submission.repository.js'
import { practiceProjection, type ExecutionFeatureConfig } from '../submissions/submission.service.js'
import { createHash } from 'node:crypto'
import { practiceError, type createActivityPracticeService } from './practice.service.js'

const params = z.object({ activityId: z.uuid() })
const source = z.string().max(100000).refine(s => isWellFormedText(s) && !s.includes('\0') && Buffer.byteLength(s) <= 100000)
const save = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('SAVE'), sourceCode: source, expectedHead: z.string().regex(/^[0-9a-f]{40}$/), requestKey: z.uuid() }).strict(),
  z.object({ operation: z.literal('RESET'), expectedHead: z.string().regex(/^[0-9a-f]{40}$/), requestKey: z.uuid() }).strict(),
])
export function createActivityPracticeRouter(deps: { prisma: PrismaClient; service: ReturnType<typeof createActivityPracticeService>; config: ExecutionFeatureConfig; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }) {
  const router = Router()
  router.use('/activities/:activityId/practice', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() }, deps.requireAuthentication, requireAnyRole(['STUDENT']))
  for (const suffix of ['availability', ''] as const) router.get(`/activities/:activityId/practice${suffix ? '/' + suffix : ''}`, async (req, res, next) => {
    try { const { activityId } = parseRequest(params, req.params)
      res.json(successResponse(await (suffix ? deps.service.availability(req.auth!.user, activityId) : deps.service.get(req.auth!.user, activityId)), req.requestId))
    } catch (e) { next(e) }
  })
  router.post('/activities/:activityId/practice', requireJson, deps.requireCsrf, async (req, res, next) => {
    try { const { activityId } = parseRequest(params, req.params); parseRequest(z.object({}).strict(), req.body)
      res.status(202).json(successResponse(await deps.service.enter(req.auth!.user, activityId), req.requestId))
    } catch (e) { next(e) }
  })
  router.get('/activities/:activityId/practice/saves/:jobId', async (req, res, next) => {
    try { const { activityId, jobId } = parseRequest(params.extend({ jobId: z.uuid() }), req.params)
      res.json(successResponse(await deps.service.getJob(req.auth!.user, activityId, jobId), req.requestId))
    } catch (e) { next(e) }
  })
  router.post('/activities/:activityId/practice/saves', requireJson, deps.requireCsrf, async (req, res, next) => {
    try { const { activityId } = parseRequest(params, req.params)
      res.status(202).json(successResponse(await deps.service.save(req.auth!.user, activityId, parseRequest(save, req.body)), req.requestId))
    } catch (e) { next(e) }
  })
  router.post('/activities/:activityId/practice/visible-test-runs', requireJson, deps.requireCsrf, async (req, res, next) => {
    try {
      if (deps.config.mode === 'disabled') practiceError('EXECUTION_UNAVAILABLE', 503)
      const { activityId } = parseRequest(params, req.params), input = parseRequest(z.object({ sourceCode: source.refine(s => Boolean(s.trim())) }).strict(), req.body)
      if (Buffer.byteLength(input.sourceCode) > deps.config.sourceLimitBytes) practiceError('SOURCE_CODE_TOO_LARGE', 413)
      const workspace = await deps.prisma.activityPracticeWorkspace.findUnique({ where: { activityId_studentId: { activityId, studentId: req.auth!.user.id } } })
      if (!workspace) practiceError('PRACTICE_UNAVAILABLE', 404)
      const now = new Date()
      const result = await createPrismaSubmissionRepository(deps.prisma).createPractice({ activityId, studentId: req.auth!.user.id, activityPracticeWorkspaceId: workspace.id,
        sourceCode: input.sourceCode, sourceHash: createHash('sha256').update(input.sourceCode).digest('hex'), now,
        expiresAt: new Date(now.getTime() + deps.config.practiceRunTtlHours * 3600000), runsPerMinute: deps.config.practiceRunsPerMinute, maxActivePerActivity: deps.config.practiceMaxActivePerActivity })
      if (result.kind !== 'created') practiceError(result.kind === 'rate_limited' || result.kind === 'capacity_unavailable' ? 'EXECUTION_CAPACITY_UNAVAILABLE' : 'PRACTICE_UNAVAILABLE', result.kind === 'forbidden' ? 404 : 409)
      res.status(202).json(successResponse(practiceProjection(result.practice), req.requestId))
    } catch (e) { next(e) }
  })
  return router
}
