import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import express from 'express'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from 'pino'
import type { AppEnv } from '../../config/env.js'
import { createErrorHandler } from '../../middleware/error-handler.js'
import { notFoundMiddleware } from '../../middleware/not-found.js'
import { requestIdMiddleware } from '../../middleware/request-id.js'
import { createGitCredentialService, type GitCredentialService } from '../../modules/git-transport/git-credential.service.js'
import { createPrismaGitTransportRepository } from '../../modules/git-transport/git-transport.repository.js'
import { createGitProtocolRouter } from '../../modules/git-transport/git-transport.routes.js'
import { createGitTransportService, type GitTransportService } from '../../modules/git-transport/git-transport.service.js'
import { assertHostedGitService } from '../preflight/hosted-service.js'
import { createRepositoryStorage } from '../storage/repository-storage.js'
import { createGitSmartHttpBackend } from './git-smart-http.js'

const PROTOCOL_PATH = /^\/api\/v1\/git\/repositories\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(info\/refs|git-upload-pack|git-receive-pack)$/i

export function configuredGitHttpBackend(env: AppEnv) {
  return createGitSmartHttpBackend({
    executable: env.gitHttpBackendExecutable || process.execPath,
    gitExecutable: env.gitExecutable || process.execPath,
    storageRoot: env.gitStorageRoot || process.cwd(),
    hookScript: fileURLToPath(new URL('./git-transport-hook.js', import.meta.url)),
    limits: {
      requestBytes: env.gitHttpRequestLimitBytes, responseBytes: env.gitHttpResponseLimitBytes,
      timeoutMs: env.gitHttpTimeoutMs, maxConcurrent: env.gitHttpMaxConcurrent,
      maxBranches: env.gitMaxBranches, maxRefUpdates: env.gitMaxRefUpdates,
      maxNewCommits: env.gitMaxNewCommits, blobLimitBytes: env.gitBlobLimitBytes,
      repositoryLimitBytes: env.gitRepositorySizeLimitBytes,
    },
  })
}

/** No JSON/body parser, cookies, filesystem routes, browser API or proxy trust. */
export function createGitHttpWorkerServer(input: {
  enabled: boolean
  credentialService: GitCredentialService
  transportService: GitTransportService
  databaseReady(): Promise<void>
  logger: Logger
  timeoutMs: number
}): Server {
  const app = express()
  app.disable('x-powered-by')
  app.use(requestIdMiddleware)
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next() })
  app.get('/internal/git/ready', async (_request, response) => {
    try {
      if (!input.enabled) { response.status(503).json({ ready: false }); return }
      await input.databaseReady()
      response.json({ ready: true })
    } catch { response.status(503).json({ ready: false }) }
  })
  app.use((request, response, next) => {
    const match = PROTOCOL_PATH.exec(request.originalUrl.split('?')[0] ?? '')
    if (!input.enabled || !match || request.header('x-forwarded-proto') !== 'https') {
      response.status(404).end(); return
    }
    const expectedMethod = match[1]?.toLowerCase() === 'info/refs' ? 'GET' : 'POST'
    if (request.method !== expectedMethod) { response.status(405).end(); return }
    // git-http-backend expects the unencoded Git protocol body.
    if (request.header('content-encoding') && request.header('content-encoding') !== 'identity') {
      response.status(415).end(); return
    }
    next()
  })
  app.use('/api/v1', createGitProtocolRouter(input))
  app.use(notFoundMiddleware)
  app.use(createErrorHandler(input.logger))
  const server = createServer({ maxHeaderSize: 16_384 }, app)
  server.maxConnections = 64
  server.headersTimeout = 10_000
  server.requestTimeout = input.timeoutMs + 10_000
  server.keepAliveTimeout = 5_000
  return server
}

export async function startIsolatedGitHttpWorker(env: AppEnv, prisma: PrismaClient, logger: Logger): Promise<Server | undefined> {
  if (!env.gitSmartHttpEnabled || env.gitExecutionMode !== 'service_isolated') return
  await assertHostedGitService(env.gitStorageRoot)
  const repository = createPrismaGitTransportRepository(prisma)
  const credentialService = createGitCredentialService({ issuanceEnabled: false, repository, logger, credentialTtlMinutes: env.gitCredentialTtlMinutes })
  const transportService = createGitTransportService({
    enabled: true, credentialService, repository, logger,
    storage: createRepositoryStorage({ root: env.gitStorageRoot, repositorySizeLimitBytes: env.gitRepositorySizeLimitBytes }),
    backend: configuredGitHttpBackend(env),
  })
  await transportService.initialize()
  const server = createGitHttpWorkerServer({
    enabled: true, credentialService, transportService, logger, timeoutMs: env.gitHttpTimeoutMs,
    databaseReady: async () => { await prisma.$queryRaw`SELECT 1` },
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(env.gitHttpPort, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
  })
  logger.info({ event: 'git_http.ready' }, 'isolated Git HTTP listener ready')
  return server
}
