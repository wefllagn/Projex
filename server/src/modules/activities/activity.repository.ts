import type {
  Prisma,
  ActivityStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client'
import type {
  ActivityListQuery,
  CreateActivityInput,
} from './activity.schemas.js'
import type { ActivityAccessRecord, ActivityRecord } from './activity.types.js'

export const activityRecordSelect = {
  id: true,
  classId: true,
  createdById: true,
  title: true,
  instructions: true,
  dueDate: true,
  language: true,
  entryClassName: true,
  starterCode: true,
  maxAttempts: true,
  creditPolicy: true,
  totalPoints: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  closedAt: true,
  archivedAt: true,
  class: {
    select: {
      id: true,
      instructorId: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
    },
  },
} as const

export type ActivityWriteFailure =
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'invalid_state' }
  | { kind: 'stale' }
  | { kind: 'unfinished_submission_work' }
  | { kind: 'test_case_points_exceed_total' }

export type ActivityWriteResult =
  | { kind: 'updated'; activity: ActivityRecord }
  | ActivityWriteFailure

export type CreateActivityResult =
  | { kind: 'created'; activity: ActivityRecord }
  | { kind: 'class_not_found' }
  | { kind: 'class_archived' }

export type ActivityPublishFailureReason =
  | 'DUE_DATE_NOT_FUTURE'
  | 'NO_TEST_CASES'
  | 'NO_VISIBLE_TEST_CASE'
  | 'TEST_CASE_POINTS_REQUIRED'
  | 'TEST_CASE_POINTS_EXCEED_TOTAL'
  | 'STARTER_CODE_REQUIRED'

export type PublishActivityResult =
  | { kind: 'updated'; activity: ActivityRecord }
  | { kind: 'not_publishable'; reason: ActivityPublishFailureReason }
  | ActivityWriteFailure

export interface ActivityMutableFields {
  title?: string
  instructions?: string
  dueDate?: Date
  language?: 'JAVA'
  entryClassName?: string
  starterCode?: string
  maxAttempts?: number
  creditPolicy?: 'LATEST' | 'HIGHEST'
  totalPoints?: number
}

