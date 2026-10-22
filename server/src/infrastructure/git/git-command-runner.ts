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
  if (match.slice(1).some((part) => part !== undefined && !Number.isSafeInteger(Number(part)))) {
    throw new GitInfrastructureError('GIT_VERSION_UNRECOGNIZED')
  }
  return {
    raw: output.trim().slice('git version '.length),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    windowsBuild: match[4] ? Number(match[4]) : null,
  }
}

function meetsMinimumGitVersion(version: DetectedGitVersion): boolean {
  return version.major > 2 ||
    (version.major === 2 &&
      (version.minor > 55 || (version.minor === 55 && version.patch >= 0)))
}

export function assertSupportedGitForWindows(version: DetectedGitVersion): void {
  if (version.windowsBuild === null || !meetsMinimumGitVersion(version)) {
    throw new GitInfrastructureError('GIT_VERSION_UNSUPPORTED')
  }
}

export function assertSupportedGitVersion(
  version: DetectedGitVersion,
  platform: NodeJS.Platform = process.platform,
): void {
  if (platform === 'win32') return assertSupportedGitForWindows(version)
  // Verified macOS profile: upstream release output, as emitted by Homebrew Git.
  // Other vendor formats and other operating systems remain unsupported.
  if (platform !== 'darwin' || version.windowsBuild !== null || !meetsMinimumGitVersion(version)) {
    throw new GitInfrastructureError('GIT_VERSION_UNSUPPORTED')
  }
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
    // Process-local only: managed UUID paths can exceed legacy Windows limits.
    ...(process.platform === 'win32' ? { GIT_CONFIG_PARAMETERS: "'core.longpaths=true'" } : {}),
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

  function run(args: readonly string[], cwd?: string, input?: { stdin?: string; indexFile?: string; actorId?: string; commitDate?: string }): Promise<{ stdout: string; stderr: string; stdoutBuffer: Buffer }> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, [...args], {
        cwd,
        env: { ...createSanitizedGitEnvironment(),
          ...(input?.indexFile ? { GIT_INDEX_FILE: input.indexFile } : {}),
          ...(input?.actorId ? { GIT_AUTHOR_NAME: `Projex Student ${input.actorId}`, GIT_AUTHOR_EMAIL: `student-${input.actorId}@projex.local`, GIT_COMMITTER_NAME: `Projex Student ${input.actorId}`, GIT_COMMITTER_EMAIL: `student-${input.actorId}@projex.local` } : {}),
          ...(input?.commitDate ? { GIT_AUTHOR_DATE: input.commitDate, GIT_COMMITTER_DATE: input.commitDate } : {}),
        },
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      child.stdin.on('error', () => {})
      child.stdin.end(input?.stdin)
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
          stdoutBuffer: Buffer.concat(stdout),
          stderr: Buffer.concat(stderr).toString('utf8'),
        })
      })
    })
  }

  async function detectVersion(): Promise<DetectedGitVersion> {
    await validateExecutable()
    const result = await run(['--version'])
    const version = parseGitVersion(result.stdout)
    assertSupportedGitVersion(version)
    return version
  }

  async function initializeBare(repositoryPath: string): Promise<void> {
    await run(['init', '--bare', '--initial-branch=main', repositoryPath])
    if (process.platform === 'win32') {
      // Receive-pack clears caller Git config before unpacking; its own newly
      // provisioned repository must retain this filesystem compatibility flag.
      await run(['--git-dir', '.', 'config', 'core.longpaths', 'true'], repositoryPath)
    }
  }

  async function verifyEmptyBare(repositoryPath: string): Promise<void> {
    try {
      // Git for Windows has a separate fixed limit for an absolute GIT_DIR,
      // even with core.longpaths enabled. Keep the already validated directory
      // as cwd, not in that argument; containment/ownership checks are unchanged.
      const bare = await run(['--git-dir', '.', 'rev-parse', '--is-bare-repository'], repositoryPath)
      if (bare.stdout.trim() !== 'true') throw new GitInfrastructureError('GIT_REPOSITORY_NOT_BARE')
      const head = await run(['--git-dir', '.', 'symbolic-ref', 'HEAD'], repositoryPath)
      if (head.stdout.trim() !== 'refs/heads/main') {
        throw new GitInfrastructureError('GIT_DEFAULT_BRANCH_INVALID')
      }
      const refs = await run(['--git-dir', '.', 'for-each-ref', '--format=%(refname)'], repositoryPath)
      if (refs.stdout.trim() !== '') throw new GitInfrastructureError('GIT_REPOSITORY_NOT_EMPTY')
      await run(['--git-dir', '.', 'fsck', '--full', '--no-dangling'], repositoryPath)
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

  return { executable, run, detectVersion, initializeBare, verifyEmptyBare }
}
