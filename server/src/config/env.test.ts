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
})
