import { spawn } from 'node:child_process'
import path from 'node:path'
import { TextDecoder } from 'node:util'
import { createSanitizedGitEnvironment } from './git-command-runner.js'

const COMMIT_ID = /^[0-9a-f]{40}$/i
const BRANCH_NAME = /^(?!-)(?!.*(?:\.\.|\/\/|@\{|\\|[~^:?*[\]\s]|\.$|\.lock(?:\/|$)))[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/
const PATH_SEGMENT = /^(?!\.git$)(?!.*[. ]$)[A-Za-z0-9][A-Za-z0-9._()@+, -]{0,254}$/i

export class GitRepositoryReadError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'GitRepositoryReadError'
  }
}

export interface GitCommitSummary {
  commitId: string
  authorName: string
  authoredAt: string
  subject: string
}

export interface GitBranchSummary extends GitCommitSummary {
  branchName: string
  isDefault: boolean
}

export interface GitTreeEntry {
  name: string
  path: string
  entryType: 'tree' | 'blob'
  objectId: string
  sizeBytes: number | null
}

export interface GitCommitFileChange {
  status: string
  path: string
  previousPath?: string
}

export interface GitCommitDetail extends GitCommitSummary {
  parentCommitIds: string[]
  files: GitCommitFileChange[]
}

interface ProcessResult {
  stdout: Buffer
  stderr: Buffer
}

function normalizeText(value: string, maximum: number): string {
  return [...value]
    .map((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127 ? ' ' : character
    })
    .join('')
    .trim()
    .slice(0, maximum)
}

function decodeUtf8(buffer: Buffer): string {
  if (buffer.includes(0)) throw new GitRepositoryReadError('GIT_BINARY_FILE_UNSUPPORTED')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new GitRepositoryReadError('GIT_BINARY_FILE_UNSUPPORTED')
  }
}

export function isValidGitBranchName(value: string): boolean {
  return value !== 'HEAD' && BRANCH_NAME.test(value)
}

export function isValidGitCommitId(value: string): boolean {
  return COMMIT_ID.test(value)
}

export function normalizeGitRepositoryPath(value: string): string {
  if (!value || value.length > 1_024 || value.startsWith('/') || value.includes('\\') || value.includes(':')) {
    throw new GitRepositoryReadError('GIT_PATH_INVALID')
  }
  const segments = value.split('/')
  if (segments.some((segment) => segment === '.' || segment === '..' || !PATH_SEGMENT.test(segment))) {
    throw new GitRepositoryReadError('GIT_PATH_INVALID')
  }
  return segments.join('/')
}

function parseCommitRecords(output: Buffer): GitCommitSummary[] {
  const fields = output.toString('utf8').split('\0')
  if (fields.at(-1) === '') fields.pop()
  if (fields.length === 0) return []
  if (fields.length % 4 !== 0) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
  const commits: GitCommitSummary[] = []
  for (let index = 0; index < fields.length; index += 4) {
    const commitId = fields[index]!
    const authoredAt = fields[index + 2]!
    if (!isValidGitCommitId(commitId) || Number.isNaN(Date.parse(authoredAt))) {
      throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
    }
    commits.push({
      commitId: commitId.toLowerCase(),
      authorName: normalizeText(fields[index + 1]!, 200),
      authoredAt: new Date(authoredAt).toISOString(),
      subject: normalizeText(fields[index + 3]!, 500),
    })
  }
  return commits
}

