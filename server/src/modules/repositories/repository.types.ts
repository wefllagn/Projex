import type {
  ClassMemberStatus,
  ClassStatus,
  ProjectTaskStatus,
  RepositoryFeedbackStatus,
  RepositoryInvitationStatus,
  RepositoryMemberRole,
  RepositoryMemberStatus,
  RepositoryReviewStatus,
  RepositoryStorageStatus,
  RepositoryStatus,
  RepositoryType,
  RepositoryVisibility,
  TeamMemberRole,
  UserStatus,
} from '@prisma/client'

export interface RepositoryRecord {
  id: string
  projectTaskId: string | null
  teamId: string | null
  ownerId: string
  repositoryType: RepositoryType
  repositoryName: string
  slug: string
  description: string | null
  defaultBranch: string
  visibility: RepositoryVisibility
  status: RepositoryStatus
  storageStatus: RepositoryStorageStatus
  reviewStatus: RepositoryReviewStatus
  createdAt: Date
  updatedAt: Date
  readyForReviewAt: Date | null
  approvedAt: Date | null
  archivedAt: Date | null
  owner: { id: string; fullName: string }
  projectTask: {
    id: string
    classId: string
    dueDate: Date
    status: ProjectTaskStatus
    class: { id: string; instructorId: string; status: ClassStatus }
  } | null
  team: { id: string; leadStudentId: string } | null
}

export interface RepositoryAccessRecord {
  repository: RepositoryRecord
  classMembership: { id: string; status: ClassMemberStatus } | null
  repositoryMembership: {
    id: string
    memberRole: RepositoryMemberRole
    status: RepositoryMemberStatus
  } | null
}

export interface RepositoryProjection {
  id: string
  projectTaskId: string | null
  teamId: string | null
  repositoryType: RepositoryType
  repositoryName: string
  slug: string
  description: string | null
  defaultBranch: string
  visibility: Exclude<RepositoryVisibility, 'PUBLIC'>
  status: RepositoryStatus
  storageStatus: RepositoryStorageStatus
  reviewStatus: RepositoryReviewStatus
  owner: { userId: string; fullName: string }
  createdAt: Date
  updatedAt: Date
  readyForReviewAt: Date | null
  approvedAt: Date | null
  archivedAt: Date | null
}

export interface RepositoryMemberProjection {
  memberId: string
  userId: string
  fullName: string
  memberRole: RepositoryMemberRole
  teamRole: TeamMemberRole | null
  membershipStatus?: RepositoryMemberStatus
  userStatus?: UserStatus
  joinedAt?: Date
  removedAt?: Date | null
  lastActivatedAt?: Date
  updatedAt?: Date
}

export interface RepositoryInvitationProjection {
  invitationId: string
  repositoryId: string
  projectTaskId: string
  invitee: { userId: string; fullName: string }
  invitedBy: { userId: string; fullName: string }
  status: RepositoryInvitationStatus
  createdAt: Date
  expiresAt: Date
  acceptedAt: Date | null
  declinedAt: Date | null
  revokedAt: Date | null
  expiredAt: Date | null
}

export interface RepositoryFeedbackProjection {
  feedbackId: string
  repositoryId: string
  feedbackText: string
  status: RepositoryFeedbackStatus
  author: { userId: string; fullName: string }
  createdAt: Date
  updatedAt: Date
  releasedAt: Date | null
}

export function toRepositoryProjection(record: RepositoryRecord): RepositoryProjection {
  if (record.visibility === 'PUBLIC') throw new Error('PUBLIC repositories are unavailable.')
  return {
    id: record.id,
    projectTaskId: record.projectTaskId,
    teamId: record.teamId,
    repositoryType: record.repositoryType,
    repositoryName: record.repositoryName,
    slug: record.slug,
    description: record.description,
    defaultBranch: record.defaultBranch,
    visibility: record.visibility,
    status: record.status,
    storageStatus: record.storageStatus,
    reviewStatus: record.reviewStatus,
    owner: { userId: record.owner.id, fullName: record.owner.fullName },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    readyForReviewAt: record.readyForReviewAt,
    approvedAt: record.approvedAt,
    archivedAt: record.archivedAt,
  }
}
