import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { ActivityRepository } from '../activities/activity.repository.js'
import type { ActivityAccessRecord } from '../activities/activity.types.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  ReplaceTestCasesInput,
  TestCaseListQuery,
} from './test-case.schemas.js'
import type { TestCaseRepository } from './test-case.repository.js'
import {
  toManagerTestCaseProjection,
  toStudentTestCaseProjection,
  type ManagerTestCaseProjection,
  type StudentTestCaseProjection,
} from './test-case.types.js'

export interface TestCaseListResult {
  testCases: Array<ManagerTestCaseProjection | StudentTestCaseProjection>
  pagination: PaginationMeta
}
export interface ReplaceTestCasesProjection {
  testCases: ManagerTestCaseProjection[]
  activityUpdatedAt: Date
}

export interface TestCaseService {
  list(
    caller: SafeUserProfile,
    activityId: string,
    query: TestCaseListQuery,
  ): Promise<TestCaseListResult>
  replace(
    caller: SafeUserProfile,
    activityId: string,
    input: ReplaceTestCasesInput,
  ): Promise<ReplaceTestCasesProjection>
}

function forbidden(): AppError {
  return new AppError({
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'You are not authorized to perform this action.',
  })
}

function activityNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'ACTIVITY_NOT_FOUND',
    message: 'Programming activity not found.',
  })
}

function isManager(caller: SafeUserProfile, access: ActivityAccessRecord): boolean {
  return (
    caller.role === 'ADMIN' ||
    (caller.role === 'INSTRUCTOR' &&
      caller.id === access.activity.class.instructorId)
  )
}

function isStudentViewer(
  caller: SafeUserProfile,
  access: ActivityAccessRecord,
): boolean {
  return (
    caller.role === 'STUDENT' &&
    access.membership?.status === 'ACTIVE' &&
    (access.activity.status === 'PUBLISHED' || access.activity.status === 'CLOSED')
  )
}

export function createTestCaseService(dependencies: {
  repository: TestCaseRepository
  activityRepository: ActivityRepository
  logger: Logger
  now?: () => Date
}): TestCaseService {
  const {
    repository,
    activityRepository,
    logger,
    now = () => new Date(),
  } = dependencies

  async function loadAccess(
    caller: SafeUserProfile,
    activityId: string,
  ): Promise<ActivityAccessRecord> {
    if (caller.status !== 'ACTIVE') throw forbidden()
    const access = await activityRepository.findAccess(activityId, caller.id)
    if (!access) throw activityNotFound()
    return access
  }

  return {
    async list(caller, activityId, query) {
      const access = await loadAccess(caller, activityId)
      const manager = isManager(caller, access)
      if (!manager && !isStudentViewer(caller, access)) throw activityNotFound()
      const result = await repository.list({
        activityId,
        includeHidden: manager,
        query,
      })
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        testCases: manager
          ? result.testCases.map(toManagerTestCaseProjection)
          : result.testCases.map(toStudentTestCaseProjection),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: result.totalItems,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      }
    },
    async replace(caller, activityId, input) {
      const access = await loadAccess(caller, activityId)
      if (!isManager(caller, access)) throw activityNotFound()
      if (access.activity.class.status === 'ARCHIVED') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_ARCHIVED',
          message: 'Archived classes are read-only.',
        })
      }
      if (access.activity.status !== 'DRAFT') {
        throw new AppError({
          statusCode: 409,
          code: 'PUBLISHED_TEST_CASES_IMMUTABLE',
          message: 'Test cases are editable only while the activity is a draft.',
        })
      }
      const result = await repository.replace({
        activityId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        testCases: input.testCases,
        now: now(),
      })
      if (result.kind === 'not_found') throw activityNotFound()
      if (result.kind === 'class_archived') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_ARCHIVED',
          message: 'Archived classes are read-only.',
        })
      }
      if (result.kind === 'activity_not_draft') {
        throw new AppError({
          statusCode: 409,
          code: 'PUBLISHED_TEST_CASES_IMMUTABLE',
          message: 'Test cases are editable only while the activity is a draft.',
        })
      }
      if (result.kind === 'stale') {
        throw new AppError({
          statusCode: 409,
          code: 'STALE_ACTIVITY_VERSION',
          message: 'The activity changed. Reload it before trying again.',
        })
      }
      if (result.kind === 'points_exceed_total') {
        throw new AppError({
          statusCode: 409,
          code: 'TEST_CASE_POINTS_EXCEED_TOTAL',
          message: 'Test-case points cannot exceed the activity total.',
        })
      }
      logger.info(
        {
          event: 'activity.test_cases_replaced',
          actorId: caller.id,
          classId: access.activity.classId,
          activityId,
          testCaseCount: result.testCases.length,
        },
        'programming activity test cases replaced',
      )
      return {
        testCases: result.testCases.map(toManagerTestCaseProjection),
        activityUpdatedAt: result.activityUpdatedAt,
      }
    },
  }
}