export function createGitRepositoryReader(options: {
  executable: string
  timeoutMs: number
  commandOutputLimitBytes: number
  fileLimitBytes: number
  diffLimitBytes: number
  maxChangedFiles: number
  maxBranches: number
  maxConcurrent: number
}) {
  if (!path.isAbsolute(options.executable)) throw new GitRepositoryReadError('GIT_EXECUTABLE_NOT_ABSOLUTE')
  const executable = path.resolve(options.executable)
  let activeProcesses = 0

  function terminate(child: ReturnType<typeof spawn>): void {
    if (process.platform === 'win32' && child.pid) {
      const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')
      const killer = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      })
      killer.unref()
    } else {
      child.kill('SIGKILL')
    }
  }

  function run(repositoryPath: string, args: readonly string[], outputLimitBytes: number): Promise<ProcessResult> {
    if (activeProcesses >= options.maxConcurrent) {
      return Promise.reject(new GitRepositoryReadError('GIT_INSPECTION_BUSY'))
    }
    activeProcesses += 1
    return new Promise((resolve, reject) => {
      const child = spawn(executable, ['--git-dir', repositoryPath, ...args], {
        env: createSanitizedGitEnvironment(),
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const stdout: Buffer[] = []
      const stderr: Buffer[] = []
      let outputBytes = 0
      let settled = false
      let released = false
      const release = () => {
        if (released) return
        released = true
        activeProcesses -= 1
      }
      const fail = (code: string) => {
        if (settled) return
        settled = true
        release()
        terminate(child)
        reject(new GitRepositoryReadError(code))
      }
      const collect = (target: Buffer[], chunk: Buffer) => {
        outputBytes += chunk.length
        if (outputBytes > outputLimitBytes) {
          fail('GIT_OUTPUT_LIMIT_EXCEEDED')
          return
        }
        target.push(chunk)
      }
      const timer = setTimeout(() => fail('GIT_COMMAND_TIMEOUT'), options.timeoutMs)
      child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk))
      child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk))
      child.once('error', () => {
        clearTimeout(timer)
        fail('GIT_PROCESS_START_FAILED')
      })
      child.once('close', (code) => {
        clearTimeout(timer)
        if (settled) return
        settled = true
        release()
        if (code !== 0) {
          reject(new GitRepositoryReadError('GIT_COMMAND_FAILED'))
          return
        }
        resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) })
      })
    })
  }

  async function listRawBranches(repositoryPath: string): Promise<string[]> {
    const result = await run(
      repositoryPath,
      ['for-each-ref', '--format=%(refname:short)', 'refs/heads'],
      options.commandOutputLimitBytes,
    )
    const branches = result.stdout
      .toString('utf8')
      .split(/\r?\n/)
      .map((branch) => branch.trim())
      .filter(Boolean)
      .map((branch) => {
        if (!isValidGitBranchName(branch)) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        return branch
      })
    if (branches.length > options.maxBranches) throw new GitRepositoryReadError('GIT_BRANCH_LIMIT_EXCEEDED')
    return branches
  }

  async function resolveBranch(repositoryPath: string, branchName: string): Promise<string> {
    if (!isValidGitBranchName(branchName)) throw new GitRepositoryReadError('GIT_BRANCH_INVALID')
    const result = await run(
      repositoryPath,
      ['rev-parse', '--verify', `refs/heads/${branchName}^{commit}`],
      options.commandOutputLimitBytes,
    ).catch((error: unknown) => {
      if (error instanceof GitRepositoryReadError && error.code === 'GIT_COMMAND_FAILED') {
        throw new GitRepositoryReadError('GIT_REVISION_NOT_FOUND')
      }
      throw error
    })
    const commitId = result.stdout.toString('utf8').trim()
    if (!isValidGitCommitId(commitId)) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
    return commitId.toLowerCase()
  }

  async function assertReachableCommit(repositoryPath: string, commitId: string): Promise<string> {
    if (!isValidGitCommitId(commitId)) throw new GitRepositoryReadError('GIT_COMMIT_INVALID')
    const result = await run(
      repositoryPath,
      ['for-each-ref', `--contains=${commitId}`, '--format=%(refname)', 'refs/heads'],
      options.commandOutputLimitBytes,
    ).catch((error: unknown) => {
      if (error instanceof GitRepositoryReadError && error.code === 'GIT_COMMAND_FAILED') {
        throw new GitRepositoryReadError('GIT_REVISION_NOT_FOUND')
      }
      throw error
    })
    if (!result.stdout.toString('utf8').trim()) throw new GitRepositoryReadError('GIT_REVISION_NOT_FOUND')
    return commitId.toLowerCase()
  }

  async function resolveRevision(
    repositoryPath: string,
    input: { branchName?: string; commitId?: string; defaultBranch: string },
  ): Promise<string | null> {
    if (input.commitId) return assertReachableCommit(repositoryPath, input.commitId)
    const branches = await listRawBranches(repositoryPath)
    if (branches.length === 0) return null
    return resolveBranch(repositoryPath, input.branchName ?? input.defaultBranch)
  }

  async function commitSummaries(
    repositoryPath: string,
    revision: string,
    optionsInput: { skip: number; limit: number },
  ): Promise<GitCommitSummary[]> {
    const result = await run(
      repositoryPath,
      [
        'log',
        '-z',
        '--no-show-signature',
        `--skip=${optionsInput.skip}`,
        `--max-count=${optionsInput.limit}`,
        '--format=%H%x00%an%x00%aI%x00%s',
        revision,
      ],
      options.commandOutputLimitBytes,
    )
    return parseCommitRecords(result.stdout)
  }

  return {
    async summary(repositoryPath: string, defaultBranch: string) {
      const branches = await listRawBranches(repositoryPath)
      if (branches.length === 0) {
        return { empty: true, defaultBranch, branchCount: 0, commitCount: 0, latestCommit: null }
      }
      const count = await run(
        repositoryPath,
        ['rev-list', '--count', ...branches.map((branch) => `refs/heads/${branch}`)],
        options.commandOutputLimitBytes,
      )
      const commitCount = Number(count.stdout.toString('utf8').trim())
      if (!Number.isSafeInteger(commitCount) || commitCount < 0) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
      const latestCommit = branches.includes(defaultBranch)
        ? (await commitSummaries(
            repositoryPath,
            await resolveBranch(repositoryPath, defaultBranch),
            { skip: 0, limit: 1 },
          ))[0] ?? null
        : null
      return { empty: false, defaultBranch, branchCount: branches.length, commitCount, latestCommit }
    },

    async branches(repositoryPath: string, defaultBranch: string): Promise<GitBranchSummary[]> {
      const branches = await listRawBranches(repositoryPath)
      const summaries: GitBranchSummary[] = []
      for (const branchName of branches) {
        const revision = await resolveBranch(repositoryPath, branchName)
        const commit = (await commitSummaries(repositoryPath, revision, { skip: 0, limit: 1 }))[0]
        if (!commit) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        summaries.push({ ...commit, branchName, isDefault: branchName === defaultBranch })
      }
      return summaries
    },

    async history(repositoryPath: string, input: {
      defaultBranch: string
      branchName?: string
      page: number
      pageSize: number
    }) {
      const revision = await resolveRevision(repositoryPath, {
        branchName: input.branchName,
        defaultBranch: input.defaultBranch,
      })
      if (!revision) return { commits: [], totalItems: 0 }
      const count = await run(repositoryPath, ['rev-list', '--count', revision], options.commandOutputLimitBytes)
      const totalItems = Number(count.stdout.toString('utf8').trim())
      if (!Number.isSafeInteger(totalItems) || totalItems < 0) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
      const commits = await commitSummaries(repositoryPath, revision, {
        skip: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
      })
      return { commits, totalItems }
    },

    async commit(repositoryPath: string, commitId: string): Promise<GitCommitDetail> {
      const revision = await assertReachableCommit(repositoryPath, commitId)
      const metadata = await run(
        repositoryPath,
        ['show', '-s', '--no-show-signature', '--format=%H%x00%an%x00%aI%x00%s%x00%P', revision],
        options.commandOutputLimitBytes,
      )
      const fields = metadata.stdout.toString('utf8').trimEnd().split('\0')
      if (fields.length !== 5 || !isValidGitCommitId(fields[0]!)) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
      const changes = await run(
        repositoryPath,
        ['diff-tree', '--root', '--no-commit-id', '--name-status', '-r', '-z', '--find-renames', revision],
        options.commandOutputLimitBytes,
      )
      const tokens = changes.stdout.toString('utf8').split('\0')
      if (tokens.at(-1) === '') tokens.pop()
      const files: GitCommitFileChange[] = []
      for (let index = 0; index < tokens.length;) {
        const status = tokens[index++]!
        if (!/^[ACDMRTUXB][0-9]{0,3}$/.test(status)) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        if (status.startsWith('R') || status.startsWith('C')) {
          const previousPath = tokens[index++]
          const currentPath = tokens[index++]
          if (!previousPath || !currentPath) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
          files.push({
            status,
            previousPath: normalizeGitRepositoryPath(previousPath),
            path: normalizeGitRepositoryPath(currentPath),
          })
        } else {
          const changedPath = tokens[index++]
          if (!changedPath) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
          files.push({ status, path: normalizeGitRepositoryPath(changedPath) })
        }
        if (files.length > options.maxChangedFiles) throw new GitRepositoryReadError('GIT_CHANGED_FILE_LIMIT_EXCEEDED')
      }
      const authoredAt = fields[2]!
      if (Number.isNaN(Date.parse(authoredAt))) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
      return {
        commitId: fields[0]!.toLowerCase(),
        authorName: normalizeText(fields[1]!, 200),
        authoredAt: new Date(authoredAt).toISOString(),
        subject: normalizeText(fields[3]!, 500),
        parentCommitIds: fields[4]!.split(' ').filter(Boolean).map((parent) => {
          if (!isValidGitCommitId(parent)) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
          return parent.toLowerCase()
        }),
        files,
      }
    },

    async tree(repositoryPath: string, input: {
      defaultBranch: string
      branchName?: string
      commitId?: string
      path?: string
    }): Promise<{ commitId: string | null; path: string; entries: GitTreeEntry[] }> {
      const revision = await resolveRevision(repositoryPath, input)
      const requestedPath = input.path ? normalizeGitRepositoryPath(input.path) : ''
      if (!revision) return { commitId: null, path: requestedPath, entries: [] }
      const treeish = requestedPath ? `${revision}:${requestedPath}` : revision
      const type = await run(repositoryPath, ['cat-file', '-t', treeish], options.commandOutputLimitBytes)
        .catch((error: unknown) => {
          if (error instanceof GitRepositoryReadError && error.code === 'GIT_COMMAND_FAILED') {
            throw new GitRepositoryReadError('GIT_CONTENT_NOT_FOUND')
          }
          throw error
        })
      if (type.stdout.toString('utf8').trim() !== 'tree') throw new GitRepositoryReadError('GIT_CONTENT_NOT_FOUND')
      const listing = await run(repositoryPath, ['ls-tree', '-z', '-l', treeish], options.commandOutputLimitBytes)
      const records = listing.stdout.toString('utf8').split('\0')
      if (records.at(-1) === '') records.pop()
      const entries = records.map((record): GitTreeEntry => {
        const separator = record.indexOf('\t')
        if (separator < 0) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        const [mode, objectType, objectId, size] = record.slice(0, separator).split(/ +/)
        const name = record.slice(separator + 1)
        if (!mode || !['tree', 'blob'].includes(objectType ?? '') || !objectId || !isValidGitCommitId(objectId)) {
          throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        }
        const sizeBytes = size === '-' ? null : Number(size)
        if (sizeBytes !== null && (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)) {
          throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
        }
        const entryPath = normalizeGitRepositoryPath(requestedPath ? `${requestedPath}/${name}` : name)
        return {
          name,
          path: entryPath,
          entryType: objectType as 'tree' | 'blob',
          objectId: objectId.toLowerCase(),
          sizeBytes,
        }
      })
      return { commitId: revision, path: requestedPath, entries }
    },

    async file(repositoryPath: string, input: {
      defaultBranch: string
      branchName?: string
      commitId?: string
      path: string
    }) {
      const revision = await resolveRevision(repositoryPath, input)
      if (!revision) throw new GitRepositoryReadError('GIT_CONTENT_NOT_FOUND')
      const requestedPath = normalizeGitRepositoryPath(input.path)
      const objectExpression = `${revision}:${requestedPath}`
      const objectType = await run(repositoryPath, ['cat-file', '-t', objectExpression], options.commandOutputLimitBytes)
        .catch((error: unknown) => {
          if (error instanceof GitRepositoryReadError && error.code === 'GIT_COMMAND_FAILED') {
            throw new GitRepositoryReadError('GIT_CONTENT_NOT_FOUND')
          }
          throw error
        })
      if (objectType.stdout.toString('utf8').trim() !== 'blob') throw new GitRepositoryReadError('GIT_CONTENT_NOT_FOUND')
      const sizeResult = await run(repositoryPath, ['cat-file', '-s', objectExpression], options.commandOutputLimitBytes)
      const sizeBytes = Number(sizeResult.stdout.toString('utf8').trim())
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new GitRepositoryReadError('GIT_OUTPUT_INVALID')
      if (sizeBytes > options.fileLimitBytes) throw new GitRepositoryReadError('GIT_FILE_LIMIT_EXCEEDED')
      const content = await run(repositoryPath, ['cat-file', 'blob', objectExpression], options.fileLimitBytes + 1)
      const text = decodeUtf8(content.stdout)
      return { commitId: revision, path: requestedPath, sizeBytes, encoding: 'utf-8' as const, content: text }
    },

    async diff(repositoryPath: string, input: {
      baseCommitId: string
      targetCommitId: string
      path?: string
    }) {
      const [baseCommitId, targetCommitId] = await Promise.all([
        assertReachableCommit(repositoryPath, input.baseCommitId),
        assertReachableCommit(repositoryPath, input.targetCommitId),
      ])
      const requestedPath = input.path ? normalizeGitRepositoryPath(input.path) : undefined
      const args = [
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        '--find-renames',
        '--unified=3',
        baseCommitId,
        targetCommitId,
        ...(requestedPath ? ['--', requestedPath] : []),
      ]
      const result = await run(repositoryPath, args, options.diffLimitBytes)
      return {
        baseCommitId,
        targetCommitId,
        path: requestedPath ?? null,
        patch: decodeUtf8(result.stdout),
      }
    },
  }
}

export type GitRepositoryReader = ReturnType<typeof createGitRepositoryReader>
