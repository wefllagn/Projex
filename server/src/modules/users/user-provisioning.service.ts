import type { Logger } from 'pino'
import type { EmailClient } from '../../infrastructure/email/email.types.js'
import { createAccountSetupEmail } from '../../infrastructure/email/account-setup-email.js'
import { AppError } from '../../shared/errors/app-error.js'
import { SETUP_RESEND_COOLDOWN_MS } from '../auth/auth.constants.js'
import type { TokenService } from '../auth/auth.tokens.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { UpdateUserStatusInput } from './user-provisioning.schemas.js'
import type {
  ProvisionInstructorInput,
  ProvisionStudentInput,
} from './user-provisioning.schemas.js'
import type { UserProvisioningRepository } from './user-provisioning.repository.js'

export interface UserProvisioningService {
  provisionStudent(
    caller: SafeUserProfile,
    input: ProvisionStudentInput,
    requestId?: string,
  ): Promise<SafeUserProfile>
  provisionInstructor(
    caller: SafeUserProfile,
    input: ProvisionInstructorInput,
    requestId?: string,
  ): Promise<SafeUserProfile>
  resendSetup(caller: SafeUserProfile, userId: string, requestId?: string): Promise<void>
  updateStatus(
    caller: SafeUserProfile,
    userId: string,
    input: UpdateUserStatusInput,
    requestId?: string,
  ): Promise<SafeUserProfile>
}

