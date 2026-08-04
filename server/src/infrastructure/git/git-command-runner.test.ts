import { describe, expect, it } from 'vitest'
import {
  assertSupportedGitForWindows,
  createSanitizedGitEnvironment,
  parseGitVersion,
} from './git-command-runner.js'
import { GitInfrastructureError } from './git-errors.js'

describe('Git version validation', () => {
  it('accepts the tested Git for Windows version', () => {
    const version = parseGitVersion('git version 2.55.0.windows.3\n')
    expect(version.raw).toBe('2.55.0.windows.3')
    expect(() => assertSupportedGitForWindows(version)).not.toThrow()
  })

  it('accepts later supported Git for Windows patches', () => {
    expect(() =>
      assertSupportedGitForWindows(parseGitVersion('git version 2.56.1.windows.1')),
    ).not.toThrow()
  })

  it('rejects older or non-Windows Git builds', () => {
    expect(() =>
      assertSupportedGitForWindows(parseGitVersion('git version 2.54.9.windows.9')),
    ).toThrow(GitInfrastructureError)
    expect(() => assertSupportedGitForWindows(parseGitVersion('git version 2.55.0'))).toThrow(
      GitInfrastructureError,
    )
  })
})

describe('Git process environment', () => {
  it('inherits only required host values and fixed non-interactive Git settings', () => {
    const environment = createSanitizedGitEnvironment({
      Path: 'SAFE_PATH',
      TEMP: 'SAFE_TEMP',
      DATABASE_URL: 'SENTINEL_DATABASE_URL',
      SMTP_PASSWORD: 'SENTINEL_SMTP_PASSWORD',
      AUTH_COOKIE_SECRET: 'SENTINEL_COOKIE_SECRET',
      GIT_CONFIG_GLOBAL: 'SENTINEL_GIT_CONFIG',
      SSH_ASKPASS: 'SENTINEL_ASKPASS',
    })

    expect(environment.Path).toBe('SAFE_PATH')
    expect(environment.TEMP).toBe('SAFE_TEMP')
    expect(environment.DATABASE_URL).toBeUndefined()
    expect(environment.SMTP_PASSWORD).toBeUndefined()
    expect(environment.AUTH_COOKIE_SECRET).toBeUndefined()
    expect(environment.SSH_ASKPASS).toBeUndefined()
    expect(environment.GIT_CONFIG_NOSYSTEM).toBe('1')
    expect(environment.GIT_CONFIG_GLOBAL).toBe(process.platform === 'win32' ? 'NUL' : '/dev/null')
    expect(environment.GIT_TERMINAL_PROMPT).toBe('0')
  })
})
