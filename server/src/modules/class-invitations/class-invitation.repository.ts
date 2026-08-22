import { Prisma, type PrismaClient } from '@prisma/client'
import { classRecordSelect } from '../classes/class.repository.js'
import type { ClassRecord } from '../classes/class.types.js'
import type { ClassInvitationListQuery } from './class-invitation.schemas.js'

export interface ClassInvitationStudentSummary {
  fullName: string
  universityEmail: string
}

export interface ClassInvitationClassSummary {
  classId: string
  className: string
  section: string
  semester: string
  schoolYear: string
  instructor: { userId: string; fullName: string }
}

export interface StudentClassInvitationProjection {
  invitationId: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  createdAt: Date
  respondedAt: Date | null
  class: ClassInvitationClassSummary
}

export interface InstructorClassInvitationProjection
  extends StudentClassInvitationProjection {
  invitee: ClassInvitationStudentSummary
}

export type InvitationLookupResult =
  | { kind: 'not_found' }
  | {
      kind: 'eligible' | 'already_member' | 'already_pending'
      student: ClassInvitationStudentSummary
      willReactivate: boolean
    }

export type CreateInvitationResult =
  | { kind: 'created'; invitation: InstructorClassInvitationProjection }
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'target_not_found' }
  | { kind: 'already_member' }
  | { kind: 'already_pending' }
  | { kind: 'membership_pending' }

export type AcceptInvitationResult =
  | {
      kind: 'accepted'
      invitation: StudentClassInvitationProjection
      classRecord: ClassRecord
      membership: {
        id: string
        joinedAt: Date
        lastActivatedAt: Date
      }
      changed: boolean
    }
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'student_inactive' }
  | { kind: 'resolved' }
  | { kind: 'membership_pending' }

export type DeclineInvitationResult =
  | {
      kind: 'declined'
      invitation: StudentClassInvitationProjection
      changed: boolean
    }
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'student_inactive' }
  | { kind: 'resolved' }

export interface ClassInvitationRepository {
  lookup(input: {
    universityEmail: string
    classId?: string
  }): Promise<InvitationLookupResult>
  create(input: {
    classId: string
    invitedById: string
    universityEmail: string
    now: Date
  }): Promise<CreateInvitationResult>
  listForClass(input: {
    classId: string
    query: ClassInvitationListQuery
  }): Promise<{
    invitations: InstructorClassInvitationProjection[]
    totalItems: number
  }>
  listForStudent(input: {
    studentId: string
    query: ClassInvitationListQuery
  }): Promise<{
    invitations: StudentClassInvitationProjection[]
    totalItems: number
  }>
  accept(input: {
    invitationId: string
    studentId: string
    now: Date
  }): Promise<AcceptInvitationResult>
  decline(input: {
    invitationId: string
    studentId: string
    now: Date
  }): Promise<DeclineInvitationResult>
}

const invitationSelect = {
  id: true,
  status: true,
  createdAt: true,
  respondedAt: true,
  invitee: {
    select: { id: true, fullName: true, email: true, role: true, status: true },
  },
  class: {
    select: classRecordSelect,
  },
} as const

type InvitationRecord = Prisma.ClassInvitationGetPayload<{
  select: typeof invitationSelect
}>

function studentProjection(
  record: InvitationRecord,
): StudentClassInvitationProjection {
  return {
    invitationId: record.id,
    status: record.status,
    createdAt: record.createdAt,
    respondedAt: record.respondedAt,
    class: {
      classId: record.class.id,
      className: record.class.className,
      section: record.class.section,
      semester: record.class.semester,
      schoolYear: record.class.schoolYear,
      instructor: {
        userId: record.class.instructor.id,
        fullName: record.class.instructor.fullName,
      },
    },
  }
}

function instructorProjection(
  record: InvitationRecord,
): InstructorClassInvitationProjection {
  return {
    ...studentProjection(record),
    invitee: {
      fullName: record.invitee.fullName,
      universityEmail: record.invitee.email,
    },
  }
}

function isRetryableTransactionFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  )
}

