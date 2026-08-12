import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BACKUP_MANIFEST_VERSION, createArtifact, type BackupManifest } from './backup-manifest.js'
import { BACKUP_CONFIRMATION, buildPairedBackupPlan, executePairedBackupPlan, inspectGitStorageTree } from './backup.js'
import { assessQuiescence } from './quiescence.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((item) => rm(item, { recursive: true, force: true }))))

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'projex-backup-'))
  roots.push(root)
  for (const item of ['project', 'storage', 'outputs']) await mkdir(path.join(root, item))
  const plan = await buildPairedBackupPlan({
    confirmation: BACKUP_CONFIRMATION,
    backupId: 'run-20260813',
    projectRoot: path.join(root, 'project'),
    gitStorageRoot: path.join(root, 'storage'),
    backupOutputRoot: path.join(root, 'outputs'),
    databaseUrl: 'postgresql://user:private@localhost/projex',
    pgDumpExecutable: path.join(root, 'pg_dump'),
    tarExecutable: path.join(root, 'tar'),
    quiescence: { runningExecutionJobs: 0, runningProvisioningJobs: 0, provisioningRepositories: 0, stagingEntries: 0, transportRequestEntries: 0 },
  })
  return { root, plan }
}

describe('paired backup planning and execution safety', () => {
  it('blocks every transitional state without mutating it', () => {
    expect(assessQuiescence({ runningExecutionJobs: 1, runningProvisioningJobs: 1, provisioningRepositories: 1, stagingEntries: 1, transportRequestEntries: 1 })).toEqual({
      safe: false,
      blockers: ['EXECUTION_JOBS_RUNNING', 'PROVISIONING_JOBS_RUNNING', 'REPOSITORIES_PROVISIONING', 'GIT_STAGING_NOT_EMPTY', 'GIT_TRANSPORT_RECOVERY_REQUIRED'],
    })
  })

  it('requires explicit backup confirmation', async () => {
    const { root } = await fixture()
    await expect(buildPairedBackupPlan({
      confirmation: '', backupId: 'run-20260813', projectRoot: path.join(root, 'project'),
      gitStorageRoot: path.join(root, 'storage'), backupOutputRoot: path.join(root, 'outputs'),
      databaseUrl: 'postgresql://user:private@localhost/projex', pgDumpExecutable: path.join(root, 'pg_dump'),
      tarExecutable: path.join(root, 'tar'), quiescence: { runningExecutionJobs: 0, runningProvisioningJobs: 0, provisioningRepositories: 0, stagingEntries: 0, transportRequestEntries: 0 },
    })).rejects.toThrowError('BACKUP_CONFIRMATION_REQUIRED')
  })

  it('inspects the complete storage tree before archiving and rejects nested links', async () => {
    const { root } = await fixture()
    const repository = path.join(root, 'storage', 'repositories', '11', 'repo.git')
    const quarantine = path.join(root, 'storage', 'quarantine', 'entry-1')
    await mkdir(repository, { recursive: true })
    await mkdir(quarantine, { recursive: true })
    await writeFile(path.join(repository, 'projex-repository.json'), '{}')
    await expect(inspectGitStorageTree(path.join(root, 'storage'))).resolves.toEqual({ markerCount: 1, quarantineCount: 1 })
    const external = path.join(root, 'external')
    await mkdir(external)
    await symlink(external, path.join(repository, 'unsafe-link'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(inspectGitStorageTree(path.join(root, 'storage'))).rejects.toThrowError('GIT_STORAGE_LINK_REJECTED')
  })

  it('uses argument arrays and removes only its marker-owned directory after failure', async () => {
    const { plan } = await fixture()
    const run = vi.fn().mockRejectedValue(new Error('fixture failure'))
    await expect(executePairedBackupPlan(plan, { run, buildManifest: vi.fn() })).rejects.toThrow('fixture failure')
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ args: expect.any(Array) }))
    await expect(readFile(plan.outputDirectory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('writes a deterministic manifest only after both commands succeed', async () => {
    const { plan } = await fixture()
    const run = vi.fn().mockImplementation(async (command: { args: readonly string[] }) => {
      const output = command.args.find((item) => item.startsWith('--file='))?.slice(7) ?? command.args[1]
      if (output) await import('node:fs/promises').then(({ writeFile }) => writeFile(output, 'fixture'))
    })
    const buildManifest = async (): Promise<BackupManifest> => ({
      manifestVersion: BACKUP_MANIFEST_VERSION, backupId: plan.backupId, createdAt: '2026-08-13T00:00:00.000Z',
      applicationCommit: '40b91f3', capabilityProfile: 'HOSTED_SAFE', tools: { postgres: '18', pgDump: '18', git: '2.55' },
      migrations: [], artifacts: await Promise.all([
        createArtifact(path.join(plan.outputDirectory, 'database.dump')),
        createArtifact(path.join(plan.outputDirectory, 'git-storage.tar')),
      ]), counts: {}, repositoryStorageStates: {}, markerCount: 0, quarantineCount: 0,
      transitionalDirectoriesEmpty: true,
    })
    await executePairedBackupPlan(plan, { run, buildManifest })
    await expect(readFile(plan.manifestFile, 'utf8')).resolves.toContain('run-20260813')
  })
})
