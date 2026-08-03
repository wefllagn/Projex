import {
  Prisma,
  type ClassMemberStatus,
  type PrismaClient,
  type UserStatus,
} from '@prisma/client'
import { classRecordSelect } from '../classes/class.repository.js'
import type { ClassRecord } from '../classes/class.types.js'
import type { ClassRosterQuery } from './class-member.schemas.js'

export interface ClassMemberRecord {
  id: string
  classId: string
  studentId: string
  joinedAt: Date
  status: ClassMemberStatus
  updatedAt: Date
  removedAt: Date | null
  lastActivatedAt: Date
  student: {
    id: string
    fullName: string
    email: string
    status: UserStatus
  }
}

export type JoinClassResult =
  | {
      kind: 'joined' | 'already_active'
      member: ClassMemberRecord
      classRecord: ClassRecord
    }
  | { kind: 'invalid_code' }
  | { kind: 'removed' }
  | { kind: 'pending' }

export type MemberTransitionResult =
  | { kind: 'updated'; member: ClassMemberRecord; changed: boolean }
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'invalid_transition' }

export interface ClassMemberRepository {
  joinByCode(input: {
    studentId: string
    classCode: string
    now: Date
  }): Promise<JoinClassResult>
  list(classId: string, query: ClassRosterQuery, activeOnly: boolean): Promise<{
    members: ClassMemberRecord[]
    totalItems: number
  }>
  transition(input: {
    classId: string
    memberId: string
    status: 'ACTIVE' | 'REMOVED'
    now: Date
  }): Promise<MemberTransitionResult>
}

const classMemberSelect = {
  id: true,
  classId: true,
  studentId: true,
  joinedAt: true,
  status: true,
  updatedAt: true,
  removedAt: true,
  lastActivatedAt: true,
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
    },
  },
} as const

function isRetryableTransactionFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  )
}

export function createPrismaClassMemberRepository(
  prisma: PrismaClient,
): ClassMemberRepository {
  return {
    async joinByCode(input) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await prisma.$transaction(
            async (transaction) => {
              const classRecord = await transaction.class.findUnique({
                where: { classCode: input.classCode },
                select: classRecordSelect,
              })
              if (
                !classRecord ||
                classRecord.status !== 'ACTIVE' ||
                !classRecord.classCodeActive
              ) {
                return { kind: 'invalid_code' } as const
              }
              const existing = await transaction.classMember.findUnique({
                where: {
                  classId_studentId: {
                    classId: classRecord.id,
                    studentId: input.studentId,
                  },
                },
                select: classMemberSelect,
              })
              if (existing?.status === 'ACTIVE') {
                return {
                  kind: 'already_active',
                  member: existing,
                  classRecord,
                } as const
              }
              if (existing?.status === 'REMOVED') {
                return { kind: 'removed' } as const
              }
              if (existing) return { kind: 'pending' } as const

              const member = await transaction.classMember.create({
                data: {
                  classId: classRecord.id,
                  studentId: input.studentId,
                  status: 'ACTIVE',
                  joinedAt: input.now,
                  lastActivatedAt: input.now,
                },
                select: classMemberSelect,
              })
              return { kind: 'joined', member, classRecord } as const
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          )
        } catch (error) {
          if (isRetryableTransactionFailure(error) && attempt < 2) continue
          throw error
        }
      }
      throw new Error('Class join retry limit exhausted.')
    },
    async list(classId, query, activeOnly) {
      const where = {
        classId,
        ...(activeOnly ? { status: 'ACTIVE' as const } : {}),
      }
      const [members, totalItems] = await prisma.$transaction([
        prisma.classMember.findMany({
          where,
          select: classMemberSelect,
          orderBy: [
            { status: 'asc' },
            { student: { fullName: 'asc' } },
            { id: 'asc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.classMember.count({ where }),
      ])
      return { members, totalItems }
    },
    transition(input) {
      return prisma.$transaction(async (transaction) => {
        const classRecord = await transaction.class.findUnique({
          where: { id: input.classId },
          select: { status: true },
        })
        if (!classRecord) return { kind: 'not_found' } as const
        if (classRecord.status === 'ARCHIVED') {
          return { kind: 'class_archived' } as const
        }
        const existing = await transaction.classMember.findUnique({
          where: { id: input.memberId },
          select: classMemberSelect,
        })
        if (!existing || existing.classId !== input.classId) {
          return { kind: 'not_found' } as const
        }
        if (existing.status === 'PENDING') {
          return { kind: 'invalid_transition' } as const
        }
        if (existing.status === input.status) {
          return { kind: 'updated', member: existing, changed: false } as const
        }
        if (
          !(
            (existing.status === 'ACTIVE' && input.status === 'REMOVED') ||
            (existing.status === 'REMOVED' && input.status === 'ACTIVE')
          )
        ) {
          return { kind: 'invalid_transition' } as const
        }
        const member = await transaction.classMember.update({
          where: { id: input.memberId },
          data:
            input.status === 'REMOVED'
              ? { status: 'REMOVED', removedAt: input.now }
              : {
                  status: 'ACTIVE',
                  removedAt: null,
                  lastActivatedAt: input.now,
                },
          select: classMemberSelect,
        })
        return { kind: 'updated', member, changed: true } as const
      })
    },
  }
}
