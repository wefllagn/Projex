import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { GitInfrastructureError } from './git-errors.js'
import { browserCommitInput } from '../../modules/group-browser-commits/group-browser-commit.schemas.js'
import type { BrowserCommitInput } from '../../modules/group-browser-commits/group-browser-commit.schemas.js'

const ZERO = '0'.repeat(40)
export class BrowserCommitError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'BrowserCommitError' }
}
interface Runner {
  run(args: readonly string[], cwd?: string, input?: { stdin?: string; indexFile?: string; actorId?: string; commitDate?: string }): Promise<{ stdout: string; stderr: string; stdoutBuffer?: Buffer }>
}
export type BrowserWrite = BrowserCommitInput & { id: string; actorId: string; repositoryId: string; storagePath: string; createdAt: Date }
export function createGitGroupBrowserWriter(deps: { git: Runner; resolveRepository(id: string, storagePath: string): Promise<string>; checkSize(root: string): Promise<void> }) {
  async function locate(job: BrowserWrite) { return deps.resolveRepository(job.repositoryId, job.storagePath) }
  async function revision(root: string, ref: string): Promise<string | null> {
    try { return (await deps.git.run(['--git-dir', '.', 'rev-parse', '--verify', ref], root)).stdout.trim() }
    catch (error) { if (error instanceof GitInfrastructureError && error.code === 'GIT_COMMAND_FAILED') return null; throw error }
  }
  const receiptRef = (job: BrowserWrite) => {
    if (!/^[0-9a-f-]{36}$/i.test(job.id)) throw new BrowserCommitError('BROWSER_COMMIT_INVALID')
    return `refs/projex/browser-commits/${job.id}`
  }
  return {
    async receipt(job: BrowserWrite) { return revision(await locate(job), receiptRef(job)) },
    async prepare(job: BrowserWrite): Promise<string> {
      browserCommitInput.parse({ branchName: job.branchName, filePath: job.filePath, operation: job.operation, content: job.content, commitMessage: job.commitMessage, expectedHeadCommitHash: job.expectedHeadCommitHash })
      const root = await locate(job)
      const head = await revision(root, `refs/heads/${job.branchName}`)
      if (head !== job.expectedHeadCommitHash) throw new BrowserCommitError('BROWSER_HEAD_CHANGED')
      if (!head && (job.branchName !== 'main' || (await deps.git.run(['--git-dir', '.', 'for-each-ref', '--format=%(refname)', 'refs/heads/'], root)).stdout.trim())) throw new BrowserCommitError('BROWSER_INITIALIZATION_DENIED')
      let mode = '100644'
      if (head) {
        const entries = (await deps.git.run(['--git-dir', '.', 'ls-tree', '-r', '-t', '-z', '--full-tree', head], root)).stdout.split('\0').filter(Boolean).map(line => { const separator = line.indexOf('\t'); const meta = line.slice(0,separator).split(' '); return { mode: meta[0], object: meta[2]!, name: line.slice(separator+1) } })
        const target = entries.find(entry => entry.name === job.filePath)
        if (entries.some(entry => entry.name.toLowerCase() === job.filePath.toLowerCase() && entry.name !== job.filePath)) throw new BrowserCommitError('BROWSER_PATH_UNSAFE')
        const parts = job.filePath.split('/')
        for (let i = 1; i < parts.length; i++) {
          const ancestor = parts.slice(0,i).join('/')
          if (entries.some(entry => entry.name.toLowerCase() === ancestor.toLowerCase() && (entry.name !== ancestor || entry.mode !== '040000'))) throw new BrowserCommitError('BROWSER_PATH_UNSAFE')
        }
        if (job.operation === 'CREATE' && target || job.operation === 'UPDATE' && !target) throw new BrowserCommitError('BROWSER_FILE_CHANGED')
        if (target && !['100644','100755'].includes(target.mode!)) throw new BrowserCommitError('BROWSER_PATH_UNSAFE')
        if (target) {
          mode = target.mode!
          const original = await deps.git.run(['--git-dir', '.', 'cat-file', 'blob', target.object],root)
          const bytes = original.stdoutBuffer ?? Buffer.from(original.stdout)
          if (bytes.length > 65536 || bytes.includes(0)) throw new BrowserCommitError('BROWSER_FILE_UNSUPPORTED')
          try { new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw new BrowserCommitError('BROWSER_FILE_UNSUPPORTED') }
        }
      } else if (job.operation !== 'CREATE') throw new BrowserCommitError('BROWSER_FILE_CHANGED')
      const scratch = await mkdtemp(path.join(tmpdir(), 'px-browser-'))
      try {
        const indexFile = path.join(scratch, 'index')
        const run = (args: string[], stdin?: string) => deps.git.run(['--git-dir', '.', ...args], root, { indexFile, stdin, actorId: job.actorId, commitDate: job.createdAt.toISOString() })
        await run(head ? ['read-tree', head] : ['read-tree', '--empty'])
        const blob = (await run(['hash-object', '-w', '--stdin'], job.content)).stdout.trim()
        await run(['update-index', '--add', '--cacheinfo', mode, blob, job.filePath])
        const tree = (await run(['write-tree'])).stdout.trim()
        const commit = (await run(['commit-tree', tree, ...(head ? ['-p', head] : [])], `${job.commitMessage}\n\nProjex-Browser-Commit: ${job.id}\n`)).stdout.trim()
        if (!/^[0-9a-f]{40}$/.test(commit)) throw new BrowserCommitError('BROWSER_COMMIT_INVALID')
        await deps.checkSize(root)
        return commit
      } finally { await rm(scratch, { recursive: true, force: true }) }
    },
    async publish(job: BrowserWrite, commit: string): Promise<void> {
      const root = await locate(job)
      await deps.checkSize(root)
      try {
        await deps.git.run(['--git-dir', '.', 'update-ref', '--stdin'], root, { stdin: `start\nupdate refs/heads/${job.branchName} ${commit} ${job.expectedHeadCommitHash ?? ZERO}\ncreate ${receiptRef(job)} ${commit}\nprepare\ncommit\n` })
      } catch (error) {
        // A timeout/transport interruption has an unknown outcome; the durable receipt resolves it on retry.
        if (error instanceof GitInfrastructureError && error.code === 'GIT_COMMAND_FAILED') {
          if (await this.receipt(job)) return
          if (await revision(root, `refs/heads/${job.branchName}`) !== job.expectedHeadCommitHash) throw new BrowserCommitError('BROWSER_HEAD_CHANGED')
        }
        throw error
      }
    },
  }
}
export type GitGroupBrowserWriter = ReturnType<typeof createGitGroupBrowserWriter>
