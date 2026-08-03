import {
  Prisma,
  type PrismaClient,
  type UserRole,
} from '@prisma/client'
import type {
  ClassListQuery,
  UpdateClassInput,
} from './class.schemas.js'
import type { ClassAccessRecord, ClassRecord } from './class.types.js'

export const classRecordSelect = {
  id: true,
  instructorId: true,
  className: true,
  classCode: true,
  classCodeActive: true,
  classCodeChangedAt: true,
  section: true,
  semester: true,
  schoolYear: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  instructor: {
    select: { id: true, fullName: true },
  },
} as const

export type ClassWriteResult =
  | { kind: 'updated'; classRecord: ClassRecord; changed: boolean }
  | { kind: 'not_found' }

export type ClassCodeWriteResult =
  | { kind: 'updated'; classRecord: ClassRecord }
  | { kind: 'collision' }
  | { kind: 'not_found' }

export type CreateClassResult =
  | { kind: 'created'; classRecord: ClassRecord }
  | { kind: 'instructor_not_active' }
  | { kind: 'collision' }

export interface ClassRepository {
  create(input: {
    instructorId: string
    className: string
    section: string
    semester: string
    schoolYear: string
    classCode: string
    now: Date
  }): Promise<CreateClassResult>
  list(input: {
    callerId: string
    callerRole: UserRole
    query: ClassListQuery
  }): Promise<{ classes: ClassRecord[]; totalItems: number }>
  findAccess(classId: string, callerId: string): Promise<ClassAccessRecord | null>
  updateMetadata(
    classId: string,
    input: UpdateClassInput,
  ): Promise<ClassRecord | null>
  archive(classId: string, now: Date): Promise<ClassWriteResult>
  restore(classId: string): Promise<ClassWriteResult>
  rotateCode(
    classId: string,
    classCode: string,
    now: Date,
  ): Promise<ClassCodeWriteResult>
  revokeCode(classId: string, now: Date): Promise<ClassRecord | null>
}

function isUniqueFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export function createPrismaClassRepository(
  prisma: PrismaClient,
): ClassRepository {
  return {
    async create(input) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const instructor = await transaction.user.findUnique({
            where: { id: input.instructorId },
            select: { role: true, status: true },
          })
          if (
            !instructor ||
            instructor.role !== 'INSTRUCTOR' ||
            instructor.status !== 'ACTIVE'
          ) {
            return { kind: 'instructor_not_active' } as const
          }
          const classRecord = await transaction.class.create({
            data: {
              instructorId: input.instructorId,
              className: input.className,
              section: input.section,
              semester: input.semester,
              schoolYear: input.schoolYear,
              classCode: input.classCode,
              classCodeActive: true,
              classCodeChangedAt: input.now,
            },
            select: classRecordSelect,
          })
          return { kind: 'created', classRecord } as const
        })
      } catch (error) {
        if (isUniqueFailure(error)) return { kind: 'collision' }
        throw error
      }
    },
    async list(input) {
      const roleScope: Prisma.ClassWhereInput =
        input.callerRole === 'ADMIN'
          ? {}
          : input.callerRole === 'INSTRUCTOR'
            ? { instructorId: input.callerId }
            : {
                members: {
                  some: {
                    studentId: input.callerId,
                    status: 'ACTIVE',
                  },
                },
              }
      const where: Prisma.ClassWhereInput = {
        ...roleScope,
        ...(input.query.status ? { status: input.query.status } : {}),
        ...(input.query.search
          ? {
              OR: [
                {
                  className: {
                    contains: input.query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  section: {
                    contains: input.query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      }
      const [classes, totalItems] = await prisma.$transaction([
        prisma.class.findMany({
          where,
          select: classRecordSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.class.count({ where }),
      ])
      return { classes, totalItems }
    },
    async findAccess(classId, callerId) {
      const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        select: {
          ...classRecordSelect,
          members: {
            where: { studentId: callerId },
            take: 1,
            select: { id: true, status: true },
          },
        },
      })
      if (!classRecord) return null
      const { members, ...record } = classRecord
      return { classRecord: record, membership: members[0] ?? null }
    },
    updateMetadata(classId, input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.class.updateMany({
          where: { id: classId, status: 'ACTIVE' },
          data: input,
        })
        if (result.count === 0) return null
        return transaction.class.findUnique({
          where: { id: classId },
          select: classRecordSelect,
        })
      })
    },
    async archive(classId, now) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.class.findUnique({
          where: { id: classId },
          select: { status: true },
        })
        if (!existing) return { kind: 'not_found' } as const
        const changed = existing.status !== 'ARCHIVED'
        const classRecord = changed
          ? await transaction.class.update({
              where: { id: classId },
              data: {
                status: 'ARCHIVED',
                archivedAt: now,
                classCodeActive: false,
                classCodeChangedAt: now,
              },
              select: classRecordSelect,
            })
          : await transaction.class.findUniqueOrThrow({
              where: { id: classId },
              select: classRecordSelect,
            })
        return { kind: 'updated', classRecord, changed } as const
      })
    },
    async restore(classId) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.class.findUnique({
          where: { id: classId },
          select: { status: true },
        })
        if (!existing) return { kind: 'not_found' } as const
        const changed = existing.status !== 'ACTIVE'
        const classRecord = changed
          ? await transaction.class.update({
              where: { id: classId },
              data: {
                status: 'ACTIVE',
                archivedAt: null,
                classCodeActive: false,
              },
              select: classRecordSelect,
            })
          : await transaction.class.findUniqueOrThrow({
              where: { id: classId },
              select: classRecordSelect,
            })
        return { kind: 'updated', classRecord, changed } as const
      })
    },
    async rotateCode(classId, classCode, now) {
      try {
        const classRecord = await prisma.$transaction(async (transaction) => {
          const result = await transaction.class.updateMany({
            where: { id: classId, status: 'ACTIVE' },
            data: {
              classCode,
              classCodeActive: true,
              classCodeChangedAt: now,
            },
          })
          if (result.count === 0) return null
          return transaction.class.findUnique({
            where: { id: classId },
            select: classRecordSelect,
          })
        })
        if (!classRecord) return { kind: 'not_found' }
        return { kind: 'updated', classRecord }
      } catch (error) {
        if (isUniqueFailure(error)) return { kind: 'collision' }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          return { kind: 'not_found' }
        }
        throw error
      }
    },
    revokeCode(classId, now) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.class.updateMany({
          where: { id: classId, status: 'ACTIVE' },
          data: { classCodeActive: false, classCodeChangedAt: now },
        })
        if (result.count === 0) return null
        return transaction.class.findUnique({
          where: { id: classId },
          select: classRecordSelect,
        })
      })
    },
  }
}
