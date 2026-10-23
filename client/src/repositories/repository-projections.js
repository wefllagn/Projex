const REPOSITORY_TYPES = new Set(['CLASS_PROJECT', 'PERSONAL', 'CLASS_WORKSPACE', 'ACTIVITY_WORKSPACE'])
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
    groupRelationship: value.groupRelationship === 'MY_GROUP' ? 'MY_GROUP' : 'CLASS_METADATA',
    id: typeof value.id === 'string' ? value.id : '',
    projectTaskId: typeof value.projectTaskId === 'string' ? value.projectTaskId : null,
    activityId: typeof value.activityId === 'string' ? value.activityId : null,
    classId: typeof value.classId === 'string' ? value.classId : null,
    contextClassId: typeof value.contextClassId === 'string' ? value.contextClassId : null,
    className: typeof value.className === 'string' ? value.className : null,
    activityTitle: typeof value.activityTitle === 'string' ? value.activityTitle : null,
    projectTitle: typeof value.projectTitle === 'string' ? value.projectTitle : null,
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

export function repositoryActivityProjection(value = {}) {
  if (!value.id || !['REPOSITORY_PROVISIONED', 'PUSH'].includes(value.activityType) || !safeDate(value.activityAt)) return null
  if (value.activityType === 'PUSH' && (!value.actor?.userId || !value.actor?.fullName)) return null
  return {
    id: value.id,
    activityType: value.activityType,
    activityAt: value.activityAt,
    actor: value.activityType === 'PUSH' ? { userId: value.actor.userId, fullName: value.actor.fullName } : null,
  }
}

export function repositoryContributionProjection(value = {}) {
  if (!value.userId || !value.fullName || !Number.isSafeInteger(value.acceptedPushes) || value.acceptedPushes < 1) return null
  return { userId: value.userId, fullName: value.fullName, acceptedPushes: value.acceptedPushes }
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
    groupRelationship: repository.groupRelationship,
    id: repository.id,
    projectTaskId: repository.projectTaskId,
    activityId: repository.activityId,
    classId: repository.classId,
    contextClassId: repository.contextClassId,
    className: repository.className,
    activityTitle: repository.activityTitle,
    projectTitle: repository.projectTitle,
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

export function groupContextProjection(value, repository) {
  if (value?.repositoryId !== repository.id || value.project?.id !== repository.projectTaskId
    || value.team?.id !== repository.teamId || !value.class?.id || !value.class?.className
    || !value.project?.title || !safeDate(value.project.dueDate) || !value.team?.name
    || !Number.isSafeInteger(value.team.activeMemberCount) || !Array.isArray(value.teachingStaff)
    || !['MAINTAINER', 'DEVELOPER', 'INSTRUCTOR', 'METADATA_ONLY'].includes(value.currentRole)) {
    throw new Error('Group repository context did not match this repository.')
  }
  const keys = ['canRead', 'canWrite', 'canUpdateMain', 'canManageMembers', 'canInviteMembers', 'canReview', 'canRequestChanges', 'canSubmitForReview', 'canViewActivity', 'canEditFeedback', 'canArchive', 'canRestore']
  if (keys.some((key) => typeof value.permissions?.[key] !== 'boolean')) throw new Error('Group repository permissions are unavailable.')
  return {
    repositoryId: value.repositoryId,
    project: { id: value.project.id, title: value.project.title, dueDate: value.project.dueDate, status: value.project.status },
    class: { id: value.class.id, className: value.class.className, status: value.class.status },
    team: { id: value.team.id, name: value.team.name, status: value.team.status, activeMemberCount: value.team.activeMemberCount },
    teachingStaff: value.teachingStaff.filter((person) => person.userId && person.fullName && ['PRIMARY', 'CO_INSTRUCTOR'].includes(person.role))
      .map((person) => ({ userId: person.userId, fullName: person.fullName, role: person.role })),
    currentRole: value.currentRole,
    permissions: Object.fromEntries(keys.map((key) => [key, value.permissions[key]])),
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
