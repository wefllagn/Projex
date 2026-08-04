import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
      path.join('repositories', '11', '11', '11111111-1111-4111-8111-111111111111.git'),
    )
    await expect(readFile(root)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects invalid identifiers', () => {
    const storage = createRepositoryStorage({ root: path.resolve('C:\\safe'), repositorySizeLimitBytes: 1_000_000 })
    expect(() => storage.pathsFor('../escape', '22222222-2222-4222-8222-222222222222')).toThrow(
      RepositoryStorageError,
    )
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