export function createPrismaClassInvitationRepository(
  prisma: PrismaClient,
): ClassInvitationRepository {
  return {
    async lookup(input) {
      const student = await prisma.user.findUnique({
        where: { email: input.universityEmail },
        select: { id: true, fullName: true, email: true, role: true, status: true },
      })
      if (!student || student.role !== 'STUDENT' || student.status !== 'ACTIVE') {
        return { kind: 'not_found' }
      }
      const summary = {
        fullName: student.fullName,
        universityEmail: student.email,
      }
      if (!input.classId) {
        return { kind: 'eligible', student: summary, willReactivate: false }
      }
      const [membership, pending] = await prisma.$transaction([
        prisma.classMember.findUnique({
          where: {
            classId_studentId: {
              classId: input.classId,
              studentId: student.id,
            },
          },
          select: { status: true },
        }),
        prisma.classInvitation.findFirst({
          where: {
            classId: input.classId,
            inviteeId: student.id,
            status: 'PENDING',
          },
          select: { id: true },
        }),
      ])
      if (membership?.status === 'ACTIVE') {
        return { kind: 'already_member', student: summary, willReactivate: false }
      }
      if (pending) {
        return {
          kind: 'already_pending',
          student: summary,
          willReactivate: membership?.status === 'REMOVED',
        }
      }
      return {
        kind: 'eligible',
        student: summary,
        willReactivate: membership?.status === 'REMOVED',
      }
    },
    async create(input) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await prisma.$transaction(
            async (transaction) => {
              const [classRecord, student] = await Promise.all([
                transaction.class.findUnique({
                  where: { id: input.classId },
                  select: { instructorId: true, status: true },
                }),
                transaction.user.findUnique({
                  where: { email: input.universityEmail },
                  select: {
                    id: true,
                    role: true,
                    status: true,
                  },
                }),
              ])
              if (!classRecord || classRecord.instructorId !== input.invitedById) {
                return { kind: 'not_found' } as const
              }
              if (classRecord.status !== 'ACTIVE') {
                return { kind: 'class_archived' } as const
              }
              if (!student || student.role !== 'STUDENT' || student.status !== 'ACTIVE') {
                return { kind: 'target_not_found' } as const
              }
              const [membership, pending] = await Promise.all([
                transaction.classMember.findUnique({
                  where: {
                    classId_studentId: {
                      classId: input.classId,
                      studentId: student.id,
                    },
                  },
                  select: { status: true },
                }),
                transaction.classInvitation.findFirst({
                  where: {
                    classId: input.classId,
                    inviteeId: student.id,
                    status: 'PENDING',
                  },
                  select: { id: true },
                }),
              ])
              if (membership?.status === 'ACTIVE') {
                return { kind: 'already_member' } as const
              }
              if (membership?.status === 'PENDING') {
                return { kind: 'membership_pending' } as const
              }
              if (pending) return { kind: 'already_pending' } as const
              const invitation = await transaction.classInvitation.create({
                data: {
                  classId: input.classId,
                  inviteeId: student.id,
                  invitedById: input.invitedById,
                  status: 'PENDING',
                  createdAt: input.now,
                },
                select: invitationSelect,
              })
              return {
                kind: 'created',
                invitation: instructorProjection(invitation),
              } as const
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          )
        } catch (error) {
          if (isRetryableTransactionFailure(error) && attempt < 2) continue
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            return { kind: 'already_pending' }
          }
          throw error
        }
      }
      throw new Error('Class invitation creation retry limit exhausted.')
    },
    async listForClass(input) {
      const where = { classId: input.classId, status: 'PENDING' as const }
      const [records, totalItems] = await prisma.$transaction([
        prisma.classInvitation.findMany({
          where,
          select: invitationSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.classInvitation.count({ where }),
      ])
      return {
        invitations: records.map(instructorProjection),
        totalItems,
      }
    },
    async listForStudent(input) {
      const where = {
        inviteeId: input.studentId,
        status: 'PENDING' as const,
        class: { status: 'ACTIVE' as const },
      }
      const [records, totalItems] = await prisma.$transaction([
        prisma.classInvitation.findMany({
          where,
          select: invitationSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.classInvitation.count({ where }),
      ])
      return {
        invitations: records.map(studentProjection),
        totalItems,
      }
    },
    async accept(input) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await prisma.$transaction(
            async (transaction) => {
              await transaction.$queryRaw`
                SELECT "class_invitation_id"
                FROM "class_invitations"
                WHERE "class_invitation_id" = ${input.invitationId}::uuid
                FOR UPDATE
              `
              const invitation = await transaction.classInvitation.findUnique({
                where: { id: input.invitationId },
                select: invitationSelect,
              })
              if (!invitation || invitation.invitee.id !== input.studentId) {
                return { kind: 'not_found' } as const
              }
              const membership = await transaction.classMember.findUnique({
                where: {
                  classId_studentId: {
                    classId: invitation.class.id,
                    studentId: input.studentId,
                  },
                },
                select: {
                  id: true,
                  status: true,
                  joinedAt: true,
                  lastActivatedAt: true,
                },
              })
              if (invitation.status === 'ACCEPTED' && membership?.status === 'ACTIVE') {
                return {
                  kind: 'accepted',
                  invitation: studentProjection(invitation),
                  classRecord: invitation.class,
                  membership,
                  changed: false,
                } as const
              }
              if (invitation.status !== 'PENDING') return { kind: 'resolved' } as const
              if (invitation.class.status !== 'ACTIVE') {
                return { kind: 'class_archived' } as const
              }
              if (
                invitation.invitee.role !== 'STUDENT' ||
                invitation.invitee.status !== 'ACTIVE'
              ) {
                return { kind: 'student_inactive' } as const
              }
              if (membership?.status === 'PENDING') {
                return { kind: 'membership_pending' } as const
              }
              const activeMembership = membership
                ? await transaction.classMember.update({
                    where: { id: membership.id },
                    data: {
                      status: 'ACTIVE',
                      removedAt: null,
                      lastActivatedAt: input.now,
                    },
                    select: {
                      id: true,
                      joinedAt: true,
                      lastActivatedAt: true,
                    },
                  })
                : await transaction.classMember.create({
                    data: {
                      classId: invitation.class.id,
                      studentId: input.studentId,
                      status: 'ACTIVE',
                      joinedAt: input.now,
                      lastActivatedAt: input.now,
                    },
                    select: {
                      id: true,
                      joinedAt: true,
                      lastActivatedAt: true,
                    },
                  })
              const accepted = await transaction.classInvitation.update({
                where: { id: input.invitationId },
                data: { status: 'ACCEPTED', respondedAt: input.now },
                select: invitationSelect,
              })
              return {
                kind: 'accepted',
                invitation: studentProjection(accepted),
                classRecord: accepted.class,
                membership: activeMembership,
                changed: true,
              } as const
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          )
        } catch (error) {
          if (isRetryableTransactionFailure(error) && attempt < 2) continue
          throw error
        }
      }
      throw new Error('Class invitation acceptance retry limit exhausted.')
    },
    async decline(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT "class_invitation_id"
          FROM "class_invitations"
          WHERE "class_invitation_id" = ${input.invitationId}::uuid
          FOR UPDATE
        `
        const invitation = await transaction.classInvitation.findUnique({
          where: { id: input.invitationId },
          select: invitationSelect,
        })
        if (!invitation || invitation.invitee.id !== input.studentId) {
          return { kind: 'not_found' } as const
        }
        if (invitation.status === 'DECLINED') {
          return {
            kind: 'declined',
            invitation: studentProjection(invitation),
            changed: false,
          } as const
        }
        if (invitation.status !== 'PENDING') return { kind: 'resolved' } as const
        if (invitation.class.status !== 'ACTIVE') {
          return { kind: 'class_archived' } as const
        }
        if (
          invitation.invitee.role !== 'STUDENT' ||
          invitation.invitee.status !== 'ACTIVE'
        ) {
          return { kind: 'student_inactive' } as const
        }
        const declined = await transaction.classInvitation.update({
          where: { id: input.invitationId },
          data: { status: 'DECLINED', respondedAt: input.now },
          select: invitationSelect,
        })
        return {
          kind: 'declined',
          invitation: studentProjection(declined),
          changed: true,
        } as const
      })
    },
  }
}
