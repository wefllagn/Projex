import { lstat, readFile, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'

import { parseManifest, verifyArtifact, verifyManifestChecksum, type BackupManifest } from './backup-manifest.js'
import { OperationsSafetyError } from './operations-error.js'
import { validateRestorePaths } from './path-guards.js'
import { buildPgRestorePlan } from './postgres-tools.js'
import type { CommandPlan } from './process-runner.js'

export type RestoreEvidence = Readonly<{
  manifestValid: boolean
  artifactsValid: boolean
  migrationHistoryMatches: boolean
  safeCountsMatch: boolean
  relationshipsValid: boolean
  markersValid: boolean
  repositoryCorrespondenceValid: boolean
  gitFsckPassed: boolean
  orphanRepositories: number
  capabilityProfile: 'HOSTED_SAFE' | 'LOCAL_FULL'
  healthStatus: 'ok' | 'unavailable'
  syntheticAuthentication: 'passed' | 'failed' | 'not-run'
}>

export type RestoredRepositoryRecord = Readonly<{
  repositoryId: string
  provisioningJobId: string
  storagePath: string
}>

export type RestoredStateObservation = Readonly<{
  migrations: readonly string[]
  counts: Readonly<Record<string, number>>
  repositoryStorageStates: Readonly<Record<string, number>>
  markerCount: number
  quarantineCount: number
  relationshipsValid: boolean
  repositoryCorrespondenceValid: boolean
  gitFsckPassed: boolean
  orphanRepositories: number
  capabilityProfile: RestoreEvidence['capabilityProfile']
  healthStatus: RestoreEvidence['healthStatus']
  syntheticAuthentication: RestoreEvidence['syntheticAuthentication']
}>

const REPOSITORY_MARKER = 'projex-repository.json'

function within(root: string, candidate: string): boolean {
  const normalizedRoot = process.platform === 'win32' ? root.toLowerCase() : root
  const normalizedCandidate = process.platform === 'win32' ? candidate.toLowerCase() : candidate
  return normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
}

export async function verifyRepositoryCorrespondence(
  restoreGitRoot: string,
  repositories: readonly RestoredRepositoryRecord[],
): Promise<{ verifiedRepositories: number; orphanRepositories: number }> {
  const canonicalRoot = await realpath(restoreGitRoot)
  const expectedDirectories = new Set<string>()
  for (const repository of repositories) {
    if (path.isAbsolute(repository.storagePath) || repository.storagePath.includes('..')) {
      throw new OperationsSafetyError('RESTORED_REPOSITORY_PATH_INVALID')
    }
    const repositoryPath = path.resolve(canonicalRoot, repository.storagePath)
    if (!within(canonicalRoot, repositoryPath)) throw new OperationsSafetyError('RESTORED_REPOSITORY_PATH_INVALID')
    const canonicalRepository = await realpath(repositoryPath).catch(() => {
      throw new OperationsSafetyError('RESTORED_REPOSITORY_MISSING')
    })
    if (!within(canonicalRoot, canonicalRepository)) throw new OperationsSafetyError('RESTORED_REPOSITORY_PATH_INVALID')
    const metadata = await lstat(canonicalRepository)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new OperationsSafetyError('RESTORED_REPOSITORY_PATH_INVALID')
    let marker: unknown
    try {
      marker = JSON.parse(await readFile(path.join(canonicalRepository, REPOSITORY_MARKER), 'utf8'))
    } catch {
      throw new OperationsSafetyError('RESTORED_REPOSITORY_MARKER_INVALID')
    }
    if (!marker || typeof marker !== 'object' || Array.isArray(marker) ||
        (marker as Record<string, unknown>).version !== 1 ||
        (marker as Record<string, unknown>).repositoryId !== repository.repositoryId ||
        (marker as Record<string, unknown>).provisioningJobId !== repository.provisioningJobId) {
      throw new OperationsSafetyError('RESTORED_REPOSITORY_MARKER_INVALID')
    }
    if (expectedDirectories.has(canonicalRepository)) throw new OperationsSafetyError('RESTORED_REPOSITORY_PATH_DUPLICATE')
    expectedDirectories.add(canonicalRepository)
  }

  const discovered = new Set<string>()
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    })) {
      const candidate = path.join(directory, entry.name)
      const metadata = await lstat(candidate)
      if (metadata.isSymbolicLink()) throw new OperationsSafetyError('RESTORED_REPOSITORY_LINK_REJECTED')
      if (!entry.isDirectory()) continue
      const markerExists = await lstat(path.join(candidate, REPOSITORY_MARKER)).then((item) => item.isFile(), () => false)
      if (markerExists) discovered.add(await realpath(candidate))
      else await walk(candidate)
    }
  }
  await walk(path.join(canonicalRoot, 'repositories'))
  const orphanRepositories = [...discovered].filter((item) => !expectedDirectories.has(item)).length
  if (orphanRepositories > 0) throw new OperationsSafetyError('RESTORED_REPOSITORY_ORPHANED')
  return { verifiedRepositories: expectedDirectories.size, orphanRepositories }
}

