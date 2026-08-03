import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ClassRepository } from '../classes/class.repository.js'
import type { ClassAccessRecord } from '../classes/class.types.js'
import type {
  ActivityRepository,
  ActivityWriteFailure,
} from './activity.repository.js'
import type {
  ActivityListQuery,
  ActivityTransitionInput,
  CreateActivityInput,
  UpdateActivityInput,
} from './activity.schemas.js'
import {
  toActivityProjection,
  type ActivityAccessRecord,
  type ActivityProjection,
} from './activity.types.js'

export interface ActivityListResult {
  activities: ActivityProjection[]
  pagination: PaginationMeta
}

export interface ActivityService {
  create(
    caller: SafeUserProfile,
    classId: string,
    input: CreateActivityInput,
  ): Promise<ActivityProjection>
  list(
    caller: SafeUserProfile,
    classId: string,
    query: ActivityListQuery,
  ): Promise<ActivityListResult>
  get(caller: SafeUserProfile, activityId: string): Promise<ActivityProjection>
  update(
    caller: SafeUserProfile,
    activityId: string,
    input: UpdateActivityInput,
  ): Promise<ActivityProjection>
  publish(
    caller: SafeUserProfile,
    activityId: string,
    input: ActivityTransitionInput,
  ): Promise<ActivityProjection>
  close(
    caller: SafeUserProfile,
    activityId: string,
    input: ActivityTransitionInput,
  ): Promise<ActivityProjection>
  archive(
    caller: SafeUserProfile,
    activityId: string,
    input: ActivityTransitionInput,
  ): Promise<ActivityProjection>
  restore(
    caller: SafeUserProfile,
    activityId: string,
    input: ActivityTransitionInput,
  ): Promise<ActivityProjection>
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

function classNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'CLASS_NOT_FOUND',
    message: 'Class not found.',
  })
}

function classArchived(): AppError {
  return new AppError({
    statusCode: 409,
    code: 'CLASS_ARCHIVED',
    message: 'Archived classes are read-only.',
  })
}

function requireActiveCaller(caller: SafeUserProfile): void {
  if (caller.status !== 'ACTIVE') throw forbidden()
}

function isManager(caller: SafeUserProfile, instructorId: string): boolean {
  return (
    caller.role === 'ADMIN' ||
    (caller.role === 'INSTRUCTOR' && caller.id === instructorId)
  )
}

function canViewClass(caller: SafeUserProfile, access: ClassAccessRecord): boolean {
  return (
    isManager(caller, access.classRecord.instructorId) ||
    (caller.role === 'STUDENT' && access.membership?.status === 'ACTIVE')
  )
}

function canViewActivity(
  caller: SafeUserProfile,
  access: ActivityAccessRecord,
): boolean {
  if (isManager(caller, access.activity.class.instructorId)) return true
  return (
    caller.role === 'STUDENT' &&
    access.membership?.status === 'ACTIVE' &&
    (access.activity.status === 'PUBLISHED' || access.activity.status === 'CLOSED')
  )
}

function requireManager(
  caller: SafeUserProfile,
  access: ActivityAccessRecord,
): void {
  if (!isManager(caller, access.activity.class.instructorId)) {
    throw activityNotFound()
  }
}

function mapWriteFailure(result: ActivityWriteFailure): never {
  if (result.kind === 'not_found') throw activityNotFound()
  if (result.kind === 'class_archived') throw classArchived()
  if (result.kind === 'stale') {
    throw new AppError({
      statusCode: 409,
      code: 'STALE_ACTIVITY_VERSION',
      message: 'The activity changed. Reload it before trying again.',
    })
  }
  if (result.kind === 'test_case_points_exceed_total') {
    throw new AppError({
      statusCode: 409,
      code: 'TEST_CASE_POINTS_EXCEED_TOTAL',
      message: 'Test-case points cannot exceed the activity total.',
    })
  }
  throw new AppError({
    statusCode: 409,
    code: 'INVALID_ACTIVITY_TRANSITION',
    message: 'The activity lifecycle transition is not allowed.',
  })
}

function publishedFieldViolation(input: UpdateActivityInput): string | null {
  const frozenFields: Array<keyof UpdateActivityInput> = [
    'language',
    'entryClassName',
    'starterCode',
    'totalPoints',
  ]
  return frozenFields.find((field) => input[field] !== undefined) ?? null
}

