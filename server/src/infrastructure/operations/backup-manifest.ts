import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat } from 'node:fs/promises'
import path from 'node:path'

import { OperationsSafetyError } from './operations-error.js'

export const BACKUP_MANIFEST_VERSION = 1 as const

export type BackupArtifact = Readonly<{
  filename: string
  bytes: number
  sha256: string
}>

export type BackupManifest = Readonly<{
  manifestVersion: typeof BACKUP_MANIFEST_VERSION
  backupId: string
  createdAt: string
  applicationCommit: string
  capabilityProfile: 'HOSTED_SAFE' | 'LOCAL_FULL'
  tools: Readonly<{ postgres: string; pgDump: string; git: string }>
  migrations: readonly string[]
  artifacts: readonly BackupArtifact[]
  counts: Readonly<Record<string, number>>
  repositoryStorageStates: Readonly<Record<string, number>>
  markerCount: number
  quarantineCount: number
  transitionalDirectoriesEmpty: true
}>

const BACKUP_ID = /^[a-z0-9][a-z0-9-]{7,63}$/
const SHA256 = /^[a-f0-9]{64}$/
const COMMIT = /^[a-f0-9]{7,64}$/
const SAFE_NAME = /^[A-Za-z0-9._-]+$/
const SAFE_KEY = /^[A-Za-z0-9_-]+$/
const REQUIRED_ARTIFACTS = new Set(['database.dump', 'git-storage.tar'])
const MANIFEST_KEYS = new Set([
  'manifestVersion', 'backupId', 'createdAt', 'applicationCommit', 'capabilityProfile',
  'tools', 'migrations', 'artifacts', 'counts', 'repositoryStorageStates', 'markerCount',
  'quarantineCount', 'transitionalDirectoriesEmpty',
])
const MAX_MANIFEST_BYTES = 1_048_576
const MAX_CHECKSUM_BYTES = 4_096

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSafeBoundedString(value: unknown, maximum = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum &&
    ![...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
}

function isNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function validateCountRecord(value: unknown): value is Readonly<Record<string, number>> {
  return isRecord(value) && Object.entries(value).every(([key, item]) => SAFE_KEY.test(key) && isNonnegativeInteger(item))
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return value
}

export function serializeManifest(manifest: BackupManifest): string {
  validateManifest(manifest)
  return `${JSON.stringify(canonical(manifest), null, 2)}\n`
}

export function manifestChecksum(manifest: BackupManifest): string {
  return createHash('sha256').update(serializeManifest(manifest)).digest('hex')
}

export function verifyManifestChecksum(manifest: BackupManifest, checksumFile: string): void {
  if (Buffer.byteLength(checksumFile) > MAX_CHECKSUM_BYTES) {
    throw new OperationsSafetyError('BACKUP_MANIFEST_CHECKSUM_INVALID')
  }
  const match = /^([a-f0-9]{64})\s+manifest\.json\s*$/.exec(checksumFile)
  if (!match || match[1] !== manifestChecksum(manifest)) {
    throw new OperationsSafetyError('BACKUP_MANIFEST_CHECKSUM_MISMATCH')
  }
}

export async function createArtifact(file: string): Promise<BackupArtifact> {
  const filename = path.basename(file)
  if (!SAFE_NAME.test(filename)) throw new OperationsSafetyError('MANIFEST_ARTIFACT_NAME_INVALID')
  const metadata = await lstat(file)
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new OperationsSafetyError('MANIFEST_ARTIFACT_NOT_FILE')
  const digest = createHash('sha256')
  let bytes = 0
  for await (const chunk of createReadStream(file)) {
    bytes += (chunk as Buffer).length
    digest.update(chunk as Buffer)
  }
  if (bytes !== metadata.size) throw new OperationsSafetyError('MANIFEST_ARTIFACT_CHANGED')
  return {
    filename,
    bytes: metadata.size,
    sha256: digest.digest('hex'),
  }
}

export async function verifyArtifact(root: string, artifact: BackupArtifact): Promise<void> {
  if (!SAFE_NAME.test(artifact.filename) || path.basename(artifact.filename) !== artifact.filename) {
    throw new OperationsSafetyError('MANIFEST_ARTIFACT_NAME_INVALID')
  }
  const actual = await createArtifact(path.join(root, artifact.filename))
  if (actual.bytes !== artifact.bytes || actual.sha256 !== artifact.sha256) {
    throw new OperationsSafetyError('BACKUP_ARTIFACT_CHECKSUM_MISMATCH')
  }
}

export function validateManifest(value: unknown): asserts value is BackupManifest {
  if (!isRecord(value) || Object.keys(value).some((key) => !MANIFEST_KEYS.has(key))) {
    throw new OperationsSafetyError('BACKUP_MANIFEST_INVALID')
  }
  const manifest = value as Partial<BackupManifest>
  if (manifest.manifestVersion !== BACKUP_MANIFEST_VERSION) {
    throw new OperationsSafetyError('BACKUP_MANIFEST_VERSION_INVALID')
  }
  if (typeof manifest.backupId !== 'string' || !BACKUP_ID.test(manifest.backupId)) throw new OperationsSafetyError('BACKUP_ID_INVALID')
  if (typeof manifest.applicationCommit !== 'string' || !COMMIT.test(manifest.applicationCommit)) throw new OperationsSafetyError('BACKUP_COMMIT_INVALID')
  if (typeof manifest.createdAt !== 'string' || Number.isNaN(Date.parse(manifest.createdAt)) || new Date(manifest.createdAt).toISOString() !== manifest.createdAt) {
    throw new OperationsSafetyError('BACKUP_TIMESTAMP_INVALID')
  }
  if (!['HOSTED_SAFE', 'LOCAL_FULL'].includes(manifest.capabilityProfile ?? '')) {
    throw new OperationsSafetyError('BACKUP_CAPABILITY_PROFILE_INVALID')
  }
  if (!isRecord(manifest.tools) || Object.keys(manifest.tools).sort().join(',') !== 'git,pgDump,postgres' ||
      !isSafeBoundedString(manifest.tools.postgres) || !isSafeBoundedString(manifest.tools.pgDump) || !isSafeBoundedString(manifest.tools.git)) {
    throw new OperationsSafetyError('BACKUP_TOOL_VERSION_INVALID')
  }
  if (!Array.isArray(manifest.migrations) || manifest.migrations.some((item) => typeof item !== 'string' || !SAFE_NAME.test(item))) {
    throw new OperationsSafetyError('BACKUP_MIGRATIONS_INVALID')
  }
  if (!manifest.transitionalDirectoriesEmpty) throw new OperationsSafetyError('BACKUP_NOT_QUIESCENT')
  if (!Array.isArray(manifest.artifacts)) throw new OperationsSafetyError('BACKUP_ARTIFACT_INVALID')
  const artifactNames = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (!isRecord(artifact) || Object.keys(artifact).sort().join(',') !== 'bytes,filename,sha256' ||
        typeof artifact.filename !== 'string' || !SAFE_NAME.test(artifact.filename) ||
        !isNonnegativeInteger(artifact.bytes) || typeof artifact.sha256 !== 'string' || !SHA256.test(artifact.sha256) ||
        artifactNames.has(artifact.filename)) {
      throw new OperationsSafetyError('BACKUP_ARTIFACT_INVALID')
    }
    artifactNames.add(artifact.filename)
  }
  if (artifactNames.size !== REQUIRED_ARTIFACTS.size || [...REQUIRED_ARTIFACTS].some((name) => !artifactNames.has(name))) {
    throw new OperationsSafetyError('BACKUP_ARTIFACT_SET_INVALID')
  }
  if (!validateCountRecord(manifest.counts) || !validateCountRecord(manifest.repositoryStorageStates) ||
      !isNonnegativeInteger(manifest.markerCount) || !isNonnegativeInteger(manifest.quarantineCount)) {
    throw new OperationsSafetyError('BACKUP_COUNTS_INVALID')
  }
  const serialized = JSON.stringify(manifest)
  if (/postgres(?:ql)?:\/\/|database_url|password|secret|credential|cookie|authorization|smtp|access.?token|[A-Za-z]:\\|\/(?:home|etc|opt|srv|tmp|var)\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) {
    throw new OperationsSafetyError('BACKUP_MANIFEST_SENSITIVE_VALUE')
  }
}

export function parseManifest(raw: string): BackupManifest {
  if (Buffer.byteLength(raw) > MAX_MANIFEST_BYTES) throw new OperationsSafetyError('BACKUP_MANIFEST_TOO_LARGE')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new OperationsSafetyError('BACKUP_MANIFEST_INVALID')
  }
  validateManifest(parsed)
  return parsed
}
