export class AdminProjectionError extends Error {
  constructor(message = 'Projex returned an invalid administrative response.') {
    super(message)
    this.name = 'AdminProjectionError'
  }
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function string(value) {
  return typeof value === 'string' ? value : null
}

function nullableString(value) {
  return value === null || typeof value === 'string' ? value : null
}

function number(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function countMap(value) {
  const source = object(value) ?? {}
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key, count]) => /^[A-Z][A-Z0-9_]*$/.test(key) && Number.isSafeInteger(count) && count >= 0),
  )
}

function requireIdentity(value, expectedId) {
  const id = string(value)
  if (!id || (expectedId && id !== expectedId)) throw new AdminProjectionError()
  return id
}

export function projectAdminUser(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  return {
    id: requireIdentity(source.id, expectedId),
    fullName: string(source.fullName) ?? '',
    universityEmail: string(source.universityEmail ?? source.email) ?? '',
    role: string(source.role) ?? 'UNKNOWN',
    status: string(source.status) ?? 'UNKNOWN',
    createdAt: nullableString(source.createdAt),
    updatedAt: nullableString(source.updatedAt),
  }
}

export function projectAdminManualSetup(value) {
  const source = object(value)
  const manualSetup = object(source?.manualSetup)
  const setupLink = string(manualSetup?.setupLink)
  const expiresAt = string(manualSetup?.expiresAt)
  if (!setupLink || !expiresAt) throw new AdminProjectionError()

  let parsed
  try {
    parsed = new URL(setupLink)
  } catch {
    throw new AdminProjectionError()
  }
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const token = fragment.get('token')
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    !parsed.pathname.endsWith('/account-setup') ||
    !token ||
    token.length < 32 ||
    Number.isNaN(Date.parse(expiresAt))
  ) {
    throw new AdminProjectionError()
  }
  return { setupLink, expiresAt }
}

export function projectAdminOverview(value) {
  const source = object(value)
  const users = object(source?.users)
  const academics = object(source?.academics)
  const repositories = object(source?.repositories)
  const operations = object(source?.operations)
  if (!source || !users || !academics || !repositories || !operations) {
    throw new AdminProjectionError()
  }
  const accountSetup = object(users.accountSetup) ?? {}
  const credentials = object(operations.gitCredentials) ?? {}
  return {
    generatedAt: nullableString(source.generatedAt),
    users: {
      total: number(users.total),
      byRole: countMap(users.byRole),
      byStatus: countMap(users.byStatus),
      accountSetup: {
        complete: number(accountSetup.complete),
        pending: number(accountSetup.pending),
        actionRequired: number(accountSetup.actionRequired),
      },
    },
    academics: {
      classesByStatus: countMap(academics.classesByStatus),
      membershipsByStatus: countMap(academics.membershipsByStatus),
      activitiesByStatus: countMap(academics.activitiesByStatus),
      submissionsByStatus: countMap(academics.submissionsByStatus),
      projectTasksByStatus: countMap(academics.projectTasksByStatus),
      teamsByStatus: countMap(academics.teamsByStatus),
    },
    repositories: {
      byType: countMap(repositories.byType),
      byLifecycle: countMap(repositories.byLifecycle),
      byStorage: countMap(repositories.byStorage),
      byReview: countMap(repositories.byReview),
      knownMeasuredBytes: string(repositories.knownMeasuredBytes) ?? '0',
      measuredRecords: number(repositories.measuredRecords),
      unmeasuredRecords: number(repositories.unmeasuredRecords),
    },
    operations: {
      executionJobsByStatus: countMap(operations.executionJobsByStatus),
      provisioningJobsByStatus: countMap(operations.provisioningJobsByStatus),
      gitCredentials: {
        active: number(credentials.active),
        expired: number(credentials.expired),
        revoked: number(credentials.revoked),
      },
    },
  }
}

export function projectAdminAccount(value, expectedId) {
  const source = object(value)
  if (!source) throw new AdminProjectionError()
  const userId = requireIdentity(source.userId, expectedId)
  const setup = object(source.accountSetup) ?? {}
  const sessions = object(source.sessions) ?? {}
  const memberships = Array.isArray(source.memberships) ? source.memberships : []
  return {
    userId,
    fullName: string(source.fullName) ?? '',
    universityEmail: string(source.universityEmail) ?? '',
    role: string(source.role) ?? 'UNKNOWN',
    status: string(source.status) ?? 'UNKNOWN',
    createdAt: nullableString(source.createdAt),
    updatedAt: nullableString(source.updatedAt),
    passwordChangedAt: nullableString(source.passwordChangedAt),
    lastLoginAt: nullableString(source.lastLoginAt),
    accountSetup: {
      state: string(setup.state) ?? 'UNKNOWN',
      lastIssuedAt: nullableString(setup.lastIssuedAt),
      expiresAt: nullableString(setup.expiresAt),
    },
    sessions: {
      active: number(sessions.active),
      revoked: number(sessions.revoked),
      expired: number(sessions.expired),
    },
    memberships: memberships.map((membership) => {
      const member = object(membership) ?? {}
      const classRecord = object(member.class) ?? {}
      return {
        memberId: string(member.memberId) ?? '',
        membershipStatus: string(member.membershipStatus) ?? 'UNKNOWN',
        joinedAt: nullableString(member.joinedAt),
        removedAt: nullableString(member.removedAt),
        lastActivatedAt: nullableString(member.lastActivatedAt),
        class: {
          classId: string(classRecord.classId) ?? '',
          className: string(classRecord.className) ?? '',
          section: string(classRecord.section) ?? '',
          status: string(classRecord.status) ?? 'UNKNOWN',
        },
      }
    }),
  }
}

export function assertMatchingAdminAccount(directoryUser, account, expectedId) {
  if (directoryUser.id !== expectedId || account.userId !== expectedId) throw new AdminProjectionError()
  if (
    directoryUser.fullName !== account.fullName ||
    directoryUser.universityEmail !== account.universityEmail ||
    directoryUser.role !== account.role ||
    directoryUser.status !== account.status
  ) {
    throw new AdminProjectionError('Projex returned conflicting administrative account records.')
  }
  return account
}
