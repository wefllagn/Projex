import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { requireJson } from '../../middleware/require-json.js'
import { requireRole } from '../auth/auth.authorization.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import type { TopicService } from './topic.service.js'
const params = z.object({ classId: z.uuid() }).strict()
export const topicChangeSchema = z.object({
  expectedVersion: z.number().int().min(0), action: z.enum(['create', 'rename', 'remove', 'up', 'down']),
  topicId: z.uuid().optional(), name: z.string().trim().min(1).max(200).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action !== 'create' && !value.topicId) ctx.addIssue({ code: 'custom', path: ['topicId'], message: 'Choose a topic.' })
  if (['create', 'rename'].includes(value.action) && !value.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Enter a topic name.' })
})
export function createTopicRouter(deps: { service: TopicService; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }) {
  const router = Router()
  router.get('/:classId/topics', deps.requireAuthentication, async (req, res, next) => {
    try {
      const { classId } = parseRequest(params, req.params)
      const { page } = parseRequest(z.object({ page: z.coerce.number().int().min(1).default(1) }).strict(), req.query)
      res.json(successResponse(await deps.service.list(req.auth!.user, classId, page), req.requestId))
    } catch (error) { next(error) }
  })
  router.post('/:classId/topics', requireJson, deps.requireAuthentication, deps.requireCsrf, requireRole('INSTRUCTOR'), async (req, res, next) => {
    try {
      const { classId } = parseRequest(params, req.params)
      const input = parseRequest(topicChangeSchema, req.body)
      res.status(input.action === 'create' ? 201 : 200).json(successResponse(await deps.service.change(req.auth!.user, classId, input), req.requestId))
    } catch (error) { next(error) }
  })
  return router
}
