import { describe, expect, it } from 'vitest'
import {
  assertSupportedGitForWindows,
  assertSupportedGitVersion,
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

  it.each([
    ['win32', '2.55.0.windows.3'],
    ['win32', '2.56.1.windows.1'],
    ['darwin', '2.55.0'],
    ['darwin', '2.55.1'],
    ['darwin', '2.56.0'],
    ['darwin', '3.0.0'],
    ['linux', '2.43.0'],
    ['linux', '2.43.9'],
    ['linux', '2.44.0'],
    ['linux', '2.55.0'],
    ['linux', '3.0.0'],
  ] as const)('accepts supported %s release %s', (platform, release) => {
    expect(() => assertSupportedGitVersion(parseGitVersion(`git version ${release}\n`), platform)).not.toThrow()
  })

  it.each([
    ['win32', '2.54.9.windows.9'],
    ['win32', '2.55.0'],
    ['darwin', '2.54.9'],
    ['darwin', '1.99.99'],
    ['darwin', '2.55.0.windows.3'],
    ['linux', '2.42.99'],
    ['linux', '1.99.99'],
    ['linux', '2.43.0.windows.3'],
    ['linux', '2.55.0.windows.3'],
    ['win32', '2.43.0.windows.3'],
    ['darwin', '2.43.0'],
    ['freebsd', '2.55.0'],
  ] as const)('rejects unsupported %s release %s', (platform, release) => {
    expect(() => assertSupportedGitVersion(parseGitVersion(`git version ${release}`), platform))
      .toThrowError('GIT_VERSION_UNSUPPORTED')
  })

  it.each([
    '2.55.0',
    'git version 2.55',
    'git version 2.55.0-rc1',
    'git version 2.43.0-rc1',
    'git version 2.43.0.ubuntu.1',
    'git version 2.43.0\nuntrusted output',
    'git version 2.55.0.vendor.1',
    'git version 2.55.0 (Apple Git-999)',
    'git version 2.55.0.windows',
    'git version 2.55.0.windows.3.extra',
    'git version 2.55.0\nuntrusted output',
    'git version 9007199254740992.0.0',
    'git version 2.55.0.windows.9007199254740992',
  ])('rejects malformed or unverified output %j', (output) => {
    expect(() => parseGitVersion(output)).toThrowError('GIT_VERSION_UNRECOGNIZED')
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
      GIT_CONFIG_PARAMETERS: 'SENTINEL_UNTRUSTED_GIT_CONFIG',
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.hooksPath',
      GIT_CONFIG_VALUE_0: 'SENTINEL_UNTRUSTED_HOOKS',
      GIT_CONFIG_SYSTEM: 'SENTINEL_SYSTEM_CONFIG',
      GIT_DIR: 'SENTINEL_GIT_DIR',
      GIT_WORK_TREE: 'SENTINEL_WORK_TREE',
      GIT_OBJECT_DIRECTORY: 'SENTINEL_OBJECTS',
      GIT_ALTERNATE_OBJECT_DIRECTORIES: 'SENTINEL_ALTERNATES',
      NODE_OPTIONS: 'SENTINEL_NODE_OPTIONS',
      SSH_ASKPASS: 'SENTINEL_ASKPASS',
    })

    expect(environment.Path).toBe('SAFE_PATH')
    expect(environment.TEMP).toBe('SAFE_TEMP')
    expect(environment.DATABASE_URL).toBeUndefined()
    expect(environment.SMTP_PASSWORD).toBeUndefined()
    expect(environment.AUTH_COOKIE_SECRET).toBeUndefined()
    expect(environment.SSH_ASKPASS).toBeUndefined()
    for (const key of ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0',
      'GIT_CONFIG_SYSTEM', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_OBJECT_DIRECTORY',
      'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'NODE_OPTIONS']) {
      expect(environment[key]).toBeUndefined()
    }
    expect(environment.GIT_CONFIG_NOSYSTEM).toBe('1')
    expect(environment.GIT_CONFIG_GLOBAL).toBe(process.platform === 'win32' ? 'NUL' : '/dev/null')
    expect(environment.GIT_CONFIG_PARAMETERS).toBe(process.platform === 'win32' ? "'core.longpaths=true'" : undefined)
    expect(environment.GIT_TERMINAL_PROMPT).toBe('0')
  })
})
