const REPOSITORY_TYPES = new Set(['CLASS_PROJECT', 'PERSONAL'])
const REPOSITORY_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
const STORAGE_STATUSES = new Set(['PENDING', 'PROVISIONING', 'READY', 'FAILED', 'QUARANTINED'])
const REVIEW_STATUSES = new Set(['WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'])

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
