import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Request, Response } from 'express'
import { AppError } from '../../shared/errors/app-error.js'
import { createGitCommandRunner, createSanitizedGitEnvironment } from './git-command-runner.js'
import type { AcceptedPushReceipt, AuthenticatedGitRequest } from '../../modules/git-transport/git-transport.types.js'

const HEADER_LIMIT_BYTES = 32_768
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface Limits {
  requestBytes: number
  responseBytes: number
  timeoutMs: number
  maxConcurrent: number
  maxBranches: number
  maxRefUpdates: number
  maxNewCommits: number
  blobLimitBytes: number
  repositoryLimitBytes: number
}

interface SmartHttpInput {
  request: Request
  response: Response
  repositoryPath: string
  relativeRepositoryPath: string
  routeSuffix: 'info/refs' | 'git-upload-pack' | 'git-receive-pack'
  queryString: string
  authentication: AuthenticatedGitRequest
  operationId: string
  onAcceptedPush(receipt: AcceptedPushReceipt): Promise<void>
}

function transportError(statusCode: number, code: string, message: string): AppError {
  return new AppError({ statusCode, code, message })
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return relative.length > 0 && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

function safePathForShell(value: string): string {
  return value.replaceAll('\\', '/')
}

function sameCanonicalPath(left: string, right: string): boolean {
  return process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right
}

async function assertPlainFile(file: string, code: string): Promise<void> {
  if (!path.isAbsolute(file)) throw transportError(503, code, 'Git Smart HTTP is unavailable.')
  const metadata = await lstat(file).catch(() => null)
  if (!metadata?.isFile() || metadata.isSymbolicLink()) {
    throw transportError(503, code, 'Git Smart HTTP is unavailable.')
  }
  await access(file, constants.X_OK).catch(() => {
    throw transportError(503, code, 'Git Smart HTTP is unavailable.')
  })
}

function parseReceipt(
  raw: string,
  expected?: { operationId: string; repositoryId?: string; userId?: string },
): AcceptedPushReceipt {
  const receipt = JSON.parse(raw) as Partial<AcceptedPushReceipt>
  if (
    !UUID.test(receipt.operationId ?? '') ||
    !UUID.test(receipt.repositoryId ?? '') ||
    !UUID.test(receipt.userId ?? '') ||
    (expected && receipt.operationId !== expected.operationId) ||
    (expected?.repositoryId && receipt.repositoryId !== expected.repositoryId) ||
    (expected?.userId && receipt.userId !== expected.userId) ||
    !Array.isArray(receipt.branches) ||
    receipt.branches.some((branch) => typeof branch !== 'string' || !branch || branch.length > 255) ||
    !Number.isInteger(receipt.refUpdateCount) ||
    receipt.refUpdateCount! < 1 ||
    typeof receipt.acceptedAt !== 'string' ||
    Number.isNaN(Date.parse(receipt.acceptedAt))
  ) {
    throw transportError(500, 'GIT_PUSH_RECEIPT_INVALID', 'Git push auditing failed.')
  }
  return receipt as AcceptedPushReceipt
}

export function createGitSmartHttpBackend(options: {
  executable: string
  gitExecutable: string
  storageRoot: string
  hookScript: string
  limits: Limits
}) {
  const executable = path.resolve(options.executable)
  const gitExecutable = path.resolve(options.gitExecutable)
  const storageRoot = path.resolve(options.storageRoot)
  const hookScript = path.resolve(options.hookScript)
  const transportRoot = path.join(storageRoot, 'transport')
  const hookRoot = path.join(transportRoot, 'hooks')
  const requestRoot = path.join(transportRoot, 'requests')
  const git = createGitCommandRunner({
    executable: gitExecutable,
    timeoutMs: Math.min(options.limits.timeoutMs, 10_000),
    outputLimitBytes: 16_384,
  })
  let active = 0
  let initialized: Promise<void> | null = null
  let recovery: Promise<number> | null = null
  const activeOperationIds = new Set<string>()

  async function initialize(): Promise<void> {
    if (initialized) return initialized
    initialized = (async () => {
      await Promise.all([
        assertPlainFile(executable, 'GIT_HTTP_BACKEND_UNAVAILABLE'),
        assertPlainFile(gitExecutable, 'GIT_EXECUTABLE_UNAVAILABLE'),
        assertPlainFile(hookScript, 'GIT_HOOK_RUNTIME_UNAVAILABLE'),
      ])
      await git.detectVersion()
      let createdTransportRoot = false
      try {
        await mkdir(transportRoot)
        createdTransportRoot = true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
      const markerPath = path.join(transportRoot, '.projex-transport.json')
      const expectedMarker = `${JSON.stringify({ version: 1, owner: 'projex-git-smart-http' })}\n`
      if (createdTransportRoot) {
        await writeFile(markerPath, expectedMarker, { encoding: 'utf8', flag: 'wx' })
      } else if (await readFile(markerPath, 'utf8').catch(() => '') !== expectedMarker) {
        throw transportError(503, 'GIT_TRANSPORT_MARKER_INVALID', 'Git Smart HTTP is unavailable.')
      }
      const transportMetadata = await lstat(transportRoot)
      if (!transportMetadata.isDirectory() || transportMetadata.isSymbolicLink()) {
        throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
      }
      await mkdir(hookRoot, { recursive: true })
      await mkdir(requestRoot, { recursive: true })
      for (const directory of [hookRoot, requestRoot]) {
        const metadata = await lstat(directory)
        if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
          throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
        }
      }
      const canonicalStorage = await realpath(storageRoot)
      const canonicalTransport = await realpath(transportRoot)
      if (!isWithin(canonicalStorage, canonicalTransport)) {
        throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
      }
      const node = safePathForShell(process.execPath)
      const script = safePathForShell(hookScript)
      for (const hook of ['pre-receive', 'post-receive'] as const) {
        const hookPath = path.join(hookRoot, hook)
        const expectedHook = `#!/bin/sh\nexec "${node}" "${script}" ${hook}\n`
        const existing = await readFile(hookPath, 'utf8').catch(() => null)
        if (existing === null) {
          await writeFile(hookPath, expectedHook, { encoding: 'utf8', flag: 'wx' })
        } else {
          const metadata = await lstat(hookPath)
          if (!metadata.isFile() || metadata.isSymbolicLink() || existing !== expectedHook) {
            throw transportError(503, 'GIT_TRANSPORT_HOOK_INVALID', 'Git Smart HTTP is unavailable.')
          }
        }
      }
    })()
    return initialized
  }

  function terminate(child: ReturnType<typeof spawn>): void {
    if (process.platform === 'win32' && child.pid) {
      const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')
      const killer = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      })
      killer.unref()
    } else child.kill('SIGKILL')
  }

  async function removeVerifiedRequestDirectory(requestDirectory: string, operationId: string): Promise<void> {
    if (!isWithin(requestRoot, requestDirectory) || path.basename(requestDirectory) !== operationId) {
      throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
    }
    const metadata = await lstat(requestDirectory)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
    }
    const marker = JSON.parse(
      await readFile(path.join(requestDirectory, '.projex-request.json'), 'utf8'),
    ) as { version?: number; operationId?: string }
    if (marker.version !== 1 || marker.operationId !== operationId) {
      throw transportError(503, 'GIT_TRANSPORT_MARKER_INVALID', 'Git Smart HTTP is unavailable.')
    }
    await rm(requestDirectory, { recursive: true, force: false })
  }

  async function recover(onAcceptedPush: SmartHttpInput['onAcceptedPush']): Promise<number> {
    await initialize()
    if (recovery) return recovery
    recovery = (async () => {
      let recovered = 0
      for (const entry of await readdir(requestRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || !UUID.test(entry.name) || activeOperationIds.has(entry.name)) {
          if (!activeOperationIds.has(entry.name)) {
            throw transportError(503, 'GIT_TRANSPORT_STORAGE_INVALID', 'Git Smart HTTP is unavailable.')
          }
          continue
        }
        const requestDirectory = path.join(requestRoot, entry.name)
        const receiptRaw = await readFile(path.join(requestDirectory, 'accepted-push.json'), 'utf8').catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null
            throw error
          },
        )
        if (receiptRaw) {
          await onAcceptedPush(parseReceipt(receiptRaw, { operationId: entry.name }))
          recovered += 1
        }
        await removeVerifiedRequestDirectory(requestDirectory, entry.name)
      }
      return recovered
    })().finally(() => {
      recovery = null
    })
    return recovery
  }

  async function execute(input: SmartHttpInput): Promise<void> {
    if (active >= options.limits.maxConcurrent) {
      throw transportError(503, 'GIT_TRANSPORT_BUSY', 'Git transport capacity is temporarily unavailable.')
    }
    await recover(input.onAcceptedPush)
    const [canonicalRepositoryPath, canonicalBackendPath] = await Promise.all([
      realpath(input.repositoryPath),
      realpath(path.resolve(storageRoot, input.relativeRepositoryPath)),
    ])
    if (!sameCanonicalPath(canonicalRepositoryPath, canonicalBackendPath)) {
      throw transportError(503, 'GIT_REPOSITORY_STORAGE_INVALID', 'Git transport is unavailable.')
    }
    const declaredContentLength = input.request.header('content-length')
    if (input.request.method !== 'GET' && declaredContentLength !== undefined) {
      if (!/^\d+$/.test(declaredContentLength)) {
        throw transportError(400, 'GIT_CONTENT_LENGTH_INVALID', 'Git transport request is invalid.')
      }
      const parsedContentLength = Number(declaredContentLength)
      if (!Number.isSafeInteger(parsedContentLength)) {
        throw transportError(400, 'GIT_CONTENT_LENGTH_INVALID', 'Git transport request is invalid.')
      }
      if (parsedContentLength > options.limits.requestBytes) {
        throw transportError(413, 'GIT_REQUEST_LIMIT_EXCEEDED', 'Git transport request exceeded its limit.')
      }
    }
    active += 1
    const writeOperation = input.routeSuffix === 'git-receive-pack'
    const requestDirectory = path.join(requestRoot, input.operationId)
    const receiptPath = path.join(requestDirectory, 'accepted-push.json')
    let acceptedPushRecorded = false
    try {
      if (writeOperation) {
        if (!UUID.test(input.operationId)) throw transportError(500, 'GIT_OPERATION_INVALID', 'Git transport failed.')
        activeOperationIds.add(input.operationId)
        await mkdir(requestDirectory, { recursive: false })
        await writeFile(
          path.join(requestDirectory, '.projex-request.json'),
          `${JSON.stringify({ version: 1, operationId: input.operationId })}\n`,
          { encoding: 'utf8', flag: 'wx' },
        )
      }

      const policy = Buffer.from(JSON.stringify({
        operationId: input.operationId,
        repositoryId: input.authentication.repositoryId,
        userId: input.authentication.userId,
        canUpdateMain: input.authentication.permission.canUpdateMain,
        maxBranches: options.limits.maxBranches,
        maxRefUpdates: options.limits.maxRefUpdates,
        maxNewCommits: options.limits.maxNewCommits,
        blobLimitBytes: options.limits.blobLimitBytes,
        repositoryLimitBytes: options.limits.repositoryLimitBytes,
      }), 'utf8').toString('base64url')

      const pathInfo = `/${input.relativeRepositoryPath.replaceAll('\\', '/')}/${input.routeSuffix}`
      const environment: NodeJS.ProcessEnv = {
        ...createSanitizedGitEnvironment(),
        GIT_PROJECT_ROOT: storageRoot,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: pathInfo,
        QUERY_STRING: input.queryString,
        REQUEST_METHOD: input.request.method,
        CONTENT_TYPE: input.request.header('content-type') ?? '',
        CONTENT_LENGTH: input.request.header('content-length') ?? '',
        REMOTE_USER: input.authentication.userId,
        REMOTE_ADDR: input.request.socket.remoteAddress ?? '',
        SERVER_PROTOCOL: `HTTP/${input.request.httpVersion}`,
        SERVER_NAME: '127.0.0.1',
        SERVER_PORT: String(input.request.socket.localPort ?? ''),
        GIT_CONFIG_COUNT: '3',
        GIT_CONFIG_KEY_0: 'core.hooksPath',
        GIT_CONFIG_VALUE_0: hookRoot,
        GIT_CONFIG_KEY_1: 'http.receivepack',
        GIT_CONFIG_VALUE_1: 'true',
        GIT_CONFIG_KEY_2: 'http.uploadpack',
        GIT_CONFIG_VALUE_2: 'true',
        PROJEX_GIT_EXECUTABLE: gitExecutable,
        PROJEX_PUSH_POLICY: policy,
        PROJEX_PUSH_RECEIPT_PATH: receiptPath,
      }

      await new Promise<void>((resolve, reject) => {
        const child = spawn(executable, [], {
          env: environment,
          shell: false,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        })
        let headerBuffer = Buffer.alloc(0)
        let headersSent = false
        let responseBytes = 0
        let requestBytes = 0
        let failure: AppError | null = null
        let settled = false
        const fail = (error: AppError) => {
          if (!failure) failure = error
          terminate(child)
        }
        const timer = setTimeout(
          () => fail(transportError(504, 'GIT_TRANSPORT_TIMEOUT', 'Git transport timed out.')),
          options.limits.timeoutMs,
        )

        const writeBody = (chunk: Buffer) => {
          responseBytes += chunk.length
          if (responseBytes > options.limits.responseBytes) {
            fail(transportError(502, 'GIT_RESPONSE_LIMIT_EXCEEDED', 'Git transport response exceeded its limit.'))
            return
          }
          if (!input.response.write(chunk)) {
            child.stdout.pause()
            input.response.once('drain', () => child.stdout.resume())
          }
        }

        child.stdout.on('data', (chunk: Buffer) => {
          if (headersSent) {
            writeBody(chunk)
            return
          }
          headerBuffer = Buffer.concat([headerBuffer, chunk])
          if (headerBuffer.length > HEADER_LIMIT_BYTES) {
            fail(transportError(502, 'GIT_CGI_HEADERS_INVALID', 'Git transport returned invalid headers.'))
            return
          }
          const crlf = headerBuffer.indexOf('\r\n\r\n')
          const lf = headerBuffer.indexOf('\n\n')
          const index = crlf >= 0 ? crlf : lf
          if (index < 0) return
          const delimiterLength = crlf >= 0 ? 4 : 2
          const headerText = headerBuffer.subarray(0, index).toString('utf8')
          const body = headerBuffer.subarray(index + delimiterLength)
          let status = 200
          for (const line of headerText.split(/\r?\n/)) {
            const separator = line.indexOf(':')
            if (separator <= 0) continue
            const name = line.slice(0, separator).trim()
            const value = line.slice(separator + 1).trim()
            if (name.toLowerCase() === 'status') status = Number(value.slice(0, 3)) || 200
            else if (['content-type', 'cache-control', 'expires', 'pragma'].includes(name.toLowerCase())) {
              input.response.setHeader(name, value)
            }
          }
          input.response.status(status)
          headersSent = true
          headerBuffer = Buffer.alloc(0)
          if (body.length > 0) writeBody(body)
        })
        child.stderr.resume()
        child.stdin.on('error', () => {
          // The backend may close stdin after rejecting a malformed or oversized request.
        })
        child.once('error', () => fail(transportError(502, 'GIT_BACKEND_START_FAILED', 'Git transport failed.')))
        child.once('close', (code) => {
          clearTimeout(timer)
          if (settled) return
          settled = true
          if (failure) {
            reject(failure)
            return
          }
          if (code !== 0 || !headersSent) {
            reject(transportError(502, 'GIT_BACKEND_FAILED', 'Git transport failed.'))
            return
          }
          resolve()
        })

        if (input.request.method === 'GET') child.stdin.end()
        else {
          input.request.on('data', (chunk: Buffer) => {
            requestBytes += chunk.length
            if (requestBytes > options.limits.requestBytes) {
              input.request.pause()
              fail(transportError(413, 'GIT_REQUEST_LIMIT_EXCEEDED', 'Git transport request exceeded its limit.'))
              return
            }
            if (!child.stdin.write(chunk)) {
              input.request.pause()
              child.stdin.once('drain', () => input.request.resume())
            }
          })
          input.request.once('end', () => child.stdin.end())
          input.request.once('aborted', () => fail(transportError(499, 'GIT_CLIENT_DISCONNECTED', 'Git client disconnected.')))
        }
        input.response.once('close', () => {
          if (!input.response.writableEnded && !settled) {
            fail(transportError(499, 'GIT_CLIENT_DISCONNECTED', 'Git client disconnected.'))
          }
        })
      })

      if (writeOperation) {
        const receipt = await readFile(receiptPath, 'utf8').then(
          (raw) => parseReceipt(raw, {
            operationId: input.operationId,
            repositoryId: input.authentication.repositoryId,
            userId: input.authentication.userId,
          }),
          (error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null
            throw error
          },
        )
        if (receipt) await input.onAcceptedPush(receipt)
        acceptedPushRecorded = receipt !== null
      }
      input.response.end()
    } finally {
      active -= 1
      if (writeOperation) {
        activeOperationIds.delete(input.operationId)
        const receiptExists = await lstat(receiptPath).then(() => true, () => false)
        const directoryExists = await lstat(requestDirectory).then(() => true, () => false)
        if (directoryExists && (!receiptExists || acceptedPushRecorded)) {
          await removeVerifiedRequestDirectory(requestDirectory, input.operationId)
        }
      }
    }
  }

  return { initialize, recover, execute }
}
