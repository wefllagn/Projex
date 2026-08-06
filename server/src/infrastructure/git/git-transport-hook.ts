import { spawn } from 'node:child_process'
import { lstat, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ZERO = '0000000000000000000000000000000000000000'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEAD_REF = /^refs\/heads\/(.+)$/

interface Policy {
  operationId: string
  repositoryId: string
  userId: string
  canUpdateMain: boolean
  maxBranches: number
  maxRefUpdates: number
  maxNewCommits: number
  blobLimitBytes: number
  repositoryLimitBytes: number
}

interface RefUpdate {
  oldObjectId: string
  newObjectId: string
  refName: string
  branchName: string
}

class HookRejection extends Error {}

function reject(code: string): never {
  throw new HookRejection(code)
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) reject('HOOK_CONFIGURATION_INVALID')
  return value
}

function parsePolicy(): Policy {
  try {
    const policy = JSON.parse(
      Buffer.from(requiredEnvironment('PROJEX_PUSH_POLICY'), 'base64url').toString('utf8'),
    ) as Policy
    if (
      !UUID.test(policy.operationId) ||
      !UUID.test(policy.repositoryId) ||
      !UUID.test(policy.userId) ||
      typeof policy.canUpdateMain !== 'boolean' ||
      !Number.isInteger(policy.maxBranches) ||
      !Number.isInteger(policy.maxRefUpdates) ||
      !Number.isInteger(policy.maxNewCommits) ||
      !Number.isInteger(policy.blobLimitBytes) ||
      !Number.isInteger(policy.repositoryLimitBytes)
    ) {
      reject('HOOK_POLICY_INVALID')
    }
    return policy
  } catch (error) {
    if (error instanceof HookRejection) throw error
    reject('HOOK_POLICY_INVALID')
  }
}

async function readUpdates(maxUpdates: number): Promise<RefUpdate[]> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > 65_536) reject('TOO_MANY_REF_UPDATES')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  if (lines.length > maxUpdates) reject('TOO_MANY_REF_UPDATES')
  return lines.map((line) => {
    const parts = line.split(' ')
    if (parts.length !== 3) reject('MALFORMED_REF_UPDATE')
    const [oldObjectId, newObjectId, refName] = parts
    if (!/^[0-9a-f]{40}$/.test(oldObjectId!) || !/^[0-9a-f]{40}$/.test(newObjectId!)) {
      reject('MALFORMED_REF_UPDATE')
    }
    const match = HEAD_REF.exec(refName!)
    if (!match?.[1]) reject('UNSUPPORTED_REF_NAMESPACE')
    return { oldObjectId: oldObjectId!, newObjectId: newObjectId!, refName: refName!, branchName: match[1] }
  })
}

function childEnvironment(): NodeJS.ProcessEnv {
  const allowed = new Set([
    'COMSPEC', 'LANG', 'LC_ALL', 'PATH', 'PATHEXT', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR',
    'TZ', 'WINDIR', 'GIT_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_QUARANTINE_PATH',
  ])
  const result: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && allowed.has(key.toUpperCase())) result[key] = value
  }
  return {
    ...result,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_EDITOR: 'true',
  }
}

async function runGit(
  args: readonly string[],
  options: { stdin?: string; acceptedExitCodes?: number[] } = {},
): Promise<{ stdout: string; exitCode: number }> {
  const executable = requiredEnvironment('PROJEX_GIT_EXECUTABLE')
  if (!path.isAbsolute(executable)) reject('HOOK_CONFIGURATION_INVALID')
  return new Promise((resolve, rejectPromise) => {
    const child = spawn(executable, [...args], {
      cwd: path.resolve(process.env.GIT_DIR ?? process.cwd()),
      env: childEnvironment(),
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const output: Buffer[] = []
    let bytes = 0
    let settled = false
    const stop = (error: Error) => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      rejectPromise(error)
    }
    const timer = setTimeout(() => stop(new HookRejection('HOOK_GIT_TIMEOUT')), 30_000)
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > 33_554_432) {
        stop(new HookRejection('HOOK_GIT_OUTPUT_LIMIT'))
        return
      }
      output.push(chunk)
    })
    child.stderr.resume()
    child.once('error', () => stop(new HookRejection('HOOK_GIT_FAILED')))
    child.once('close', (code) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      const exitCode = code ?? -1
      if (!(options.acceptedExitCodes ?? [0]).includes(exitCode)) {
        rejectPromise(new HookRejection('HOOK_GIT_FAILED'))
        return
      }
      resolve({ stdout: Buffer.concat(output).toString('utf8'), exitCode })
    })
    child.stdin.end(options.stdin)
  })
}

