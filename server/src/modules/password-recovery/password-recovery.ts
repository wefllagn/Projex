import { Router, type RequestHandler } from 'express'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from 'pino'
import { z } from 'zod'
import { requireRole } from '../auth/auth.authorization.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { TokenService } from '../auth/auth.tokens.js'
import type { PasswordService } from '../auth/auth.password.js'
import { completeAccountSetupSchema } from '../account-setup/account-setup.schemas.js'
import { appendAdminAuditEvent } from '../admin/admin-audit.js'
import { AppError } from '../../shared/errors/app-error.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import { requireJson } from '../../middleware/require-json.js'
import { createRateLimiter } from '../../middleware/rate-limit.js'

export function createPasswordRecoveryService({ prisma, tokenService, passwordService, logger, frontendOrigin, now = () => new Date() }: { prisma: PrismaClient; tokenService: TokenService; passwordService: PasswordService; logger: Logger; frontendOrigin: string; now?: () => Date }) {
  const invalid = () => new AppError({ statusCode: 400, code: 'RECOVERY_TOKEN_INVALID', message: 'This recovery link is invalid, expired, replaced, or already used.' })
  return {
    async issue(caller: SafeUserProfile, userId: string, requestId: string) {
      if (caller.role !== 'ADMIN' || caller.status !== 'ACTIVE') throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      const raw = tokenService.createOpaqueToken(), createdAt = now(), expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000)
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT user_id FROM users WHERE user_id = ${userId}::uuid FOR UPDATE`
        const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, role: true } })
        if (!user || user.status !== 'ACTIVE' || !['STUDENT', 'INSTRUCTOR'].includes(user.role)) throw new AppError({ statusCode: 409, code: 'RECOVERY_NOT_AVAILABLE', message: 'Recovery is available only for activated Student or Instructor accounts.' })
        await tx.accountSetupToken.updateMany({ where: { userId, purpose: 'PASSWORD_RECOVERY', usedAt: null, invalidatedAt: null }, data: { invalidatedAt: createdAt } })
        await tx.accountSetupToken.create({ data: { userId, purpose: 'PASSWORD_RECOVERY', tokenHash: tokenService.hashOpaqueToken(raw), createdAt, expiresAt } })
        await appendAdminAuditEvent(tx, { actorAdminId: caller.id, requestId, action: 'USER_PASSWORD_RECOVERY_ISSUED', targetType: 'USER', targetId: userId, metadata: { expiresAt: expiresAt.toISOString() }, createdAt })
      })
      logger.info({ event: 'auth.password_recovery.issued', actorId: caller.id, userId }, 'password recovery issued')
      return { setupLink: `${frontendOrigin.replace(/\/$/, '')}/password-recovery#token=${encodeURIComponent(raw)}`, expiresAt }
    },
    async complete(raw: string, password: string) {
      passwordService.assertPolicy(password)
      const passwordHash = await passwordService.hash(password), tokenHash = tokenService.hashOpaqueToken(raw), completedAt = now()
      const userId = await prisma.$transaction(async tx => {
        const found = await tx.accountSetupToken.findUnique({ where: { tokenHash }, select: { userId: true } })
        if (!found) throw invalid()
        await tx.$queryRaw`SELECT user_id FROM users WHERE user_id = ${found.userId}::uuid FOR UPDATE`
        const token = await tx.accountSetupToken.findUnique({ where: { tokenHash }, include: { user: { select: { role: true, status: true } } } })
        if (!token || token.purpose !== 'PASSWORD_RECOVERY' || token.usedAt || token.invalidatedAt || token.expiresAt <= completedAt || token.user.status !== 'ACTIVE' || !['STUDENT', 'INSTRUCTOR'].includes(token.user.role)) throw invalid()
        const claimed = await tx.accountSetupToken.updateMany({ where: { id: token.id, usedAt: null, invalidatedAt: null, expiresAt: { gt: completedAt } }, data: { usedAt: completedAt } })
        if (claimed.count !== 1) throw invalid()
        await tx.user.update({ where: { id: token.userId, status: 'ACTIVE' }, data: { passwordHash, passwordChangedAt: completedAt } })
        await tx.refreshSession.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: completedAt } })
        await tx.accountSetupToken.updateMany({ where: { userId: token.userId, id: { not: token.id }, usedAt: null, invalidatedAt: null }, data: { invalidatedAt: completedAt } })
        return token.userId
      })
      logger.info({ event: 'auth.password_recovery.completed', userId }, 'password recovery completed and sessions revoked')
    },
  }
}
export function createPasswordRecoveryRouter(dependencies: Parameters<typeof createPasswordRecoveryService>[0] & { requireAuthentication: RequestHandler; requireCsrf: RequestHandler }) {
  const service = createPasswordRecoveryService(dependencies), router = Router()
  const limit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, key: request => request.auth?.user.id ?? request.ip ?? 'unknown' })
  router.post('/users/:userId/password-recovery', requireJson, dependencies.requireAuthentication, dependencies.requireCsrf, requireRole('ADMIN'), limit, async (request, response, next) => {
    try {
      const { userId } = parseRequest(z.object({ userId: z.uuid() }).strict(), request.params)
      parseRequest(z.object({}).strict(), request.body)
      const result = await service.issue(request.auth!.user, userId, request.requestId)
      response.setHeader('Cache-Control', 'no-store'); response.setHeader('Pragma', 'no-cache')
      response.status(201).json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  })
  router.post('/password-recovery/complete', requireJson, limit, async (request, response, next) => {
    try {
      const input = parseRequest(completeAccountSetupSchema, request.body)
      await service.complete(input.setupToken, input.password)
      response.setHeader('Cache-Control', 'no-store')
      response.json(successResponse({ recoveryCompleted: true }, request.requestId))
    } catch (error) { next(error) }
  })
  return router
}
