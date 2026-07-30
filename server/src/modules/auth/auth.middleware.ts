import type { RequestHandler } from 'express'
import { AppError } from '../../shared/errors/app-error.js'
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  GENERIC_AUTH_MESSAGE,
} from './auth.constants.js'
import type { AuthRepository } from './auth.repository.js'
import type { AuthService } from './auth.service.js'
import type { TokenService } from './auth.tokens.js'

function authenticationError(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: GENERIC_AUTH_MESSAGE,
  })
}

export function createAuthenticationMiddleware(dependencies: {
  repository: AuthRepository
  tokenService: TokenService
  now?: () => Date
  allowRevokedSession?: boolean
  allowInactiveUser?: boolean
}): RequestHandler {
  const {
    repository,
    tokenService,
    now = () => new Date(),
    allowRevokedSession = false,
    allowInactiveUser = false,
  } = dependencies

  return async (request, _response, next) => {
    try {
      const token = request.cookies?.[ACCESS_COOKIE_NAME] as string | undefined
      if (!token) throw authenticationError()
      const claims = await tokenService.verifyAccessToken(token)
      const context = await repository.findContext(claims.sub, claims.sid)
      if (
        !context ||
        (!allowInactiveUser && context.user.status !== 'ACTIVE') ||
        (!allowRevokedSession && context.session.revokedAt) ||
        context.session.expiresAt <= now()
      ) {
        throw authenticationError()
      }

      request.auth = context
      next()
    } catch {
      next(authenticationError())
    }
  }
}

export function createCsrfMiddleware(authService: AuthService): RequestHandler {
  return (request, _response, next) => {
    try {
      if (!request.auth) throw authenticationError()
      authService.verifyCsrf(
        request.auth,
        request.cookies?.[CSRF_COOKIE_NAME] as string | undefined,
        request.header(CSRF_HEADER_NAME),
      )
      next()
    } catch (error) {
      next(error)
    }
  }
}
