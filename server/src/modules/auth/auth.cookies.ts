import type { CookieOptions, Response } from 'express'
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from './auth.constants.js'
import type { SessionTokens } from './auth.types.js'

export interface AuthCookieConfig {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  accessMaxAgeMs: number
  refreshMaxAgeMs: number
}

function baseOptions(config: AuthCookieConfig): CookieOptions {
  return {
    secure: config.secure,
    sameSite: config.sameSite,
  }
}

export function setAuthCookies(
  response: Response,
  tokens: SessionTokens,
  config: AuthCookieConfig,
): void {
  response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseOptions(config),
    httpOnly: true,
    path: '/',
    maxAge: config.accessMaxAgeMs,
  })
  response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseOptions(config),
    httpOnly: true,
    path: '/api/v1/auth',
    maxAge: config.refreshMaxAgeMs,
  })
  response.cookie(CSRF_COOKIE_NAME, tokens.csrfToken, {
    ...baseOptions(config),
    httpOnly: false,
    path: '/',
    maxAge: config.refreshMaxAgeMs,
  })
}

export function clearAuthCookies(
  response: Response,
  config: AuthCookieConfig,
): void {
  response.clearCookie(ACCESS_COOKIE_NAME, {
    ...baseOptions(config),
    httpOnly: true,
    path: '/',
  })
  response.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseOptions(config),
    httpOnly: true,
    path: '/api/v1/auth',
  })
  response.clearCookie(CSRF_COOKIE_NAME, {
    ...baseOptions(config),
    httpOnly: false,
    path: '/',
  })
}
