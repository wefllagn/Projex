import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ClassRepository } from '../classes/class.repository.js'
import { toClassProjection } from '../classes/class.types.js'
import type {
  ClassInvitationRepository,
  InstructorClassInvitationProjection,
  StudentClassInvitationProjection,
} from './class-invitation.repository.js'
import type {
  ClassInvitationListQuery,
  ClassInvitationLookupInput,
  CreateClassInvitationInput,
} from './class-invitation.schemas.js'

export interface ClassInvitationList<T> {
  invitations: T[]
  pagination: PaginationMeta
}

export interface ClassInvitationService {
  lookup(
    caller: SafeUserProfile,
    input: ClassInvitationLookupInput,
  ): Promise<{
    eligibility: 'ELIGIBLE' | 'NOT_FOUND' | 'ALREADY_MEMBER' | 'ALREADY_PENDING'
    student?: { fullName: string; universityEmail: string }
    willReactivate?: boolean
  }>
  create(
    caller: SafeUserProfile,
    classId: string,
    input: CreateClassInvitationInput,
  ): Promise<InstructorClassInvitationProjection>
  listForClass(
    caller: SafeUserProfile,
    classId: string,
    query: ClassInvitationListQuery,
  ): Promise<ClassInvitationList<InstructorClassInvitationProjection>>
  listForStudent(
    caller: SafeUserProfile,
    query: ClassInvitationListQuery,
  ): Promise<ClassInvitationList<StudentClassInvitationProjection>>
  accept(
    caller: SafeUserProfile,
    invitationId: string,
  ): Promise<{
    invitation: StudentClassInvitationProjection
    membership: {
      membershipId: string
      status: 'ACTIVE'
      joinedAt: Date
      lastActivatedAt: Date
    }
    class: ReturnType<typeof toClassProjection>
  }>
  decline(
    caller: SafeUserProfile,
    invitationId: string,
  ): Promise<StudentClassInvitationProjection>
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

function invitationNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    code: 'CLASS_INVITATION_NOT_FOUND',
    message: 'Class invitation not found.',
  })
}

function pagination(totalItems: number, query: ClassInvitationListQuery): PaginationMeta {
  const totalPages = Math.ceil(totalItems / query.pageSize)
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  }
}

