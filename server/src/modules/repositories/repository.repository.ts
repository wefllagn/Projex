import type { Prisma, PrismaClient, UserRole } from '@prisma/client'
import type {
  ApproveRepositoryInput,
  CreateClassProjectRepositoryInput,
  CreateFeedbackDraftInput,
  CreateInvitationInput,
  CreatePersonalRepositoryInput,
  MemberTransitionInput,
  RepositoryListQuery,
  RequestChangesInput,
  UpdateFeedbackDraftInput,
} from './repository.schemas.js'
import type {
  RepositoryAccessRecord,
  RepositoryFeedbackProjection,
  RepositoryInvitationProjection,
  RepositoryMemberProjection,
  RepositoryRecord,
} from './repository.types.js'

export const repositoryRecordSelect = {
  id: true,
  projectTaskId: true,
  teamId: true,
  ownerId: true,
  repositoryType: true,
  repositoryName: true,
  slug: true,
  description: true,
  defaultBranch: true,
  visibility: true,
  status: true,
  storageStatus: true,
  reviewStatus: true,
  createdAt: true,
  updatedAt: true,
  readyForReviewAt: true,
  approvedAt: true,
  archivedAt: true,
  owner: { select: { id: true, fullName: true } },
  projectTask: {
    select: {
      id: true,
      classId: true,
      dueDate: true,
      status: true,
      class: { select: { id: true, instructorId: true, status: true } },
    },
  },
  team: { select: { id: true, leadStudentId: true } },
} as const

export type CollaborationFailureKind =
  | 'not_found'
  | 'class_archived'
  | 'task_not_open'
  | 'deadline_passed'
  | 'stale'
  | 'conflict'
  | 'student_ineligible'
  | 'different_team'
  | 'capacity_reached'
  | 'already_member'
  | 'member_removed'
  | 'owner_immutable'
  | 'invalid_state'
  | 'feedback_required'
  | 'invitation_expired'
  | 'invitation_resolved'
  | 'archive_blocked'
  | 'reason_required'

export type CollaborationFailure = { kind: CollaborationFailureKind }
export type RepositoryWriteResult =
  | { kind: 'ok'; repository: RepositoryRecord }
  | CollaborationFailure
export type InvitationWriteResult =
  | { kind: 'ok'; invitation: RepositoryInvitationProjection }
  | CollaborationFailure
export type MemberWriteResult =
  | { kind: 'ok'; member: RepositoryMemberProjection }
  | CollaborationFailure
export type FeedbackWriteResult =
  | { kind: 'ok'; feedback: RepositoryFeedbackProjection }
  | CollaborationFailure

export interface RepositoryRepository {
  createClassProject(input: {
    projectTaskId: string
    ownerId: string
    repository: CreateClassProjectRepositoryInput
    now: Date
  }): Promise<RepositoryWriteResult>
  createPersonal(input: {
    ownerId: string
    repository: CreatePersonalRepositoryInput
    now: Date
  }): Promise<RepositoryWriteResult>
  list(input: {
    callerId: string
    callerRole: UserRole
    query: RepositoryListQuery
  }): Promise<{ repositories: RepositoryRecord[]; totalItems: number }>
  findAccess(repositoryId: string, callerId: string): Promise<RepositoryAccessRecord | null>
  updateMetadata(input: {
    repositoryId: string
    expectedUpdatedAt: Date
    repositoryName?: string
    description?: string | null
    now: Date
  }): Promise<RepositoryWriteResult>
  readyForReview(input: { repositoryId: string; expectedUpdatedAt: Date; now: Date }): Promise<RepositoryWriteResult>
  requestChanges(input: {
    repositoryId: string
    instructorId: string
    review: RequestChangesInput
    now: Date
  }): Promise<RepositoryWriteResult>
  approve(input: {
    repositoryId: string
    instructorId: string
    review: ApproveRepositoryInput
    now: Date
  }): Promise<RepositoryWriteResult>
  archive(input: { repositoryId: string; expectedUpdatedAt: Date; now: Date }): Promise<RepositoryWriteResult>
  restore(input: { repositoryId: string; expectedUpdatedAt: Date; now: Date }): Promise<RepositoryWriteResult>
  listMembers(
    repositoryId: string,
    projection: 'student' | 'owner' | 'detailed',
  ): Promise<RepositoryMemberProjection[]>
  transitionMember(input: {
    repositoryId: string
    memberId: string
    mutation: MemberTransitionInput
    now: Date
  }): Promise<MemberWriteResult>
  createInvitation(input: {
    repositoryId: string
    invitedById: string
    invitation: CreateInvitationInput
    now: Date
  }): Promise<InvitationWriteResult>
  listRepositoryInvitations(repositoryId: string, now: Date): Promise<RepositoryInvitationProjection[]>
  listReceivedInvitations(inviteeId: string, now: Date): Promise<RepositoryInvitationProjection[]>
  findInvitation(invitationId: string): Promise<RepositoryInvitationProjection | null>
  acceptInvitation(input: { invitationId: string; inviteeId: string; now: Date }): Promise<InvitationWriteResult>
  declineInvitation(input: { invitationId: string; inviteeId: string; now: Date }): Promise<InvitationWriteResult>
  revokeInvitation(input: {
    invitationId: string
    actorId: string
    reason?: string
    instructorOverride: boolean
    now: Date
  }): Promise<InvitationWriteResult>
  createFeedbackDraft(input: {
    repositoryId: string
    instructorId: string
    feedback: CreateFeedbackDraftInput
    now: Date
  }): Promise<FeedbackWriteResult>
  updateFeedbackDraft(input: {
    feedbackId: string
    instructorId: string
    feedback: UpdateFeedbackDraftInput
    now: Date
  }): Promise<FeedbackWriteResult>
  listFeedback(repositoryId: string, includeDrafts: boolean): Promise<RepositoryFeedbackProjection[]>
  findFeedback(feedbackId: string): Promise<RepositoryFeedbackProjection | null>
}

function normalizeSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'repository'
}

function normalizeTeamName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function nextUpdatedAt(expected: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expected.getTime() + 1))
}

function invitationProjection(
  record: {
    id: string
    repositoryId: string
    projectTaskId: string
    status: RepositoryInvitationProjection['status']
    createdAt: Date
    expiresAt: Date
    acceptedAt: Date | null
    declinedAt: Date | null
    revokedAt: Date | null
    expiredAt: Date | null
    invitee: { id: string; fullName: string }
    invitedBy: { id: string; fullName: string }
  },
  now?: Date,
): RepositoryInvitationProjection {
  const expired = record.status === 'PENDING' && now && record.expiresAt.getTime() <= now.getTime()
  return {
    invitationId: record.id,
    repositoryId: record.repositoryId,
    projectTaskId: record.projectTaskId,
    invitee: { userId: record.invitee.id, fullName: record.invitee.fullName },
    invitedBy: { userId: record.invitedBy.id, fullName: record.invitedBy.fullName },
    status: expired ? 'EXPIRED' : record.status,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    acceptedAt: record.acceptedAt,
    declinedAt: record.declinedAt,
    revokedAt: record.revokedAt,
    expiredAt: expired ? record.expiresAt : record.expiredAt,
  }
}

const invitationSelect = {
  id: true,
  repositoryId: true,
  projectTaskId: true,
  status: true,
  createdAt: true,
  expiresAt: true,
  acceptedAt: true,
  declinedAt: true,
  revokedAt: true,
  expiredAt: true,
  invitee: { select: { id: true, fullName: true } },
  invitedBy: { select: { id: true, fullName: true } },
} as const

const feedbackSelect = {
  id: true,
  repositoryId: true,
  feedbackText: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  releasedAt: true,
  instructor: { select: { id: true, fullName: true } },
} as const

function feedbackProjection(record: {
  id: string
  repositoryId: string
  feedbackText: string
  status: RepositoryFeedbackProjection['status']
  createdAt: Date
  updatedAt: Date
  releasedAt: Date | null
  instructor: { id: string; fullName: string }
}): RepositoryFeedbackProjection {
  return {
    feedbackId: record.id,
    repositoryId: record.repositoryId,
    feedbackText: record.feedbackText,
    status: record.status,
    author: { userId: record.instructor.id, fullName: record.instructor.fullName },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    releasedAt: record.releasedAt,
  }
}

async function loadRepository(
  transaction: Prisma.TransactionClient,
  repositoryId: string,
): Promise<RepositoryRecord> {
  return transaction.repository.findUniqueOrThrow({
    where: { id: repositoryId },
    select: repositoryRecordSelect,
  })
}

async function expirePendingInvitations(
  transaction: Prisma.TransactionClient,
  now: Date,
  scope: { projectTaskId?: string; invitationId?: string },
): Promise<void> {
  await transaction.repositoryInvitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
      ...(scope.projectTaskId ? { projectTaskId: scope.projectTaskId } : {}),
      ...(scope.invitationId ? { id: scope.invitationId } : {}),
    },
    data: { status: 'EXPIRED', expiredAt: now },
  })
}

async function memberProjection(
  transaction: Prisma.TransactionClient,
  repositoryId: string,
  memberId: string,
  detailed: boolean,
): Promise<RepositoryMemberProjection> {
  const member = await transaction.repositoryMember.findFirstOrThrow({
    where: { id: memberId, repositoryId },
    select: {
      id: true,
      studentId: true,
      memberRole: true,
      status: true,
      joinedAt: true,
      removedAt: true,
      lastActivatedAt: true,
      updatedAt: true,
      student: { select: { fullName: true, status: true } },
    },
  })
  const teamMember = await transaction.teamMember.findFirst({
    where: { team: { repository: { id: repositoryId } }, studentId: member.studentId },
    select: { memberRole: true },
  })
  return {
    memberId: member.id,
    userId: member.studentId,
    fullName: member.student.fullName,
    memberRole: member.memberRole,
    teamRole: teamMember?.memberRole ?? null,
    ...(detailed
      ? {
          membershipStatus: member.status,
          userStatus: member.student.status,
          joinedAt: member.joinedAt,
          removedAt: member.removedAt,
          lastActivatedAt: member.lastActivatedAt,
          updatedAt: member.updatedAt,
        }
      : {}),
  }
}