export async function buildRestoreVerificationPlan(input: {
  projectRoot: string
  backupSourceRoot: string
  restoreGitRoot: string
  normalGitStorageRoot?: string
  testGitStorageRoot?: string
  restoreDatabaseUrl?: string
  pgRestoreExecutable: string
  gitExecutable: string
  manifestRaw: string
  manifestChecksumRaw: string
}): Promise<{
  manifest: BackupManifest
  databaseRestore: CommandPlan
  gitFsck(repositoryPath: string): CommandPlan
}> {
  if (!input.restoreDatabaseUrl) throw new OperationsSafetyError('RESTORE_DATABASE_URL_REQUIRED')
  if (!path.isAbsolute(input.gitExecutable)) throw new OperationsSafetyError('GIT_EXECUTABLE_NOT_ABSOLUTE')
  const safePaths = await validateRestorePaths(input)
  const manifest = parseManifest(input.manifestRaw)
  verifyManifestChecksum(manifest, input.manifestChecksumRaw)
  for (const artifact of manifest.artifacts) await verifyArtifact(safePaths.backupSourceRoot, artifact)
  const databaseArtifact = manifest.artifacts.find((item) => item.filename === 'database.dump')
  if (!databaseArtifact) throw new OperationsSafetyError('DATABASE_BACKUP_ARTIFACT_REQUIRED')
  return {
    manifest,
    databaseRestore: buildPgRestorePlan({
      executable: input.pgRestoreExecutable,
      restoreDatabaseUrl: input.restoreDatabaseUrl,
      inputFile: path.join(safePaths.backupSourceRoot, databaseArtifact.filename),
    }),
    gitFsck(repositoryPath: string) {
      if (!path.isAbsolute(repositoryPath)) throw new OperationsSafetyError('GIT_REPOSITORY_PATH_NOT_ABSOLUTE')
      const resolved = path.resolve(repositoryPath)
      if (!resolved.startsWith(`${path.resolve(safePaths.restoreGitRoot)}${path.sep}`)) {
        throw new OperationsSafetyError('GIT_REPOSITORY_OUTSIDE_RESTORE_ROOT')
      }
      return {
        executable: path.resolve(input.gitExecutable),
        args: ['--git-dir', resolved, 'fsck', '--full'],
        environment: {
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
          GIT_TERMINAL_PROMPT: '0',
        },
      }
    },
  }
}

export function sanitizeRestoreEvidence(evidence: RestoreEvidence): RestoreEvidence {
  return Object.freeze({ ...evidence })
}

function recordsMatch(left: Readonly<Record<string, number>>, right: Readonly<Record<string, number>>): boolean {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b))
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries)
}

export function buildRestoreEvidence(manifest: BackupManifest, observed: RestoredStateObservation): RestoreEvidence {
  if (manifest.capabilityProfile !== observed.capabilityProfile) {
    throw new OperationsSafetyError('RESTORE_CAPABILITY_PROFILE_MISMATCH')
  }
  return sanitizeRestoreEvidence({
    manifestValid: true,
    artifactsValid: true,
    migrationHistoryMatches: JSON.stringify(manifest.migrations) === JSON.stringify(observed.migrations),
    safeCountsMatch: recordsMatch(manifest.counts, observed.counts) &&
      recordsMatch(manifest.repositoryStorageStates, observed.repositoryStorageStates) &&
      manifest.quarantineCount === observed.quarantineCount,
    relationshipsValid: observed.relationshipsValid,
    markersValid: manifest.markerCount === observed.markerCount,
    repositoryCorrespondenceValid: observed.repositoryCorrespondenceValid,
    gitFsckPassed: observed.gitFsckPassed,
    orphanRepositories: observed.orphanRepositories,
    capabilityProfile: observed.capabilityProfile,
    healthStatus: observed.healthStatus,
    syntheticAuthentication: observed.syntheticAuthentication,
  })
}
