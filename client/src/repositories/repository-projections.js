const REPOSITORY_TYPES = new Set(['CLASS_PROJECT', 'PERSONAL'])
const REPOSITORY_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
const STORAGE_STATUSES = new Set(['PENDING', 'PROVISIONING', 'READY', 'FAILED', 'QUARANTINED'])
const REVIEW_STATUSES = new Set(['WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'])
const MEMBER_ROLES = new Set(['OWNER', 'MEMBER'])
const TEAM_ROLES = new Set(['LEAD', 'MEMBER'])
const MEMBER_STATUSES = new Set(['ACTIVE', 'REMOVED'])
const USER_STATUSES = new Set(['SETUP_PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
const INVITATION_STATUSES = new Set(['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED'])
const FEEDBACK_STATUSES = new Set(['DRAFT', 'RELEASED'])

function safeDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

export function repositoryProjection(value = {}) {
  return {
    id: typeof value.id === 'string' ? value.id : '',
    projectTaskId: typeof value.projectTaskId === 'string' ? value.projectTaskId : null,
    teamId: typeof value.teamId === 'string' ? value.teamId : null,
    repositoryType: REPOSITORY_TYPES.has(value.repositoryType) ? value.repositoryType : 'PERSONAL',
    repositoryName: typeof value.repositoryName === 'string' ? value.repositoryName : '',
    slug: typeof value.slug === 'string' ? value.slug : '',
    description: typeof value.description === 'string' ? value.description : null,
    defaultBranch: typeof value.defaultBranch === 'string' ? value.defaultBranch : 'main',
    visibility: value.visibility === 'CLASS_ONLY' ? 'CLASS_ONLY' : 'PRIVATE',
    status: REPOSITORY_STATUSES.has(value.status) ? value.status : 'INACTIVE',
    storageStatus: STORAGE_STATUSES.has(value.storageStatus) ? value.storageStatus : 'FAILED',
    reviewStatus: REVIEW_STATUSES.has(value.reviewStatus) ? value.reviewStatus : 'WORKING',
    owner: {
      userId: typeof value.owner?.userId === 'string' ? value.owner.userId : '',
      fullName: typeof value.owner?.fullName === 'string' ? value.owner.fullName : '',
    },
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt),
    readyForReviewAt: safeDate(value.readyForReviewAt),
    approvedAt: safeDate(value.approvedAt),
    archivedAt: safeDate(value.archivedAt),
  }
}

export function repositoryMatchesProject(repository, projectTaskId) {
  return Boolean(repository?.id && projectTaskId && repository.projectTaskId === projectTaskId)
}

export function isProvisioning(storageStatus) {
  return storageStatus === 'PENDING' || storageStatus === 'PROVISIONING'
}

export function isStorageTerminal(storageStatus) {
  return ['READY', 'FAILED', 'QUARANTINED'].includes(storageStatus)
}

export function formatRepositoryLabel(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function repositoryCatalogProjection(value) {
  const repository = repositoryProjection(value)
  return {
    id: repository.id,
    projectTaskId: repository.projectTaskId,
    repositoryType: repository.repositoryType,
    repositoryName: repository.repositoryName,
    description: repository.description,
    status: repository.status,
    storageStatus: repository.storageStatus,
    reviewStatus: repository.reviewStatus,
    owner: repository.owner,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
    archivedAt: repository.archivedAt,
  }
}

function memberBase(value = {}) {
  return {
    memberId: typeof value.memberId === 'string' ? value.memberId : '',
    userId: typeof value.userId === 'string' ? value.userId : '',
    fullName: typeof value.fullName === 'string' ? value.fullName : '',
    memberRole: MEMBER_ROLES.has(value.memberRole) ? value.memberRole : 'MEMBER',
    teamRole: TEAM_ROLES.has(value.teamRole) ? value.teamRole : null,
  }
}

export function studentRepositoryMemberProjection(value = {}) {
  const member = memberBase(value)
  if (MEMBER_STATUSES.has(value.membershipStatus)) member.membershipStatus = value.membershipStatus
  const updatedAt = safeDate(value.updatedAt)
  if (updatedAt) member.updatedAt = updatedAt
  return member
}

export function instructorRepositoryMemberProjection(value = {}) {
  return {
    ...memberBase(value),
    membershipStatus: MEMBER_STATUSES.has(value.membershipStatus) ? value.membershipStatus : 'REMOVED',
    userStatus: USER_STATUSES.has(value.userStatus) ? value.userStatus : 'DEACTIVATED',
    joinedAt: safeDate(value.joinedAt),
    removedAt: safeDate(value.removedAt),
    lastActivatedAt: safeDate(value.lastActivatedAt),
    updatedAt: safeDate(value.updatedAt),
  }
}

export function repositoryInvitationProjection(value = {}) {
  return {
    invitationId: typeof value.invitationId === 'string' ? value.invitationId : '',
    repositoryId: typeof value.repositoryId === 'string' ? value.repositoryId : '',
    projectTaskId: typeof value.projectTaskId === 'string' ? value.projectTaskId : '',
    invitee: {
      userId: typeof value.invitee?.userId === 'string' ? value.invitee.userId : '',
      fullName: typeof value.invitee?.fullName === 'string' ? value.invitee.fullName : '',
    },
    invitedBy: {
      userId: typeof value.invitedBy?.userId === 'string' ? value.invitedBy.userId : '',
      fullName: typeof value.invitedBy?.fullName === 'string' ? value.invitedBy.fullName : '',
    },
    status: INVITATION_STATUSES.has(value.status) ? value.status : 'EXPIRED',
    createdAt: safeDate(value.createdAt),
    expiresAt: safeDate(value.expiresAt),
    acceptedAt: safeDate(value.acceptedAt),
    declinedAt: safeDate(value.declinedAt),
    revokedAt: safeDate(value.revokedAt),
    expiredAt: safeDate(value.expiredAt),
  }
}

export function instructorRepositoryFeedbackProjection(value = {}) {
  return {
    feedbackId: typeof value.feedbackId === 'string' ? value.feedbackId : '',
    repositoryId: typeof value.repositoryId === 'string' ? value.repositoryId : '',
    feedbackText: typeof value.feedbackText === 'string' ? value.feedbackText : '',
    status: FEEDBACK_STATUSES.has(value.status) ? value.status : 'RELEASED',
    author: {
      userId: typeof value.author?.userId === 'string' ? value.author.userId : '',
      fullName: typeof value.author?.fullName === 'string' ? value.author.fullName : '',
    },
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt),
    releasedAt: safeDate(value.releasedAt),
  }
}

export function studentRepositoryFeedbackProjection(value = {}) {
  if (value.status !== 'RELEASED') return null
  return instructorRepositoryFeedbackProjection(value)
}