async function directorySize(root: string, limit: number): Promise<number> {
  let total = 0
  const pending = [root]
  while (pending.length > 0) {
    const current = pending.pop()!
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name)
      const metadata = await lstat(target)
      if (metadata.isSymbolicLink()) reject('REPOSITORY_LINK_REJECTED')
      if (metadata.isDirectory()) pending.push(target)
      else if (metadata.isFile()) {
        total += (await stat(target)).size
        if (total > limit) reject('REPOSITORY_SIZE_LIMIT_EXCEEDED')
      } else reject('REPOSITORY_ENTRY_REJECTED')
    }
  }
  return total
}

async function validatePreReceive(policy: Policy, updates: RefUpdate[]): Promise<void> {
  if (updates.length === 0) reject('EMPTY_PUSH_REJECTED')
  const existingOutput = await runGit(['for-each-ref', '--format=%(refname)', 'refs/heads/'])
  const existing = new Set(existingOutput.stdout.split(/\r?\n/).filter(Boolean))

  for (const update of updates) {
    await runGit(['check-ref-format', update.refName])
    if (update.branchName.toLowerCase() === 'main' && !policy.canUpdateMain) {
      reject('MAIN_BRANCH_PROTECTED')
    }
    if (update.refName === 'refs/heads/main' && update.newObjectId === ZERO) {
      reject('MAIN_BRANCH_DELETION_REJECTED')
    }
    if (update.oldObjectId !== ZERO && update.newObjectId !== ZERO) {
      const ancestor = await runGit(
        ['merge-base', '--is-ancestor', update.oldObjectId, update.newObjectId],
        { acceptedExitCodes: [0, 1] },
      )
      if (ancestor.exitCode !== 0) reject('NON_FAST_FORWARD_REJECTED')
    }
  }

  const finalRefs = new Set(existing)
  for (const update of updates) {
    if (update.newObjectId === ZERO) finalRefs.delete(update.refName)
    else finalRefs.add(update.refName)
  }
  if (finalRefs.size > policy.maxBranches) reject('BRANCH_LIMIT_EXCEEDED')
  const lower = new Set<string>()
  for (const refName of finalRefs) {
    const key = refName.toLowerCase()
    if (lower.has(key)) reject('BRANCH_CASE_COLLISION')
    lower.add(key)
  }

  const newTips = [...new Set(updates.filter((item) => item.newObjectId !== ZERO).map((item) => item.newObjectId))]
  if (newTips.length > 0) {
    const commitCount = Number((await runGit(['rev-list', '--count', ...newTips, '--not', '--all'])).stdout.trim())
    if (!Number.isSafeInteger(commitCount) || commitCount > policy.maxNewCommits) {
      reject('NEW_COMMIT_LIMIT_EXCEEDED')
    }
    const objectLines = (await runGit(['rev-list', '--objects', ...newTips, '--not', '--all'])).stdout
      .split(/\r?\n/)
      .filter(Boolean)
    const objectIds = [...new Set(objectLines.map((line) => line.split(' ')[0]).filter(Boolean))]
    if (objectIds.length > 0) {
      const inspected = await runGit(
        ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
        { stdin: `${objectIds.join('\n')}\n` },
      )
      for (const line of inspected.stdout.split(/\r?\n/).filter(Boolean)) {
        const [, type, rawSize] = line.split(' ')
        if (type === 'blob' && Number(rawSize) > policy.blobLimitBytes) {
          reject('BLOB_SIZE_LIMIT_EXCEEDED')
        }
      }
    }
  }
  await directorySize(path.resolve(process.env.GIT_DIR ?? process.cwd()), policy.repositoryLimitBytes)
}

async function writePostReceiveReceipt(policy: Policy, updates: RefUpdate[]): Promise<void> {
  if (updates.length === 0) return
  const receiptPath = requiredEnvironment('PROJEX_PUSH_RECEIPT_PATH')
  if (!path.isAbsolute(receiptPath)) reject('HOOK_CONFIGURATION_INVALID')
  const branches = [...new Set(updates.map((item) => item.branchName))].sort((a, b) => a.localeCompare(b))
  await writeFile(
    receiptPath,
    `${JSON.stringify({
      operationId: policy.operationId,
      repositoryId: policy.repositoryId,
      userId: policy.userId,
      branches,
      refUpdateCount: updates.length,
      acceptedAt: new Date().toISOString(),
    })}\n`,
    { encoding: 'utf8', flag: 'wx' },
  )
}

async function main(): Promise<void> {
  const hook = process.argv[2]
  const policy = parsePolicy()
  const updates = await readUpdates(policy.maxRefUpdates)
  if (hook === 'pre-receive') await validatePreReceive(policy, updates)
  else if (hook === 'post-receive') await writePostReceiveReceipt(policy, updates)
  else reject('HOOK_TYPE_INVALID')
}

main().catch((error: unknown) => {
  const code = error instanceof HookRejection && /^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : 'PUSH_POLICY_FAILED'
  process.stderr.write(`Projex push rejected: ${code}\n`)
  process.exitCode = 1
})
