import type { PrismaClient } from '@prisma/client'
import type { Writable } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import type { JavaRunner } from '../../infrastructure/java/java-runner.js'
import type { ClaimedExecutionJob } from '../../infrastructure/job-queue/execution-queue.js'
import { consoleInclude, eligible, type ConsoleInput } from './console.repository.js'

// One interactive job per serial Java worker, one live console per Student.
// Input is delivered only by the worker which claimed the single-attempt job.
export async function executeConsoleJob(prisma: PrismaClient, runner: JavaRunner, job: ClaimedExecutionJob,
  options: { leaseMs: number; stopping: () => boolean }) {
  const id = job.practiceExecutionId!
  const abort = new AbortController()
  let stdin: Writable | undefined
  let delivered = 0
  let stdout = '', stderr = '', transcript = ''
  let phase = 'COMPILING'
  let reason: string | null = null
  let finished = false
  const terminate = (value: string) => { reason ??= value; abort.abort() }
  const control = async () => {
    const now = new Date()
    const record = await prisma.interactiveConsole.findUniqueOrThrow({ where: { id }, include: consoleInclude })
    if (options.stopping()) terminate('CANCELLED')
    else if (record.cancelRequested) terminate('CANCELLED')
    else if (now.getTime() - record.lastSeenAt.getTime() > 30_000 || now.getTime() - record.practice.createdAt.getTime() > 150_000) terminate('EXPIRED')
    else if (!eligible(record, now)) terminate('CANCELLED')
    const owned = await prisma.executionJob.updateMany({ where: { id: job.id, workerId: job.workerId, status: 'RUNNING' },
      data: { leaseExpiresAt: new Date(now.getTime() + options.leaseMs) } })
    if (!owned.count) terminate('FAILED')
    if (abort.signal.aborted) return
    const inputs = record.inputs as unknown as ConsoleInput[]
    if (stdin) {
      for (const line of inputs.slice(delivered)) {
        if (stdin.destroyed || stdin.writableEnded) break
        if (line.eof) stdin.end()
        else {
          // Hard total input bound (20 kB) also bounds the writable queue.
          stdin.write(line.text + '\n')
          transcript += line.text + '\n'
        }
        delivered++
      }
    }
    await prisma.interactiveConsole.update({ where: { id }, data: { stdout, stderr, transcript } })
  }
  // Recheck ownership, eligibility, cancellation and expiry before spawning anything.
  await control()
  const monitor = (async () => {
    while (!finished && !abort.signal.aborted) {
      await delay(200)
      if (!finished) {
        try { await control() } catch { terminate('FAILED') }
      }
    }
  })()
  try {
    if (abort.signal.aborted) throw new Error('CONSOLE_CANCELLED')
    const result = await runner.executeInteractive({ sourceCode: job.sourceCode, entryClassName: job.entryClassName }, {
      signal: abort.signal,
      onPhase: async (next) => {
        phase = next
        await prisma.interactiveConsole.update({ where: { id }, data: { phase } })
      },
      onStart: (pipe) => { stdin = pipe },
      onOutput: (channel, text) => { if (channel === 'stdout') stdout += text; else stderr += text; transcript += text },
    })
    const execution = result.execution
    phase = reason ?? (result.compilation.timedOut ? 'TIMEOUT' : result.compilation.outputLimited ? 'OUTPUT_LIMIT'
      : !execution ? 'COMPILE_ERROR' : execution.timedOut ? 'TIMEOUT' : execution.outputLimited ? 'OUTPUT_LIMIT'
      : execution.exitCode !== 0 ? 'RUNTIME_ERROR' : 'COMPLETED')
    finished = true
    await monitor
    await complete(phase, execution?.exitCode ?? null, result.compilation.stdout + result.compilation.stderr,
      result.compilation.exitCode === 0 && !result.compilation.timedOut && !result.compilation.outputLimited ? 'SUCCESS' : 'STUDENT_ERROR')
  } catch {
    terminate(reason ?? 'FAILED')
    finished = true
    await monitor
    await complete(reason ?? 'FAILED', null, '', 'INFRASTRUCTURE_ERROR')
  }
  async function complete(finalPhase: string, exitCode: number | null, compilerOutput: string, compileStatus: 'SUCCESS' | 'STUDENT_ERROR' | 'INFRASTRUCTURE_ERROR') {
    await prisma.$transaction(async (tx) => {
      const owned = await tx.executionJob.updateMany({ where: { id: job.id, workerId: job.workerId, status: 'RUNNING' }, data: {
        status: finalPhase === 'COMPLETED' || finalPhase === 'COMPILE_ERROR' || finalPhase === 'RUNTIME_ERROR' ? 'SUCCEEDED' : 'FAILED',
        completedAt: new Date(), leaseExpiresAt: null,
      } })
      if (!owned.count) return
      await tx.interactiveConsole.update({ where: { id }, data: { phase: finalPhase, exitCode, stdout, stderr, transcript } })
      await tx.practiceExecution.update({ where: { id }, data: {
        status: finalPhase === 'TIMEOUT' ? 'TIMEOUT' : finalPhase === 'COMPLETED' || finalPhase === 'COMPILE_ERROR' || finalPhase === 'RUNTIME_ERROR' ? 'SUCCEEDED' : 'FAILED',
        compileStatus,
        runtimeStatus: compileStatus !== 'SUCCESS' ? 'NOT_RUN' : finalPhase === 'COMPLETED' ? 'PASSED' : finalPhase === 'TIMEOUT' ? 'TIMEOUT' : finalPhase === 'OUTPUT_LIMIT' ? 'OUTPUT_LIMIT' : 'ERROR',
        compilerOutput: compilerOutput || null, completedAt: new Date(),
      } })
    })
  }
}
