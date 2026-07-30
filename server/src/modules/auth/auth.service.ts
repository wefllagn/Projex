import { randomUUID } from 'node:crypto'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import {
  GENERIC_AUTH_MESSAGE,
  INVALID_LOGIN_MESSAGE,
} from './auth.constants.js'
import type { PasswordService } from './auth.password.js'
import type { AuthRepository } from './auth.repository.js'
import type { TokenService } from './auth.tokens.js'
import type {
  AuthUser,
  AuthContext,
  SafeUserProfile,
  SessionMetadata,
  SessionTokens,
} from './auth.types.js'

function safeProfile(user: AuthUser): SafeUserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}

export interface AuthServiceConfig {
  refreshTokenTtlDays: number
}

export interface AuthResult {
  profile: SafeUserProfile
  tokens: SessionTokens
}

export interface AuthService {
  login(email: string, password: string, metadata: SessionMetadata): Promise<AuthResult>
  refresh(input: {
    refreshToken?: string
    csrfCookie?: string
    csrfHeader?: string
    metadata: SessionMetadata
  }): Promise<AuthResult>
  logout(context: AuthContext): Promise<void>
  logoutAll(context: AuthContext): Promise<void>
  changePassword(
    context: AuthContext,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>
  verifyCsrf(context: AuthContext, csrfCookie?: string, csrfHeader?: string): void
}

function authError(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: GENERIC_AUTH_MESSAGE,
  })
}

export function createAuthService(dependencies: {
  repository: AuthRepository
  passwordService: PasswordService
  tokenService: TokenService
  logger: Logger
  config: AuthServiceConfig
  now?: () => Date
}): AuthService {
  const {
    repository,
    passwordService,
    tokenService,
    logger,
    config,
    now = () => new Date(),
  } = dependencies

  async function createSession(
    profile: SafeUserProfile,
    metadata: SessionMetadata,
    updateLastLogin: boolean,
    familyId = randomUUID(),
  ): Promise<AuthResult> {
    const sessionId = randomUUID()
    const refreshToken = tokenService.createOpaqueToken()
    const csrfToken = tokenService.createOpaqueToken()
    const expiresAt = new Date(
      now().getTime() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    )
    await repository.createSession({
      id: sessionId,
      userId: profile.id,
      familyId,
      tokenHash: tokenService.hashOpaqueToken(refreshToken),
      csrfTokenHash: tokenService.hashOpaqueToken(csrfToken),
      expiresAt,
      updateLastLogin,
      ...metadata,
    })
    const accessToken = await tokenService.signAccessToken({
      userId: profile.id,
      role: profile.role,
      sessionId,
    })
    return { profile, tokens: { accessToken, refreshToken, csrfToken } }
  }

  function verifyCsrfHash(
    expectedHash: string,
    csrfCookie?: string,
    csrfHeader?: string,
  ): void {
    if (
      !csrfCookie ||
      !csrfHeader ||
      !tokenService.safeEqual(csrfCookie, csrfHeader) ||
      !tokenService.safeEqual(
        tokenService.hashOpaqueToken(csrfHeader),
        expectedHash,
      )
    ) {
      throw new AppError({
        statusCode: 403,
        code: 'CSRF_VALIDATION_FAILED',
        message: 'CSRF validation failed.',
      })
    }
  }

  return {
    async login(email, password, metadata) {
      const user = await repository.findUserByEmail(email)
      const isValid =
        user?.status === 'ACTIVE' &&
        Boolean(user.passwordHash) &&
        (await passwordService.verify(user.passwordHash!, password))

      if (!user || !isValid) {
        logger.warn(
          {
            event: 'auth.login.failed',
            reason: !user
              ? 'unknown_user'
              : user.status !== 'ACTIVE'
                ? 'account_status'
                : 'invalid_password',
          },
          'login failed',
        )
        throw new AppError({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: INVALID_LOGIN_MESSAGE,
        })
      }

      const profile = safeProfile(user)
      const result = await createSession(profile, metadata, true)
      logger.info({ event: 'auth.login.succeeded', userId: user.id }, 'login succeeded')
      return result
    },
    async refresh({ refreshToken, csrfCookie, csrfHeader, metadata }) {
      if (!refreshToken) throw authError()
      const record = await repository.findSessionByTokenHash(
        tokenService.hashOpaqueToken(refreshToken),
      )
      if (!record) throw authError()

      const currentTime = now()
      if (record.session.revokedAt || record.session.replacedBySessionId) {
        await repository.revokeFamily(record.session.familyId, currentTime)
        logger.warn(
          {
            event: 'auth.refresh.reuse_detected',
            userId: record.user.id,
            sessionId: record.session.id,
          },
          'refresh token reuse detected',
        )
        throw authError()
      }

      verifyCsrfHash(record.session.csrfTokenHash, csrfCookie, csrfHeader)
      if (
        record.session.expiresAt <= currentTime ||
        record.user.status !== 'ACTIVE'
      ) {
        await repository.revokeFamily(record.session.familyId, currentTime)
        throw authError()
      }

      const replacementId = randomUUID()
      const newRefreshToken = tokenService.createOpaqueToken()
      const newCsrfToken = tokenService.createOpaqueToken()
      const replacement = await repository.rotateSession({
        id: replacementId,
        previousSessionId: record.session.id,
        userId: record.user.id,
        familyId: record.session.familyId,
        tokenHash: tokenService.hashOpaqueToken(newRefreshToken),
        csrfTokenHash: tokenService.hashOpaqueToken(newCsrfToken),
        expiresAt: new Date(
          currentTime.getTime() +
            config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
        ),
        usedAt: currentTime,
        ...metadata,
      })
      if (!replacement) {
        await repository.revokeFamily(record.session.familyId, currentTime)
        throw authError()
      }

      const accessToken = await tokenService.signAccessToken({
        userId: record.user.id,
        role: record.user.role,
        sessionId: replacement.id,
      })
      logger.info(
        {
          event: 'auth.refresh.rotated',
          userId: record.user.id,
          sessionId: replacement.id,
        },
        'refresh session rotated',
      )
      return {
        profile: safeProfile(record.user),
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          csrfToken: newCsrfToken,
        },
      }
    },
    async logout(context) {
      await repository.revokeSession(context.session.id, now())
      logger.info(
        { event: 'auth.logout', userId: context.user.id, sessionId: context.session.id },
        'user logged out',
      )
    },
    async logoutAll(context) {
      await repository.revokeAllUserSessions(context.user.id, now())
      logger.info({ event: 'auth.logout_all', userId: context.user.id }, 'all sessions revoked')
    },
    async changePassword(context, currentPassword, newPassword) {
      const user = await repository.findUserById(context.user.id)
      if (
        !user?.passwordHash ||
        !(await passwordService.verify(user.passwordHash, currentPassword))
      ) {
        throw new AppError({
          statusCode: 400,
          code: 'CURRENT_PASSWORD_INVALID',
          message: 'Current password is incorrect.',
        })
      }
      passwordService.assertPolicy(newPassword)
      const passwordHash = await passwordService.hash(newPassword)
      await repository.changePassword(
        user.id,
        context.session.id,
        passwordHash,
        now(),
      )
      logger.info({ event: 'auth.password.changed', userId: user.id }, 'password changed')
    },
    verifyCsrf(context, csrfCookie, csrfHeader) {
      verifyCsrfHash(context.session.csrfTokenHash, csrfCookie, csrfHeader)
    },
  }
}
