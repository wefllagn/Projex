import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { normalizeClassCode } from '../classes/class-code.js'
import type { ClassRepository } from '../classes/class.repository.js'
import { toClassProjection, type ClassAccessRecord } from '../classes/class.types.js'
import type {
  ClassMemberRecord,
  ClassMemberRepository,
} from './class-member.repository.js'
import type {
  ClassRosterQuery,
  UpdateClassMemberInput,
} from './class-member.schemas.js'

export interface StudentRosterMember {
  userId: string
  fullName: string
}

export interface DetailedRosterMember extends StudentRosterMember {
  memberId: string
  email: string
  userStatus: ClassMemberRecord['student']['status']
  membershipStatus: ClassMemberRecord['status']
  joinedAt: Date
  removedAt: Date | null
  lastActivatedAt: Date
}

export interface ClassRosterResult {
  members: Array<StudentRosterMember | DetailedRosterMember>
  pagination: PaginationMeta
}

export interface ClassMemberService {
  join(
    caller: SafeUserProfile,
    classCode: string,
  ): Promise<{
    created: boolean
    membershipId: string
    status: 'ACTIVE'
    joinedAt: Date
    lastActivatedAt: Date
    class: ReturnType<typeof toClassProjection>
  }>
  list(
    caller: SafeUserProfile,
    classId: string,
    query: ClassRosterQuery,
  ): Promise<ClassRosterResult>
  update(
    caller: SafeUserProfile,
    classId: string,
    memberId: string,
    input: UpdateClassMemberInput,
    requestId?: string,
  ): Promise<DetailedRosterMember>
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

function isOwnerOrAdmin(
  caller: SafeUserProfile,
  access: ClassAccessRecord,
): boolean {
  return (
    caller.role === 'ADMIN' ||
    (caller.role === 'INSTRUCTOR' &&
      access.classRecord.instructorId === caller.id)
  )
}

function detailedProjection(member: ClassMemberRecord): DetailedRosterMember {
  return {
    memberId: member.id,
    userId: member.student.id,
    fullName: member.student.fullName,
    email: member.student.email,
    userStatus: member.student.status,
    membershipStatus: member.status,
    joinedAt: member.joinedAt,
    removedAt: member.removedAt,
    lastActivatedAt: member.lastActivatedAt,
  }
}

export function createClassMemberService(dependencies: {
  repository: ClassMemberRepository
  classRepository: ClassRepository
  logger: Logger
  now?: () => Date
}): ClassMemberService {
  const {
    repository,
    classRepository,
    logger,
    now = () => new Date(),
  } = dependencies

  return {
    async join(caller, classCode) {
      requireActiveCaller(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      const result = await repository.joinByCode({
        studentId: caller.id,
        classCode: normalizeClassCode(classCode),
        now: now(),
      })
      if (result.kind === 'invalid_code') {
        throw new AppError({
          statusCode: 400,
          code: 'CLASS_CODE_INVALID',
          message: 'The class code is invalid or unavailable.',
        })
      }
      if (result.kind === 'removed') {
        throw new AppError({
          statusCode: 403,
          code: 'CLASS_MEMBERSHIP_REMOVED',
          message: 'Removed membership requires instructor reactivation.',
        })
      }
      if (result.kind === 'pending') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_MEMBERSHIP_PENDING',
          message: 'Pending memberships cannot join by class code.',
        })
      }
      const created = result.kind === 'joined'
      if (created) {
        logger.info(
          {
            event: 'class.member_joined',
            actorId: caller.id,
            classId: result.classRecord.id,
            memberId: result.member.id,
          },
          'student joined class',
        )
      }
      return {
        created,
        membershipId: result.member.id,
        status: 'ACTIVE',
        joinedAt: result.member.joinedAt,
        lastActivatedAt: result.member.lastActivatedAt,
        class: toClassProjection(result.classRecord),
      }
    },
    async list(caller, classId, query) {
      requireActiveCaller(caller)
      const access = await classRepository.findAccess(classId, caller.id)
      if (!access) throw classNotFound()
      const detailed = isOwnerOrAdmin(caller, access)
      const studentAccess =
        caller.role === 'STUDENT' && access.membership?.status === 'ACTIVE'
      if (!detailed && !studentAccess) throw classNotFound()

      const result = await repository.list(classId, query, !detailed)
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        members: detailed
          ? result.members.map(detailedProjection)
          : result.members.map((member) => ({
                userId: member.student.id,
                fullName: member.student.fullName,
              })),
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
    async update(caller, classId, memberId, input, requestId) {
      requireActiveCaller(caller)
      const access = await classRepository.findAccess(classId, caller.id)
      if (!access || !isOwnerOrAdmin(caller, access)) throw classNotFound()
      if (access.classRecord.status === 'ARCHIVED') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_ARCHIVED',
          message: 'Archived classes are read-only.',
        })
      }
      if (caller.role === 'ADMIN' && !input.reason) {
        throw new AppError({
          statusCode: 422,
          code: 'ADMIN_REASON_REQUIRED',
          message: 'A reason is required for this administrative action.',
        })
      }
      if (caller.role === 'ADMIN' && !input.expectedUpdatedAt) {
        throw new AppError({
          statusCode: 422,
          code: 'ADMIN_EXPECTED_VERSION_REQUIRED',
          message: 'The current membership version is required.',
        })
      }
      if (caller.role === 'ADMIN' && !requestId) {
        throw new Error('Administrative request ID is required.')
      }
      const result = await repository.transition({
        classId,
        memberId,
        status: input.status,
        now: now(),
        expectedUpdatedAt: input.expectedUpdatedAt,
        adminAudit:
          caller.role === 'ADMIN'
            ? {
                actorAdminId: caller.id,
                requestId: requestId!,
                reason: input.reason!,
              }
            : undefined,
      })
      if (result.kind === 'not_found') {
        throw new AppError({
          statusCode: 404,
          code: 'CLASS_MEMBER_NOT_FOUND',
          message: 'Class member not found.',
        })
      }
      if (result.kind === 'class_archived') {
        throw new AppError({
          statusCode: 409,
          code: 'CLASS_ARCHIVED',
          message: 'Archived classes are read-only.',
        })
      }
      if (result.kind === 'invalid_transition') {
        throw new AppError({
          statusCode: 409,
          code: 'INVALID_MEMBERSHIP_TRANSITION',
          message: 'The membership status transition is not allowed.',
        })
      }
      if (result.kind === 'stale') {
        throw new AppError({
          statusCode: 409,
          code: 'STALE_CLASS_MEMBER_VERSION',
          message: 'The class membership changed. Reload it before trying again.',
        })
      }
      if (result.changed) {
        logger.info(
          {
            event:
              input.status === 'REMOVED'
                ? 'class.member_removed'
                : 'class.member_reactivated',
            actorId: caller.id,
            classId,
            memberId,
            studentId: result.member.studentId,
          },
          input.status === 'REMOVED'
            ? 'class member removed'
            : 'class member reactivated',
        )
      }
      return detailedProjection(result.member)
    },
  }
}
