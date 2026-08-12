import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { BACKUP_MANIFEST_VERSION, createArtifact, manifestChecksum, parseManifest, serializeManifest, validateManifest, verifyArtifact, verifyManifestChecksum, type BackupManifest } from './backup-manifest.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((item) => rm(item, { recursive: true, force: true }))))

function manifest(artifacts: BackupManifest['artifacts'] = [
  { filename: 'database.dump', bytes: 1, sha256: '1'.repeat(64) },
  { filename: 'git-storage.tar', bytes: 1, sha256: '2'.repeat(64) },
]): BackupManifest {
  return {
    manifestVersion: BACKUP_MANIFEST_VERSION,
    backupId: 'run-20260813',
    createdAt: '2026-08-13T00:00:00.000Z',
    applicationCommit: '40b91f3466b65412dd25dcce208818fa0050622c',
    capabilityProfile: 'HOSTED_SAFE',
    tools: { postgres: '18.4', pgDump: '18.4', git: '2.55.0' },
    migrations: ['20260730000000_init_core_schema'],
    artifacts,
    counts: { users: 3, repositories: 1 },
    repositoryStorageStates: { READY: 1 },
    markerCount: 1,
    quarantineCount: 0,
    transitionalDirectoriesEmpty: true,
  }
}

describe('backup manifest', () => {
  it('serializes and hashes deterministically without sensitive values', () => {
    const first = manifestChecksum(manifest())
    expect(manifestChecksum(manifest())).toBe(first)
    expect(serializeManifest(manifest())).not.toMatch(/password|database_url|C:\\Users\\/i)
  })

  it('rejects sensitive values', () => {
    const unsafe = { ...manifest(), tools: { postgres: 'postgresql://user:secret@host/db', pgDump: '18', git: '2' } }
    expect(() => validateManifest(unsafe)).toThrowError('BACKUP_MANIFEST_SENSITIVE_VALUE')
    expect(() => validateManifest({ ...manifest(), tools: { postgres: '18', pgDump: '18', git: 'operator@example.edu' } })).toThrowError('BACKUP_MANIFEST_SENSITIVE_VALUE')
  })

  it('rejects malformed or incomplete manifests with stable errors', () => {
    expect(() => validateManifest(null)).toThrowError('BACKUP_MANIFEST_INVALID')
    expect(() => validateManifest({ ...manifest(), artifacts: [] })).toThrowError('BACKUP_ARTIFACT_SET_INVALID')
    expect(() => validateManifest({ ...manifest(), unexpected: 'value' })).toThrowError('BACKUP_MANIFEST_INVALID')
  })

  it('bounds manifest and checksum control files', () => {
    expect(() => parseManifest(' '.repeat(1_048_577))).toThrowError('BACKUP_MANIFEST_TOO_LARGE')
    expect(() => verifyManifestChecksum(manifest(), '0'.repeat(4_097))).toThrowError('BACKUP_MANIFEST_CHECKSUM_INVALID')
  })

  it('verifies the separate manifest checksum record', () => {
    const value = manifest()
    expect(() => verifyManifestChecksum(value, `${manifestChecksum(value)}  manifest.json\n`)).not.toThrow()
    expect(() => verifyManifestChecksum(value, `${'0'.repeat(64)}  manifest.json\n`)).toThrowError('BACKUP_MANIFEST_CHECKSUM_MISMATCH')
  })

  it('creates and verifies artifact checksums and detects changes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-manifest-'))
    roots.push(root)
    const file = path.join(root, 'database.dump')
    await writeFile(file, 'safe fixture')
    const artifact = await createArtifact(file)
    await expect(verifyArtifact(root, artifact)).resolves.toBeUndefined()
    await writeFile(file, 'changed fixture')
    await expect(verifyArtifact(root, artifact)).rejects.toThrowError('BACKUP_ARTIFACT_CHECKSUM_MISMATCH')
  })
})
