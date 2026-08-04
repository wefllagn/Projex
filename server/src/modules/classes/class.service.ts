import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import {
  CLASS_CODE_COLLISION_RETRIES,
  formatClassCode,
  generateClassCode,
  normalizeClassCode,
} from './class-code.js'
import type { ClassRepository } from './class.repository.js'
import type {
  ClassListQuery,
  CreateClassInput,
  UpdateClassInput,
} from './class.schemas.js'
import {
  toClassProjection,
  type ClassAccessRecord,
  type ClassProjection,
  type ClassRecord,
} from './class.types.js'

export interface ClassListResult {
  classes: ClassProjection[]
  pagination: PaginationMeta
}

export interface JoinCodeProjection {
  classId: string
  classCode: string
  active: boolean
  changedAt: Date
}

export interface ClassService {
  create(caller: SafeUserProfile, input: CreateClassInput): Promise<ClassProjection>
  list(caller: SafeUserProfile, query: ClassListQuery): Promise<ClassListResult>
  get(caller: SafeUserProfile, classId: string): Promise<ClassProjection>
  update(
    caller: SafeUserProfile,
    classId: string,
    input: UpdateClassInput,
  ): Promise<ClassProjection>
  archive(caller: SafeUserProfile, classId: string): Promise<ClassProjection>
  restore(caller: SafeUserProfile, classId: string): Promise<ClassProjection>
  getJoinCode(
    caller: SafeUserProfile,
    classId: string,
  ): Promise<JoinCodeProjection>
  rotateJoinCode(
    caller: SafeUserProfile,
    classId: string,
  ): Promise<JoinCodeProjection>
  revokeJoinCode(
    caller: SafeUserProfile,
    classId: string,
  ): Promise<JoinCodeProjection>
}

function forbidden(): AppError {
  return new AppError({
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'You are not authorized to perform this action.',
  })
}

function classNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'CLASS_NOT_FOUND',
    message: 'Class not found.',
  })
}

function requireActiveCaller(caller: SafeUserProfile): void {
  if (caller.status !== 'ACTIVE') throw forbidden()
}

function canView(caller: SafeUserProfile, access: ClassAccessRecord): boolean {
  if (caller.role === 'ADMIN') return true
  if (caller.role === 'INSTRUCTOR') {
    return access.classRecord.instructorId === caller.id
  }
  return access.membership?.status === 'ACTIVE'
}

function requireOwnerOrAdmin(
  caller: SafeUserProfile,
  access: ClassAccessRecord,
): void {
  if (
    caller.role !== 'ADMIN' &&
    !(
      caller.role === 'INSTRUCTOR' &&
      access.classRecord.instructorId === caller.id
    )
  ) {
    throw classNotFound()
  }
}

function requireMutable(record: ClassRecord): void {
  if (record.status === 'ARCHIVED') {
    throw new AppError({
      statusCode: 409,
      code: 'CLASS_ARCHIVED',
      message: 'Archived classes are read-only.',
    })
  }
}

function joinCodeProjection(record: ClassRecord): JoinCodeProjection {
  return {
    classId: record.id,
    classCode: formatClassCode(record.classCode),
    active: record.classCodeActive,
    changedAt: record.classCodeChangedAt,
  }
}

