import { AdminProjectionError } from './admin-projections.js'

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function nullableText(value) {
  return value === null || typeof value === 'string' ? value : null
}

function requiredText(value) {
  const result = text(value)
  if (!result) throw new AdminProjectionError()
  return result
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function decimal(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function identity(value, expectedId) {
  const id = text(value)
  if (!id || (expectedId && id !== expectedId)) throw new AdminProjectionError()
  return id
}

function safeUser(value) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    userId: identity(source.id ?? source.userId),
    fullName: text(source.fullName),
    universityEmail: text(source.email ?? source.universityEmail),
  }
}

function safeClass(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    classId: identity(source.id ?? source.classId, expectedId),
    className: text(source.className),
    section: text(source.section),
    semester: text(source.semester),
    schoolYear: text(source.schoolYear),
    status: text(source.status, 'UNKNOWN'),
  }
}

function counts(value) {
  const source = object(value) ?? {}
  return Object.fromEntries(Object.entries(source).filter(([, item]) => Number.isSafeInteger(item) && item >= 0))
}

export function projectGovernedClass(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const instructor = object(source.instructor)
  if (!instructor) throw new AdminProjectionError()
  return {
    ...safeClass(source, expectedId),
    createdAt: nullableText(source.createdAt),
    updatedAt: requiredText(source.updatedAt),
    archivedAt: nullableText(source.archivedAt),
    instructor: {
      userId: identity(instructor.userId ?? instructor.id),
      fullName: text(instructor.fullName),
      universityEmail: text(instructor.email ?? instructor.universityEmail),
    },
    membershipCounts: counts(source.membershipCounts),
  }
}

export function projectJoinCode(value, expectedClassId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const active = source.active === true
  return {
    classId: identity(source.classId, expectedClassId),
    classCode: active ? text(source.classCode) : '',
    active,
    changedAt: nullableText(source.changedAt),
  }
}

export function projectDetailedRosterMember(value, expectedMemberId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    memberId: identity(source.memberId, expectedMemberId),
    userId: identity(source.userId),
    fullName: text(source.fullName),
    universityEmail: text(source.email ?? source.universityEmail),
    userStatus: text(source.userStatus, 'UNKNOWN'),
    membershipStatus: text(source.membershipStatus, 'UNKNOWN'),
    joinedAt: nullableText(source.joinedAt),
    updatedAt: requiredText(source.updatedAt),
    removedAt: nullableText(source.removedAt),
    lastActivatedAt: nullableText(source.lastActivatedAt),
  }
}

export function projectAcademicClass(value) {
  return projectGovernedClass(value)
}

export function projectAcademicActivity(value) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    activityId: identity(source.id),
    title: text(source.title),
    status: text(source.status, 'UNKNOWN'),
    language: text(source.language, 'UNKNOWN'),
    dueDate: nullableText(source.dueDate),
    totalPoints: decimal(source.totalPoints),
    maxAttempts: count(source.maxAttempts),
    testCaseCount: count(source.testCaseCount),
    testCasePointTotal: decimal(source.testCasePointTotal),
    submissionCount: count(source.submissionCount),
    createdAt: nullableText(source.createdAt),
    updatedAt: nullableText(source.updatedAt),
    publishedAt: nullableText(source.publishedAt),
    closedAt: nullableText(source.closedAt),
    archivedAt: nullableText(source.archivedAt),
    class: safeClass(source.class),
    createdBy: safeUser(source.createdBy),
  }
}

export function projectAcademicSubmission(value) {
  const source = object(value)
  const activity = object(source?.activity)
  if (!source || !activity) throw new AdminProjectionError()
  const status = text(source.submissionStatus, 'UNKNOWN')
  return {
    submissionId: identity(source.id),
    attemptNumber: count(source.attemptNumber),
    submissionStatus: status,
    isLate: source.isLate === true,
    submittedAt: nullableText(source.submittedAt),
    updatedAt: nullableText(source.updatedAt),
    reviewedAt: nullableText(source.reviewedAt),
    releasedAt: nullableText(source.releasedAt),
    releasedScore: status === 'RELEASED' && typeof source.releasedScore === 'number' ? source.releasedScore : null,
    student: safeUser(source.student),
    activity: {
      activityId: identity(activity.id),
      title: text(activity.title),
      status: text(activity.status, 'UNKNOWN'),
      class: safeClass(activity.class),
    },
  }
}

export function projectAcademicProjectTask(value) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    projectTaskId: identity(source.id),
    title: text(source.title),
    status: text(source.status, 'UNKNOWN'),
    dueDate: nullableText(source.dueDate),
    maxTeamSize: count(source.maxTeamSize),
    createdAt: nullableText(source.createdAt),
    updatedAt: nullableText(source.updatedAt),
    publishedAt: nullableText(source.publishedAt),
    closedAt: nullableText(source.closedAt),
    archivedAt: nullableText(source.archivedAt),
    class: safeClass(source.class),
    createdBy: safeUser(source.createdBy),
    counts: counts(source.counts),
  }
}

export function projectAcademicRepository(value) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const projectTask = object(source.projectTask)
  const team = object(source.team)
  return {
    repositoryId: identity(source.id),
    repositoryType: text(source.repositoryType, 'UNKNOWN'),
    repositoryName: text(source.repositoryName),
    slug: text(source.slug),
    visibility: text(source.visibility, 'UNKNOWN'),
    status: text(source.status, 'UNKNOWN'),
    reviewStatus: text(source.reviewStatus, 'UNKNOWN'),
    storageStatus: text(source.storageStatus, 'UNKNOWN'),
    storageSizeBytes: nullableText(source.storageSizeBytes),
    createdAt: nullableText(source.createdAt),
    updatedAt: nullableText(source.updatedAt),
    provisionedAt: nullableText(source.provisionedAt),
    storageVerifiedAt: nullableText(source.storageVerifiedAt),
    readyForReviewAt: nullableText(source.readyForReviewAt),
    approvedAt: nullableText(source.approvedAt),
    archivedAt: nullableText(source.archivedAt),
    owner: safeUser(source.owner),
    projectTask: projectTask ? {
      projectTaskId: identity(projectTask.id),
      title: text(projectTask.title),
      status: text(projectTask.status, 'UNKNOWN'),
      class: safeClass(projectTask.class),
    } : null,
    team: team ? {
      teamId: identity(team.id),
      name: text(team.name),
      status: text(team.status, 'UNKNOWN'),
      leadStudentId: identity(team.leadStudentId),
    } : null,
    counts: counts(source.counts),
  }
}
