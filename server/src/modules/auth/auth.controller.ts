import type { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  REFRESH_COOKIE_NAME,
} from './auth.constants.js'
import {
  clearAuthCookies,
  setAuthCookies,
  type AuthCookieConfig,
} from './auth.cookies.js'
import { changePasswordSchema, loginSchema } from './auth.schemas.js'
import type { AuthService } from './auth.service.js'

function metadata(request: Request) {
  return {
    userAgent: request.header('user-agent'),
    ipAddress: request.ip,
  }
}

export function createAuthController(
  authService: AuthService,
  cookieConfig: AuthCookieConfig,
) {
  return {
    login: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const input = parseRequest(loginSchema, request.body)
        const result = await authService.login(
          input.email,
          input.password,
          metadata(request),
        )
        setAuthCookies(response, result.tokens, cookieConfig)
        response.status(200).json(successResponse(result.profile, request.requestId))
      } catch (error) {
        next(error)
      }
    },
    refresh: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await authService.refresh({
          refreshToken: request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
          csrfCookie: request.cookies?.[CSRF_COOKIE_NAME] as string | undefined,
          csrfHeader: request.header(CSRF_HEADER_NAME),
          metadata: metadata(request),
        })
        setAuthCookies(response, result.tokens, cookieConfig)
        response
          .status(200)
          .json(successResponse({ refreshed: true }, request.requestId))
      } catch (error) {
        clearAuthCookies(response, cookieConfig)
        next(error)
      }
    },
    logout: async (request: Request, response: Response, next: NextFunction) => {
      try {
        await authService.logout(request.auth!)
        clearAuthCookies(response, cookieConfig)
        response
          .status(200)
          .json(successResponse({ loggedOut: true }, request.requestId))
      } catch (error) {
        clearAuthCookies(response, cookieConfig)
        next(error)
      }
    },
    logoutAll: async (request: Request, response: Response, next: NextFunction) => {
      try {
        await authService.logoutAll(request.auth!)
        clearAuthCookies(response, cookieConfig)
        response
          .status(200)
          .json(successResponse({ loggedOut: true }, request.requestId))
      } catch (error) {
        clearAuthCookies(response, cookieConfig)
        next(error)
      }
    },
    me: (request: Request, response: Response) => {
      response
        .status(200)
        .json(successResponse(request.auth!.user, request.requestId))
    },
    changePassword: async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const input = parseRequest(changePasswordSchema, request.body)
        await authService.changePassword(
          request.auth!,
          input.currentPassword,
          input.newPassword,
        )
        response
          .status(200)
          .json(successResponse({ passwordChanged: true }, request.requestId))
      } catch (error) {
        next(error)
      }
    },
  }
}
