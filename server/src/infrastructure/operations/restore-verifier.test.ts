import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { BACKUP_MANIFEST_VERSION, createArtifact, manifestChecksum, serializeManifest, type BackupManifest } from './backup-manifest.js'
import { runCommand } from './process-runner.js'
import { buildRestoreEvidence, buildRestoreVerificationPlan, sanitizeRestoreEvidence, verifyRepositoryCorrespondence } from './restore-verifier.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((item) => rm(item, { recursive: true, force: true }))))

describe('restore verification framework', () => {
  it('validates artifacts and creates safe restore/fsck argument arrays', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-restore-'))
    roots.push(root)
    const project = path.join(root, 'project'); const backup = path.join(root, 'backup')
    await mkdir(project); await mkdir(backup)
    await writeFile(path.join(backup, 'database.dump'), 'database fixture')
    await writeFile(path.join(backup, 'git-storage.tar'), 'git fixture')
    const artifacts = await Promise.all(['database.dump', 'git-storage.tar'].map((name) => createArtifact(path.join(backup, name))))
    const manifest: BackupManifest = {
      manifestVersion: BACKUP_MANIFEST_VERSION, backupId: 'run-20260813', createdAt: '2026-08-13T00:00:00.000Z',
      applicationCommit: '40b91f3', capabilityProfile: 'HOSTED_SAFE', tools: { postgres: '18', pgDump: '18', git: '2.55' },
      migrations: [], artifacts, counts: {}, repositoryStorageStates: {}, markerCount: 0, quarantineCount: 0,
      transitionalDirectoriesEmpty: true,
    }
    const restoreRoot = path.join(root, 'restored-git')
    const plan = await buildRestoreVerificationPlan({
      projectRoot: project, backupSourceRoot: backup, restoreGitRoot: restoreRoot,
      restoreDatabaseUrl: 'postgresql://restore:secret@localhost/projex_restore_verify_run123',
      pgRestoreExecutable: path.join(root, 'pg_restore'), gitExecutable: path.join(root, 'git'),
      manifestRaw: serializeManifest(manifest),
      manifestChecksumRaw: `${manifestChecksum(manifest)}  manifest.json\n`,
    })
    expect(plan.databaseRestore.args.join(' ')).not.toContain('secret')
    expect(plan.gitFsck(path.join(restoreRoot, 'repo.git')).args).toEqual(['--git-dir', path.join(restoreRoot, 'repo.git'), 'fsck', '--full'])
    expect(() => plan.gitFsck(path.join(root, 'outside.git'))).toThrowError('GIT_REPOSITORY_OUTSIDE_RESTORE_ROOT')
  })

  it('requires an explicit restore database URL and exposes only allowlisted evidence', async () => {
    await expect(buildRestoreVerificationPlan({
      projectRoot: path.resolve('project'), backupSourceRoot: path.resolve('backup'), restoreGitRoot: path.resolve('restore'),
      pgRestoreExecutable: path.resolve('pg_restore'), gitExecutable: path.resolve('git'), manifestRaw: '{}', manifestChecksumRaw: '',
    })).rejects.toThrowError('RESTORE_DATABASE_URL_REQUIRED')
    expect(sanitizeRestoreEvidence({ manifestValid: true, artifactsValid: true, migrationHistoryMatches: true, safeCountsMatch: true, relationshipsValid: true, markersValid: true, repositoryCorrespondenceValid: true, gitFsckPassed: true, orphanRepositories: 0, capabilityProfile: 'HOSTED_SAFE', healthStatus: 'ok', syntheticAuthentication: 'passed' })).not.toHaveProperty('databaseUrl')
  })

  it('compares only safe restored-state evidence against the manifest', () => {
    const manifest: BackupManifest = {
      manifestVersion: BACKUP_MANIFEST_VERSION, backupId: 'run-20260813', createdAt: '2026-08-13T00:00:00.000Z',
      applicationCommit: '40b91f3', capabilityProfile: 'HOSTED_SAFE', tools: { postgres: '18', pgDump: '18', git: '2.55' },
      migrations: ['migration-1'], artifacts: [
        { filename: 'database.dump', bytes: 1, sha256: '1'.repeat(64) },
        { filename: 'git-storage.tar', bytes: 1, sha256: '2'.repeat(64) },
      ], counts: { users: 2 }, repositoryStorageStates: { READY: 1 }, markerCount: 1, quarantineCount: 0,
      transitionalDirectoriesEmpty: true,
    }
    const evidence = buildRestoreEvidence(manifest, {
      migrations: ['migration-1'], counts: { users: 2 }, repositoryStorageStates: { READY: 1 }, markerCount: 1,
      quarantineCount: 0, relationshipsValid: true, repositoryCorrespondenceValid: true, gitFsckPassed: true,
      orphanRepositories: 0, capabilityProfile: 'HOSTED_SAFE', healthStatus: 'ok', syntheticAuthentication: 'passed',
    })
    expect(evidence).toMatchObject({ migrationHistoryMatches: true, safeCountsMatch: true, markersValid: true })
    expect(buildRestoreEvidence(manifest, {
      migrations: [], counts: { users: 3 }, repositoryStorageStates: { READY: 1 }, markerCount: 0,
      quarantineCount: 0, relationshipsValid: false, repositoryCorrespondenceValid: false, gitFsckPassed: false,
      orphanRepositories: 1, capabilityProfile: 'HOSTED_SAFE', healthStatus: 'unavailable', syntheticAuthentication: 'failed',
    })).toMatchObject({ migrationHistoryMatches: false, safeCountsMatch: false, relationshipsValid: false, markersValid: false })
  })

  it('passes shell metacharacters as one literal argument', async () => {
    const result = await runCommand({ executable: process.execPath, args: ['-e', 'process.stdout.write(process.argv[1])', 'literal;echo-not-executed'] })
    expect(result.stdout).toBe('literal;echo-not-executed')
  })

  it('does not pass unrelated parent secrets into an operations child', async () => {
    process.env.PROJEX_OPERATION_SECRET_FIXTURE = 'must-not-be-inherited'
    try {
      const result = await runCommand({
        executable: process.execPath,
        args: ['-e', "process.stdout.write(process.env.PROJEX_OPERATION_SECRET_FIXTURE ?? 'absent')"],
      })
      expect(result.stdout).toBe('absent')
    } finally {
      delete process.env.PROJEX_OPERATION_SECRET_FIXTURE
    }
  })

  it('matches restored database repository records to filesystem markers and detects orphans', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-restore-markers-'))
    roots.push(root)
    const repositoryId = '11111111-1111-4111-8111-111111111111'
    const provisioningJobId = '22222222-2222-4222-8222-222222222222'
    const canonicalLocator = `repositories/11/11/${repositoryId}.git`
    const legacyWindowsLocator = `repositories\\11\\11\\${repositoryId}.git`
    const repositoryPath = path.join(root, 'repositories', '11', '11', `${repositoryId}.git`)
    await mkdir(repositoryPath, { recursive: true })
    await writeFile(path.join(repositoryPath, 'projex-repository.json'), JSON.stringify({ version: 1, repositoryId, provisioningJobId }))
    const canonicalRepositoryPath = await realpath(repositoryPath)
    await expect(verifyRepositoryCorrespondence(root, [{ repositoryId, provisioningJobId, storagePath: canonicalLocator }])).resolves.toEqual({
      verifiedRepositories: 1,
      orphanRepositories: 0,
      repositoryPaths: [canonicalRepositoryPath],
    })
    await expect(verifyRepositoryCorrespondence(root, [{ repositoryId, provisioningJobId, storagePath: legacyWindowsLocator }])).resolves.toEqual({
      verifiedRepositories: 1,
      orphanRepositories: 0,
      repositoryPaths: [canonicalRepositoryPath],
    })
    const orphanId = '33333333-3333-4333-8333-333333333333'
    const orphan = path.join(root, 'repositories', '33', '33', `${orphanId}.git`)
    await mkdir(orphan, { recursive: true })
    await writeFile(path.join(orphan, 'projex-repository.json'), JSON.stringify({ version: 1, repositoryId: orphanId, provisioningJobId: '44444444-4444-4444-8444-444444444444' }))
    await expect(verifyRepositoryCorrespondence(root, [{ repositoryId, provisioningJobId, storagePath: legacyWindowsLocator }])).rejects.toThrowError('RESTORED_REPOSITORY_ORPHANED')
  })

  it('rejects unsafe locators, missing repositories, duplicate mappings, and marker mismatches', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-restore-correspondence-'))
    roots.push(root)
    const repositoryId = '11111111-1111-4111-8111-111111111111'
    const provisioningJobId = '22222222-2222-4222-8222-222222222222'
    const storagePath = `repositories/11/11/${repositoryId}.git`
    const record = { repositoryId, provisioningJobId, storagePath }

    await expect(verifyRepositoryCorrespondence(root, [record])).rejects.toThrowError('RESTORED_REPOSITORY_MISSING')

    const repositoryPath = path.join(root, 'repositories', '11', '11', `${repositoryId}.git`)
    await mkdir(repositoryPath, { recursive: true })
    await writeFile(path.join(repositoryPath, 'projex-repository.json'), JSON.stringify({
      version: 1,
      repositoryId,
      provisioningJobId: '33333333-3333-4333-8333-333333333333',
    }))
    await expect(verifyRepositoryCorrespondence(root, [record])).rejects.toThrowError('RESTORED_REPOSITORY_MARKER_INVALID')

    await writeFile(path.join(repositoryPath, 'projex-repository.json'), JSON.stringify({ version: 1, repositoryId, provisioningJobId }))
    await expect(verifyRepositoryCorrespondence(root, [record, record])).rejects.toThrowError('RESTORED_REPOSITORY_PATH_DUPLICATE')
    await expect(verifyRepositoryCorrespondence(root, [{ ...record, storagePath: `../${storagePath}` }]))
      .rejects.toThrowError('RESTORED_REPOSITORY_PATH_INVALID')
  })
})
