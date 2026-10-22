import type { Prisma, PrismaClient } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error.js'
import { isOrdinarySubmissionOpen } from '../activities/activity.types.js'

export const consoleInclude = {
  practice: { include: { student: { select: { role: true, status: true } }, executionJob: true,
    activity: { include: { class: { include: { members: { select: { studentId: true, status: true } } } } } } } },
} as const
export type ConsoleRecord = Prisma.InteractiveConsoleGetPayload<{ include: typeof consoleInclude }>
export interface ConsoleInput { sequence: number; text: string; eof: boolean }
export const activePhases = ['QUEUED', 'COMPILING', 'RUNNING']
export function eligible(record: ConsoleRecord, now: Date): boolean {
  const { practice } = record
  return practice.student.role === 'STUDENT' && practice.student.status === 'ACTIVE'
    && practice.activity.class.status === 'ACTIVE'
    && practice.activity.class.members.some((m) => m.studentId === practice.studentId && m.status === 'ACTIVE')
    && isOrdinarySubmissionOpen(practice.activity.status, practice.activity.dueDate, now)
}
function missing(): never {
  throw new AppError({ statusCode: 404, code: 'CODE_RUN_NOT_FOUND', message: 'Code run not found.' })
}
function conflict(code: string, message: string): never {
  throw new AppError({ statusCode: 409, code, message })
}
export function createConsoleRepository(prisma: PrismaClient) {
  return {
    async access(id: string, studentId: string, action: 'read' | 'stop' | 'input', input?: ConsoleInput) {
      return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "practice_execution_id" FROM "interactive_consoles" WHERE "practice_execution_id" = ${id}::uuid FOR UPDATE`
        const record = await tx.interactiveConsole.findUnique({ where: { id }, include: consoleInclude })
        const now = new Date()
        if (!record || record.practice.studentId !== studentId || record.practice.expiresAt <= now
          || record.practice.student.status !== 'ACTIVE' || record.practice.student.role !== 'STUDENT'
          || !record.practice.activity.class.members.some((m) => m.studentId === studentId && m.status === 'ACTIVE')) missing()
        const terminal = !activePhases.includes(record.phase) || !['QUEUED', 'RUNNING'].includes(record.practice.status)
        if (action === 'stop') {
          if (!terminal) await tx.interactiveConsole.update({ where: { id }, data: { cancelRequested: true } })
        } else if (action === 'input' && input) {
          if (!eligible(record, now)) missing()
          const inputs = record.inputs as unknown as ConsoleInput[]
          const prior = inputs[input.sequence - 1]
          if (prior) {
            if (prior.text !== input.text || prior.eof !== input.eof) conflict('CONSOLE_INPUT_CONFLICT', 'Input changed. Check the console before retrying.')
            return record // same sequence/content is an acknowledged replay, never delivered twice
          }
          if (terminal || record.phase !== 'RUNNING' || record.inputClosed || record.cancelRequested) conflict('CONSOLE_NOT_RUNNING', 'The program is no longer accepting input.')
          if (input.sequence !== inputs.length + 1) conflict('CONSOLE_INPUT_CONFLICT', 'Check the console before sending more input.')
          const bytes = Buffer.byteLength(input.text, 'utf8') + (input.eof ? 0 : 1)
          if (record.inputBytes + bytes > 20_000 || inputs.length >= 256) {
            throw new AppError({ statusCode: 413, code: 'PROGRAM_INPUT_TOO_LARGE', message: 'Program input exceeds the allowed size.' })
          }
          await tx.interactiveConsole.update({ where: { id }, data: {
            inputs: [...inputs, input] as unknown as Prisma.InputJsonValue,
            inputBytes: record.inputBytes + bytes, inputClosed: input.eof, lastSeenAt: now,
          } })
        } else if (action === 'read' && !terminal) {
          await tx.interactiveConsole.update({ where: { id }, data: { lastSeenAt: now } })
        }
        return tx.interactiveConsole.findUniqueOrThrow({ where: { id }, include: consoleInclude })
      })
    },
  }
}
