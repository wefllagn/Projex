import cookieParser from 'cookie-parser'
import express from 'express'
import pino from 'pino'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import { requireRole } from './auth.authorization.js'
import type { AuthCookieConfig } from './auth.cookies.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from './auth.middleware.js'
import { createPasswordService } from './auth.password.js'
import type {
  AuthRepository,
  CreateSessionInput,
  RotateSessionInput,
} from './auth.repository.js'
import { createAuthRouter } from './auth.routes.js'
import { createAuthService } from './auth.service.js'
import { createTokenService } from './auth.tokens.js'
import type { AuthSession, AuthUser, SafeUserProfile } from './auth.types.js'

const userId = '11111111-1111-4111-8111-111111111111'
const password = 'ValidPassword1!'
let passwordHash = ''

beforeAll(async () => {
  passwordHash = await createPasswordService().hash(password)
})

class MemoryAuthRepository implements AuthRepository {
  users = new Map<string, AuthUser>()
  sessions = new Map<string, AuthSession>()

  constructor(status: AuthUser['status'] = 'ACTIVE') {
    this.users.set(userId, {
      id: userId,
      fullName: 'Test Student',
      email: 'student@slu.edu',
      role: 'STUDENT',
      status,
      passwordHash,
      passwordChangedAt: null,
    })
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null
  }

  async findContext(contextUserId: string, sessionId: string) {
    const user = this.users.get(contextUserId)
    const session = this.sessions.get(sessionId)
    if (!user || !session || session.userId !== user.id) return null
    return { user: toSafeProfile(user), session }
  }

  async findSessionByTokenHash(tokenHash: string) {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.tokenHash === tokenHash,
    )
    if (!session) return null
    const user = this.users.get(session.userId)
    return user ? { session, user } : null
  }

  async createSession(input: CreateSessionInput) {
    const session = toSession(input)
    this.sessions.set(session.id, session)
    return session
  }

  async rotateSession(input: RotateSessionInput) {
    const previous = this.sessions.get(input.previousSessionId)
    if (!previous || previous.revokedAt || previous.replacedBySessionId) return null
    previous.revokedAt = input.usedAt
    previous.replacedBySessionId = input.id
    const replacement = toSession(input)
    this.sessions.set(replacement.id, replacement)
    return replacement
  }

  async revokeSession(sessionId: string, revokedAt: Date) {
    const session = this.sessions.get(sessionId)
    if (session && !session.revokedAt) session.revokedAt = revokedAt
  }

  async revokeFamily(familyId: string, revokedAt: Date) {
    for (const session of this.sessions.values()) {
      if (session.familyId === familyId && !session.revokedAt) session.revokedAt = revokedAt
    }
  }

  async revokeAllUserSessions(
    targetUserId: string,
    revokedAt: Date,
    exceptSessionId?: string,
  ) {
    for (const session of this.sessions.values()) {
      if (
        session.userId === targetUserId &&
        session.id !== exceptSessionId &&
        !session.revokedAt
      ) {
        session.revokedAt = revokedAt
      }
    }
  }

  async changePassword(
    targetUserId: string,
    currentSessionId: string,
    newHash: string,
    changedAt: Date,
  ) {
    const user = this.users.get(targetUserId)
    if (user) {
      user.passwordHash = newHash
      user.passwordChangedAt = changedAt
    }
    await this.revokeAllUserSessions(targetUserId, changedAt, currentSessionId)
  }
}

function toSafeProfile(user: AuthUser): SafeUserProfile {
  const { id, fullName, email, role, status } = user
  return { id, fullName, email, role, status }
}

function toSession(input: CreateSessionInput): AuthSession {
  return {
    id: input.id,
    userId: input.userId,
    familyId: input.familyId,
    tokenHash: input.tokenHash,
    csrfTokenHash: input.csrfTokenHash,
    createdAt: new Date(),
    lastUsedAt: null,
    expiresAt: input.expiresAt,
    revokedAt: null,
    replacedBySessionId: null,
  }
}

const cookieConfig: AuthCookieConfig = {
  secure: false,
  sameSite: 'lax',
  accessMaxAgeMs: 15 * 60 * 1000,
  refreshMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
}

function createHarness(status: AuthUser['status'] = 'ACTIVE') {
  const repository = new MemoryAuthRepository(status)
  const passwordService = createPasswordService()
  const tokenService = createTokenService('a'.repeat(64), 15)
  const logger = pino({ level: 'silent' })
  const authService = createAuthService({
    repository,
    passwordService,
    tokenService,
    logger,
    config: { refreshTokenTtlDays: 7 },
  })
  const requireAuthentication = createAuthenticationMiddleware({
    repository,
    tokenService,
  })
  const requireLogoutAuthentication = createAuthenticationMiddleware({
    repository,
    tokenService,
    allowRevokedSession: true,
    allowInactiveUser: true,
  })
  const requireCsrf = createCsrfMiddleware(authService)
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json())
  app.use(cookieParser())
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      authService,
      cookieConfig,
      requireAuthentication,
      requireLogoutAuthentication,
      requireCsrf,
    }),
  )
  app.get('/api/v1/admin-only', requireAuthentication, requireRole('ADMIN'), (_req, res) => {
    res.status(200).json({ ok: true })
  })
  app.use(createErrorHandler(logger))
  return { app, repository, authService, tokenService }
}

