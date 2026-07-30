import { Router } from 'express'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { requireJson } from '../../middleware/require-json.js'
import type { AuthCookieConfig } from './auth.cookies.js'
import { createAuthController } from './auth.controller.js'
import type { AuthService } from './auth.service.js'
import type { RequestHandler } from 'express'

const ipKey = (request: Parameters<Parameters<typeof createRateLimiter>[0]['key']>[0]) =>
  request.ip ?? 'unknown'

export function createAuthRouter(dependencies: {
  authService: AuthService
  cookieConfig: AuthCookieConfig
  requireAuthentication: RequestHandler
  requireLogoutAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const router = Router()
  const controller = createAuthController(
    dependencies.authService,
    dependencies.cookieConfig,
  )
  const loginLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (request) =>
      `${ipKey(request)}:${String(request.body?.email ?? '').trim().toLowerCase()}`,
  })
  const refreshLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: ipKey,
  })

  router.post('/login', requireJson, loginLimit, controller.login)
  router.post('/refresh', requireJson, refreshLimit, controller.refresh)
  router.post(
    '/logout',
    requireJson,
    dependencies.requireLogoutAuthentication,
    dependencies.requireCsrf,
    controller.logout,
  )
  router.post(
    '/logout-all',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    controller.logoutAll,
  )
  router.get('/me', dependencies.requireAuthentication, controller.me)
  router.post(
    '/change-password',
    requireJson,
    dependencies.requireAuthentication,
    dependencies.requireCsrf,
    controller.changePassword,
  )

  return router
}
