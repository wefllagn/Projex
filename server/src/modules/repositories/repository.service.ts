import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type {
  CollaborationFailure,
  FeedbackWriteResult,
  InvitationWriteResult,
  MemberWriteResult,
  RepositoryRepository,
  RepositoryWriteResult,
} from './repository.repository.js'
import type {
  ApproveRepositoryInput,
  CreateClassProjectRepositoryInput,
  CreateFeedbackDraftInput,
  CreateInvitationInput,
  CreatePersonalRepositoryInput,
  InvitationActionInput,
  MemberTransitionInput,
  RepositoryListQuery,
  RepositoryTransitionInput,
  RequestChangesInput,
  UpdateFeedbackDraftInput,
  UpdateRepositoryInput,
} from './repository.schemas.js'
import {
  toRepositoryProjection,
  type RepositoryAccessRecord,
  type RepositoryFeedbackProjection,
  type RepositoryInvitationProjection,
  type RepositoryMemberProjection,
  type RepositoryProjection,
} from './repository.types.js'

export interface RepositoryListResult {
  repositories: RepositoryProjection[]
  pagination: PaginationMeta
}

export type AdminRepositoryFeedbackProjection = Omit<
  RepositoryFeedbackProjection,
  'feedbackText'
>

export interface RepositoryService {
  createClassProject(caller: SafeUserProfile, projectTaskId: string, input: CreateClassProjectRepositoryInput): Promise<RepositoryProjection>
  createPersonal(caller: SafeUserProfile, input: CreatePersonalRepositoryInput): Promise<RepositoryProjection>
  list(caller: SafeUserProfile, query: RepositoryListQuery): Promise<RepositoryListResult>
  get(caller: SafeUserProfile, repositoryId: string): Promise<RepositoryProjection>
  update(caller: SafeUserProfile, repositoryId: string, input: UpdateRepositoryInput): Promise<RepositoryProjection>
  readyForReview(caller: SafeUserProfile, repositoryId: string, input: RepositoryTransitionInput): Promise<RepositoryProjection>
  requestChanges(caller: SafeUserProfile, repositoryId: string, input: RequestChangesInput): Promise<RepositoryProjection>
  approve(caller: SafeUserProfile, repositoryId: string, input: ApproveRepositoryInput): Promise<RepositoryProjection>
  archive(caller: SafeUserProfile, repositoryId: string, input: RepositoryTransitionInput): Promise<RepositoryProjection>
  restore(caller: SafeUserProfile, repositoryId: string, input: RepositoryTransitionInput): Promise<RepositoryProjection>
  listMembers(caller: SafeUserProfile, repositoryId: string): Promise<RepositoryMemberProjection[]>
  transitionMember(caller: SafeUserProfile, repositoryId: string, memberId: string, input: MemberTransitionInput): Promise<RepositoryMemberProjection>
  createInvitation(caller: SafeUserProfile, repositoryId: string, input: CreateInvitationInput): Promise<RepositoryInvitationProjection>
  listRepositoryInvitations(caller: SafeUserProfile, repositoryId: string): Promise<RepositoryInvitationProjection[]>
  listReceivedInvitations(caller: SafeUserProfile): Promise<RepositoryInvitationProjection[]>
  acceptInvitation(caller: SafeUserProfile, invitationId: string): Promise<RepositoryInvitationProjection>
  declineInvitation(caller: SafeUserProfile, invitationId: string): Promise<RepositoryInvitationProjection>
  revokeInvitation(caller: SafeUserProfile, invitationId: string, input: InvitationActionInput): Promise<RepositoryInvitationProjection>
  createFeedbackDraft(caller: SafeUserProfile, repositoryId: string, input: CreateFeedbackDraftInput): Promise<RepositoryFeedbackProjection>
  updateFeedbackDraft(caller: SafeUserProfile, feedbackId: string, input: UpdateFeedbackDraftInput): Promise<RepositoryFeedbackProjection>
  listFeedback(
    caller: SafeUserProfile,
    repositoryId: string,
  ): Promise<Array<RepositoryFeedbackProjection | AdminRepositoryFeedbackProjection>>
}

function notFound(): AppError {
  return new AppError({ statusCode: 404, code: 'REPOSITORY_NOT_FOUND', message: 'Repository not found.' })
}