export interface ActivityRepository {
  create(input: {
    classId: string
    createdById: string
    activity: CreateActivityInput
    now: Date
  }): Promise<CreateActivityResult>
  list(input: {
    classId: string
    callerId: string
    callerRole: UserRole
    studentView: boolean
    query: ActivityListQuery
  }): Promise<{ activities: ActivityRecord[]; totalItems: number }>
  findAccess(activityId: string, callerId: string): Promise<ActivityAccessRecord | null>
  update(input: {
    activityId: string
    expectedUpdatedAt: Date
    currentStatus: ActivityStatus
    fields: ActivityMutableFields
    now: Date
  }): Promise<ActivityWriteResult>
  publish(input: {
    activityId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<PublishActivityResult>
  close(input: {
    activityId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ActivityWriteResult>
  archive(input: {
    activityId: string
    expectedUpdatedAt: Date
    currentStatus: Exclude<ActivityStatus, 'ARCHIVED'>
    now: Date
  }): Promise<ActivityWriteResult>
  restore(input: {
    activityId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ActivityWriteResult>
}

function nextUpdatedAt(expectedUpdatedAt: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1))
}

async function diagnoseWriteFailure(
  transaction: Prisma.TransactionClient,
  activityId: string,
  expectedUpdatedAt: Date,
  allowedStatuses: readonly ActivityStatus[],
): Promise<ActivityWriteFailure> {
  const current = await transaction.programmingActivity.findUnique({
    where: { id: activityId },
    select: {
      status: true,
      updatedAt: true,
      class: { select: { status: true } },
    },
  })
  if (!current) return { kind: 'not_found' }
  if (current.class.status === 'ARCHIVED') return { kind: 'class_archived' }
  if (!allowedStatuses.includes(current.status)) return { kind: 'invalid_state' }
  if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    return { kind: 'stale' }
  }
  return { kind: 'stale' }
}

async function loadActivity(
  transaction: Prisma.TransactionClient,
  activityId: string,
): Promise<ActivityRecord> {
  return transaction.programmingActivity.findUniqueOrThrow({
    where: { id: activityId },
    select: activityRecordSelect,
  })
}

export function createPrismaActivityRepository(
  prisma: PrismaClient,
): ActivityRepository {
  return {
    create(input) {
      return prisma.$transaction(async (transaction) => {
        const classRecord = await transaction.class.findUnique({
          where: { id: input.classId },
          select: { status: true },
        })
        if (!classRecord) return { kind: 'class_not_found' } as const
        if (classRecord.status === 'ARCHIVED') {
          return { kind: 'class_archived' } as const
        }
        const activity = await transaction.programmingActivity.create({
          data: {
            classId: input.classId,
            createdById: input.createdById,
            title: input.activity.title,
            instructions: input.activity.instructions,
            dueDate: input.activity.dueDate,
            language: input.activity.language,
            entryClassName: input.activity.entryClassName,
            starterCode: input.activity.starterCode,
            maxAttempts: input.activity.maxAttempts,
            creditPolicy: input.activity.creditPolicy,
            totalPoints: input.activity.totalPoints,
            status: 'DRAFT',
            createdAt: input.now,
            updatedAt: input.now,
          },
          select: activityRecordSelect,
        })
        return { kind: 'created', activity } as const
      })
    },
    async list(input) {
      const studentStatuses: ActivityStatus[] = ['PUBLISHED', 'CLOSED']
      const statusScope: Prisma.ProgrammingActivityWhereInput = input.studentView
        ? {
            status:
              input.query.status && studentStatuses.includes(input.query.status)
                ? input.query.status
                : input.query.status
                  ? { in: [] }
                  : { in: studentStatuses },
          }
        : input.query.status
          ? { status: input.query.status }
          : {}
      const where: Prisma.ProgrammingActivityWhereInput = {
        classId: input.classId,
        ...statusScope,
        ...(input.studentView
          ? {
              class: {
                members: {
                  some: { studentId: input.callerId, status: 'ACTIVE' },
                },
              },
            }
          : {}),
        ...(input.query.search
          ? {
              OR: [
                {
                  title: {
                    contains: input.query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  instructions: {
                    contains: input.query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      }
      const [activities, totalItems] = await prisma.$transaction([
        prisma.programmingActivity.findMany({
          where,
          select: activityRecordSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.programmingActivity.count({ where }),
      ])
      return { activities, totalItems }
    },
    async findAccess(activityId, callerId) {
      const activity = await prisma.programmingActivity.findUnique({
        where: { id: activityId },
        select: {
          ...activityRecordSelect,
          class: {
            select: {
              id: true,
              instructorId: true,
              status: true,
              members: {
                where: { studentId: callerId },
                take: 1,
                select: { id: true, status: true },
              },
            },
          },
        },
      })
      if (!activity) return null
      const { members, ...classRecord } = activity.class
      return {
        activity: { ...activity, class: classRecord },
        membership: members[0] ?? null,
      }
    },
    update(input) {
      return prisma.$transaction(async (transaction) => {
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        if (input.fields.totalPoints !== undefined) {
          const aggregate = await transaction.testCase.aggregate({
            where: { activityId: input.activityId },
            _sum: { points: true },
          })
          if (Number(aggregate._sum.points ?? 0) > input.fields.totalPoints) {
            return { kind: 'test_case_points_exceed_total' } as const
          }
        }
        const result = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: input.currentStatus,
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: { ...input.fields, updatedAt: versionTimestamp },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(
            transaction,
            input.activityId,
            input.expectedUpdatedAt,
            [input.currentStatus],
          )
        }
        return {
          kind: 'updated',
          activity: await loadActivity(transaction, input.activityId),
        } as const
      })
    },
    publish(input) {
      return prisma.$transaction(async (transaction) => {
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        const current = await transaction.programmingActivity.findUnique({
          where: { id: input.activityId },
          select: {
            ...activityRecordSelect,
            testCases: {
              select: { points: true, isHidden: true },
            },
          },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.class.status === 'ARCHIVED') {
          return { kind: 'class_archived' } as const
        }
        if (current.status !== 'DRAFT') return { kind: 'invalid_state' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        if (current.dueDate.getTime() <= input.now.getTime()) {
          return {
            kind: 'not_publishable',
            reason: 'DUE_DATE_NOT_FUTURE',
          } as const
        }
        if (current.starterCode.trim().length === 0) {
          return {
            kind: 'not_publishable',
            reason: 'STARTER_CODE_REQUIRED',
          } as const
        }
        if (current.testCases.length === 0) {
          return { kind: 'not_publishable', reason: 'NO_TEST_CASES' } as const
        }
        if (!current.testCases.some((testCase) => !testCase.isHidden)) {
          return {
            kind: 'not_publishable',
            reason: 'NO_VISIBLE_TEST_CASE',
          } as const
        }
        const testCasePoints = current.testCases.reduce(
          (total, testCase) => total + Number(testCase.points),
          0,
        )
        if (testCasePoints <= 0) {
          return {
            kind: 'not_publishable',
            reason: 'TEST_CASE_POINTS_REQUIRED',
          } as const
        }
        if (testCasePoints > Number(current.totalPoints)) {
          return {
            kind: 'not_publishable',
            reason: 'TEST_CASE_POINTS_EXCEED_TOTAL',
          } as const
        }
        const result = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: 'DRAFT',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: input.now,
            closedAt: null,
            archivedAt: null,
            updatedAt: versionTimestamp,
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(
            transaction,
            input.activityId,
            input.expectedUpdatedAt,
            ['DRAFT'],
          )
        }
        return {
          kind: 'updated',
          activity: await loadActivity(transaction, input.activityId),
        } as const
      })
    },
    close(input) {
      return prisma.$transaction(async (transaction) => {
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        const result = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: 'PUBLISHED',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: 'CLOSED',
            closedAt: input.now,
            updatedAt: versionTimestamp,
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(
            transaction,
            input.activityId,
            input.expectedUpdatedAt,
            ['PUBLISHED'],
          )
        }
        return {
          kind: 'updated',
          activity: await loadActivity(transaction, input.activityId),
        } as const
      })
    },
    archive(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT "activity_id"
          FROM "programming_activities"
          WHERE "activity_id" = ${input.activityId}::uuid
          FOR UPDATE
        `
        const unfinished = await transaction.activitySubmission.count({
          where: {
            activityId: input.activityId,
            submissionStatus: { notIn: ['RELEASED', 'FAILED_RESOLVED'] },
          },
        })
        const activeReplacement =
          await transaction.submissionFailureResolution.count({
            where: {
              failedSubmission: { activityId: input.activityId },
              resolutionType: 'REPLACEMENT_GRANTED',
              replacementSubmissionId: null,
              replacementExpiresAt: { gt: input.now },
            },
          })
        const activePractice = await transaction.practiceExecution.count({
          where: {
            activityId: input.activityId,
            status: { in: ['QUEUED', 'RUNNING'] },
          },
        })
        if (unfinished > 0 || activeReplacement > 0 || activePractice > 0) {
          return { kind: 'unfinished_submission_work' } as const
        }
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        const result = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: input.currentStatus,
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: 'ARCHIVED',
            archivedAt: input.now,
            updatedAt: versionTimestamp,
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(
            transaction,
            input.activityId,
            input.expectedUpdatedAt,
            ['DRAFT', 'PUBLISHED', 'CLOSED'],
          )
        }
        return {
          kind: 'updated',
          activity: await loadActivity(transaction, input.activityId),
        } as const
      })
    },
    restore(input) {
      return prisma.$transaction(async (transaction) => {
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        const existing = await transaction.programmingActivity.findUnique({
          where: { id: input.activityId },
          select: {
            status: true,
            updatedAt: true,
            publishedAt: true,
            closedAt: true,
            class: { select: { status: true } },
          },
        })
        if (!existing) return { kind: 'not_found' } as const
        if (existing.class.status === 'ARCHIVED') {
          return { kind: 'class_archived' } as const
        }
        if (existing.status !== 'ARCHIVED') return { kind: 'invalid_state' } as const
        if (existing.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        const restoredStatus: ActivityStatus = existing.publishedAt ? 'CLOSED' : 'DRAFT'
        const result = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: 'ARCHIVED',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: restoredStatus,
            archivedAt: null,
            closedAt:
              restoredStatus === 'CLOSED' ? (existing.closedAt ?? input.now) : null,
            updatedAt: versionTimestamp,
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(
            transaction,
            input.activityId,
            input.expectedUpdatedAt,
            ['ARCHIVED'],
          )
        }
        return {
          kind: 'updated',
          activity: await loadActivity(transaction, input.activityId),
        } as const
      })
    },
  }
}
