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
import {
  appendAdminAuditEvent,
  type AdminAuditWriter,
} from '../admin/admin-audit.js'

interface ClassAdminAuditContext {
  actorAdminId: string
  requestId: string
  reason?: string
}

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
  | { kind: 'unfinished_submission_work' }
  | { kind: 'unfinished_project_work' }

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
    adminAudit?: ClassAdminAuditContext
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
    adminAudit?: ClassAdminAuditContext,
  ): Promise<ClassRecord | null>
  archive(classId: string, now: Date, adminAudit?: ClassAdminAuditContext): Promise<ClassWriteResult>
  restore(classId: string, adminAudit?: ClassAdminAuditContext): Promise<ClassWriteResult>
  rotateCode(
    classId: string,
    classCode: string,
    now: Date,
    adminAudit?: ClassAdminAuditContext,
  ): Promise<ClassCodeWriteResult>
  revokeCode(classId: string, now: Date, adminAudit?: ClassAdminAuditContext): Promise<ClassRecord | null>
}

function isUniqueFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export function createPrismaClassRepository(
  prisma: PrismaClient,
  auditWriter: AdminAuditWriter = appendAdminAuditEvent,
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
          if (input.adminAudit) {
            await auditWriter(transaction, {
              ...input.adminAudit,
              action: 'CLASS_CREATED',
              targetType: 'CLASS',
              targetId: classRecord.id,
              metadata: { instructorId: input.instructorId },
              createdAt: input.now,
            })
          }
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
    updateMetadata(classId, input, adminAudit) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.class.updateMany({
          where: { id: classId, status: 'ACTIVE' },
          data: input,
        })
        if (result.count === 0) return null
        const classRecord = await transaction.class.findUnique({
          where: { id: classId },
          select: classRecordSelect,
        })
        if (classRecord && adminAudit) {
          await auditWriter(transaction, {
            ...adminAudit,
            action: 'CLASS_UPDATED',
            targetType: 'CLASS',
            targetId: classId,
            metadata: { changed: true },
            createdAt: classRecord.updatedAt,
          })
        }
        return classRecord
      })
    },
    async archive(classId, now, adminAudit) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT "class_id"
          FROM "classes"
          WHERE "class_id" = ${classId}::uuid
          FOR UPDATE
        `
        const existing = await transaction.class.findUnique({
          where: { id: classId },
          select: { status: true },
        })
        if (!existing) return { kind: 'not_found' } as const
        if (existing.status !== 'ARCHIVED') {
          const unfinished = await transaction.activitySubmission.count({
            where: {
              activity: { classId },
              submissionStatus: { notIn: ['RELEASED', 'FAILED_RESOLVED'] },
            },
          })
          const activeReplacement =
            await transaction.submissionFailureResolution.count({
              where: {
                failedSubmission: { activity: { classId } },
                resolutionType: 'REPLACEMENT_GRANTED',
                replacementSubmissionId: null,
                replacementExpiresAt: { gt: now },
              },
            })
          const activePractice = await transaction.practiceExecution.count({
            where: {
              activity: { classId },
              status: { in: ['QUEUED', 'RUNNING'] },
            },
          })
          if (unfinished > 0 || activeReplacement > 0 || activePractice > 0) {
            return { kind: 'unfinished_submission_work' } as const
          }
          const [activeInvitation, unfinishedRepository, membershipMismatch] =
            await Promise.all([
              transaction.repositoryInvitation.count({
                where: {
                  projectTask: { classId },
                  status: 'PENDING',
                  expiresAt: { gt: now },
                },
              }),
              transaction.repository.count({
                where: {
                  projectTask: { classId },
                  status: { not: 'ARCHIVED' },
                  reviewStatus: { in: ['WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED'] },
                },
              }),
              transaction.$queryRaw<Array<{ broken: boolean }>>`
                SELECT EXISTS (
                  SELECT 1
                  FROM "repositories" r
                  JOIN "project_tasks" pt ON pt."project_task_id" = r."project_task_id"
                  JOIN "teams" t ON t."team_id" = r."team_id"
                  WHERE pt."class_id" = ${classId}::uuid
                    AND r."repository_type" = 'CLASS_PROJECT'
                    AND (
                      r."owner_id" <> t."lead_student_id"
                      OR EXISTS (
                        SELECT 1 FROM "team_members" tm
                        LEFT JOIN "repository_members" rm
                          ON rm."repository_id" = r."repository_id" AND rm."student_id" = tm."student_id"
                        WHERE tm."team_id" = t."team_id"
                          AND (rm."repository_member_id" IS NULL OR rm."status"::text <> tm."status"::text)
                      )
                      OR EXISTS (
                        SELECT 1 FROM "repository_members" rm
                        LEFT JOIN "team_members" tm
                          ON tm."team_id" = t."team_id" AND tm."student_id" = rm."student_id"
                        WHERE rm."repository_id" = r."repository_id"
                          AND (tm."team_member_id" IS NULL OR tm."status"::text <> rm."status"::text)
                      )
                    )
                ) AS broken
              `,
            ])
          if (
            activeInvitation > 0 ||
            unfinishedRepository > 0 ||
            (membershipMismatch[0]?.broken ?? true)
          ) {
            return { kind: 'unfinished_project_work' } as const
          }
        }
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
        if (changed && adminAudit) {
          await auditWriter(transaction, {
            ...adminAudit,
            action: 'CLASS_ARCHIVED',
            targetType: 'CLASS',
            targetId: classId,
            metadata: { changed },
            createdAt: now,
          })
        }
        return { kind: 'updated', classRecord, changed } as const
      })
    },
    async restore(classId, adminAudit) {
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
        if (changed && adminAudit) {
          await auditWriter(transaction, {
            ...adminAudit,
            action: 'CLASS_RESTORED',
            targetType: 'CLASS',
            targetId: classId,
            metadata: { changed },
            createdAt: classRecord.updatedAt,
          })
        }
        return { kind: 'updated', classRecord, changed } as const
      })
    },
    async rotateCode(classId, classCode, now, adminAudit) {
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
          const updated = await transaction.class.findUnique({
            where: { id: classId },
            select: classRecordSelect,
          })
          if (updated && adminAudit) {
            await auditWriter(transaction, {
              ...adminAudit,
              action: 'CLASS_JOIN_CODE_ROTATED',
              targetType: 'CLASS',
              targetId: classId,
              metadata: { changed: true },
              createdAt: now,
            })
          }
          return updated
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
    revokeCode(classId, now, adminAudit) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.class.updateMany({
          where: { id: classId, status: 'ACTIVE' },
          data: { classCodeActive: false, classCodeChangedAt: now },
        })
        if (result.count === 0) return null
        const classRecord = await transaction.class.findUnique({
          where: { id: classId },
          select: classRecordSelect,
        })
        if (classRecord && adminAudit) {
          await auditWriter(transaction, {
            ...adminAudit,
            action: 'CLASS_JOIN_CODE_REVOKED',
            targetType: 'CLASS',
            targetId: classId,
            metadata: { changed: true },
            createdAt: now,
          })
        }
        return classRecord
      })
    },
  }
}
