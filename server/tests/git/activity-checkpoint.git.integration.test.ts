import { randomUUID } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createGitCommandRunner } from '../../src/infrastructure/git/git-command-runner.js'
import { createGitActivityCheckpointWriter } from '../../src/infrastructure/git/git-activity-checkpoint-writer.js'

// The real-Git launcher supplies a sentinel-owned current-run child; never use
// a normal repository root or fall back to an unguarded temporary directory.
const guardedRoot = process.env.GIT_STORAGE_ROOT
if (!guardedRoot || !path.isAbsolute(guardedRoot)) throw new Error('Guarded Git test root required')
const git = createGitCommandRunner({
  executable: process.env.GIT_EXECUTABLE!, timeoutMs: 30_000, outputLimitBytes: 1_048_576,
})
let repositoryPath: string
const writer = createGitActivityCheckpointWriter({
  git, resolveRepository: async () => repositoryPath,
})
const source = 'public class Main { public static void main(String[] args) { System.out.println(1); } }\n'
const input = () => ({
  repositoryId: randomUUID(), checkpointId: randomUUID(), studentId: randomUUID(),
  storagePath: 'unused-by-primitive-fixture', sourceCode: source,
  entryFilePath: 'Main.java', defaultBranch: 'main', expectedHeadCommitHash: null as string | null,
})
const head = async () => (await git.run(['--git-dir', '.', 'rev-parse', 'refs/heads/main'], repositoryPath)).stdout.trim()

beforeEach(async () => {
  await git.detectVersion()
  repositoryPath = path.join(await mkdtemp(path.join(guardedRoot, 'checkpoint-runtime-')), 'repository.git')
  await git.initializeBare(repositoryPath)
  await git.verifyEmptyBare(repositoryPath)
})

describe('real activity checkpoint Git command compatibility', () => {
  it('clones, commits and pushes exact source; retry recovers the existing checkpoint', async () => {
    const request = input()
    const result = await writer.write(request)
    expect(await head()).toBe(result.commitHash)
    expect((await git.run(['--git-dir', '.', 'show', 'main:Main.java'], repositoryPath)).stdout).toBe(source)
    expect(await writer.write(request)).toEqual(result)
    expect((await git.run(['--git-dir', '.', 'rev-list', '--count', 'main'], repositoryPath)).stdout.trim()).toBe('1')
    await git.run(['--git-dir', '.', 'fsck', '--full'], repositoryPath)
  })

  it('rejects a concurrent non-fast-forward push and preserves the winning source', async () => {
    const first = await writer.write(input())
    const winnerSource = source.replace('println(1)', 'println(2)')
    let winner: string | undefined
    await expect(writer.write({
      ...input(), expectedHeadCommitHash: first.commitHash,
      beforePush: async () => {
        winner = (await writer.write({ ...input(), sourceCode: winnerSource, expectedHeadCommitHash: first.commitHash })).commitHash
      },
    })).rejects.toMatchObject({ code: 'CHECKPOINT_HEAD_CHANGED', conflict: true })
    expect(await head()).toBe(winner)
    expect((await git.run(['--git-dir', '.', 'show', 'main:Main.java'], repositoryPath)).stdout).toBe(winnerSource)
    await git.run(['--git-dir', '.', 'fsck', '--full'], repositoryPath)
  })
})
