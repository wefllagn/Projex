import { spawn } from 'node:child_process'

import { OperationsSafetyError } from './operations-error.js'

export type CommandPlan = Readonly<{
  executable: string
  args: readonly string[]
  cwd?: string
  environment?: Readonly<Record<string, string>>
}>

export type CommandResult = Readonly<{ stdout: string; stderr: string }>

const INHERITED_ENVIRONMENT_ALLOWLIST = new Set([
  'COMSPEC', 'LANG', 'LC_ALL', 'PATH', 'PATHEXT', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR', 'TZ', 'WINDIR',
])

function childEnvironment(overrides: Readonly<Record<string, string>> | undefined): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && INHERITED_ENVIRONMENT_ALLOWLIST.has(key.toUpperCase())) environment[key] = value
  }
  return { ...environment, ...overrides }
}

export function runCommand(
  plan: CommandPlan,
  options: { timeoutMs?: number; outputLimitBytes?: number } = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 120_000
  const outputLimitBytes = options.outputLimitBytes ?? 1_048_576

  return new Promise((resolve, reject) => {
    const child = spawn(plan.executable, [...plan.args], {
      cwd: plan.cwd,
      env: childEnvironment(plan.environment),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let bytes = 0
    let settled = false
    const finishWithError = (code: string) => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      reject(new OperationsSafetyError(code))
    }
    const timer = setTimeout(() => finishWithError('OPERATIONS_COMMAND_TIMEOUT'), timeoutMs)
    const collect = (target: Buffer[], chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > outputLimitBytes) {
        finishWithError('OPERATIONS_COMMAND_OUTPUT_LIMIT')
        return
      }
      target.push(chunk)
    }
    child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk))
    child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk))
    child.once('error', () => {
      clearTimeout(timer)
      finishWithError('OPERATIONS_COMMAND_START_FAILED')
    })
    child.once('close', (exitCode) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      if (exitCode !== 0) {
        reject(new OperationsSafetyError('OPERATIONS_COMMAND_FAILED'))
        return
      }
      resolve({
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}
