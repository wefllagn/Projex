import { AdminProjectionError } from './admin-projections.js'

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function requiredText(value) {
  const result = text(value)
  if (!result) throw new AdminProjectionError()
  return result
}

function nullableText(value) {
  return value === null || typeof value === 'string' ? value : null
}

function identity(value, expectedId) {
  const id = requiredText(value)
  if (expectedId && id !== expectedId) throw new AdminProjectionError()
  return id
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function countMap(value) {
  const source = object(value) ?? {}
  return Object.fromEntries(Object.entries(source).filter(([key, item]) => (
    /^[A-Z][A-Z0-9_]*$/.test(key) && Number.isSafeInteger(item) && item >= 0
  )))
}

function enumValue(value, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new AdminProjectionError()
  return value
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

function jobBase(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const failureCode = nullableText(source.failureCode)
  return {
    source,
    jobId: identity(source.id ?? source.jobId, expectedId),
    status: requiredText(source.status),
    claimAttempt: count(source.claimAttempt),
    maxClaimAttempts: count(source.maxClaimAttempts),
    availableAt: nullableText(source.availableAt),
    claimedAt: nullableText(source.claimedAt),
    leaseExpiresAt: nullableText(source.leaseExpiresAt),
    completedAt: nullableText(source.completedAt),
    failureCode: failureCode && /^[A-Z][A-Z0-9_]{0,63}$/.test(failureCode) ? failureCode : null,
    createdAt: nullableText(source.createdAt),
    updatedAt: requiredText(source.updatedAt),
    stuck: source.stuck === true,
  }
}

export function projectOperationalHealth(value) {
  const source = object(value)
  const api = object(source?.api)
  const database = object(source?.database)
  const queues = object(source?.queues)
  const workerHealth = object(source?.workerHealth)
  if (!source || !api || !database || !queues || !workerHealth) throw new AdminProjectionError()
  const queueSource = enumValue(queues.source, [
    'persisted_job_and_lease_state',
    'database_unavailable',
    'query_unavailable',
  ])
  const result = {
    apiStatus: enumValue(api.status, ['available']),
    databaseStatus: enumValue(database.status, ['connected', 'unavailable']),
    queueSource,
    queueStatus: nullableText(queues.status),
    workerStatus: enumValue(workerHealth.status, ['not_observed']),
    timestamp: nullableText(source.timestamp),
    execution: null,
    repositoryProvisioning: null,
  }
  if (queueSource === 'persisted_job_and_lease_state') {
    const execution = object(queues.execution)
    const provisioning = object(queues.repositoryProvisioning)
    if (!execution || !provisioning) throw new AdminProjectionError()
    result.execution = {
      byStatus: countMap(execution.byStatus),
      stuck: count(execution.stuck),
    }
    result.repositoryProvisioning = {
      byStatus: countMap(provisioning.byStatus),
      stuck: count(provisioning.stuck),
    }
  }
  return result
}

export function projectStorageSummary(value) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const knownMeasuredBytes = requiredText(source.knownMeasuredBytes)
  if (!/^\d+$/.test(knownMeasuredBytes)) throw new AdminProjectionError()
  return {
    byStorageStatus: countMap(source.byStorageStatus),
    knownMeasuredBytes,
    measuredRecords: count(source.measuredRecords),
    unmeasuredRecords: count(source.unmeasuredRecords),
  }
}

export function projectExecutionJob(value, expectedId) {
  const base = jobBase(value, expectedId)
  return {
    jobId: base.jobId,
    jobType: enumValue(base.source.jobType, ['OFFICIAL_ASSESSMENT', 'VISIBLE_TEST_RUN']),
    submissionId: nullableText(base.source.submissionId),
    practiceExecutionId: nullableText(base.source.practiceExecutionId),
    status: enumValue(base.status, ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']),
    claimAttempt: base.claimAttempt,
    maxClaimAttempts: base.maxClaimAttempts,
    availableAt: base.availableAt,
    claimedAt: base.claimedAt,
    leaseExpiresAt: base.leaseExpiresAt,
    completedAt: base.completedAt,
    failureCode: base.failureCode,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    stuck: base.stuck,
  }
}

export function projectProvisioningJob(value, expectedId) {
  const base = jobBase(value, expectedId)
  return {
    jobId: base.jobId,
    repositoryId: identity(base.source.repositoryId),
    status: enumValue(base.status, ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']),
    claimAttempt: base.claimAttempt,
    maxClaimAttempts: base.maxClaimAttempts,
    availableAt: base.availableAt,
    claimedAt: base.claimedAt,
    leaseExpiresAt: base.leaseExpiresAt,
    completedAt: base.completedAt,
    failureCode: base.failureCode,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    stuck: base.stuck,
  }
}

export function projectGitCredential(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const operations = Array.isArray(source.allowedOperations)
    ? source.allowedOperations.filter((item) => item === 'READ' || item === 'WRITE')
    : []
  return {
    credentialId: identity(source.id ?? source.credentialId, expectedId),
    userId: identity(source.userId),
    repositoryId: identity(source.repositoryId),
    allowedOperations: operations,
    lifecycle: enumValue(source.lifecycle, ['ACTIVE', 'EXPIRED', 'REVOKED']),
    createdAt: nullableText(source.createdAt),
    expiresAt: nullableText(source.expiresAt),
    lastUsedAt: nullableText(source.lastUsedAt),
    revokedAt: nullableText(source.revokedAt),
  }
}

function safeAuditMetadata(action, value) {
  const source = object(value)
  if (!source) return null
  const values = {}
  const addText = (key) => {
    if (typeof source[key] === 'string') values[key] = source[key]
  }
  const addBoolean = (key) => {
    if (typeof source[key] === 'boolean') values[key] = source[key]
  }
  const addCount = (key) => {
    if (Number.isSafeInteger(source[key]) && source[key] >= 0) values[key] = source[key]
  }
  if (action === 'USER_STUDENT_PROVISIONED' || action === 'USER_INSTRUCTOR_PROVISIONED') {
    addText('provisionedRole'); addBoolean('initialClassAssigned')
  } else if (action === 'USER_SETUP_REISSUED') addText('setupState')
  else if (action === 'USER_STATUS_CHANGED') {
    addText('previousStatus'); addText('newStatus'); addCount('revokedSessionCount')
  } else if (action === 'USER_SESSIONS_REVOKED') addCount('revokedSessionCount')
  else if (action === 'CLASS_CREATED') addText('instructorId')
  else if (['CLASS_UPDATED', 'CLASS_ARCHIVED', 'CLASS_RESTORED', 'CLASS_JOIN_CODE_ROTATED', 'CLASS_JOIN_CODE_REVOKED'].includes(action)) addBoolean('changed')
  else if (action === 'CLASS_MEMBER_REMOVED' || action === 'CLASS_MEMBER_REACTIVATED') {
    addText('classId'); addText('studentId'); addBoolean('changed')
  } else if (action === 'GIT_CREDENTIAL_REVOKED') {
    addText('userId'); addText('repositoryId'); addText('previousLifecycle')
  } else if (action === 'REPOSITORY_PROVISIONING_RETRY_QUEUED') {
    addText('repositoryId'); addCount('claimAttempt'); addCount('previousMaxClaimAttempts')
    addCount('newMaxClaimAttempts'); addText('previousFailureCode'); addText('previousCompletedAt')
  }
  return Object.keys(values).length ? values : null
}

export function projectAuditEvent(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const action = requiredText(source.action)
  return {
    eventId: identity(source.id ?? source.eventId, expectedId),
    actor: safeUser(source.actorAdmin ?? source.actor),
    action,
    targetType: requiredText(source.targetType),
    targetId: nullableText(source.targetId),
    reason: nullableText(source.reason),
    requestId: nullableText(source.requestId),
    metadata: safeAuditMetadata(action, source.metadata),
    createdAt: nullableText(source.createdAt),
  }
}