export function createActivityService(dependencies: {
  repository: ActivityRepository
  classRepository: ClassRepository
  logger: Logger
  now?: () => Date
}): ActivityService {
  const {
    repository,
    classRepository,
    logger,
    now = () => new Date(),
  } = dependencies

  async function loadAccess(
    caller: SafeUserProfile,
    activityId: string,
  ): Promise<ActivityAccessRecord> {
    requireActiveCaller(caller)
    const access = await repository.findAccess(activityId, caller.id)
    if (!access || !canViewActivity(caller, access)) throw activityNotFound()
    return access
  }

  async function loadManagerAccess(
    caller: SafeUserProfile,
    activityId: string,
  ): Promise<ActivityAccessRecord> {
    requireActiveCaller(caller)
    const access = await repository.findAccess(activityId, caller.id)
    if (!access) throw activityNotFound()
    requireManager(caller, access)
    if (access.activity.class.status === 'ARCHIVED') throw classArchived()
    return access
  }

  return {
    async create(caller, classId, input) {
      requireActiveCaller(caller)
      if (caller.role !== 'INSTRUCTOR' && caller.role !== 'ADMIN') {
        throw forbidden()
      }
      const classAccess = await classRepository.findAccess(classId, caller.id)
      if (!classAccess || !isManager(caller, classAccess.classRecord.instructorId)) {
        throw classNotFound()
      }
      if (classAccess.classRecord.status === 'ARCHIVED') throw classArchived()
      const createdAt = now()
      const result = await repository.create({
        classId,
        createdById: caller.id,
        activity: input,
        now: createdAt,
      })
      if (result.kind === 'class_not_found') throw classNotFound()
      if (result.kind === 'class_archived') throw classArchived()
      logger.info(
        {
          event: 'activity.created',
          actorId: caller.id,
          classId,
          activityId: result.activity.id,
        },
        'programming activity created',
      )
      return toActivityProjection(result.activity, createdAt)
    },
    async list(caller, classId, query) {
      requireActiveCaller(caller)
      const classAccess = await classRepository.findAccess(classId, caller.id)
      if (!classAccess || !canViewClass(caller, classAccess)) throw classNotFound()
      const studentView = caller.role === 'STUDENT'
      const result = await repository.list({
        classId,
        callerId: caller.id,
        callerRole: caller.role,
        studentView,
        query,
      })
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      const currentTime = now()
      return {
        activities: result.activities.map((activity) =>
          toActivityProjection(activity, currentTime),
        ),
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
    async get(caller, activityId) {
      const access = await loadAccess(caller, activityId)
      return toActivityProjection(access.activity, now())
    },
    async update(caller, activityId, input) {
      const access = await loadManagerAccess(caller, activityId)
      if (access.activity.status === 'CLOSED' || access.activity.status === 'ARCHIVED') {
        throw new AppError({
          statusCode: 409,
          code: 'ACTIVITY_NOT_EDITABLE',
          message: 'The activity is read-only in its current state.',
        })
      }
      if (access.activity.status === 'PUBLISHED') {
        const frozenField = publishedFieldViolation(input)
        if (frozenField) {
          throw new AppError({
            statusCode: 409,
            code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE',
            message: 'Published scoring and test configuration is immutable.',
            details: { field: frozenField },
          })
        }
        if (
          input.dueDate &&
          input.dueDate.getTime() < access.activity.dueDate.getTime()
        ) {
          throw new AppError({
            statusCode: 409,
            code: 'PUBLISHED_DUE_DATE_CANNOT_DECREASE',
            message: 'A published activity due date may only be extended.',
          })
        }
        if (
          input.maxAttempts !== undefined &&
          input.maxAttempts < access.activity.maxAttempts
        ) {
          throw new AppError({
            statusCode: 409,
            code: 'PUBLISHED_ATTEMPT_LIMIT_CANNOT_DECREASE',
            message: 'A published activity attempt limit may only increase.',
          })
        }
      }
      const { expectedUpdatedAt, ...fields } = input
      const changedAt = now()
      const result = await repository.update({
        activityId,
        expectedUpdatedAt,
        currentStatus: access.activity.status,
        fields,
        now: changedAt,
      })
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info(
        {
          event: 'activity.metadata_updated',
          actorId: caller.id,
          classId: result.activity.classId,
          activityId,
        },
        'programming activity metadata updated',
      )
      return toActivityProjection(result.activity, changedAt)
    },
    async publish(caller, activityId, input) {
      await loadManagerAccess(caller, activityId)
      const changedAt = now()
      const result = await repository.publish({
        activityId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        now: changedAt,
      })
      if (result.kind === 'not_publishable') {
        throw new AppError({
          statusCode: 409,
          code: 'ACTIVITY_NOT_PUBLISHABLE',
          message: 'The activity does not meet publication requirements.',
          details: { reason: result.reason },
        })
      }
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info(
        {
          event: 'activity.published',
          actorId: caller.id,
          classId: result.activity.classId,
          activityId,
        },
        'programming activity published',
      )
      return toActivityProjection(result.activity, changedAt)
    },
    async close(caller, activityId, input) {
      await loadManagerAccess(caller, activityId)
      const changedAt = now()
      const result = await repository.close({
        activityId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        now: changedAt,
      })
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info(
        {
          event: 'activity.closed',
          actorId: caller.id,
          classId: result.activity.classId,
          activityId,
        },
        'programming activity closed',
      )
      return toActivityProjection(result.activity, changedAt)
    },
    async archive(caller, activityId, input) {
      const access = await loadManagerAccess(caller, activityId)
      if (access.activity.status === 'ARCHIVED') {
        throw new AppError({
          statusCode: 409,
          code: 'INVALID_ACTIVITY_TRANSITION',
          message: 'The activity lifecycle transition is not allowed.',
        })
      }
      const changedAt = now()
      const result = await repository.archive({
        activityId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        currentStatus: access.activity.status,
        now: changedAt,
      })
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info(
        {
          event: 'activity.archived',
          actorId: caller.id,
          classId: result.activity.classId,
          activityId,
        },
        'programming activity archived',
      )
      return toActivityProjection(result.activity, changedAt)
    },
    async restore(caller, activityId, input) {
      await loadManagerAccess(caller, activityId)
      const changedAt = now()
      const result = await repository.restore({
        activityId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        now: changedAt,
      })
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info(
        {
          event: 'activity.restored',
          actorId: caller.id,
          classId: result.activity.classId,
          activityId,
        },
        'programming activity restored',
      )
      return toActivityProjection(result.activity, changedAt)
    },
  }
}
