import type { Prisma } from '@prisma/client'

export interface TestCaseRecord {
  id: string
  activityId: string
  name: string
  testCaseOrder: number
  inputData: string | null
  expectedOutput: string
  isHidden: boolean
  importance?: string | null
  points: Prisma.Decimal | null
  createdAt: Date
  updatedAt: Date
}
export interface ManagerTestCaseProjection {
  id: string
  name: string
  testCaseOrder: number
  inputData: string | null
  expectedOutput: string
  isHidden: boolean
  importance?: string | null
  points: number | null
  createdAt: Date
  updatedAt: Date
}

export interface StudentTestCaseProjection {
  id: string
  name: string
  testCaseOrder: number
  inputData: string | null
  expectedOutput: string
  importance?: string | null
  points: number | null
}

export function toManagerTestCaseProjection(
  testCase: TestCaseRecord,
): ManagerTestCaseProjection {
  return {
    id: testCase.id,
    name: testCase.name,
    testCaseOrder: testCase.testCaseOrder,
    inputData: testCase.inputData,
    expectedOutput: testCase.expectedOutput,
    isHidden: testCase.isHidden,
    importance: testCase.importance ?? null,
    points: testCase.points === null ? null : Number(testCase.points),
    createdAt: testCase.createdAt,
    updatedAt: testCase.updatedAt,
  }
}

export function toStudentTestCaseProjection(
  testCase: TestCaseRecord,
): StudentTestCaseProjection {
  return {
    id: testCase.id,
    name: testCase.name,
    testCaseOrder: testCase.testCaseOrder,
    inputData: testCase.inputData,
    expectedOutput: testCase.expectedOutput,
    importance: testCase.importance ?? null,
    points: testCase.points === null ? null : Number(testCase.points),
  }
}