function invitationNotFound(): AppError {
  return new AppError({ statusCode: 404, code: 'REPOSITORY_INVITATION_NOT_FOUND', message: 'Repository invitation not found.' })
}

function feedbackNotFound(): AppError {
  return new AppError({ statusCode: 404, code: 'REPOSITORY_FEEDBACK_NOT_FOUND', message: 'Repository feedback not found.' })
}

function forbidden(): AppError {
  return new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'You are not authorized to perform this action.' })
}

function requireActive(caller: SafeUserProfile): void {
  if (caller.status !== 'ACTIVE') throw forbidden()
}

function instructorOwns(access: RepositoryAccessRecord, caller: SafeUserProfile): boolean {
  return caller.role === 'INSTRUCTOR' && access.repository.projectTask?.class.instructorId === caller.id
}

function isOwner(access: RepositoryAccessRecord, caller: SafeUserProfile): boolean {
  return access.repository.ownerId === caller.id && access.repositoryMembership?.status === 'ACTIVE'
}

function canView(access: RepositoryAccessRecord, caller: SafeUserProfile): boolean {
  if (caller.role === 'ADMIN' || instructorOwns(access, caller) || isOwner(access, caller)) return true
  if (access.repositoryMembership?.status === 'REMOVED') return false
  if (access.repository.repositoryType === 'PERSONAL') {
    return access.repositoryMembership?.status === 'ACTIVE'
  }
  return access.classMembership?.status === 'ACTIVE' && access.repository.visibility === 'CLASS_ONLY'
}

function isCutoff(access: RepositoryAccessRecord, now: Date): boolean {
  const task = access.repository.projectTask
  return Boolean(!task || task.status !== 'PUBLISHED' || task.dueDate.getTime() <= now.getTime())
}

function mapFailure(result: CollaborationFailure, resource: 'repository' | 'invitation' | 'feedback' = 'repository'): never {
  if (result.kind === 'not_found') {
    if (resource === 'invitation') throw invitationNotFound()
    if (resource === 'feedback') throw feedbackNotFound()
    throw notFound()
  }
  const errors: Record<Exclude<CollaborationFailure['kind'], 'not_found'>, AppError> = {
    class_archived: new AppError({ statusCode: 409, code: 'CLASS_ARCHIVED', message: 'Archived classes are read-only.' }),
    task_not_open: new AppError({ statusCode: 409, code: 'PROJECT_TASK_NOT_OPEN', message: 'The project task is not accepting this action.' }),
    deadline_passed: new AppError({ statusCode: 409, code: 'PROJECT_TASK_DEADLINE_PASSED', message: 'The project-task deadline has passed.' }),
    stale: new AppError({ statusCode: 409, code: 'STALE_REPOSITORY_VERSION', message: 'The record changed. Reload it before trying again.' }),
    conflict: new AppError({ statusCode: 409, code: 'REPOSITORY_CONFLICT', message: 'The repository, team, or invitation conflicts with an existing record.' }),
    student_ineligible: new AppError({ statusCode: 409, code: 'COLLABORATOR_NOT_ELIGIBLE', message: 'The selected student is not eligible for this project team.' }),
    different_team: new AppError({ statusCode: 409, code: 'STUDENT_ALREADY_ASSIGNED_TO_TEAM', message: 'The student already belongs to a team for this project task.' }),
    capacity_reached: new AppError({ statusCode: 409, code: 'TEAM_CAPACITY_REACHED', message: 'The project team has reached its member and pending-invitation limit.' }),
    already_member: new AppError({ statusCode: 409, code: 'REPOSITORY_MEMBER_ALREADY_ACTIVE', message: 'The student is already an active team member.' }),
    member_removed: new AppError({ statusCode: 409, code: 'REPOSITORY_MEMBER_REMOVED', message: 'The removed membership requires explicit reactivation.' }),
    owner_immutable: new AppError({ statusCode: 409, code: 'REPOSITORY_OWNER_IMMUTABLE', message: 'Repository ownership transfer is not available in Phase 7.' }),
    invalid_state: new AppError({ statusCode: 409, code: 'INVALID_REPOSITORY_TRANSITION', message: 'The repository action is not valid in its current state.' }),
    feedback_required: new AppError({ statusCode: 422, code: 'REVIEW_FEEDBACK_REQUIRED', message: 'A current non-empty feedback draft is required.' }),
    invitation_expired: new AppError({ statusCode: 409, code: 'REPOSITORY_INVITATION_EXPIRED', message: 'The repository invitation has expired.' }),
    invitation_resolved: new AppError({ statusCode: 409, code: 'REPOSITORY_INVITATION_RESOLVED', message: 'The repository invitation has already been resolved.' }),
    archive_blocked: new AppError({ statusCode: 409, code: 'REPOSITORY_ARCHIVE_BLOCKED', message: 'The repository cannot be archived until review and invitation blockers are resolved.' }),
    reason_required: new AppError({ statusCode: 422, code: 'CORRECTIVE_REASON_REQUIRED', message: 'A reason is required for this corrective action.' }),
  }
  throw errors[result.kind]
}

