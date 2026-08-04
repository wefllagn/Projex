import { constants } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { GitInfrastructureError } from './git-errors.js'

export interface DetectedGitVersion {
  raw: string
  major: number
  minor: number
  patch: number
  windowsBuild: number | null
}

export function parseGitVersion(output: string): DetectedGitVersion {
  const match = /^git version (\d+)\.(\d+)\.(\d+)(?:\.windows\.(\d+))?\s*$/i.exec(
    output.trim(),
  )
  if (!match) throw new GitInfrastructureError('GIT_VERSION_UNRECOGNIZED')
  return {
    raw: output.trim().slice('git version '.length),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    windowsBuild: match[4] ? Number(match[4]) : null,
  }
}

export function assertSupportedGitForWindows(version: DetectedGitVersion): void {
  const supported =
    version.windowsBuild !== null &&
    (version.major > 2 ||
      (version.major === 2 &&
        (version.minor > 55 || (version.minor === 55 && version.patch >= 0))))
  if (!supported) throw new GitInfrastructureError('GIT_VERSION_UNSUPPORTED')
}

const INHERITED_ENVIRONMENT_ALLOWLIST = new Set([
  'COMSPEC',
  'LANG',
  'LC_ALL',
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TMPDIR',
  'TZ',
  'WINDIR',
])

export function createSanitizedGitEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && INHERITED_ENVIRONMENT_ALLOWLIST.has(key.toUpperCase())) {
      environment[key] = value
    }
  }
  return {
    ...environment,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_EDITOR: 'true',
  }
}

export function createGitCommandRunner(options: {
  executable: string
  timeoutMs: number
  outputLimitBytes: number
}) {
  if (!path.isAbsolute(options.executable)) {
    throw new GitInfrastructureError('GIT_EXECUTABLE_NOT_ABSOLUTE')
  }
  const executable = path.resolve(options.executable)

  async function validateExecutable(): Promise<void> {
    const executableStat = await stat(executable).catch(() => null)
    if (!executableStat?.isFile()) throw new GitInfrastructureError('GIT_EXECUTABLE_NOT_FOUND')
    await access(executable, constants.X_OK).catch(() => {
      throw new GitInfrastructureError('GIT_EXECUTABLE_NOT_EXECUTABLE')
    })
  }

  function run(args: readonly string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, [...args], {
        cwd,
        env: createSanitizedGitEnvironment(),
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const stdout: Buffer[] = []
      const stderr: Buffer[] = []
      let outputBytes = 0
      let settled = false
      const killProcessTree = () => {
        if (process.platform === 'win32' && child.pid) {
          const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')
          const killer = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], {
            shell: false,
            windowsHide: true,
            stdio: 'ignore',
          })
          killer.unref()
        } else {
          child.kill('SIGKILL')
        }
      }
      const stopWith = (code: string) => {
        if (settled) return
        settled = true
        killProcessTree()
        reject(new GitInfrastructureError(code))
      }
      const timer = setTimeout(() => stopWith('GIT_COMMAND_TIMEOUT'), options.timeoutMs)
      const collect = (target: Buffer[], chunk: Buffer) => {
        outputBytes += chunk.length
        if (outputBytes > options.outputLimitBytes) {
          stopWith('GIT_OUTPUT_LIMIT_EXCEEDED')
          return
        }
        target.push(chunk)
      }
      child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk))
      child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk))
      child.once('error', () => {
        clearTimeout(timer)
        stopWith('GIT_PROCESS_START_FAILED')
      })
      child.once('close', (code) => {
        clearTimeout(timer)
        if (settled) return
        settled = true
        if (code !== 0) {
          reject(new GitInfrastructureError('GIT_COMMAND_FAILED'))
          return
        }
        resolve({
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
        })
      })
    })
  }

  async function detectVersion(): Promise<DetectedGitVersion> {
    await validateExecutable()
    const result = await run(['--version'])
    const version = parseGitVersion(result.stdout)
    assertSupportedGitForWindows(version)
    return version
  }

  async function initializeBare(repositoryPath: string): Promise<void> {
    await run(['init', '--bare', '--initial-branch=main', repositoryPath])
  }

  async function verifyEmptyBare(repositoryPath: string): Promise<void> {
    try {
      const bare = await run(['--git-dir', repositoryPath, 'rev-parse', '--is-bare-repository'])
      if (bare.stdout.trim() !== 'true') throw new GitInfrastructureError('GIT_REPOSITORY_NOT_BARE')
      const head = await run(['--git-dir', repositoryPath, 'symbolic-ref', 'HEAD'])
      if (head.stdout.trim() !== 'refs/heads/main') {
        throw new GitInfrastructureError('GIT_DEFAULT_BRANCH_INVALID')
      }
      const refs = await run(['--git-dir', repositoryPath, 'for-each-ref', '--format=%(refname)'])
      if (refs.stdout.trim() !== '') throw new GitInfrastructureError('GIT_REPOSITORY_NOT_EMPTY')
      await run(['--git-dir', repositoryPath, 'fsck', '--full', '--no-dangling'])
    } catch (error) {
      if (
        error instanceof GitInfrastructureError &&
        ['GIT_REPOSITORY_NOT_BARE', 'GIT_DEFAULT_BRANCH_INVALID', 'GIT_REPOSITORY_NOT_EMPTY'].includes(error.code)
      ) {
        throw error
      }
      throw new GitInfrastructureError('GIT_REPOSITORY_VERIFICATION_FAILED')
    }
  }

  return { executable, detectVersion, initializeBare, verifyEmptyBare }
}
