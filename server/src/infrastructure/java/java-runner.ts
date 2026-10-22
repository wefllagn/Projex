import { StringDecoder } from 'node:string_decoder'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile, readdir, lstat } from 'node:fs/promises'
import path from 'node:path'
import { areJavaOutputsEquivalent, normalizeJavaOutput } from './java-output-comparison.js'

export interface JavaCaseInput {
  id: string
  input: string | null
  expectedOutput: string
  maximumPoints?: number
  compareOutput?: boolean
  captureStandardError?: boolean
}

export interface JavaCaseResult {
  id: string
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'TIMEOUT' | 'OUTPUT_LIMIT'
  actualOutput: string | null
  errorMessage: string | null
  executionTimeMs: number
  automatedPoints: number
}

export interface JavaAssessmentResult {
  compileStatus: 'SUCCESS' | 'STUDENT_ERROR'
  runtimeStatus: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR' | 'OUTPUT_LIMIT' | 'NOT_RUN'
  compilerOutput: string | null
  cases: JavaCaseResult[]
}

export interface JavaRunnerConfig {
  javaExecutable: string
  javacExecutable: string
  release: number
  jobRoot: string
  compileTimeoutMs: number
  testTimeoutMs: number
  outputLimitBytes: number
  memoryLimitMb: number
}

export class JavaInfrastructureError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'JavaInfrastructureError'
  }
}

export interface ProcessResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  outputLimited: boolean
  durationMs: number
}

function boundedText(value: string, limit: number): string {
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.length <= limit) return value
  return bytes.subarray(0, limit).toString('utf8')
}

async function terminateProcessTree(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (!child.pid) return
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn(
        'taskkill.exe',
        ['/PID', String(child.pid), '/T', '/F'],
        { shell: false, windowsHide: true, stdio: 'ignore' },
      )
      killer.once('error', () => resolve())
      killer.once('exit', () => resolve())
    })
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

function minimalEnvironment(jobDirectory: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: jobDirectory,
    TMP: jobDirectory,
    LANG: 'C.UTF-8',
  }
}

// Local lifecycle watchdog, not a hostile-code sandbox. The supervisor is the
// detached process-group leader; javac/java and ordinary descendants share it.
const supervisor = `
const {spawn, spawnSync} = require('node:child_process');
const [exe, args, timeout, parent] = process.argv.slice(1);
const child = spawn(exe, JSON.parse(args), {stdio:['pipe','pipe','pipe'], shell:false});
const kill = () => {
  if(process.platform !== 'win32') { try { process.kill(-process.pid, 'SIGKILL'); } catch {} }
  else { spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',shell:false}); process.exit(1); }
};
const deadline=setTimeout(kill,Number(timeout));
const monitor=setInterval(()=>{if(process.ppid!==Number(parent)) kill();},200);
process.stdin.pipe(child.stdin); child.stdin.on('error',()=>{});
child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
process.stdout.on('error',kill); process.stderr.on('error',kill);
child.on('error',()=>{clearTimeout(deadline);clearInterval(monitor);process.exit(127);});
child.on('close',(code)=>{clearTimeout(deadline);clearInterval(monitor);process.exitCode=code===null?1:code;process.stdin.destroy();});
`

export interface InteractiveProcessHooks {
  signal: AbortSignal
  onStart?: (stdin: ChildProcessWithoutNullStreams['stdin']) => void
  onOutput?: (channel: 'stdout' | 'stderr', text: string) => void
}

