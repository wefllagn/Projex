import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { GitInfrastructureError } from './git-errors.js'

export class GitCheckpointError extends Error {
  constructor(readonly code: string, readonly conflict = false) {
    super(code)
    this.name = 'GitCheckpointError'
  }
}

interface GitRunner {
  run(args: readonly string[], cwd?: string): Promise<{ stdout: string; stderr: string }>
}

export function createGitActivityCheckpointWriter(dependencies: {
  git: GitRunner
  resolveRepository(repositoryId: string, storagePath: string): Promise<string>
}) {
  return {
    async write(input: {
      repositoryId: string
      checkpointId: string
      storagePath: string
      studentId: string
      sourceCode: string
      entryFilePath: string
      defaultBranch: string
      expectedHeadCommitHash: string | null
      beforePush?: () => Promise<void>
    }): Promise<{ commitHash: string }> {
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*\.java$/.test(input.entryFilePath) || input.defaultBranch !== 'main') {
        throw new GitCheckpointError('CHECKPOINT_TARGET_INVALID')
      }
      const repositoryPath = await dependencies.resolveRepository(input.repositoryId, input.storagePath)
      const worktree = await mkdtemp(path.join(tmpdir(), 'projex-checkpoint-'))
      try {
        await dependencies.git.run(['clone', '--no-tags', repositoryPath, worktree])
        const entryPath = path.join(worktree, input.entryFilePath)
        const safeEntry = async () => {
          const entry = await lstat(entryPath).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null
            throw error
          })
          if (entry && (!entry.isFile() || entry.isSymbolicLink())) {
            throw new GitCheckpointError('CHECKPOINT_ENTRY_FILE_UNSAFE')
          }
          return entry
        }
        let currentHead: string | null = null
        try {
          currentHead = (await dependencies.git.run(['rev-parse', '--verify', 'HEAD'], worktree)).stdout.trim().toLowerCase()
        } catch (error) {
          if (!(error instanceof GitInfrastructureError) || error.code !== 'GIT_COMMAND_FAILED') throw error
        }
        if (currentHead !== input.expectedHeadCommitHash) {
          if (currentHead) {
            const message = (await dependencies.git.run(['log', '-1', '--format=%B', 'HEAD'], worktree)).stdout
            const entry = await safeEntry()
            if (
              message.split(/\r?\n/).includes(`Projex-Checkpoint-Id: ${input.checkpointId}`)
              && entry
              && await readFile(entryPath, 'utf8') === input.sourceCode
            ) {
              return { commitHash: currentHead }
            }
          }
          throw new GitCheckpointError('CHECKPOINT_HEAD_CHANGED', true)
        }
        await safeEntry()
        await writeFile(entryPath, input.sourceCode, { encoding: 'utf8', flag: 'w' })
        await dependencies.git.run(['add', '--', input.entryFilePath], worktree)
        await dependencies.git.run([
          '-c', 'user.name=Projex Student',
          '-c', `user.email=student-${input.studentId}@projex.local`,
          'commit', '--allow-empty', '-m', `Save browser checkpoint\n\nProjex-Checkpoint-Id: ${input.checkpointId}`,
        ], worktree)
        const commitHash = (await dependencies.git.run(['rev-parse', 'HEAD'], worktree)).stdout.trim().toLowerCase()
        await input.beforePush?.()
        try {
          await dependencies.git.run(['push', 'origin', `HEAD:refs/heads/${input.defaultBranch}`], worktree)
        } catch (error) {
          if (error instanceof GitInfrastructureError && error.code === 'GIT_COMMAND_FAILED') {
            throw new GitCheckpointError('CHECKPOINT_HEAD_CHANGED', true)
          }
          throw error
        }
        return { commitHash }
      } finally {
        await rm(worktree, { recursive: true, force: true })
      }
    },
  }
}
