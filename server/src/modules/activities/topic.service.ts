import type { Prisma, PrismaClient } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { isTeachingInstructor } from '../classes/class.types.js'

function fail(code = 'CLASS_NOT_FOUND', statusCode = 404): never {
  throw new AppError({ statusCode, code, message: code === 'STALE_TOPIC_VERSION' ? 'Topics changed. Reload before trying again.' : 'The requested topic action is unavailable.' })
}
export function authorizeTopics(caller: SafeUserProfile, record: {
  instructorId: string | null; status: string; teachingStaff: { instructorId: string; status: string }[];
  members: { studentId: string; status: string }[]
}, mutation = false): void {
  const manager = caller.role === 'INSTRUCTOR' && isTeachingInstructor(record, caller.id)
  const member = caller.role === 'STUDENT' && record.members.some(row => row.studentId === caller.id && row.status === 'ACTIVE')
  if (caller.status !== 'ACTIVE' || (mutation ? !manager : !manager && !member)) fail()
  if (mutation && record.status !== 'ACTIVE') fail('CLASS_ARCHIVED', 409)
}

export function createTopicService(prisma: PrismaClient) {
  async function access(tx: Prisma.TransactionClient, caller: SafeUserProfile, classId: string, mutation: boolean) {
    // Serialize all organization writes, including creation, against the class.
    if (mutation) await tx.$queryRaw`SELECT class_id FROM classes WHERE class_id = ${classId}::uuid FOR UPDATE`
    const record = await tx.class.findUnique({ where: { id: classId }, select: {
      instructorId: true, status: true, topicVersion: true,
      teachingStaff: { where: { status: 'ACTIVE' }, select: { instructorId: true, status: true } },
      members: { where: { studentId: caller.id, status: 'ACTIVE' }, select: { studentId: true, status: true } },
    } })
    if (!record) fail()
    authorizeTopics(caller, record, mutation)
    return record
  }
  return {
    async list(caller: SafeUserProfile, classId: string, page: number) {
      return prisma.$transaction(async tx => {
        const record = await access(tx, caller, classId, false)
        const visible = caller.role === 'STUDENT' ? { activities: { some: { status: { in: ['PUBLISHED', 'CLOSED'] as ('PUBLISHED' | 'CLOSED')[] } } } } : {}
        const where = { classId, ...visible }
        const [topics, total] = await Promise.all([
          tx.classTopic.findMany({ where, select: { id: true, name: true, position: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }], skip: (page - 1) * 100, take: 100 }),
          tx.classTopic.count({ where }),
        ])
        return { version: record.topicVersion, topics, page, hasNextPage: page * 100 < total }
      }, { isolationLevel: 'RepeatableRead' })
    },
    async change(caller: SafeUserProfile, classId: string, input: { expectedVersion: number; action: 'create' | 'rename' | 'remove' | 'up' | 'down'; topicId?: string; name?: string }) {
      return prisma.$transaction(async tx => {
        const record = await access(tx, caller, classId, true)
        if (record.topicVersion !== input.expectedVersion) fail('STALE_TOPIC_VERSION', 409)
        const topic = input.topicId ? await tx.classTopic.findFirst({ where: { id: input.topicId, classId } }) : null
        if (input.action !== 'create' && !topic) fail('TOPIC_NOT_FOUND')
        let createdId: string | undefined
        if (input.action === 'create') {
          const last = await tx.classTopic.aggregate({ where: { classId }, _max: { position: true } })
          createdId = (await tx.classTopic.create({ data: { classId, name: input.name!, position: (last._max.position ?? -1) + 1 } })).id
        } else if (input.action === 'rename') {
          await tx.classTopic.update({ where: { id: topic!.id }, data: { name: input.name! } })
        } else if (input.action === 'remove') {
          // Never delete academic or Git records. Invalidate affected Activity forms.
          await tx.$executeRaw`UPDATE programming_activities SET topic_id = NULL, updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 millisecond') WHERE class_id = ${classId}::uuid AND topic_id = ${topic!.id}::uuid`
          await tx.classTopic.delete({ where: { id: topic!.id } })
        } else {
          const up = input.action === 'up'
          const neighbor = await tx.classTopic.findFirst({ where: { classId, position: up ? { lt: topic!.position } : { gt: topic!.position } }, orderBy: { position: up ? 'desc' : 'asc' } })
          if (neighbor) {
            await tx.classTopic.update({ where: { id: topic!.id }, data: { position: neighbor.position } })
            await tx.classTopic.update({ where: { id: neighbor.id }, data: { position: topic!.position } })
          }
        }
        await tx.class.update({ where: { id: classId }, data: { topicVersion: { increment: 1 } } })
        return { version: record.topicVersion + 1, ...(createdId ? { createdId } : {}) }
      })
    },
  }
}
export type TopicService = ReturnType<typeof createTopicService>
