import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createGuardedTestRunRoot,
  createRepositoryStorage,
  RepositoryStorageError,
} from './repository-storage.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})
describe('repository storage paths', () => {
  it('derives a UUID-only relative path without creating storage', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'projex-storage-unit-'))
    temporaryRoots.push(parent)
    const root = path.join(parent, 'storage-not-created')
    const storage = createRepositoryStorage({ root, repositorySizeLimitBytes: 1_000_000 })
    const paths = storage.pathsFor(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    )
    expect(paths.relativeRepositoryPath).toBe(
      'repositories/11/11/11111111-1111-4111-8111-111111111111.git',
    )
    await expect(readFile(root)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects invalid identifiers', () => {
    const storage = createRepositoryStorage({ root: path.resolve('C:\\safe'), repositorySizeLimitBytes: 1_000_000 })
    expect(() => storage.pathsFor('../escape', '22222222-2222-4222-8222-222222222222')).toThrow(
      RepositoryStorageError,
    )
  })

  it('rejects a mismatched persisted locator before creating the configured root', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'projex-storage-invalid-locator-'))
    temporaryRoots.push(parent)
    const root = path.join(parent, 'must-not-be-created')
    const storage = createRepositoryStorage({ root, repositorySizeLimitBytes: 1_000_000 })
    await expect(storage.resolveManagedRepository(
      '11111111-1111-4111-8111-111111111111',
      '../outside.git',
    )).rejects.toThrowError('STORAGE_PATH_MISMATCH')
    await expect(readFile(root)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('resolves exact legacy locators through UUID-derived components and verifies the marker', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-storage-legacy-'))
    temporaryRoots.push(root)
    const repositoryId = '11111111-1111-4111-8111-111111111111'
    const repositoryPath = path.join(root, 'repositories', '11', '11', `${repositoryId}.git`)
    await mkdir(repositoryPath, { recursive: true })
    await writeFile(
      path.join(repositoryPath, 'projex-repository.json'),
      JSON.stringify({
        version: 1,
        repositoryId,
        provisioningJobId: '22222222-2222-4222-8222-222222222222',
      }),
    )
    const resolved = await createRepositoryStorage({ root, repositorySizeLimitBytes: 1_000_000 })
      .resolveManagedRepositoryLocation(
        repositoryId,
        `repositories\\11\\11\\${repositoryId}.git`,
    )
    expect(resolved).toEqual({
      repositoryPath: await realpath(repositoryPath),
      canonicalLocator: `repositories/11/11/${repositoryId}.git`,
    })
  })

  it('rejects a managed path redirected through a link or junction', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-storage-link-'))
    const outside = await mkdtemp(path.join(os.tmpdir(), 'projex-storage-outside-'))
    temporaryRoots.push(root, outside)
    const repositoryId = '11111111-1111-4111-8111-111111111111'
    await mkdir(path.join(root, 'repositories', '11'), { recursive: true })
    await symlink(outside, path.join(root, 'repositories', '11', '11'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(createRepositoryStorage({ root, repositorySizeLimitBytes: 1_000_000 })
      .resolveManagedRepository(repositoryId, `repositories/11/11/${repositoryId}.git`))
      .rejects.toThrowError('STORAGE_REPARSE_POINT_REJECTED')
  })
})

describe('guarded Git test storage', () => {
  it('uses and cleans only a sentinel-owned run child', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'projex-git-guard-'))
    temporaryRoots.push(parent)
    const testRoot = path.join(parent, 'projex_git_test')
    const run = await createGuardedTestRunRoot({
      testRoot,
      projectRoot: path.resolve(process.cwd()),
      normalRoot: path.join(parent, 'normal'),
    })
    expect(path.dirname(run.runRoot)).toBe(testRoot)
    await run.cleanup()
    await expect(readFile(run.runRoot)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects unrecognized and overlapping roots', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'projex-git-guard-'))
    temporaryRoots.push(parent)
    await expect(
      createGuardedTestRunRoot({
        testRoot: path.join(parent, 'wrong-name'),
        projectRoot: path.resolve(process.cwd()),
      }),
    ).rejects.toThrow(RepositoryStorageError)
    await expect(
      createGuardedTestRunRoot({
        testRoot: path.join(process.cwd(), 'projex_git_test'),
        projectRoot: path.resolve(process.cwd()),
      }),
    ).rejects.toThrow(RepositoryStorageError)
  })
})