async function runProcess(input: {
  executable: string
  args: string[]
  cwd: string
  stdin?: string
  timeoutMs: number
  outputLimitBytes: number
  interactive?: InteractiveProcessHooks
}): Promise<ProcessResult> {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0)
    let stderr = Buffer.alloc(0)
    let timedOut = false
    let outputLimited = false
    let settled = false
    const child = spawn(input.interactive ? process.execPath : input.executable,
      input.interactive ? ['-e', supervisor, input.executable, JSON.stringify(input.args), String(input.timeoutMs + 1000), String(process.pid)] : input.args, {
      cwd: input.cwd,
      env: minimalEnvironment(input.cwd),
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') }
    const cancel = () => { void terminateProcessTree(child) }
    input.interactive?.signal.addEventListener('abort', cancel, { once: true })
    const finish = (exitCode: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      input.interactive?.signal.removeEventListener('abort', cancel)
      for (const channel of ['stdout', 'stderr'] as const) {
        const tail = decoders[channel].end()
        if (tail) input.interactive?.onOutput?.(channel, tail)
      }
      if (input.interactive) void terminateProcessTree(child)
      resolve({
        exitCode,
        stdout: boundedText(stdout.toString('utf8'), input.outputLimitBytes),
        stderr: boundedText(stderr.toString('utf8'), input.outputLimitBytes),
        timedOut,
        outputLimited,
        durationMs: Date.now() - started,
      })
    }

    const collect = (target: 'stdout' | 'stderr', chunk: Buffer) => {
      if (outputLimited) return
      const remaining = Math.max(
        input.outputLimitBytes - stdout.length - stderr.length,
        0,
      )
      const boundedChunk = chunk.subarray(0, remaining)
      if (input.interactive && boundedChunk.length) input.interactive.onOutput?.(target, decoders[target].write(boundedChunk))
      if (target === 'stdout') stdout = Buffer.concat([stdout, boundedChunk])
      else stderr = Buffer.concat([stderr, boundedChunk])
      if (chunk.length > remaining) {
        outputLimited = true
        void terminateProcessTree(child)
      }
    }

    child.stdout.on('data', (chunk: Buffer) => collect('stdout', chunk))
    child.stderr.on('data', (chunk: Buffer) => collect('stderr', chunk))
    // Programs may terminate before consuming all pre-supplied input.
    // A closed stdin pipe must not crash the separate worker.
    child.stdin.on('error', () => undefined)
    child.once('error', (processError) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      reject(
        new JavaInfrastructureError(
          (processError as NodeJS.ErrnoException).code === 'ENOENT'
            ? 'JAVA_RUNTIME_UNAVAILABLE'
            : 'JAVA_PROCESS_START_FAILED',
        ),
      )
    })
    child.once('close', (code) => finish(code))

    const timer = setTimeout(() => {
      timedOut = true
      void terminateProcessTree(child)
    }, input.timeoutMs)
    timer.unref()

    if (input.interactive) {
      input.interactive.onStart?.(child.stdin)
      if (input.interactive.signal.aborted) cancel()
    } else if (input.stdin !== undefined) child.stdin.end(input.stdin)
    else child.stdin.end()
  })
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
}

// A hard worker kill cannot run finally. Reap only this runner's old console
// directories after the 150-second absolute session lifetime plus a safety margin.
export async function cleanupAbandonedConsoleDirectories(jobRoot: string, now = Date.now()) {
  const root = path.resolve(jobRoot)
  await mkdir(root, { recursive: true })
  for (const name of await readdir(root)) {
    if (!/^console-[A-Za-z0-9]+$/.test(name)) continue
    const candidate = path.join(root, name)
    const entry = await lstat(candidate).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (entry?.isDirectory() && !entry.isSymbolicLink() && now - entry.mtimeMs > 300_000) {
      await rm(candidate, { recursive: true, force: true })
    }
  }
}

