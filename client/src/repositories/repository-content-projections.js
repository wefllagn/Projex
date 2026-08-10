import { ApiError } from '../api/api-client.js'

const COMMIT_ID = /^[0-9a-f]{40}$/i
const OPERATIONS = new Set(['READ', 'WRITE'])

function invalidProjection() {
  return new ApiError({ code: 'INVALID_API_RESPONSE', message: 'Projex returned an invalid repository response.' })
}

function requiredString(value) {
  if (typeof value !== 'string' || value.length === 0) throw invalidProjection()
  return value
}

function nullableDate(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw invalidProjection()
  return value
}

function requiredDate(value) {
  const projected = nullableDate(value)
  if (!projected) throw invalidProjection()
  return projected
}

function commitId(value) {
  if (typeof value !== 'string' || !COMMIT_ID.test(value)) throw invalidProjection()
  return value.toLowerCase()
}

export function commitSummaryProjection(value = {}) {
  return {
    commitId: commitId(value.commitId),
    authorName: requiredString(value.authorName),
    authoredAt: requiredDate(value.authoredAt),
    subject: typeof value.subject === 'string' ? value.subject : '',
  }
}

export function repositoryGitSummaryProjection(value = {}, expectedRepository) {
  const expectedRepositoryId = typeof expectedRepository === 'string' ? expectedRepository : expectedRepository?.id
  if (value.repositoryId !== expectedRepositoryId) throw invalidProjection()
  if (
    typeof expectedRepository === 'object' &&
    (value.repositoryStatus !== expectedRepository.status || value.storageStatus !== expectedRepository.storageStatus)
  ) throw invalidProjection()
  if (typeof value.empty !== 'boolean') throw invalidProjection()
  return {
    repositoryId: value.repositoryId,
    repositoryStatus: requiredString(value.repositoryStatus),
    storageStatus: requiredString(value.storageStatus),
    empty: value.empty,
    defaultBranch: requiredString(value.defaultBranch),
    branchCount: Number.isSafeInteger(value.branchCount) && value.branchCount >= 0 ? value.branchCount : 0,
    commitCount: Number.isSafeInteger(value.commitCount) && value.commitCount >= 0 ? value.commitCount : 0,
    latestCommit: value.latestCommit ? commitSummaryProjection(value.latestCommit) : null,
  }
}

export function branchProjection(value = {}) {
  return {
    ...commitSummaryProjection(value),
    branchName: requiredString(value.branchName),
    isDefault: value.isDefault === true,
  }
}

export function commitDetailProjection(value = {}) {
  const summary = commitSummaryProjection(value)
  if (!Array.isArray(value.parentCommitIds) || !Array.isArray(value.files)) throw invalidProjection()
  return {
    ...summary,
    parentCommitIds: value.parentCommitIds.map(commitId),
    files: value.files.map((file) => ({
      status: requiredString(file?.status),
      path: requiredString(file?.path),
      ...(typeof file?.previousPath === 'string' ? { previousPath: file.previousPath } : {}),
    })),
  }
}

export function treeProjection(value = {}) {
  if (!Array.isArray(value.entries)) throw invalidProjection()
  return {
    commitId: value.commitId === null ? null : commitId(value.commitId),
    path: typeof value.path === 'string' ? value.path : '',
    entries: value.entries.map((entry) => {
      if (!['tree', 'blob'].includes(entry?.entryType)) throw invalidProjection()
      return {
        name: requiredString(entry.name),
        path: requiredString(entry.path),
        entryType: entry.entryType,
        objectId: commitId(entry.objectId),
        sizeBytes: entry.sizeBytes === null || (Number.isSafeInteger(entry.sizeBytes) && entry.sizeBytes >= 0)
          ? entry.sizeBytes
          : null,
      }
    }),
  }
}

export function fileProjection(value = {}) {
  if (value.encoding !== 'utf-8' || typeof value.content !== 'string') throw invalidProjection()
  return {
    commitId: commitId(value.commitId),
    path: requiredString(value.path),
    sizeBytes: Number.isSafeInteger(value.sizeBytes) && value.sizeBytes >= 0 ? value.sizeBytes : 0,
    encoding: 'utf-8',
    content: value.content,
  }
}

export function diffProjection(value = {}) {
  if (typeof value.patch !== 'string') throw invalidProjection()
  return {
    baseCommitId: commitId(value.baseCommitId),
    targetCommitId: commitId(value.targetCommitId),
    path: typeof value.path === 'string' ? value.path : null,
    patch: value.patch,
  }
}

export function credentialProjection(value = {}) {
  if (!Array.isArray(value.operations) || value.operations.some((operation) => !OPERATIONS.has(operation))) {
    throw invalidProjection()
  }
  return {
    credentialId: requiredString(value.credentialId),
    repositoryId: requiredString(value.repositoryId),
    operations: [...value.operations],
    createdAt: nullableDate(value.createdAt),
    expiresAt: nullableDate(value.expiresAt),
    lastUsedAt: nullableDate(value.lastUsedAt),
    revokedAt: nullableDate(value.revokedAt),
  }
}

export function issuedCredentialProjection(value = {}, expectedRepositoryId) {
  const credential = credentialProjection(value)
  if (credential.repositoryId !== expectedRepositoryId) throw invalidProjection()
  return {
    ...credential,
    username: requiredString(value.username),
    secret: requiredString(value.secret),
  }
}
