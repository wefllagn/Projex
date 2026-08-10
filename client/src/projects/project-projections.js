const PROJECT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'])
const DUE_STATES = new Set(['DRAFT', 'OPEN', 'PAST_DUE', 'CLOSED', 'ARCHIVED'])

function safeDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

export function projectTaskProjection(value = {}) {
  return {
    id: typeof value.id === 'string' ? value.id : '',
    classId: typeof value.classId === 'string' ? value.classId : '',
    title: typeof value.title === 'string' ? value.title : '',
    instructions: typeof value.instructions === 'string' ? value.instructions : '',
    dueDate: safeDate(value.dueDate),
    dueState: DUE_STATES.has(value.dueState) ? value.dueState : 'CLOSED',
    maxTeamSize: Number.isInteger(value.maxTeamSize) ? value.maxTeamSize : 0,
    status: PROJECT_STATUSES.has(value.status) ? value.status : 'CLOSED',
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt),
    publishedAt: safeDate(value.publishedAt),
    closedAt: safeDate(value.closedAt),
    archivedAt: safeDate(value.archivedAt),
    createdBy: {
      userId: typeof value.createdBy?.userId === 'string' ? value.createdBy.userId : '',
      fullName: typeof value.createdBy?.fullName === 'string' ? value.createdBy.fullName : '',
    },
  }
}

export function teamSummaryProjection(value = {}) {
  const repository = value.repository && typeof value.repository.repositoryId === 'string'
    ? {
        repositoryId: value.repository.repositoryId,
        repositoryName: typeof value.repository.repositoryName === 'string' ? value.repository.repositoryName : '',
        status: typeof value.repository.status === 'string' ? value.repository.status : '',
        reviewStatus: typeof value.repository.reviewStatus === 'string' ? value.repository.reviewStatus : '',
      }
    : null
  return {
    teamId: typeof value.teamId === 'string' ? value.teamId : '',
    name: typeof value.name === 'string' ? value.name : '',
    status: typeof value.status === 'string' ? value.status : '',
    lead: {
      userId: typeof value.lead?.userId === 'string' ? value.lead.userId : '',
      fullName: typeof value.lead?.fullName === 'string' ? value.lead.fullName : '',
    },
    activeMemberCount: Number.isInteger(value.activeMemberCount) ? value.activeMemberCount : 0,
    repository,
  }
}

export function monitoringProjection(value = {}) {
  const statuses = value.repositoriesByReviewStatus ?? {}
  return {
    projectTaskId: typeof value.projectTaskId === 'string' ? value.projectTaskId : '',
    teamCount: Number.isInteger(value.teamCount) ? value.teamCount : 0,
    repositoryCount: Number.isInteger(value.repositoryCount) ? value.repositoryCount : 0,
    activeMemberCount: Number.isInteger(value.activeMemberCount) ? value.activeMemberCount : 0,
    pendingInvitationCount: Number.isInteger(value.pendingInvitationCount) ? value.pendingInvitationCount : 0,
    repositoriesByReviewStatus: {
      WORKING: Number.isInteger(statuses.WORKING) ? statuses.WORKING : 0,
      READY_FOR_REVIEW: Number.isInteger(statuses.READY_FOR_REVIEW) ? statuses.READY_FOR_REVIEW : 0,
      CHANGES_REQUESTED: Number.isInteger(statuses.CHANGES_REQUESTED) ? statuses.CHANGES_REQUESTED : 0,
      APPROVED: Number.isInteger(statuses.APPROVED) ? statuses.APPROVED : 0,
    },
  }
}

export function projectMatchesClass(projectTask, selectedClass) {
  return Boolean(projectTask?.id && selectedClass?.id && projectTask.classId === selectedClass.id)
}

export function formatProjectDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatProjectStatus(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function projectPayload(form) {
  return {
    title: form.title.trim(),
    instructions: form.instructions.trim(),
    dueDate: new Date(form.dueDate).toISOString(),
    maxTeamSize: Number(form.maxTeamSize),
  }
}

export function validateProjectForm(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Enter a project title.'
  if (!form.instructions.trim()) errors.instructions = 'Enter project instructions.'
  if (!form.dueDate || Number.isNaN(Date.parse(form.dueDate))) errors.dueDate = 'Choose a valid deadline.'
  const size = Number(form.maxTeamSize)
  if (!Number.isInteger(size) || size < 2 || size > 8) errors.maxTeamSize = 'Team size must be from 2 to 8.'
  return errors
}
