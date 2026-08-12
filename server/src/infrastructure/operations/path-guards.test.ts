import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { validateBackupPaths, validateRestorePaths } from './path-guards.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((item) => rm(item, { recursive: true, force: true }))))

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'projex-operations-path-'))
  roots.push(root)
  for (const item of ['project', 'storage', 'backup-source', 'outputs']) await mkdir(path.join(root, item))
  return root
}

describe('operations path guards', () => {
  it('accepts distinct absolute roots and rejects overlaps', async () => {
    const root = await fixture()
    await expect(validateBackupPaths({
      projectRoot: path.join(root, 'project'),
      gitStorageRoot: path.join(root, 'storage'),
      backupOutputRoot: path.join(root, 'outputs', 'backups'),
    })).resolves.toBeDefined()
    await expect(validateBackupPaths({
      projectRoot: path.join(root, 'project'),
      gitStorageRoot: path.join(root, 'storage'),
      backupOutputRoot: path.join(root, 'storage', 'backups'),
    })).rejects.toThrowError('BACKUP_OUTPUT_PATH_OVERLAP')
  })

  it('rejects restore source/destination overlap', async () => {
    const root = await fixture()
    await expect(validateRestorePaths({
      projectRoot: path.join(root, 'project'),
      backupSourceRoot: path.join(root, 'backup-source'),
      restoreGitRoot: path.join(root, 'backup-source', 'restored'),
    })).rejects.toThrowError('RESTORE_SOURCE_DESTINATION_OVERLAP')
  })

  it('rejects a restore source that overlaps protected storage', async () => {
    const root = await fixture()
    await expect(validateRestorePaths({
      projectRoot: path.join(root, 'project'),
      backupSourceRoot: path.join(root, 'storage'),
      restoreGitRoot: path.join(root, 'outputs', 'restored'),
      normalGitStorageRoot: path.join(root, 'storage'),
    })).rejects.toThrowError('RESTORE_SOURCE_PROTECTED_PATH_OVERLAP')
  })

  it('rejects a linked path segment', async () => {
    const root = await fixture()
    const link = path.join(root, 'storage-link')
    await symlink(path.join(root, 'storage'), link, process.platform === 'win32' ? 'junction' : 'dir')
    await expect(validateBackupPaths({
      projectRoot: path.join(root, 'project'),
      gitStorageRoot: link,
      backupOutputRoot: path.join(root, 'outputs', 'backups'),
    })).rejects.toThrowError('OPERATIONS_PATH_LINK_REJECTED')
  })
})
