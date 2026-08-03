import { Prisma, type PrismaClient } from '@prisma/client'
import type {
  TestCaseInput,
  TestCaseListQuery,
} from './test-case.schemas.js'
import type { TestCaseRecord } from './test-case.types.js'

const testCaseRecordSelect = {
  id: true,
  activityId: true,
  name: true,
  testCaseOrder: true,
  inputData: true,
  expectedOutput: true,
  isHidden: true,
  points: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ReplaceTestCasesResult =
  | {
      kind: 'updated'
      testCases: TestCaseRecord[]
      activityUpdatedAt: Date
    }
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'activity_not_draft' }
  | { kind: 'stale' }
  | { kind: 'points_exceed_total' }

export interface TestCaseRepository {
  list(input: {
    activityId: string
    includeHidden: boolean
    query: TestCaseListQuery
  }): Promise<{ testCases: TestCaseRecord[]; totalItems: number }>
  replace(input: {
    activityId: string
    expectedUpdatedAt: Date
    testCases: TestCaseInput[]
    now: Date
  }): Promise<ReplaceTestCasesResult>
}

function nextUpdatedAt(expectedUpdatedAt: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1))
}

export function createPrismaTestCaseRepository(
  prisma: PrismaClient,
): TestCaseRepository {
  return {
    async list(input) {
      const where = {
        activityId: input.activityId,
        ...(input.includeHidden ? {} : { isHidden: false }),
      }
      const [testCases, totalItems] = await prisma.$transaction([
        prisma.testCase.findMany({
          where,
          select: testCaseRecordSelect,
          orderBy: [{ testCaseOrder: 'asc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.testCase.count({ where }),
      ])
      return { testCases, totalItems }
    },
    replace(input) {
      return prisma.$transaction(async (transaction) => {
        const versionTimestamp = nextUpdatedAt(input.expectedUpdatedAt, input.now)
        const activity = await transaction.programmingActivity.findUnique({
          where: { id: input.activityId },
          select: {
            status: true,
            updatedAt: true,
            totalPoints: true,
            class: { select: { status: true } },
          },
        })
        if (!activity) return { kind: 'not_found' } as const
        if (activity.class.status === 'ARCHIVED') {
          return { kind: 'class_archived' } as const
        }
        if (activity.status !== 'DRAFT') {
          return { kind: 'activity_not_draft' } as const
        }
        if (activity.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
          return { kind: 'stale' } as const
        }
        const totalTestPoints = input.testCases.reduce(
          (total, testCase) => total + testCase.points,
          0,
        )
        if (totalTestPoints > Number(activity.totalPoints)) {
          return { kind: 'points_exceed_total' } as const
        }
        const touched = await transaction.programmingActivity.updateMany({
          where: {
            id: input.activityId,
            status: 'DRAFT',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: { updatedAt: versionTimestamp },
        })
        if (touched.count === 0) return { kind: 'stale' } as const

        await transaction.testCase.deleteMany({
          where: { activityId: input.activityId },
        })
        if (input.testCases.length > 0) {
          await transaction.testCase.createMany({
            data: input.testCases.map((testCase, index) => ({
              activityId: input.activityId,
              name: testCase.name,
              testCaseOrder: index + 1,
              inputData: testCase.inputData,
              expectedOutput: testCase.expectedOutput,
              isHidden: testCase.isHidden,
              points: new Prisma.Decimal(testCase.points),
              createdAt: input.now,
              updatedAt: input.now,
            })),
          })
        }
        const testCases = await transaction.testCase.findMany({
          where: { activityId: input.activityId },
          select: testCaseRecordSelect,
          orderBy: [{ testCaseOrder: 'asc' }, { id: 'asc' }],
        })
        return {
          kind: 'updated',
          testCases,
          activityUpdatedAt: versionTimestamp,
        } as const
      })
    },
  }
}