export function createJavaRunner(config: JavaRunnerConfig) {
  const root = path.resolve(config.jobRoot)
  return {
    async executeInteractive(input: { sourceCode: string; entryClassName: string }, hooks: InteractiveProcessHooks & { timeoutMs?: number; onPhase: (phase: 'COMPILING' | 'RUNNING') => Promise<void> }) {
      await mkdir(root, { recursive: true })
      const directory = await mkdtemp(path.join(root, 'console-'))
      if (!isWithin(root, directory)) throw new JavaInfrastructureError('JAVA_TEMP_DIRECTORY_INVALID')
      try {
        const classes = path.join(directory, 'classes')
        await mkdir(classes)
        await writeFile(path.join(directory, `${input.entryClassName}.java`), input.sourceCode, { flag: 'wx' })
        await hooks.onPhase('COMPILING')
        const compilation = await runProcess({ executable: config.javacExecutable,
          args: ['--release', String(config.release), '-encoding', 'UTF-8', '-d', classes, `${input.entryClassName}.java`],
          cwd: directory, timeoutMs: config.compileTimeoutMs, outputLimitBytes: config.outputLimitBytes,
          interactive: { signal: hooks.signal, onOutput: hooks.onOutput, onStart: (stdin) => stdin.end() } })
        if (compilation.exitCode !== 0 || compilation.timedOut || compilation.outputLimited || hooks.signal.aborted) {
          return { compilation, execution: null }
        }
        await hooks.onPhase('RUNNING')
        const execution = await runProcess({ executable: config.javaExecutable,
          args: [`-Xmx${config.memoryLimitMb}m`, '-Xss1m', '-XX:ActiveProcessorCount=1', '-Dfile.encoding=UTF-8', '-cp', classes, input.entryClassName],
          cwd: directory, timeoutMs: hooks.timeoutMs ?? 90_000, outputLimitBytes: config.outputLimitBytes - Buffer.byteLength(compilation.stdout + compilation.stderr), interactive: hooks })
        return { compilation, execution }
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
    async execute(input: {
      sourceCode: string
      entryClassName: string
      cases: JavaCaseInput[]
    }): Promise<JavaAssessmentResult> {
      await mkdir(root, { recursive: true })
      const jobDirectory = await mkdtemp(path.join(root, 'job-'))
      if (!isWithin(root, jobDirectory)) {
        throw new JavaInfrastructureError('JAVA_TEMP_DIRECTORY_INVALID')
      }
      let result: JavaAssessmentResult | undefined
      let runnerError: unknown
      try {
        result = await (async (): Promise<JavaAssessmentResult> => {
        const classesDirectory = path.join(jobDirectory, 'classes')
        await mkdir(classesDirectory)
        const sourcePath = path.join(
          jobDirectory,
          `${input.entryClassName}.java`,
        )
        const sourceFileName = `${input.entryClassName}.java`
        await writeFile(sourcePath, input.sourceCode, { encoding: 'utf8', flag: 'wx' })
        const compilation = await runProcess({
          executable: config.javacExecutable,
          args: [
            '--release',
            String(config.release),
            '-encoding',
            'UTF-8',
            '-d',
            classesDirectory,
            sourceFileName,
          ],
          cwd: jobDirectory,
          timeoutMs: config.compileTimeoutMs,
          outputLimitBytes: config.outputLimitBytes,
        })
        const compileOutput = [compilation.stdout, compilation.stderr]
          .filter(Boolean)
          .join('\n')
        if (
          compilation.exitCode !== 0 ||
          compilation.timedOut ||
          compilation.outputLimited
        ) {
          return {
            compileStatus: 'STUDENT_ERROR',
            runtimeStatus: 'NOT_RUN',
            compilerOutput: compileOutput || null,
            cases: input.cases.map((testCase) => ({
              id: testCase.id,
              status: 'ERROR',
              actualOutput: null,
              errorMessage: 'Compilation did not succeed.',
              executionTimeMs: 0,
              automatedPoints: 0,
            })),
          }
        }

        const caseResults: JavaCaseResult[] = []
        for (const testCase of input.cases) {
          const execution = await runProcess({
            executable: config.javaExecutable,
            args: [
              `-Xmx${config.memoryLimitMb}m`,
              '-Xss1m',
              '-XX:ActiveProcessorCount=1',
              '-Dfile.encoding=UTF-8',
              '-cp',
              classesDirectory,
              input.entryClassName,
            ],
            cwd: jobDirectory,
            stdin: testCase.input ?? '',
            timeoutMs: config.testTimeoutMs,
            outputLimitBytes: config.outputLimitBytes,
          })
          const actualOutput = normalizeJavaOutput(execution.stdout)
          let status: JavaCaseResult['status']
          let errorMessage: string | null = null
          if (execution.timedOut) {
            status = 'TIMEOUT'
            errorMessage = 'Execution timed out.'
          } else if (execution.outputLimited) {
            status = 'OUTPUT_LIMIT'
            errorMessage = 'Execution exceeded the output limit.'
          } else if (execution.exitCode !== 0) {
            status = 'ERROR'
            errorMessage = boundedText(
              execution.stderr || 'Execution failed.',
              config.outputLimitBytes,
            )
          } else if (testCase.compareOutput === false) {
            status = 'PASSED'
            errorMessage = testCase.captureStandardError && execution.stderr
              ? boundedText(execution.stderr, config.outputLimitBytes)
              : null
          } else if (areJavaOutputsEquivalent(testCase.expectedOutput, actualOutput)) {
            status = 'PASSED'
          } else {
            status = 'FAILED'
          }
          caseResults.push({
            id: testCase.id,
            status,
            actualOutput,
            errorMessage,
            executionTimeMs: execution.durationMs,
            automatedPoints:
              status === 'PASSED' ? (testCase.maximumPoints ?? 0) : 0,
          })
        }
        const statuses = caseResults.map((result) => result.status)
        const runtimeStatus = statuses.includes('TIMEOUT')
          ? 'TIMEOUT'
          : statuses.includes('OUTPUT_LIMIT')
            ? 'OUTPUT_LIMIT'
            : statuses.includes('ERROR')
              ? 'ERROR'
              : statuses.every((status) => status === 'PASSED')
                ? 'PASSED'
                : 'FAILED'
          return {
          compileStatus: 'SUCCESS',
          runtimeStatus,
          compilerOutput: compileOutput || null,
          cases: caseResults,
          }
        })()
      } catch (error) {
        runnerError = error
      }
      if (isWithin(root, jobDirectory)) {
        try {
          await rm(jobDirectory, { recursive: true, force: true })
        } catch {
          throw new JavaInfrastructureError('JAVA_TEMP_CLEANUP_FAILED')
        }
      }
      if (runnerError instanceof JavaInfrastructureError) throw runnerError
      if (runnerError) {
        throw new JavaInfrastructureError('JAVA_TEMP_DIRECTORY_FAILURE')
      }
      return result!
    },
  }
}

export type JavaRunner = ReturnType<typeof createJavaRunner>
