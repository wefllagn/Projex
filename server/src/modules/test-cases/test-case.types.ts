import type { Prisma } from '@prisma/client'

export interface TestCaseRecord {
  id: string
  activityId: string
  name: string
  testCaseOrder: number
  inputData: string | null
  expectedOutput: string
  isHidden: boolean
  points: Prisma.Decimal
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
  points: number
  createdAt: Date
  updatedAt: Date
}

export interface StudentTestCaseProjection {
  id: string
  name: string
  testCaseOrder: number
  inputData: string | null
  expectedOutput: string
  points: number
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
    points: Number(testCase.points),
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
    points: Number(testCase.points),
  }
}