export function createPrismaRepositoryRepository(
  prisma: PrismaClient,
  options: { provisioningMaxAttempts?: number } = {},
): RepositoryRepository {
  const provisioningMaxAttempts = options.provisioningMaxAttempts ?? 3
  async function runSerializable<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(work, { isolationLevel: 'Serializable' })
  }

  return {
    async createClassProject(input) {
      try {
        return await runSerializable(async (transaction) => {
          await transaction.$queryRaw`
            SELECT "project_task_id" FROM "project_tasks"
            WHERE "project_task_id" = ${input.projectTaskId}::uuid FOR UPDATE
          `
          const task = await transaction.projectTask.findUnique({
            where: { id: input.projectTaskId },
            select: {
              status: true,
              dueDate: true,
              classId: true,
              class: { select: { status: true } },
            },
          })
          if (!task) return { kind: 'not_found' } as const
          if (task.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
          if (task.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
          if (task.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
          const [user, membership, existingTeam] = await Promise.all([
            transaction.user.findUnique({ where: { id: input.ownerId }, select: { role: true, status: true } }),
            transaction.classMember.findUnique({
              where: { classId_studentId: { classId: task.classId, studentId: input.ownerId } },
              select: { status: true },
            }),
            transaction.teamMember.findFirst({
              where: { projectTaskId: input.projectTaskId, studentId: input.ownerId, status: 'ACTIVE' },
              select: { id: true },
            }),
          ])
          if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE' || membership?.status !== 'ACTIVE') {
            return { kind: 'student_ineligible' } as const
          }
          if (existingTeam) return { kind: 'different_team' } as const
          const team = await transaction.team.create({
            data: {
              projectTaskId: input.projectTaskId,
              leadStudentId: input.ownerId,
              name: input.repository.teamName,
              normalizedName: normalizeTeamName(input.repository.teamName),
              createdAt: input.now,
              updatedAt: input.now,
            },
          })
          await transaction.teamMember.create({
            data: {
              teamId: team.id,
              projectTaskId: input.projectTaskId,
              studentId: input.ownerId,
              memberRole: 'LEAD',
              status: 'ACTIVE',
              joinedAt: input.now,
              updatedAt: input.now,
              lastActivatedAt: input.now,
            },
          })
          const repository = await transaction.repository.create({
            data: {
              projectTaskId: input.projectTaskId,
              teamId: team.id,
              ownerId: input.ownerId,
              repositoryType: 'CLASS_PROJECT',
              repositoryName: input.repository.repositoryName,
              slug: normalizeSlug(input.repository.repositoryName),
              description: input.repository.description ?? null,
              storagePath: null,
              defaultBranch: 'main',
              visibility: 'CLASS_ONLY',
              status: 'ACTIVE',
              reviewStatus: 'WORKING',
              createdAt: input.now,
              updatedAt: input.now,
            },
            select: repositoryRecordSelect,
          })
          await transaction.repositoryMember.create({
            data: {
              repositoryId: repository.id,
              studentId: input.ownerId,
              memberRole: 'OWNER',
              status: 'ACTIVE',
              joinedAt: input.now,
              updatedAt: input.now,
              lastActivatedAt: input.now,
            },
          })
          await transaction.repositoryProvisioningJob.create({
            data: {
              repositoryId: repository.id,
              maxClaimAttempts: provisioningMaxAttempts,
              availableAt: input.now,
              createdAt: input.now,
              updatedAt: input.now,
            },
          })
          return { kind: 'ok', repository } as const
        })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002' || (error as { code?: string }).code === 'P2034') {
          return { kind: 'conflict' }
        }
        throw error
      }
    },
    async createPersonal(input) {
      try {
        return await runSerializable(async (transaction) => {
          const repository = await transaction.repository.create({
            data: {
              ownerId: input.ownerId,
              repositoryType: 'PERSONAL',
              repositoryName: input.repository.repositoryName,
              slug: normalizeSlug(input.repository.repositoryName),
              description: input.repository.description ?? null,
              storagePath: null,
              defaultBranch: 'main',
              visibility: 'PRIVATE',
              status: 'ACTIVE',
              reviewStatus: 'WORKING',
              createdAt: input.now,
              updatedAt: input.now,
            },
            select: repositoryRecordSelect,
          })
          await transaction.repositoryMember.create({
            data: {
              repositoryId: repository.id,
              studentId: input.ownerId,
              memberRole: 'OWNER',
              status: 'ACTIVE',
              joinedAt: input.now,
              updatedAt: input.now,
              lastActivatedAt: input.now,
            },
          })
          await transaction.repositoryProvisioningJob.create({
            data: {
              repositoryId: repository.id,
              maxClaimAttempts: provisioningMaxAttempts,
              availableAt: input.now,
              createdAt: input.now,
              updatedAt: input.now,
            },
          })
          return { kind: 'ok', repository } as const
        })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') return { kind: 'conflict' }
        throw error
      }
    },
    async list(input) {
      const roleScope: Prisma.RepositoryWhereInput =
        input.callerRole === 'ADMIN'
          ? {}
          : input.callerRole === 'INSTRUCTOR'
            ? { projectTask: { class: { instructorId: input.callerId } } }
            : {
                OR: [
                  { ownerId: input.callerId },
                  { members: { some: { studentId: input.callerId, status: 'ACTIVE' } } },
                  {
                    repositoryType: 'CLASS_PROJECT',
                    visibility: 'CLASS_ONLY',
                    projectTask: {
                      class: { members: { some: { studentId: input.callerId, status: 'ACTIVE' } } },
                    },
                  },
                ],
              }
      const where: Prisma.RepositoryWhereInput = {
        ...roleScope,
        ...(input.query.repositoryType ? { repositoryType: input.query.repositoryType } : {}),
        ...(input.query.status ? { status: input.query.status } : {}),
        ...(input.query.reviewStatus ? { reviewStatus: input.query.reviewStatus } : {}),
        ...(input.query.projectTaskId ? { projectTaskId: input.query.projectTaskId } : {}),
        ...(input.query.search
          ? { OR: [
              { repositoryName: { contains: input.query.search, mode: 'insensitive' } },
              { description: { contains: input.query.search, mode: 'insensitive' } },
            ] }
          : {}),
      }
      const [repositories, totalItems] = await prisma.$transaction([
        prisma.repository.findMany({
          where,
          select: repositoryRecordSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.repository.count({ where }),
      ])
      return { repositories, totalItems }
    },
    async findAccess(repositoryId, callerId) {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: {
          ...repositoryRecordSelect,
          members: {
            where: { studentId: callerId },
            take: 1,
            select: { id: true, memberRole: true, status: true },
          },
          projectTask: {
            select: {
              id: true,
              classId: true,
              dueDate: true,
              status: true,
              class: {
                select: {
                  id: true,
                  instructorId: true,
                  status: true,
                  members: {
                    where: { studentId: callerId },
                    take: 1,
                    select: { id: true, status: true },
                  },
                },
              },
            },
          },
        },
      })
      if (!repository) return null
      const { members, ...base } = repository
      const repositoryMembership = members[0] ?? null
      const classMembership = repository.projectTask?.class.members[0] ?? null
      const projectTask = repository.projectTask
        ? {
            ...repository.projectTask,
            class: {
              id: repository.projectTask.class.id,
              instructorId: repository.projectTask.class.instructorId,
              status: repository.projectTask.class.status,
            },
          }
        : null
      return {
        repository: { ...base, projectTask },
        classMembership,
        repositoryMembership,
      }
    },
    async updateMetadata(input) {
      try {
        return await runSerializable(async (transaction) => {
          const current = await transaction.repository.findUnique({
            where: { id: input.repositoryId },
            select: {
              repositoryType: true,
              status: true,
              reviewStatus: true,
              updatedAt: true,
              projectTask: { select: { status: true, dueDate: true, class: { select: { status: true } } } },
            },
          })
          if (!current) return { kind: 'not_found' } as const
          if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
          if (current.status === 'ARCHIVED' || current.reviewStatus === 'APPROVED') return { kind: 'invalid_state' } as const
          if (current.projectTask) {
            if (current.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
            if (current.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
            if (current.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
          }
          const updated = await transaction.repository.updateMany({
            where: { id: input.repositoryId, updatedAt: input.expectedUpdatedAt },
            data: {
              ...(input.repositoryName !== undefined
                ? { repositoryName: input.repositoryName, slug: normalizeSlug(input.repositoryName) }
                : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
            },
          })
          if (updated.count === 0) return { kind: 'stale' } as const
          return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
        })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') return { kind: 'conflict' }
        throw error
      }
    },
    readyForReview(input) {
      return runSerializable(async (transaction) => {
        const current = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: {
            repositoryType: true,
            status: true,
            reviewStatus: true,
            updatedAt: true,
            projectTask: { select: { status: true, dueDate: true, class: { select: { status: true } } } },
          },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.repositoryType !== 'CLASS_PROJECT' || current.status === 'ARCHIVED') return { kind: 'invalid_state' } as const
        if (!current.projectTask || current.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
        if (current.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (current.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
        if (!['WORKING', 'CHANGES_REQUESTED'].includes(current.reviewStatus)) return { kind: 'invalid_state' } as const
        const result = await transaction.repository.updateMany({
          where: { id: input.repositoryId, updatedAt: input.expectedUpdatedAt, reviewStatus: current.reviewStatus },
          data: {
            reviewStatus: 'READY_FOR_REVIEW',
            readyForReviewAt: input.now,
            approvedAt: null,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) return { kind: 'stale' } as const
        return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
      })
    },
    requestChanges(input) {
      return runSerializable(async (transaction) => {
        const current = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: {
            status: true,
            reviewStatus: true,
            updatedAt: true,
            projectTask: { select: { status: true, dueDate: true, class: { select: { status: true } } } },
          },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.updatedAt.getTime() !== input.review.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.status === 'ARCHIVED' || current.reviewStatus !== 'READY_FOR_REVIEW') return { kind: 'invalid_state' } as const
        if (!current.projectTask || current.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
        if (current.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (current.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
        const feedback = await transaction.repositoryFeedback.findFirst({
          where: { id: input.review.feedbackId, repositoryId: input.repositoryId, instructorId: input.instructorId },
          select: { status: true, updatedAt: true, feedbackText: true },
        })
        if (!feedback || feedback.status !== 'DRAFT' || feedback.feedbackText.trim().length === 0) return { kind: 'feedback_required' } as const
        if (feedback.updatedAt.getTime() !== input.review.expectedFeedbackUpdatedAt.getTime()) return { kind: 'stale' } as const
        const feedbackUpdate = await transaction.repositoryFeedback.updateMany({
          where: { id: input.review.feedbackId, status: 'DRAFT', updatedAt: input.review.expectedFeedbackUpdatedAt },
          data: { status: 'RELEASED', releasedById: input.instructorId, releasedAt: input.now, updatedAt: nextUpdatedAt(input.review.expectedFeedbackUpdatedAt, input.now) },
        })
        const repositoryUpdate = await transaction.repository.updateMany({
          where: { id: input.repositoryId, reviewStatus: 'READY_FOR_REVIEW', updatedAt: input.review.expectedUpdatedAt },
          data: { reviewStatus: 'CHANGES_REQUESTED', updatedAt: nextUpdatedAt(input.review.expectedUpdatedAt, input.now) },
        })
        if (feedbackUpdate.count === 0 || repositoryUpdate.count === 0) return { kind: 'stale' } as const
        return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
      })
    },
    approve(input) {
      return runSerializable(async (transaction) => {
        const current = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: { status: true, reviewStatus: true, updatedAt: true, projectTask: { select: { status: true, class: { select: { status: true } } } } },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.updatedAt.getTime() !== input.review.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.status === 'ARCHIVED' || current.reviewStatus !== 'READY_FOR_REVIEW') return { kind: 'invalid_state' } as const
        if (!current.projectTask || current.projectTask.status === 'ARCHIVED') return { kind: 'task_not_open' } as const
        if (current.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (input.review.feedbackId && input.review.expectedFeedbackUpdatedAt) {
          const draft = await transaction.repositoryFeedback.findFirst({
            where: { id: input.review.feedbackId, repositoryId: input.repositoryId, instructorId: input.instructorId },
            select: { status: true, updatedAt: true, feedbackText: true },
          })
          if (!draft || draft.status !== 'DRAFT' || draft.feedbackText.trim().length === 0) return { kind: 'feedback_required' } as const
          if (draft.updatedAt.getTime() !== input.review.expectedFeedbackUpdatedAt.getTime()) return { kind: 'stale' } as const
          const released = await transaction.repositoryFeedback.updateMany({
            where: { id: input.review.feedbackId, status: 'DRAFT', updatedAt: input.review.expectedFeedbackUpdatedAt },
            data: { status: 'RELEASED', releasedById: input.instructorId, releasedAt: input.now, updatedAt: nextUpdatedAt(input.review.expectedFeedbackUpdatedAt, input.now) },
          })
          if (released.count === 0) return { kind: 'stale' } as const
        }
        const updated = await transaction.repository.updateMany({
          where: { id: input.repositoryId, reviewStatus: 'READY_FOR_REVIEW', updatedAt: input.review.expectedUpdatedAt },
          data: { reviewStatus: 'APPROVED', approvedAt: input.now, updatedAt: nextUpdatedAt(input.review.expectedUpdatedAt, input.now) },
        })
        if (updated.count === 0) return { kind: 'stale' } as const
        return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
      })
    },
    archive(input) {
      return runSerializable(async (transaction) => {
        await transaction.$queryRaw`SELECT "repository_id" FROM "repositories" WHERE "repository_id" = ${input.repositoryId}::uuid FOR UPDATE`
        const current = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: { repositoryType: true, status: true, reviewStatus: true, updatedAt: true, teamId: true, projectTaskId: true },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.status === 'ARCHIVED') return { kind: 'invalid_state' } as const
        if (current.repositoryType === 'CLASS_PROJECT') {
          if (current.reviewStatus !== 'APPROVED') return { kind: 'archive_blocked' } as const
          const pending = await transaction.repositoryInvitation.count({
            where: { repositoryId: input.repositoryId, status: 'PENDING', expiresAt: { gt: input.now } },
          })
          if (pending > 0) return { kind: 'archive_blocked' } as const
        }
        const updated = await transaction.repository.updateMany({
          where: { id: input.repositoryId, updatedAt: input.expectedUpdatedAt, status: { not: 'ARCHIVED' } },
          data: { status: 'ARCHIVED', archivedAt: input.now, updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now) },
        })
        if (updated.count === 0) return { kind: 'stale' } as const
        if (current.teamId) {
          await transaction.team.update({ where: { id: current.teamId }, data: { status: 'ARCHIVED', archivedAt: input.now, updatedAt: input.now } })
        }
        return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
      })
    },
    restore(input) {
      return runSerializable(async (transaction) => {
        const current = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: { status: true, updatedAt: true, teamId: true, projectTask: { select: { status: true, class: { select: { status: true } } } } },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.status !== 'ARCHIVED') return { kind: 'invalid_state' } as const
        if (current.projectTask && (current.projectTask.status === 'ARCHIVED' || current.projectTask.class.status === 'ARCHIVED')) return { kind: 'class_archived' } as const
        const updated = await transaction.repository.updateMany({
          where: { id: input.repositoryId, status: 'ARCHIVED', updatedAt: input.expectedUpdatedAt },
          data: { status: 'ACTIVE', archivedAt: null, updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now) },
        })
        if (updated.count === 0) return { kind: 'stale' } as const
        if (current.teamId) {
          await transaction.team.update({ where: { id: current.teamId }, data: { status: 'ACTIVE', archivedAt: null, updatedAt: input.now } })
        }
        return { kind: 'ok', repository: await loadRepository(transaction, input.repositoryId) } as const
      })
    },
    async listMembers(repositoryId, projection) {
      const members = await prisma.repositoryMember.findMany({
        where: {
          repositoryId,
          ...(projection === 'student' ? { status: 'ACTIVE' } : {}),
        },
        orderBy: [{ memberRole: 'asc' }, { joinedAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          studentId: true,
          memberRole: true,
          status: true,
          joinedAt: true,
          removedAt: true,
          lastActivatedAt: true,
          updatedAt: true,
          student: { select: { fullName: true, status: true } },
          repository: { select: { teamId: true } },
        },
      })
      const teamId = members[0]?.repository.teamId
      const teamMembers = teamId
        ? await prisma.teamMember.findMany({ where: { teamId }, select: { studentId: true, memberRole: true } })
        : []
      const teamRole = new Map(teamMembers.map((member) => [member.studentId, member.memberRole]))
      return members.map((member) => ({
        memberId: member.id,
        userId: member.studentId,
        fullName: member.student.fullName,
        memberRole: member.memberRole,
        teamRole: teamRole.get(member.studentId) ?? null,
        ...(projection === 'detailed'
          ? {
              membershipStatus: member.status,
              userStatus: member.student.status,
              joinedAt: member.joinedAt,
              removedAt: member.removedAt,
              lastActivatedAt: member.lastActivatedAt,
              updatedAt: member.updatedAt,
            }
          : projection === 'owner'
            ? {
                membershipStatus: member.status,
                updatedAt: member.updatedAt,
              }
          : {}),
      }))
    },
    transitionMember(input) {
      return runSerializable(async (transaction) => {
        await transaction.$queryRaw`SELECT "repository_id" FROM "repositories" WHERE "repository_id" = ${input.repositoryId}::uuid FOR UPDATE`
        const repository = await transaction.repository.findUnique({
          where: { id: input.repositoryId },
          select: {
            teamId: true,
            projectTaskId: true,
            status: true,
            projectTask: { select: { maxTeamSize: true, classId: true } },
          },
        })
        if (!repository || !repository.teamId || !repository.projectTaskId || !repository.projectTask) return { kind: 'not_found' } as const
        if (repository.status === 'ARCHIVED') return { kind: 'invalid_state' } as const
        const member = await transaction.repositoryMember.findFirst({
          where: { id: input.memberId, repositoryId: input.repositoryId },
          select: { studentId: true, memberRole: true, status: true, updatedAt: true },
        })
        if (!member) return { kind: 'not_found' } as const
        if (member.memberRole === 'OWNER') return { kind: 'owner_immutable' } as const
        if (member.updatedAt.getTime() !== input.mutation.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        const target = input.mutation.action === 'REMOVE' ? 'REMOVED' : 'ACTIVE'
        if (member.status === target) return { kind: 'invalid_state' } as const
        if (target === 'ACTIVE') {
          const [user, classMembership, otherTeam, activeCount, pendingCount] = await Promise.all([
            transaction.user.findUnique({ where: { id: member.studentId }, select: { role: true, status: true } }),
            transaction.classMember.findUnique({ where: { classId_studentId: { classId: repository.projectTask.classId, studentId: member.studentId } }, select: { status: true } }),
            transaction.teamMember.findFirst({ where: { projectTaskId: repository.projectTaskId, studentId: member.studentId, status: 'ACTIVE', teamId: { not: repository.teamId } } }),
            transaction.teamMember.count({ where: { teamId: repository.teamId, status: 'ACTIVE' } }),
            transaction.repositoryInvitation.count({ where: { teamId: repository.teamId, status: 'PENDING', expiresAt: { gt: input.now } } }),
          ])
          if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE' || classMembership?.status !== 'ACTIVE') return { kind: 'student_ineligible' } as const
          if (otherTeam) return { kind: 'different_team' } as const
          if (activeCount + pendingCount >= repository.projectTask.maxTeamSize) return { kind: 'capacity_reached' } as const
        }
        const updatedAt = nextUpdatedAt(input.mutation.expectedUpdatedAt, input.now)
        await transaction.teamMember.update({
          where: { teamId_studentId: { teamId: repository.teamId, studentId: member.studentId } },
          data: target === 'ACTIVE'
            ? { status: 'ACTIVE', removedAt: null, lastActivatedAt: input.now, updatedAt }
            : { status: 'REMOVED', removedAt: input.now, updatedAt },
        })
        await transaction.repositoryMember.update({
          where: { id: input.memberId },
          data: target === 'ACTIVE'
            ? { status: 'ACTIVE', removedAt: null, lastActivatedAt: input.now, updatedAt }
            : { status: 'REMOVED', removedAt: input.now, updatedAt },
        })
        return { kind: 'ok', member: await memberProjection(transaction, input.repositoryId, input.memberId, true) } as const
      })
    },
    async createInvitation(input) {
      try {
        return await runSerializable(async (transaction) => {
          await transaction.$queryRaw`SELECT "repository_id" FROM "repositories" WHERE "repository_id" = ${input.repositoryId}::uuid FOR UPDATE`
          const repository = await transaction.repository.findUnique({
            where: { id: input.repositoryId },
            select: {
              teamId: true,
              projectTaskId: true,
              status: true,
              projectTask: { select: { status: true, dueDate: true, maxTeamSize: true, classId: true, class: { select: { status: true } } } },
            },
          })
          if (!repository || !repository.teamId || !repository.projectTaskId || !repository.projectTask) return { kind: 'not_found' } as const
          if (repository.status === 'ARCHIVED' || repository.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
          if (repository.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
          if (repository.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
          await expirePendingInvitations(transaction, input.now, { projectTaskId: repository.projectTaskId })
          const [
            invitee,
            classMembership,
            activeElsewhere,
            existingMember,
            existingPending,
            activeCount,
            pendingCount,
          ] = await Promise.all([
            transaction.user.findUnique({ where: { id: input.invitation.inviteeUserId }, select: { role: true, status: true } }),
            transaction.classMember.findUnique({ where: { classId_studentId: { classId: repository.projectTask.classId, studentId: input.invitation.inviteeUserId } }, select: { status: true } }),
            transaction.teamMember.findFirst({ where: { projectTaskId: repository.projectTaskId, studentId: input.invitation.inviteeUserId, status: 'ACTIVE' } }),
            transaction.repositoryMember.findUnique({ where: { repositoryId_studentId: { repositoryId: input.repositoryId, studentId: input.invitation.inviteeUserId } }, select: { status: true } }),
            transaction.repositoryInvitation.findFirst({
              where: {
                projectTaskId: repository.projectTaskId,
                inviteeId: input.invitation.inviteeUserId,
                status: 'PENDING',
                expiresAt: { gt: input.now },
              },
              select: { id: true },
            }),
            transaction.teamMember.count({ where: { teamId: repository.teamId, status: 'ACTIVE' } }),
            transaction.repositoryInvitation.count({ where: { teamId: repository.teamId, status: 'PENDING', expiresAt: { gt: input.now } } }),
          ])
          if (!invitee || invitee.role !== 'STUDENT' || invitee.status !== 'ACTIVE' || classMembership?.status !== 'ACTIVE') return { kind: 'student_ineligible' } as const
          if (activeElsewhere) return { kind: activeElsewhere.teamId === repository.teamId ? 'already_member' : 'different_team' } as const
          if (existingMember?.status === 'ACTIVE') return { kind: 'already_member' } as const
          if (existingPending) return { kind: 'conflict' } as const
          if (activeCount + pendingCount >= repository.projectTask.maxTeamSize) return { kind: 'capacity_reached' } as const
          const sevenDays = new Date(input.now.getTime() + 7 * 24 * 60 * 60 * 1000)
          const expiresAt = new Date(Math.min(sevenDays.getTime(), repository.projectTask.dueDate.getTime()))
          const invitation = await transaction.repositoryInvitation.create({
            data: {
              repositoryId: input.repositoryId,
              teamId: repository.teamId,
              projectTaskId: repository.projectTaskId,
              inviteeId: input.invitation.inviteeUserId,
              invitedById: input.invitedById,
              status: 'PENDING',
              createdAt: input.now,
              expiresAt,
            },
            select: invitationSelect,
          })
          return { kind: 'ok', invitation: invitationProjection(invitation) } as const
        })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002' || (error as { code?: string }).code === 'P2034') return { kind: 'conflict' }
        throw error
      }
    },
    async listRepositoryInvitations(repositoryId, now) {
      const records = await prisma.repositoryInvitation.findMany({ where: { repositoryId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: invitationSelect })
      return records.map((record) => invitationProjection(record, now))
    },
    async listReceivedInvitations(inviteeId, now) {
      const records = await prisma.repositoryInvitation.findMany({ where: { inviteeId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: invitationSelect })
      return records.map((record) => invitationProjection(record, now))
    },
    async findInvitation(invitationId) {
      const record = await prisma.repositoryInvitation.findUnique({ where: { id: invitationId }, select: invitationSelect })
      return record ? invitationProjection(record) : null
    },
    acceptInvitation(input) {
      return runSerializable(async (transaction) => {
        await transaction.$queryRaw`SELECT "invitation_id" FROM "repository_invitations" WHERE "invitation_id" = ${input.invitationId}::uuid FOR UPDATE`
        await expirePendingInvitations(transaction, input.now, { invitationId: input.invitationId })
        const invitation = await transaction.repositoryInvitation.findUnique({
          where: { id: input.invitationId },
          select: {
            id: true, repositoryId: true, teamId: true, projectTaskId: true, inviteeId: true, status: true, expiresAt: true,
            repository: { select: { status: true } },
            projectTask: { select: { status: true, dueDate: true, maxTeamSize: true, classId: true, class: { select: { status: true } } } },
          },
        })
        if (!invitation || invitation.inviteeId !== input.inviteeId) return { kind: 'not_found' } as const
        if (invitation.status === 'EXPIRED' || invitation.expiresAt.getTime() <= input.now.getTime()) return { kind: 'invitation_expired' } as const
        if (invitation.status !== 'PENDING') return { kind: 'invitation_resolved' } as const
        if (invitation.repository.status === 'ARCHIVED' || invitation.projectTask.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (invitation.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
        if (invitation.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
        const [user, classMembership, otherTeam, activeCount] = await Promise.all([
          transaction.user.findUnique({ where: { id: input.inviteeId }, select: { role: true, status: true } }),
          transaction.classMember.findUnique({ where: { classId_studentId: { classId: invitation.projectTask.classId, studentId: input.inviteeId } }, select: { status: true } }),
          transaction.teamMember.findFirst({ where: { projectTaskId: invitation.projectTaskId, studentId: input.inviteeId, status: 'ACTIVE' } }),
          transaction.teamMember.count({ where: { teamId: invitation.teamId, status: 'ACTIVE' } }),
        ])
        if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE' || classMembership?.status !== 'ACTIVE') return { kind: 'student_ineligible' } as const
        if (otherTeam) return { kind: otherTeam.teamId === invitation.teamId ? 'already_member' : 'different_team' } as const
        if (activeCount >= invitation.projectTask.maxTeamSize) return { kind: 'capacity_reached' } as const
        await transaction.teamMember.upsert({
          where: { teamId_studentId: { teamId: invitation.teamId, studentId: input.inviteeId } },
          create: {
            teamId: invitation.teamId, projectTaskId: invitation.projectTaskId, studentId: input.inviteeId,
            memberRole: 'MEMBER', status: 'ACTIVE', joinedAt: input.now, updatedAt: input.now, lastActivatedAt: input.now,
          },
          update: { status: 'ACTIVE', memberRole: 'MEMBER', removedAt: null, lastActivatedAt: input.now, updatedAt: input.now },
        })
        await transaction.repositoryMember.upsert({
          where: { repositoryId_studentId: { repositoryId: invitation.repositoryId, studentId: input.inviteeId } },
          create: {
            repositoryId: invitation.repositoryId, studentId: input.inviteeId, memberRole: 'MEMBER', status: 'ACTIVE',
            joinedAt: input.now, updatedAt: input.now, lastActivatedAt: input.now,
          },
          update: { status: 'ACTIVE', memberRole: 'MEMBER', removedAt: null, lastActivatedAt: input.now, updatedAt: input.now },
        })
        const updated = await transaction.repositoryInvitation.update({
          where: { id: input.invitationId },
          data: { status: 'ACCEPTED', acceptedAt: input.now },
          select: invitationSelect,
        })
        return { kind: 'ok', invitation: invitationProjection(updated) } as const
      })
    },
    declineInvitation(input) {
      return runSerializable(async (transaction) => {
        await expirePendingInvitations(transaction, input.now, { invitationId: input.invitationId })
        const invitation = await transaction.repositoryInvitation.findUnique({
          where: { id: input.invitationId },
          select: { inviteeId: true, status: true, expiresAt: true, projectTask: { select: { status: true, dueDate: true } } },
        })
        if (!invitation || invitation.inviteeId !== input.inviteeId) return { kind: 'not_found' } as const
        if (invitation.status === 'EXPIRED' || invitation.expiresAt.getTime() <= input.now.getTime()) return { kind: 'invitation_expired' } as const
        if (invitation.status !== 'PENDING') return { kind: 'invitation_resolved' } as const
        if (invitation.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
        if (invitation.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
        const updated = await transaction.repositoryInvitation.update({ where: { id: input.invitationId }, data: { status: 'DECLINED', declinedAt: input.now }, select: invitationSelect })
        return { kind: 'ok', invitation: invitationProjection(updated) } as const
      })
    },
    revokeInvitation(input) {
      return runSerializable(async (transaction) => {
        await expirePendingInvitations(transaction, input.now, { invitationId: input.invitationId })
        const invitation = await transaction.repositoryInvitation.findUnique({
          where: { id: input.invitationId },
          select: {
            status: true, expiresAt: true, invitedById: true,
            repository: { select: { ownerId: true } },
            projectTask: { select: { status: true, dueDate: true } },
          },
        })
        if (!invitation) return { kind: 'not_found' } as const
        if (invitation.status === 'EXPIRED' || invitation.expiresAt.getTime() <= input.now.getTime()) return { kind: 'invitation_expired' } as const
        if (invitation.status !== 'PENDING') return { kind: 'invitation_resolved' } as const
        if (!input.instructorOverride) {
          if (invitation.repository.ownerId !== input.actorId) return { kind: 'not_found' } as const
          if (invitation.projectTask.status !== 'PUBLISHED') return { kind: 'task_not_open' } as const
          if (invitation.projectTask.dueDate.getTime() <= input.now.getTime()) return { kind: 'deadline_passed' } as const
        } else if (!input.reason?.trim()) {
          return { kind: 'reason_required' } as const
        }
        const updated = await transaction.repositoryInvitation.update({
          where: { id: input.invitationId },
          data: { status: 'REVOKED', revokedAt: input.now, resolutionReason: input.reason ?? null },
          select: invitationSelect,
        })
        return { kind: 'ok', invitation: invitationProjection(updated) } as const
      })
    },
    createFeedbackDraft(input) {
      return runSerializable(async (transaction) => {
        const repository = await transaction.repository.findUnique({ where: { id: input.repositoryId }, select: { status: true } })
        if (!repository) return { kind: 'not_found' } as const
        if (repository.status === 'ARCHIVED') return { kind: 'invalid_state' } as const
        const feedback = await transaction.repositoryFeedback.create({
          data: {
            repositoryId: input.repositoryId,
            instructorId: input.instructorId,
            feedbackText: input.feedback.feedbackText,
            status: 'DRAFT',
            createdAt: input.now,
            updatedAt: input.now,
          },
          select: feedbackSelect,
        })
        return { kind: 'ok', feedback: feedbackProjection(feedback) } as const
      })
    },
    updateFeedbackDraft(input) {
      return runSerializable(async (transaction) => {
        const updated = await transaction.repositoryFeedback.updateMany({
          where: {
            id: input.feedbackId,
            instructorId: input.instructorId,
            status: 'DRAFT',
            updatedAt: input.feedback.expectedUpdatedAt,
            repository: { status: { not: 'ARCHIVED' } },
          },
          data: {
            feedbackText: input.feedback.feedbackText,
            updatedAt: nextUpdatedAt(input.feedback.expectedUpdatedAt, input.now),
          },
        })
        if (updated.count === 0) {
          const existing = await transaction.repositoryFeedback.findUnique({ where: { id: input.feedbackId }, select: { status: true, updatedAt: true } })
          if (!existing) return { kind: 'not_found' } as const
          if (existing.updatedAt.getTime() !== input.feedback.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
          return { kind: 'invalid_state' } as const
        }
        const feedback = await transaction.repositoryFeedback.findUniqueOrThrow({ where: { id: input.feedbackId }, select: feedbackSelect })
        return { kind: 'ok', feedback: feedbackProjection(feedback) } as const
      })
    },
    async listFeedback(repositoryId, includeDrafts) {
      const records = await prisma.repositoryFeedback.findMany({
        where: { repositoryId, ...(includeDrafts ? {} : { status: 'RELEASED' }) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: feedbackSelect,
      })
      return records.map(feedbackProjection)
    },
    async findFeedback(feedbackId) {
      const record = await prisma.repositoryFeedback.findUnique({ where: { id: feedbackId }, select: feedbackSelect })
      return record ? feedbackProjection(record) : null
    },
  }
}