export function createClassInvitationService(dependencies: {
  repository: ClassInvitationRepository
  classRepository: ClassRepository
  logger: Logger
  now?: () => Date
}): ClassInvitationService {
  const {
    repository,
    classRepository,
    logger,
    now = () => new Date(),
  } = dependencies

  function requireActiveRole(caller: SafeUserProfile, role: 'INSTRUCTOR' | 'STUDENT') {
    if (caller.status !== 'ACTIVE' || caller.role !== role) throw forbidden()
  }

  async function requireOwnedActiveClass(
    caller: SafeUserProfile,
    classId: string,
  ) {
    requireActiveRole(caller, 'INSTRUCTOR')
    const access = await classRepository.findAccess(classId, caller.id)
    if (!access || access.classRecord.instructorId !== caller.id) {
      throw classNotFound()
    }
    if (access.classRecord.status !== 'ACTIVE') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_ARCHIVED',
        message: 'Archived classes are read-only.',
      })
    }
  }

  function mapCreationFailure(kind: Exclude<
    Awaited<ReturnType<ClassInvitationRepository['create']>>['kind'],
    'created'
  >): never {
    if (kind === 'not_found') throw classNotFound()
    if (kind === 'class_archived') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_ARCHIVED',
        message: 'Archived classes are read-only.',
      })
    }
    if (kind === 'target_not_found') {
      throw new AppError({
        statusCode: 404,
        code: 'REGISTERED_ACTIVE_STUDENT_NOT_FOUND',
        message: 'No eligible registered student was found for that university email.',
      })
    }
    if (kind === 'already_member') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_MEMBER_ALREADY_ACTIVE',
        message: 'The student is already an active class member.',
      })
    }
    if (kind === 'already_pending') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_INVITATION_ALREADY_PENDING',
        message: 'A pending invitation already exists for this student and class.',
      })
    }
    throw new AppError({
      statusCode: 409,
      code: 'CLASS_MEMBERSHIP_PENDING',
      message: 'The student already has a pending membership record.',
    })
  }

  function mapResponseFailure(
    kind: 'not_found' | 'class_archived' | 'student_inactive' | 'resolved' | 'membership_pending',
  ): never {
    if (kind === 'not_found') throw invitationNotFound()
    if (kind === 'class_archived') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_ARCHIVED',
        message: 'Archived class invitations are not actionable.',
      })
    }
    if (kind === 'student_inactive') throw forbidden()
    if (kind === 'membership_pending') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_MEMBERSHIP_PENDING',
        message: 'The pending membership state must be resolved first.',
      })
    }
    throw new AppError({
      statusCode: 409,
      code: 'CLASS_INVITATION_ALREADY_RESOLVED',
      message: 'The class invitation has already been resolved.',
    })
  }

  return {
    async lookup(caller, input) {
      requireActiveRole(caller, 'INSTRUCTOR')
      if (input.classId) await requireOwnedActiveClass(caller, input.classId)
      const result = await repository.lookup(input)
      if (result.kind === 'not_found') return { eligibility: 'NOT_FOUND' }
      return {
        eligibility:
          result.kind === 'eligible'
            ? 'ELIGIBLE'
            : result.kind === 'already_member'
              ? 'ALREADY_MEMBER'
              : 'ALREADY_PENDING',
        student: result.student,
        willReactivate: result.willReactivate,
      }
    },
    async create(caller, classId, input) {
      await requireOwnedActiveClass(caller, classId)
      const result = await repository.create({
        classId,
        invitedById: caller.id,
        universityEmail: input.universityEmail,
        now: now(),
      })
      if (result.kind !== 'created') mapCreationFailure(result.kind)
      logger.info(
        {
          event: 'class.invitation_created',
          actorId: caller.id,
          classId,
          invitationId: result.invitation.invitationId,
        },
        'class invitation created',
      )
      return result.invitation
    },
    async listForClass(caller, classId, query) {
      await requireOwnedActiveClass(caller, classId)
      const result = await repository.listForClass({ classId, query })
      return {
        invitations: result.invitations,
        pagination: pagination(result.totalItems, query),
      }
    },
    async listForStudent(caller, query) {
      requireActiveRole(caller, 'STUDENT')
      const result = await repository.listForStudent({
        studentId: caller.id,
        query,
      })
      return {
        invitations: result.invitations,
        pagination: pagination(result.totalItems, query),
      }
    },
    async accept(caller, invitationId) {
      requireActiveRole(caller, 'STUDENT')
      const result = await repository.accept({
        invitationId,
        studentId: caller.id,
        now: now(),
      })
      if (result.kind !== 'accepted') mapResponseFailure(result.kind)
      if (result.changed) {
        logger.info(
          {
            event: 'class.invitation_accepted',
            actorId: caller.id,
            classId: result.classRecord.id,
            invitationId,
            memberId: result.membership.id,
          },
          'class invitation accepted',
        )
      }
      return {
        invitation: result.invitation,
        membership: {
          membershipId: result.membership.id,
          status: 'ACTIVE',
          joinedAt: result.membership.joinedAt,
          lastActivatedAt: result.membership.lastActivatedAt,
        },
        class: toClassProjection(result.classRecord),
      }
    },
    async decline(caller, invitationId) {
      requireActiveRole(caller, 'STUDENT')
      const result = await repository.decline({
        invitationId,
        studentId: caller.id,
        now: now(),
      })
      if (result.kind !== 'declined') mapResponseFailure(result.kind)
      if (result.changed) {
        logger.info(
          {
            event: 'class.invitation_declined',
            actorId: caller.id,
            classId: result.invitation.class.classId,
            invitationId,
          },
          'class invitation declined',
        )
      }
      return result.invitation
    },
  }
}