function unwrapRepository(result: RepositoryWriteResult): RepositoryProjection {
  if (result.kind !== 'ok') mapFailure(result)
  return toRepositoryProjection(result.repository)
}

function unwrapInvitation(result: InvitationWriteResult): RepositoryInvitationProjection {
  if (result.kind !== 'ok') mapFailure(result, 'invitation')
  return result.invitation
}

function unwrapMember(result: MemberWriteResult): RepositoryMemberProjection {
  if (result.kind !== 'ok') mapFailure(result)
  return result.member
}

function unwrapFeedback(result: FeedbackWriteResult): RepositoryFeedbackProjection {
  if (result.kind !== 'ok') mapFailure(result, 'feedback')
  return result.feedback
}

export function createRepositoryService(dependencies: {
  repository: RepositoryRepository
  logger: Logger
  now?: () => Date
  provisioningEnabled?: boolean
}): RepositoryService {
  const { repository, logger } = dependencies
  const now = dependencies.now ?? (() => new Date())

  function requireProvisioning(): void {
    if (dependencies.provisioningEnabled === false) {
      throw new AppError({
        statusCode: 503,
        code: 'REPOSITORY_PROVISIONING_UNAVAILABLE',
        message: 'Repository provisioning is unavailable in this environment.',
      })
    }
  }

  async function loadAccess(caller: SafeUserProfile, repositoryId: string): Promise<RepositoryAccessRecord> {
    requireActive(caller)
    const access = await repository.findAccess(repositoryId, caller.id)
    if (!access || !canView(access, caller)) throw notFound()
    return access
  }

  async function requireInstructor(caller: SafeUserProfile, repositoryId: string): Promise<RepositoryAccessRecord> {
    const access = await loadAccess(caller, repositoryId)
    if (!instructorOwns(access, caller)) throw notFound()
    return access
  }

  return {
    async createClassProject(caller, projectTaskId, input) {
      requireActive(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      requireProvisioning()
      const result = await repository.createClassProject({ projectTaskId, ownerId: caller.id, repository: input, now: now() })
      const projection = unwrapRepository(result)
      logger.info({ event: 'repository.class_project_created', actorId: caller.id, repositoryId: projection.id, teamId: projection.teamId, projectTaskId }, 'class project repository and team created')
      return projection
    },
    async createPersonal(caller, input) {
      requireActive(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      requireProvisioning()
      const projection = unwrapRepository(await repository.createPersonal({ ownerId: caller.id, repository: input, now: now() }))
      logger.info({ event: 'repository.personal_created', actorId: caller.id, repositoryId: projection.id }, 'personal repository created')
      return projection
    },
    async list(caller, query) {
      requireActive(caller)
      const result = await repository.list({ callerId: caller.id, callerRole: caller.role, query })
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        repositories: result.repositories.map(toRepositoryProjection),
        pagination: {
          page: query.page, pageSize: query.pageSize, totalItems: result.totalItems, totalPages,
          hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1,
        },
      }
    },
    async get(caller, repositoryId) {
      const access = await loadAccess(caller, repositoryId)
      return toRepositoryProjection(access.repository)
    },
    async update(caller, repositoryId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (!isOwner(access, caller)) throw notFound()
      const { expectedUpdatedAt, ...fields } = input
      const projection = unwrapRepository(await repository.updateMetadata({ repositoryId, expectedUpdatedAt, ...fields, now: now() }))
      logger.info({ event: 'repository.metadata_updated', actorId: caller.id, repositoryId }, 'repository metadata updated')
      return projection
    },
    async readyForReview(caller, repositoryId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (!isOwner(access, caller)) throw notFound()
      const projection = unwrapRepository(await repository.readyForReview({ repositoryId, expectedUpdatedAt: input.expectedUpdatedAt, now: now() }))
      logger.info({ event: 'repository.ready_for_review', actorId: caller.id, repositoryId }, 'repository submitted for review')
      return projection
    },
    async requestChanges(caller, repositoryId, input) {
      await requireInstructor(caller, repositoryId)
      const projection = unwrapRepository(await repository.requestChanges({ repositoryId, instructorId: caller.id, review: input, now: now() }))
      logger.info({ event: 'repository.changes_requested', actorId: caller.id, repositoryId }, 'repository changes requested with released feedback')
      logger.info({ event: 'repository.feedback_released', actorId: caller.id, repositoryId, feedbackId: input.feedbackId }, 'repository feedback released')
      return projection
    },
    async approve(caller, repositoryId, input) {
      await requireInstructor(caller, repositoryId)
      const projection = unwrapRepository(await repository.approve({ repositoryId, instructorId: caller.id, review: input, now: now() }))
      logger.info({ event: 'repository.approved', actorId: caller.id, repositoryId }, 'repository approved')
      if (input.feedbackId) {
        logger.info({ event: 'repository.feedback_released', actorId: caller.id, repositoryId, feedbackId: input.feedbackId }, 'repository feedback released')
      }
      return projection
    },
    async archive(caller, repositoryId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (access.repository.repositoryType === 'CLASS_PROJECT') {
        if (!instructorOwns(access, caller)) throw notFound()
      } else if (!isOwner(access, caller)) throw notFound()
      const projection = unwrapRepository(await repository.archive({ repositoryId, expectedUpdatedAt: input.expectedUpdatedAt, now: now() }))
      logger.info({ event: 'repository.archived', actorId: caller.id, repositoryId }, 'repository archived')
      return projection
    },
    async restore(caller, repositoryId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (access.repository.repositoryType === 'CLASS_PROJECT') {
        if (!instructorOwns(access, caller)) throw notFound()
      } else if (!isOwner(access, caller)) throw notFound()
      const projection = unwrapRepository(await repository.restore({ repositoryId, expectedUpdatedAt: input.expectedUpdatedAt, now: now() }))
      logger.info({ event: 'repository.restored', actorId: caller.id, repositoryId }, 'repository restored')
      return projection
    },
    async listMembers(caller, repositoryId) {
      const access = await loadAccess(caller, repositoryId)
      const projection =
        caller.role === 'ADMIN' || instructorOwns(access, caller)
          ? 'detailed'
          : isOwner(access, caller)
            ? 'owner'
            : 'student'
      return repository.listMembers(repositoryId, projection)
    },
    async transitionMember(caller, repositoryId, memberId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (access.repository.repositoryType !== 'CLASS_PROJECT') throw notFound()
      const currentTime = now()
      const cutoff = isCutoff(access, currentTime)
      if (cutoff) {
        if (!instructorOwns(access, caller)) throw notFound()
        if (!input.reason?.trim()) mapFailure({ kind: 'reason_required' })
      } else if (!isOwner(access, caller)) {
        throw notFound()
      }
      const member = unwrapMember(await repository.transitionMember({ repositoryId, memberId, mutation: input, now: currentTime }))
      logger.info({
        event: input.action === 'REMOVE' ? 'repository.member_removed' : 'repository.member_reactivated',
        actorId: caller.id,
        repositoryId,
        memberId,
        corrective: cutoff,
        hasReason: cutoff ? Boolean(input.reason) : undefined,
      }, 'repository and team membership changed')
      if (!isOwner(access, caller)) return member
      return {
        memberId: member.memberId,
        userId: member.userId,
        fullName: member.fullName,
        memberRole: member.memberRole,
        teamRole: member.teamRole,
        membershipStatus: member.membershipStatus,
        updatedAt: member.updatedAt,
      }
    },
    async createInvitation(caller, repositoryId, input) {
      const access = await loadAccess(caller, repositoryId)
      if (!isOwner(access, caller) || access.repository.repositoryType !== 'CLASS_PROJECT') throw notFound()
      const invitation = unwrapInvitation(await repository.createInvitation({ repositoryId, invitedById: caller.id, invitation: input, now: now() }))
      logger.info({ event: 'repository.invitation_created', actorId: caller.id, repositoryId, invitationId: invitation.invitationId, inviteeId: invitation.invitee.userId }, 'repository invitation created')
      return invitation
    },
    async listRepositoryInvitations(caller, repositoryId) {
      const access = await loadAccess(caller, repositoryId)
      if (!(isOwner(access, caller) || instructorOwns(access, caller) || caller.role === 'ADMIN')) throw notFound()
      return repository.listRepositoryInvitations(repositoryId, now())
    },
    async listReceivedInvitations(caller) {
      requireActive(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      return repository.listReceivedInvitations(caller.id, now())
    },
    async acceptInvitation(caller, invitationId) {
      requireActive(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      const invitation = unwrapInvitation(await repository.acceptInvitation({ invitationId, inviteeId: caller.id, now: now() }))
      logger.info({ event: 'repository.invitation_accepted', actorId: caller.id, repositoryId: invitation.repositoryId, invitationId }, 'repository invitation accepted')
      return invitation
    },
    async declineInvitation(caller, invitationId) {
      requireActive(caller)
      if (caller.role !== 'STUDENT') throw forbidden()
      const invitation = unwrapInvitation(await repository.declineInvitation({ invitationId, inviteeId: caller.id, now: now() }))
      logger.info({ event: 'repository.invitation_declined', actorId: caller.id, repositoryId: invitation.repositoryId, invitationId }, 'repository invitation declined')
      return invitation
    },
    async revokeInvitation(caller, invitationId, input) {
      requireActive(caller)
      const invitationRecord = await repository.findInvitation(invitationId)
      if (!invitationRecord) throw invitationNotFound()
      const access = await loadAccess(caller, invitationRecord.repositoryId)
      const instructorOverride = instructorOwns(access, caller)
      if (!(isOwner(access, caller) || instructorOverride)) throw invitationNotFound()
      const currentTime = now()
      if (instructorOverride && !isCutoff(access, currentTime)) throw invitationNotFound()
      const invitation = unwrapInvitation(await repository.revokeInvitation({ invitationId, actorId: caller.id, reason: input.reason, instructorOverride, now: currentTime }))
      logger.info({ event: 'repository.invitation_revoked', actorId: caller.id, repositoryId: invitation.repositoryId, invitationId, corrective: instructorOverride, hasReason: instructorOverride ? Boolean(input.reason) : undefined }, 'repository invitation revoked')
      return invitation
    },
    async createFeedbackDraft(caller, repositoryId, input) {
      await requireInstructor(caller, repositoryId)
      const feedback = unwrapFeedback(await repository.createFeedbackDraft({ repositoryId, instructorId: caller.id, feedback: input, now: now() }))
      logger.info({ event: 'repository.feedback_draft_created', actorId: caller.id, repositoryId, feedbackId: feedback.feedbackId }, 'repository feedback draft created')
      return feedback
    },
    async updateFeedbackDraft(caller, feedbackId, input) {
      requireActive(caller)
      const current = await repository.findFeedback(feedbackId)
      if (!current) throw feedbackNotFound()
      await requireInstructor(caller, current.repositoryId)
      const feedback = unwrapFeedback(await repository.updateFeedbackDraft({ feedbackId, instructorId: caller.id, feedback: input, now: now() }))
      logger.info({ event: 'repository.feedback_draft_updated', actorId: caller.id, repositoryId: current.repositoryId, feedbackId }, 'repository feedback draft updated')
      return feedback
    },
    async listFeedback(caller, repositoryId) {
      const access = await loadAccess(caller, repositoryId)
      const feedback = await repository.listFeedback(
        repositoryId,
        instructorOwns(access, caller),
      )
      if (caller.role !== 'ADMIN') return feedback
      return feedback.map(({ feedbackText: _feedbackText, ...metadata }) => metadata)
    },
  }
}
