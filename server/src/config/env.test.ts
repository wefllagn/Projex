import { describe, expect, it } from 'vitest'
import { EnvironmentValidationError, loadEnv } from './env.js'

function validEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://placeholder.invalid/projex',
    FRONTEND_ORIGIN: 'http://localhost:5173',
    ACCESS_TOKEN_SECRET: 'x'.repeat(32),
    MAIL_FROM_NAME: 'Projex',
    MAIL_FROM_ADDRESS: 'noreply@example.invalid',
    ...overrides,
  }
}

describe('execution environment boundaries', () => {
  it('requires secure cookies and exactly one proxy hop in production', () => {
    const production = { NODE_ENV: 'production', MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.example.invalid', SMTP_USER: 'placeholder', SMTP_PASSWORD: 'placeholder' }
    expect(() => loadEnv(validEnvironment(production))).toThrow(EnvironmentValidationError)
    const env = loadEnv(validEnvironment({ ...production, AUTH_COOKIE_SECURE: 'true', TRUST_PROXY_HOPS: '1' }))
    expect(env.authCookieSecure).toBe(true)
    expect(env.trustProxyHops).toBe(1)
    expect(env.javaExecutionMode).toBe('disabled')
    expect(env.gitExecutionMode).toBe('disabled')
  })

  it('bounds idle expiry within the absolute refresh lifetime', () => {
    expect(loadEnv(validEnvironment()).sessionIdleTtlMinutes).toBe(30)
    expect(() => loadEnv(validEnvironment({ REFRESH_TOKEN_TTL_DAYS: '1', SESSION_IDLE_TTL_MINUTES: '1441' }))).toThrow(EnvironmentValidationError)
    expect(() => loadEnv(validEnvironment({ ACCESS_TOKEN_TTL_MINUTES: '30', SESSION_IDLE_TTL_MINUTES: '30' }))).toThrow(EnvironmentValidationError)
  })
  it('keeps Java execution disabled by default', () => {
    expect(loadEnv(validEnvironment()).javaExecutionMode).toBe('disabled')
  })

  it('allows local-process execution only outside production', () => {
    expect(
      loadEnv(validEnvironment({ JAVA_EXECUTION_MODE: 'local_process' }))
        .javaExecutionMode,
    ).toBe('local_process')

    expect(() =>
      loadEnv(
        validEnvironment({
          NODE_ENV: 'production',
          JAVA_EXECUTION_MODE: 'local_process',
          MAIL_TRANSPORT: 'smtp',
          SMTP_HOST: 'smtp.example.invalid',
          SMTP_USER: 'placeholder',
          SMTP_PASSWORD: 'placeholder',
        }),
      ),
    ).toThrow(EnvironmentValidationError)
  })

  it('keeps Git execution disabled without requiring storage paths', () => {
    const env = loadEnv(validEnvironment())
    expect(env.gitExecutionMode).toBe('disabled')
    expect(env.gitExecutable).toBe('')
    expect(env.gitStorageRoot).toBe('')
  })

  it('requires absolute Git paths for local-process mode', () => {
    expect(() =>
      loadEnv(
        validEnvironment({
          GIT_EXECUTION_MODE: 'local_process',
          GIT_EXECUTABLE: 'git',
          GIT_STORAGE_ROOT: '.git-storage',
        }),
      ),
    ).toThrow(EnvironmentValidationError)
  })

  it('allows local Git only outside production', () => {
    const local = loadEnv(
      validEnvironment({
        GIT_EXECUTION_MODE: 'local_process',
        GIT_EXECUTABLE: 'C:\\Program Files\\Git\\cmd\\git.exe',
        GIT_STORAGE_ROOT: 'C:\\projex-storage',
      }),
    )
    expect(local.gitExecutionMode).toBe('local_process')

    expect(() =>
      loadEnv(
        validEnvironment({
          NODE_ENV: 'production',
          MAIL_TRANSPORT: 'smtp',
          SMTP_HOST: 'smtp.example.invalid',
          SMTP_USER: 'placeholder',
          SMTP_PASSWORD: 'placeholder',
          GIT_EXECUTION_MODE: 'local_process',
          GIT_EXECUTABLE: 'C:\\Program Files\\Git\\cmd\\git.exe',
          GIT_STORAGE_ROOT: 'C:\\projex-storage',
        }),
      ),
    ).toThrow(EnvironmentValidationError)
  })

  it('keeps Smart HTTP disabled by default', () => {
    const env = loadEnv(validEnvironment())
    expect(env.host).toBe('127.0.0.1')
    expect(env.gitSmartHttpEnabled).toBe(false)
    expect(env.gitCredentialTtlMinutes).toBe(15)
    expect(env.gitInspectionFileLimitBytes).toBe(262_144)
    expect(env.gitInspectionDiffLimitBytes).toBe(524_288)
    expect(env.gitInspectionMaxChangedFiles).toBe(500)
  })

  it('allows an explicit private-LAN development bind without changing secure defaults', () => {
    const env = loadEnv(validEnvironment({
      HOST: '0.0.0.0',
      FRONTEND_ORIGIN: 'http://192.0.2.20:5173',
      AUTH_COOKIE_SECURE: 'false',
      TRUST_PROXY_HOPS: '0',
    }))

    expect(env.nodeEnv).toBe('development')
    expect(env.host).toBe('0.0.0.0')
    expect(env.frontendOrigin).toBe('http://192.0.2.20:5173')
    expect(env.authCookieSecure).toBe(false)
    expect(env.trustProxyHops).toBe(0)
    expect(env.gitSmartHttpEnabled).toBe(false)
  })

  it('requires local Git, an absolute backend, and a loopback host for Smart HTTP', () => {
    const smartHttp = {
      GIT_EXECUTION_MODE: 'local_process',
      GIT_EXECUTABLE: 'C:\\Program Files\\Git\\cmd\\git.exe',
      GIT_STORAGE_ROOT: 'C:\\projex-storage',
      GIT_SMART_HTTP_ENABLED: 'true',
      GIT_HTTP_BACKEND_EXECUTABLE: 'C:\\Program Files\\Git\\mingw64\\libexec\\git-core\\git-http-backend.exe',
    }
    expect(loadEnv(validEnvironment(smartHttp)).gitSmartHttpEnabled).toBe(true)
    expect(() => loadEnv(validEnvironment({ ...smartHttp, HOST: '0.0.0.0' }))).toThrow(
      EnvironmentValidationError,
    )
    expect(() => loadEnv(validEnvironment({ ...smartHttp, GIT_HTTP_BACKEND_EXECUTABLE: 'git-http-backend' }))).toThrow(
      EnvironmentValidationError,
    )
    expect(() => loadEnv(validEnvironment({
      GIT_SMART_HTTP_ENABLED: 'true',
      GIT_HTTP_BACKEND_EXECUTABLE: 'C:\\backend.exe',
    }))).toThrow(EnvironmentValidationError)
  })
})