async function login(app: express.Express) {
  return request(app)
    .post('/api/v1/auth/login')
    .set('content-type', 'application/json')
    .send({ email: 'STUDENT@SLU.EDU', password })
    .expect(200)
}

function setCookies(response: request.Response): string[] {
  return response.headers['set-cookie'] as unknown as string[]
}

function cookiePair(cookies: string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`))
  if (!cookie) throw new Error(`Missing cookie ${name}`)
  return cookie.split(';')[0]!
}

function cookieValue(cookies: string[], name: string): string {
  return decodeURIComponent(cookiePair(cookies, name).slice(name.length + 1))
}

describe('authentication HTTP and session security', () => {
  it('logs in successfully, returns a safe profile, and sets all cookie attributes', async () => {
    const { app } = createHarness()
    const response = await login(app)
    expect(response.body.data).toEqual({
      id: userId,
      fullName: 'Test Student',
      email: 'student@slu.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
    })
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|token|csrf|sessionHash|argon2/i,
    )
    const cookies = setCookies(response)
    const accessCookie = cookies.find((value) => value.startsWith('projex_access='))!
    expect(accessCookie).toContain('HttpOnly')
    expect(accessCookie).toContain('Path=/')
    expect(accessCookie).toContain('SameSite=Lax')
    const refreshCookie = cookies.find((value) => value.startsWith('projex_refresh='))!
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toContain('Path=/api/v1/auth')
    expect(refreshCookie).toContain('SameSite=Lax')
    const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))!
    expect(csrfCookie).toMatch(/Path=\/.*SameSite=Lax/)
    expect(csrfCookie).not.toContain('HttpOnly')
  })

  it.each(['SETUP_PENDING', 'INACTIVE', 'SUSPENDED'] as const)(
    'returns the same generic login error for %s users',
    async (status) => {
      const { app } = createHarness(status)
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('content-type', 'application/json')
        .send({ email: 'student@slu.edu', password })
        .expect(401)
      expect(response.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      })
    },
  )

  it('uses the same generic response for unknown email and wrong password', async () => {
    const { app } = createHarness()
    for (const body of [
      { email: 'unknown@slu.edu', password },
      { email: 'student@slu.edu', password: 'WrongPassword1!' },
    ]) {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('content-type', 'application/json')
        .send(body)
        .expect(401)
      expect(response.body.error.message).toBe('Invalid email or password.')
    }
  })

  it('does not echo password material in validation errors', async () => {
    const { app } = createHarness()
    const secretValue = 'NeverEchoThisPassword1!'
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('content-type', 'application/json')
      .send({ email: 'not-an-email', password: secretValue })
      .expect(400)
    expect(JSON.stringify(response.body)).not.toContain(secretValue)
  })

  it('authenticates /me and uses the current database role and status', async () => {
    const { app, repository } = createHarness()
    const loggedIn = await login(app)
    const access = cookiePair(setCookies(loggedIn), 'projex_access')
    repository.users.get(userId)!.role = 'ADMIN'

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('cookie', access)
      .expect(200)
    expect(response.body.data.role).toBe('ADMIN')

    repository.users.get(userId)!.status = 'SUSPENDED'
    await request(app).get('/api/v1/auth/me').set('cookie', access).expect(401)
  })

  it('rejects unauthenticated /me and enforces current database role checks', async () => {
    const { app } = createHarness()
    await request(app).get('/api/v1/auth/me').expect(401)
    const loggedIn = await login(app)
    await request(app)
      .get('/api/v1/admin-only')
      .set('cookie', cookiePair(setCookies(loggedIn), 'projex_access'))
      .expect(403)
  })

  it('rotates refresh and CSRF tokens and revokes the replaced session', async () => {
    const { app, repository } = createHarness()
    const loggedIn = await login(app)
    const oldCookies = setCookies(loggedIn)
    const oldRefresh = cookiePair(oldCookies, 'projex_refresh')
    const oldCsrfPair = cookiePair(oldCookies, 'projex_csrf')
    const oldCsrf = cookieValue(oldCookies, 'projex_csrf')
    const originalExpiry = [...repository.sessions.values()][0]!.expiresAt.getTime()

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('content-type', 'application/json')
      .set('cookie', `${oldRefresh}; ${oldCsrfPair}`)
      .set('x-csrf-token', oldCsrf)
      .send({})
      .expect(200)
    expect(JSON.stringify(refreshed.body)).not.toMatch(/token|csrf/i)
    expect(cookieValue(setCookies(refreshed), 'projex_refresh')).not.toBe(
      cookieValue(oldCookies, 'projex_refresh'),
    )
    expect([...repository.sessions.values()].filter((session) => session.revokedAt)).toHaveLength(1)
    expect([...repository.sessions.values()].find((session) => !session.revokedAt)!.expiresAt.getTime()).toBe(originalExpiry)
  })

  it('rejects a session whose existing activity timestamp exceeds the idle limit', async () => {
    const { app, repository } = createHarness()
    const loggedIn = await login(app)
    const session = [...repository.sessions.values()][0]!
    session.createdAt = new Date(Date.now() - 31 * 60 * 1000)
    await request(app).get('/api/v1/auth/me').set('cookie', cookiePair(setCookies(loggedIn), 'projex_access')).expect(401)
  })

  it('detects refresh reuse and revokes the whole family', async () => {
    const { app, repository } = createHarness()
    const loggedIn = await login(app)
    const oldCookies = setCookies(loggedIn)
    const oldCookieHeader = `${cookiePair(oldCookies, 'projex_refresh')}; ${cookiePair(oldCookies, 'projex_csrf')}`
    const csrf = cookieValue(oldCookies, 'projex_csrf')
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('content-type', 'application/json')
      .set('cookie', oldCookieHeader)
      .set('x-csrf-token', csrf)
      .send({})
      .expect(200)
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('content-type', 'application/json')
      .set('cookie', oldCookieHeader)
      .set('x-csrf-token', csrf)
      .send({})
      .expect(401)
    expect([...repository.sessions.values()].every((session) => session.revokedAt)).toBe(true)
  })

  it.each([
    ['missing header', false, true, false],
    ['missing cookie', true, false, false],
    ['mismatched values', true, true, true],
    ['wrong session hash', true, true, false],
  ] as const)(
    'rejects CSRF with %s',
    async (_label, includeHeader, includeCookie, mismatch) => {
      const { app } = createHarness()
      const loggedIn = await login(app)
      const cookies = setCookies(loggedIn)
      const access = cookiePair(cookies, 'projex_access')
      const realCsrf = cookieValue(cookies, 'projex_csrf')
      const sentCsrf = mismatch ? 'mismatched-csrf-value' : 'same-but-wrong-hash'
      const cookieHeader = includeCookie
        ? `${access}; projex_csrf=${encodeURIComponent(sentCsrf)}`
        : access
      let operation = request(app)
        .post('/api/v1/auth/logout')
        .set('content-type', 'application/json')
        .set('cookie', cookieHeader)
        .send({})
      if (includeHeader) {
        operation = operation.set(
          'x-csrf-token',
          mismatch ? realCsrf : sentCsrf,
        )
      }
      await operation.expect(403)
    },
  )

  it('accepts a valid CSRF request and revokes logout session', async () => {
    const { app, repository } = createHarness()
    const loggedIn = await login(app)
    const cookies = setCookies(loggedIn)
    const cookieHeader = `${cookiePair(cookies, 'projex_access')}; ${cookiePair(cookies, 'projex_csrf')}`
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('content-type', 'application/json')
        .set('cookie', cookieHeader)
        .set('x-csrf-token', cookieValue(cookies, 'projex_csrf'))
        .send({})
        .expect(200)
    }
    expect([...repository.sessions.values()][0]?.revokedAt).toBeInstanceOf(Date)
  })

  it('logout-all revokes every session for the user', async () => {
    const { app, repository } = createHarness()
    await login(app)
    const second = await login(app)
    const cookies = setCookies(second)
    await request(app)
      .post('/api/v1/auth/logout-all')
      .set('content-type', 'application/json')
      .set(
        'cookie',
        `${cookiePair(cookies, 'projex_access')}; ${cookiePair(cookies, 'projex_csrf')}`,
      )
      .set('x-csrf-token', cookieValue(cookies, 'projex_csrf'))
      .send({})
      .expect(200)
    expect([...repository.sessions.values()].every((session) => session.revokedAt)).toBe(true)
  })

  it('password change hashes the new password and revokes other sessions', async () => {
    const { app, repository } = createHarness()
    await login(app)
    const second = await login(app)
    const cookies = setCookies(second)
    await request(app)
      .post('/api/v1/auth/change-password')
      .set('content-type', 'application/json')
      .set(
        'cookie',
        `${cookiePair(cookies, 'projex_access')}; ${cookiePair(cookies, 'projex_csrf')}`,
      )
      .set('x-csrf-token', cookieValue(cookies, 'projex_csrf'))
      .send({
        currentPassword: password,
        newPassword: 'NewValidPassword2!',
        confirmPassword: 'NewValidPassword2!',
      })
      .expect(200)
    const sessions = [...repository.sessions.values()]
    expect(sessions.filter((session) => session.revokedAt)).toHaveLength(1)
    expect(await createPasswordService().verify(repository.users.get(userId)!.passwordHash!, 'NewValidPassword2!')).toBe(true)
  })
})
