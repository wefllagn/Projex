import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { GitInfrastructureError } from './git-errors.js'
import { isWellFormedText } from '../../shared/source-text.js'
import { practiceBranch } from '../../modules/activity-practice/practice-policy.js'

export class PracticeWriteError extends Error { constructor(readonly code: string) { super(code) } }
export interface PracticeWrite {
  id: string; workspaceId: string; repositoryId: string; studentId: string; storagePath: string;
  operation: string; content: string; entryClassName: string; expectedHead: string | null; createdAt: Date
}
interface Runner { run(args: readonly string[], cwd?: string, input?: { stdin?: string; indexFile?: string; actorId?: string; commitDate?: string }): Promise<{ stdout: string }> }
export function createGitPracticeWriter(deps: { git: Runner; resolveRepository(id: string, locator: string): Promise<string>; checkSize(root: string): Promise<void> }) {
  async function revision(root: string, ref: string) {
    try { return (await deps.git.run(['--git-dir', '.', 'rev-parse', '--verify', ref], root)).stdout.trim() }
    catch (e) { if (e instanceof GitInfrastructureError && e.code === 'GIT_COMMAND_FAILED') return null; throw e }
  }
  function refs(job: PracticeWrite) {
    if (![job.id, job.workspaceId].every(id => /^[0-9a-f-]{36}$/.test(id)) || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(job.entryClassName)) throw new PracticeWriteError('PRACTICE_INVALID')
    return { branch: `refs/heads/${practiceBranch(job.workspaceId)}`, receipt: `refs/projex/practice-commits/${job.id}` }
  }
  return {
    async receipt(job: PracticeWrite) { return revision(await deps.resolveRepository(job.repositoryId, job.storagePath), refs(job).receipt) },
    async prepare(job: PracticeWrite) {
      const root = await deps.resolveRepository(job.repositoryId, job.storagePath)
      if (!isWellFormedText(job.content) || job.content.includes('\0') || Buffer.byteLength(job.content) > 100000) throw new PracticeWriteError('PRACTICE_INVALID')
      if (await revision(root, refs(job).branch) !== job.expectedHead) throw new PracticeWriteError('PRACTICE_HEAD_CHANGED')
      if ((job.operation === 'INIT') !== (job.expectedHead === null)) throw new PracticeWriteError('PRACTICE_INVALID')
      const scratch = await mkdtemp(path.join(tmpdir(), 'px-practice-'))
      try {
        const run = (args: string[], stdin?: string) => deps.git.run(['--git-dir', '.', ...args], root, { stdin, indexFile: path.join(scratch, 'index'), actorId: job.studentId, commitDate: job.createdAt.toISOString() })
        // INIT and RESET use only the assignment starter tree. SAVE retains other
        // externally pushed files, but replaces the fixed Java entry file safely.
        await run(job.operation === 'SAVE' && job.expectedHead ? ['read-tree', job.expectedHead] : ['read-tree', '--empty'])
        const blob = (await run(['hash-object', '-w', '--stdin'], job.content)).stdout.trim()
        await run(['update-index', '--add', '--cacheinfo', '100644', blob, `${job.entryClassName}.java`])
        const tree = (await run(['write-tree'])).stdout.trim()
        const commit = (await run(['commit-tree', tree, ...(job.expectedHead ? ['-p', job.expectedHead] : [])], `Practice ${job.operation.toLowerCase()}\n\nProjex-Practice: ${job.id}\n`)).stdout.trim()
        if (!/^[0-9a-f]{40}$/.test(commit)) throw new PracticeWriteError('PRACTICE_INVALID')
        await deps.checkSize(root)
        return commit
      } finally { await rm(scratch, { recursive: true, force: true }) }
    },
    async publish(job: PracticeWrite, commit: string) {
      const root = await deps.resolveRepository(job.repositoryId, job.storagePath), ref = refs(job)
      await deps.checkSize(root)
      try { await deps.git.run(['--git-dir', '.', 'update-ref', '--stdin'], root, { stdin: `start\nupdate ${ref.branch} ${commit} ${job.expectedHead ?? '0'.repeat(40)}\ncreate ${ref.receipt} ${commit}\nprepare\ncommit\n` }) }
      catch (e) {
        if (await this.receipt(job)) return
        if (await revision(root, ref.branch) !== job.expectedHead) throw new PracticeWriteError('PRACTICE_HEAD_CHANGED')
        throw e
      }
    },
  }
}
export type GitPracticeWriter = ReturnType<typeof createGitPracticeWriter>