export function createClassService(dependencies: {
  repository: ClassRepository
  logger: Logger
  now?: () => Date
  generateCode?: () => string
}): ClassService {
  const {
    repository,
    logger,
    now = () => new Date(),
    generateCode = generateClassCode,
  } = dependencies

  async function loadAccess(
    caller: SafeUserProfile,
    classId: string,
  ): Promise<ClassAccessRecord> {
    requireActiveCaller(caller)
    const access = await repository.findAccess(classId, caller.id)
    if (!access || !canView(caller, access)) throw classNotFound()
    return access
  }

  async function loadOwnerAccess(
    caller: SafeUserProfile,
    classId: string,
  ): Promise<ClassAccessRecord> {
    requireActiveCaller(caller)
    const access = await repository.findAccess(classId, caller.id)
    if (!access) throw classNotFound()
    requireOwnerOrAdmin(caller, access)
    return access
  }

  return {
    async create(caller, input) {
      requireActiveCaller(caller)
      if (caller.role !== 'INSTRUCTOR' && caller.role !== 'ADMIN') {
        throw forbidden()
      }
      if (caller.role === 'INSTRUCTOR' && input.instructorId) {
        throw new AppError({
          statusCode: 400,
          code: 'INSTRUCTOR_ID_NOT_ALLOWED',
          message: 'Instructors cannot assign class ownership.',
        })
      }
      if (caller.role === 'ADMIN' && !input.instructorId) {
        throw new AppError({
          statusCode: 400,
          code: 'INSTRUCTOR_ID_REQUIRED',
          message: 'An active instructor is required.',
        })
      }
      const instructorId =
        caller.role === 'INSTRUCTOR' ? caller.id : input.instructorId!

      for (let attempt = 0; attempt < CLASS_CODE_COLLISION_RETRIES; attempt += 1) {
        const result = await repository.create({
          instructorId,
          className: input.className,
          section: input.section,
          semester: input.semester,
          schoolYear: input.schoolYear,
          classCode: normalizeClassCode(generateCode()),
          now: now(),
        })
        if (result.kind === 'instructor_not_active') {
          throw new AppError({
            statusCode: 400,
            code: 'INSTRUCTOR_NOT_ACTIVE',
            message: 'The assigned instructor is not active.',
          })
        }
        if (result.kind === 'created') {
          logger.info(
            {
              event: 'class.created',
              actorId: caller.id,
              classId: result.classRecord.id,
              instructorId,
            },
            'class created',
          )
          return toClassProjection(result.classRecord)
        }
      }
      throw new AppError({
        statusCode: 503,
        code: 'CLASS_CODE_GENERATION_FAILED',
        message: 'A unique class code could not be generated.',
      })
    },
    async list(caller, query) {
      requireActiveCaller(caller)
      const result = await repository.list({
        callerId: caller.id,
        callerRole: caller.role,
        query,
      })
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        classes: result.classes.map(toClassProjection),
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
    async get(caller, classId) {
      const access = await loadAccess(caller, classId)
      return toClassProjection(access.classRecord)
    },
    async update(caller, classId, input) {
      const access = await loadOwnerAccess(caller, classId)
      requireMutable(access.classRecord)
      const classRecord = await repository.updateMetadata(classId, input)
      if (!classRecord) throw classNotFound()
      logger.info(
        { event: 'class.metadata_updated', actorId: caller.id, classId },
        'class metadata updated',
      )
      return toClassProjection(classRecord)
    },
    async archive(caller, classId) {
      await loadOwnerAccess(caller, classId)
      const result = await repository.archive(classId, now())
      if (result.kind === 'not_found') throw classNotFound()
      if (result.kind === 'unfinished_submission_work') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_HAS_UNFINISHED_SUBMISSION_WORK',
          message: 'The class cannot be archived while submission work remains unfinished.',
        })
      }
      if (result.kind === 'unfinished_project_work') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_HAS_UNFINISHED_PROJECT_WORK',
          message: 'The class cannot be archived while project collaboration work remains unfinished.',
        })
      }
      if (result.changed) {
        logger.info(
          { event: 'class.archived', actorId: caller.id, classId },
          'class archived',
        )
      }
      return toClassProjection(result.classRecord)
    },
    async restore(caller, classId) {
      await loadOwnerAccess(caller, classId)
      const result = await repository.restore(classId)
      if (result.kind === 'not_found') throw classNotFound()
      if (result.kind === 'unfinished_submission_work') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_HAS_UNFINISHED_SUBMISSION_WORK',
          message: 'The class cannot be restored while submission work remains unfinished.',
        })
      }
      if (result.kind === 'unfinished_project_work') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_HAS_UNFINISHED_PROJECT_WORK',
          message: 'The class cannot be restored while project collaboration work remains unfinished.',
        })
      }
      if (result.changed) {
        logger.info(
          { event: 'class.restored', actorId: caller.id, classId },
          'class restored',
        )
      }
      return toClassProjection(result.classRecord)
    },
    async getJoinCode(caller, classId) {
      const access = await loadOwnerAccess(caller, classId)
      return joinCodeProjection(access.classRecord)
    },
    async rotateJoinCode(caller, classId) {
      const access = await loadOwnerAccess(caller, classId)
      requireMutable(access.classRecord)
      for (let attempt = 0; attempt < CLASS_CODE_COLLISION_RETRIES; attempt += 1) {
        const nextCode = normalizeClassCode(generateCode())
        if (nextCode === access.classRecord.classCode) continue
        const result = await repository.rotateCode(
          classId,
          nextCode,
          now(),
        )
        if (result.kind === 'not_found') throw classNotFound()
        if (result.kind === 'updated') {
          logger.info(
            { event: 'class.join_code_rotated', actorId: caller.id, classId },
            'class join code rotated',
          )
          return joinCodeProjection(result.classRecord)
        }
      }
      throw new AppError({
        statusCode: 503,
        code: 'CLASS_CODE_GENERATION_FAILED',
        message: 'A unique class code could not be generated.',
      })
    },
    async revokeJoinCode(caller, classId) {
      const access = await loadOwnerAccess(caller, classId)
      requireMutable(access.classRecord)
      const classRecord = await repository.revokeCode(classId, now())
      if (!classRecord) throw classNotFound()
      logger.info(
        { event: 'class.join_code_revoked', actorId: caller.id, classId },
        'class join code revoked',
      )
      return joinCodeProjection(classRecord)
    },
  }
}
