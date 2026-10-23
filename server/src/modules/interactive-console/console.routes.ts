import { Router, type RequestHandler } from 'express'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import { AppError } from '../../shared/errors/app-error.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireAnyRole } from '../auth/auth.authorization.js'
import { codeRunSourceHash } from '../../shared/code-run.js'
import { createPrismaSubmissionRepository } from '../submissions/submission.repository.js'
import type { ExecutionFeatureConfig } from '../submissions/submission.service.js'
import { createConsoleRepository, activePhases, type ConsoleRecord } from './console.repository.js'

const parameters = z.object({ runId: z.uuid() })
const startInput = z.object({ sourceCode: z.string().min(1), requestKey: z.uuid() }).strict()
const lineInput = z.object({ sequence: z.number().int().min(1).max(256), text: z.string().max(4000).refine((s) => !s.includes('\0') && !s.includes('\n') && !s.includes('\r')), eof: z.boolean().default(false) }).strict().refine((line) => !line.eof || line.text === '', { path: ['text'] })
export function consoleProjection(record: ConsoleRecord) {
  const failed = record.practice.status === 'FAILED' && activePhases.includes(record.phase)
  return { id: record.id, activityId: record.practice.activityId, phase: failed ? 'FAILED' : record.phase,
    stdout: record.stdout, stderr: record.stderr, transcript: record.transcript, exitCode: record.exitCode,
    inputClosed: record.inputClosed, nextSequence: (record.inputs as unknown[]).length + 1,
    cancelRequested: record.cancelRequested }
}
async function retrySerialization<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation() } catch (error) {
      if (attempt >= 2 || !error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2034') throw error
    }
  }
}
export function createConsoleRouter(deps: { prisma: PrismaClient; config: ExecutionFeatureConfig; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }) {
  const router = Router()
  const noStore: RequestHandler = (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() }
  const repository = createConsoleRepository(deps.prisma)
  const submissions = createPrismaSubmissionRepository(deps.prisma)
  const mutations = [noStore, requireJson, deps.requireAuthentication, deps.requireCsrf, requireAnyRole(['STUDENT'])]
  router.post('/activities/:activityId/interactive-code-runs', ...mutations, async (req, res, next) => {
    try {
      if (deps.config.mode === 'disabled') throw new AppError({ statusCode: 503, code: 'EXECUTION_UNAVAILABLE', message: 'Java execution is unavailable.' })
      const { activityId } = parseRequest(z.object({ activityId: z.uuid() }), req.params)
      const input = parseRequest(startInput, req.body)
      if (Buffer.byteLength(input.sourceCode, 'utf8') > deps.config.sourceLimitBytes || input.sourceCode.includes('\0')) {
        throw new AppError({ statusCode: 413, code: 'SOURCE_CODE_TOO_LARGE', message: 'Source exceeds the allowed size.' })
      }
      const now = new Date()
      const result = await retrySerialization(() => submissions.createCodeRun({ activityId, studentId: req.auth!.user.id,
        sourceCode: input.sourceCode, sourceHash: codeRunSourceHash(input.sourceCode), stdin: '',
        consoleRequestKey: input.requestKey, now, expiresAt: new Date(now.getTime() + deps.config.practiceRunTtlHours * 3600000),
        runsPerMinute: deps.config.practiceRunsPerMinute, maxActivePerActivity: deps.config.practiceMaxActivePerActivity }))
      if (result.kind !== 'created') {
        const limited = result.kind === 'rate_limited' || result.kind === 'capacity_unavailable'
        throw new AppError({ statusCode: limited ? 429 : result.kind === 'activity_not_accepting' ? 409 : 404,
          code: limited ? 'EXECUTION_CAPACITY_UNAVAILABLE' : 'ACTIVITY_NOT_ACCEPTING_EXECUTION', message: 'This code run cannot start right now.' })
      }
      res.status(202).json(successResponse(consoleProjection(await repository.access(result.practice.id, req.auth!.user.id, 'read')), req.requestId))
    } catch (error) { next(error) }
  })
  router.get('/interactive-code-runs/:runId', noStore, deps.requireAuthentication, requireAnyRole(['STUDENT']), async (req, res, next) => {
    try {
      const { runId } = parseRequest(parameters, req.params)
      res.json(successResponse(consoleProjection(await repository.access(runId, req.auth!.user.id, 'read')), req.requestId))
    } catch (error) { next(error) }
  })
  for (const action of ['input', 'stop'] as const) {
    router.post(`/interactive-code-runs/:runId/${action}`, ...mutations, async (req, res, next) => {
      try {
        const { runId } = parseRequest(parameters, req.params)
        const input = action === 'input' ? parseRequest(lineInput, req.body) : undefined
        if (action === 'stop') parseRequest(z.object({}).strict(), req.body)
        res.json(successResponse(consoleProjection(await repository.access(runId, req.auth!.user.id, action, input)), req.requestId))
      } catch (error) { next(error) }
    })
  }
  return router
}