export function createUserProvisioningService(dependencies: {
  repository: UserProvisioningRepository
  tokenService: TokenService
  emailClient: EmailClient
  logger: Logger
  frontendOrigin: string
  setupTokenTtlHours: number
  now?: () => Date
}): UserProvisioningService {
  const {
    repository,
    tokenService,
    emailClient,
    logger,
    frontendOrigin,
    setupTokenTtlHours,
    now = () => new Date(),
  } = dependencies

  function requireAdminRequestId(
    caller: SafeUserProfile,
    requestId: string | undefined,
  ): void {
    if (caller.role === 'ADMIN' && !requestId) {
      throw new Error('Administrative request ID is required.')
    }
  }

  function requireActiveCaller(caller: SafeUserProfile): void {
    if (caller.status !== 'ACTIVE') {
      throw new AppError({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Not authorized.',
      })
    }
  }

  function createToken() {
    const rawToken = tokenService.createOpaqueToken()
    const createdAt = now()
    return {
      rawToken,
      record: {
        tokenHash: tokenService.hashOpaqueToken(rawToken),
        createdAt,
        expiresAt: new Date(
          createdAt.getTime() + setupTokenTtlHours * 60 * 60 * 1000,
        ),
      },
    }
  }

  async function sendSetupEmail(
    user: SafeUserProfile,
    rawToken: string,
  ): Promise<void> {
    const setupUrl = `${frontendOrigin.replace(/\/$/, '')}/account-setup#token=${encodeURIComponent(rawToken)}`
    try {
      await emailClient.send(
        createAccountSetupEmail({
          recipientName: user.fullName,
          accountEmail: user.email,
          setupUrl,
          expiresInHours: setupTokenTtlHours,
        }),
      )
    } catch (cause) {
      throw new AppError({
        statusCode: 503,
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'The account was created, but the setup email could not be delivered.',
        cause,
      })
    }
  }

  function duplicateOrClassError(kind: string): never {
    if (kind === 'duplicate_email') {
      throw new AppError({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with that email already exists.',
      })
    }
    if (kind === 'class_not_found') {
      throw new AppError({
        statusCode: 404,
        code: 'CLASS_NOT_FOUND',
        message: 'Class not found.',
      })
    }
    if (kind === 'class_archived') {
      throw new AppError({
        statusCode: 409,
        code: 'CLASS_ARCHIVED',
        message: 'Archived classes are read-only.',
      })
    }
    throw new AppError({
      statusCode: 403,
      code: 'CLASS_OWNERSHIP_REQUIRED',
      message: 'The instructor does not own that class.',
    })
  }

  return {
    async provisionStudent(caller, input, requestId) {
      requireActiveCaller(caller)
      if (caller.role !== 'INSTRUCTOR' && caller.role !== 'ADMIN') {
        throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      }
      requireAdminRequestId(caller, requestId)
      if (caller.role === 'INSTRUCTOR' && !input.classId) {
        throw new AppError({
          statusCode: 400,
          code: 'CLASS_ID_REQUIRED',
          message: 'Instructors must provide a classId.',
        })
      }
      const token = createToken()
      const result = await repository.createStudent({
        callerId: caller.id,
        callerRole: caller.role,
        fullName: input.fullName,
        email: input.universityEmail,
        classId: input.classId,
        token: token.record,
        adminAudit:
          caller.role === 'ADMIN'
            ? { actorAdminId: caller.id, requestId: requestId! }
            : undefined,
      })
      if (result.kind !== 'created') duplicateOrClassError(result.kind)
      await sendSetupEmail(result.user, token.rawToken)
      logger.info(
        { event: 'user.student.provisioned', userId: result.user.id, actorId: caller.id },
        'student provisioned',
      )
      return result.user
    },
    async provisionInstructor(caller, input, requestId) {
      requireActiveCaller(caller)
      if (caller.role !== 'ADMIN') {
        throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      }
      requireAdminRequestId(caller, requestId)
      const token = createToken()
      const result = await repository.createInstructor({
        fullName: input.fullName,
        email: input.universityEmail,
        token: token.record,
        adminAudit: { actorAdminId: caller.id, requestId: requestId! },
      })
      if (result.kind !== 'created') duplicateOrClassError(result.kind)
      await sendSetupEmail(result.user, token.rawToken)
      logger.info(
        { event: 'user.instructor.provisioned', userId: result.user.id, actorId: caller.id },
        'instructor provisioned',
      )
      return result.user
    },
    async resendSetup(caller, userId, requestId) {
      requireActiveCaller(caller)
      if (caller.role !== 'INSTRUCTOR' && caller.role !== 'ADMIN') {
        throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      }
      requireAdminRequestId(caller, requestId)
      const token = createToken()
      const result = await repository.replaceSetupToken({
        callerId: caller.id,
        callerRole: caller.role,
        userId,
        token: token.record,
        cooldownCutoff: new Date(token.record.createdAt.getTime() - SETUP_RESEND_COOLDOWN_MS),
        adminAudit:
          caller.role === 'ADMIN'
            ? { actorAdminId: caller.id, requestId: requestId! }
            : undefined,
      })
      if (result.kind === 'cooldown') {
        throw new AppError({
          statusCode: 429,
          code: 'SETUP_RESEND_COOLDOWN',
          message: 'A setup link was sent recently. Try again later.',
        })
      }
      if (result.kind === 'not_pending') {
        throw new AppError({
          statusCode: 409,
          code: 'ACCOUNT_NOT_SETUP_PENDING',
          message: 'The account is not pending setup.',
        })
      }
      if (result.kind === 'not_found') {
        throw new AppError({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' })
      }
      if (result.kind === 'forbidden') {
        throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      }
      await sendSetupEmail(result.user, token.rawToken)
      logger.info(
        { event: 'auth.setup.resent', userId: result.user.id, actorId: caller.id },
        'setup link resent',
      )
    },
    async updateStatus(caller, userId, input, requestId) {
      requireActiveCaller(caller)
      if (caller.role !== 'ADMIN') {
        throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized.' })
      }
      requireAdminRequestId(caller, requestId)
      if (caller.id === userId && input.status !== 'ACTIVE') {
        throw new AppError({
          statusCode: 409,
          code: 'ADMIN_SELF_DISABLE_FORBIDDEN',
          message: 'Administrators cannot disable their own account.',
        })
      }
      const result = await repository.updateStatus({
        userId,
        status: input.status,
        expectedUpdatedAt: input.expectedUpdatedAt,
        changedAt: now(),
        adminAudit: {
          actorAdminId: caller.id,
          requestId: requestId!,
          reason: input.reason,
        },
      })
      if (result.kind === 'not_found') {
        throw new AppError({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' })
      }
      if (result.kind === 'invalid_transition') {
        throw new AppError({
          statusCode: 409,
          code: 'INVALID_STATUS_TRANSITION',
          message: 'The requested account status transition is not allowed.',
        })
      }
      if (result.kind === 'stale') {
        throw new AppError({
          statusCode: 409,
          code: 'STALE_USER_VERSION',
          message: 'The user account changed. Reload it before trying again.',
        })
      }
      if (result.kind === 'last_active_admin') {
        throw new AppError({
          statusCode: 409,
          code: 'LAST_ACTIVE_ADMIN_REQUIRED',
          message: 'At least one active administrator must remain.',
        })
      }
      logger.info(
        {
          event: 'user.status.changed',
          userId: result.user.id,
          actorId: caller.id,
          status: input.status,
          changed: result.changed,
        },
        'user status changed',
      )
      return result.user
    },
  }
}
