import { spawn } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { request as nodeRequest } from 'node:http'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import express, { type RequestHandler } from 'express'
import pino from 'pino'
import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createGitCommandRunner } from '../../src/infrastructure/git/git-command-runner.js'
import { createGitSmartHttpBackend } from '../../src/infrastructure/git/git-smart-http.js'
import { createPostgresRepositoryProvisioningQueue } from '../../src/infrastructure/job-queue/repository-provisioning-queue.js'
import { createErrorHandler } from '../../src/middleware/error-handler.js'
import { requestIdMiddleware } from '../../src/middleware/request-id.js'
import { createRepositoryStorage } from '../../src/infrastructure/storage/repository-storage.js'
import { createPrismaAdminRepository } from '../../src/modules/admin/admin.repository.js'
import { createAdminService } from '../../src/modules/admin/admin.service.js'
import { createGitCredentialService } from '../../src/modules/git-transport/git-credential.service.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import { createGitTransportRouter } from '../../src/modules/git-transport/git-transport.routes.js'
import { createGitTransportService } from '../../src/modules/git-transport/git-transport.service.js'
import { createRepositoryProvisioningService } from '../../src/modules/repositories/repository-provisioning.service.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from '../integration/database.js'

const logger = pino({ level: 'silent' })
const storageRoot = process.env.GIT_STORAGE_ROOT!
const gitExecutable = process.env.GIT_EXECUTABLE!
const backendExecutable = process.env.GIT_HTTP_BACKEND_EXECUTABLE!
const prisma: PrismaClient = createIntegrationPrisma()
const storage = createRepositoryStorage({ root: storageRoot, repositorySizeLimitBytes: 104_857_600 })
const git = createGitCommandRunner({ executable: gitExecutable, timeoutMs: 30_000, outputLimitBytes: 4_194_304 })
const transportRepository = createPrismaGitTransportRepository(prisma)
const credentialService = createGitCredentialService({
  issuanceEnabled: true,
  repository: transportRepository,
  logger,
  credentialTtlMinutes: 15,
})
const backend = createGitSmartHttpBackend({
  executable: backendExecutable,
  gitExecutable,
  storageRoot,
  hookScript: path.resolve(process.cwd(), 'dist', 'infrastructure', 'git', 'git-transport-hook.js'),
  limits: {
    requestBytes: 26_214_400,
    responseBytes: 115_343_360,
    timeoutMs: 60_000,
    maxConcurrent: 4,
    maxBranches: 100,
    maxRefUpdates: 50,
    maxNewCommits: 200,
    blobLimitBytes: 10_485_760,
    repositoryLimitBytes: 104_857_600,
  },
})
const transportService = createGitTransportService({ enabled: true, credentialService, repository: transportRepository, storage, backend, logger })
let server: Server
let origin: string

async function startLoopbackServer(service = transportService): Promise<{ server: Server; origin: string }> {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(express.json({ limit: '1mb' }))
  const pass: RequestHandler = (_request, _response, next) => next()
  app.use('/api/v1', createGitTransportRouter({ credentialService, transportService: service, requireAuthentication: pass, requireCsrf: pass }))
  app.use(createErrorHandler(logger))
  const instance = createServer(app)
  await new Promise<void>((resolve) => instance.listen(0, '127.0.0.1', resolve))
  const address = instance.address()
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_INVALID')
  return { server: instance, origin: `http://127.0.0.1:${address.port}` }
}

function customTransport(overrides: Partial<Parameters<typeof createGitSmartHttpBackend>[0]['limits']>) {
  const customBackend = createGitSmartHttpBackend({
    executable: backendExecutable,
    gitExecutable,
    storageRoot,
    hookScript: path.resolve(process.cwd(), 'dist', 'infrastructure', 'git', 'git-transport-hook.js'),
    limits: {
      requestBytes: 26_214_400,
      responseBytes: 115_343_360,
      timeoutMs: 60_000,
      maxConcurrent: 4,
      maxBranches: 100,
      maxRefUpdates: 50,
      maxNewCommits: 200,
      blobLimitBytes: 10_485_760,
      repositoryLimitBytes: 104_857_600,
      ...overrides,
    },
  })
  return createGitTransportService({ enabled: true, credentialService, repository: transportRepository, storage, backend: customBackend, logger })
}

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function clientEnvironment(authorization?: string): NodeJS.ProcessEnv {
  const allowed = new Set(['COMSPEC', 'LANG', 'LC_ALL', 'PATH', 'PATHEXT', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR', 'TZ', 'WINDIR'])
  const environment: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && allowed.has(key.toUpperCase())) environment[key] = value
  }
  return {
    ...environment,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_EDITOR: 'true',
    GIT_CONFIG_COUNT: authorization ? '3' : '2',
    GIT_CONFIG_KEY_0: 'user.name',
    GIT_CONFIG_VALUE_0: 'Projex Test Student',
    GIT_CONFIG_KEY_1: 'user.email',
    GIT_CONFIG_VALUE_1: 'student@integration.test',
    ...(authorization ? {
      GIT_CONFIG_KEY_2: 'http.extraHeader',
      GIT_CONFIG_VALUE_2: `Authorization: ${authorization}`,
    } : {}),
  }
}

async function runGit(args: string[], cwd: string, authorization?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(gitExecutable, args, {
      cwd,
      env: clientEnvironment(authorization),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.once('error', reject)
    child.once('close', (code) => resolve({
      code: code ?? -1,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    }))
  })
}

function basic(username: string, secret: string): string {
  return `Basic ${Buffer.from(`${username}:${secret}`).toString('base64')}`
}

async function provisionPersonal() {
  const owner = await createActiveUser(prisma, 'STUDENT')
  const repository = createPrismaRepositoryRepository(prisma)
  const created = await repository.createPersonal({
    ownerId: owner.id,
    repository: { repositoryName: 'Smart HTTP Personal', description: null },
    now: new Date(),
  })
  if (created.kind !== 'ok') throw new Error('PERSONAL_FIXTURE_FAILED')
  const queue = createPostgresRepositoryProvisioningQueue(prisma)
  const job = await queue.claimNext({ workerId: crypto.randomUUID(), now: new Date(), leaseMs: 60_000 })
  if (!job) throw new Error('PROVISIONING_JOB_MISSING')
  await createRepositoryProvisioningService({ queue, git, storage, logger }).process(job)
  const ready = await prisma.repository.findUniqueOrThrow({ where: { id: created.repository.id } })
  expect(ready.storageStatus).toBe('READY')
  return { owner, repository: ready }
}

async function issue(user: Awaited<ReturnType<typeof createActiveUser>>, repositoryId: string, operations: ('READ' | 'WRITE')[]) {
  const credential = await credentialService.issue(user, repositoryId, operations)
  return basic(credential.username, credential.secret)
}

function remoteUrl(repositoryId: string): string {
  return `${origin}/api/v1/git/repositories/${repositoryId}`
}

beforeAll(async () => {
  await backend.initialize()
  const started = await startLoopbackServer()
  server = started.server
  origin = started.origin
})

beforeEach(async () => {
  await cleanIntegrationDatabase(prisma)
})

afterAll(async () => {
  await closeServer()
  await cleanIntegrationDatabase(prisma)
  await prisma.$disconnect()
})

describe('authenticated Git Smart HTTP', () => {
  it('retains an accepted-push receipt until idempotent activity persistence succeeds', async () => {
    const operationId = crypto.randomUUID()
    const requestDirectory = path.join(storageRoot, 'transport', 'requests', operationId)
    const receipt = {
      operationId,
      repositoryId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      branches: ['feature/recovery'],
      refUpdateCount: 1,
      acceptedAt: new Date().toISOString(),
    }
    await mkdir(requestDirectory)
    await writeFile(
      path.join(requestDirectory, '.projex-request.json'),
      `${JSON.stringify({ version: 1, operationId })}\n`,
      'utf8',
    )
    await writeFile(
      path.join(requestDirectory, 'accepted-push.json'),
      `${JSON.stringify(receipt)}\n`,
      'utf8',
    )

    await expect(backend.recover(async () => {
      throw new Error('temporary activity persistence failure')
    })).rejects.toThrow('temporary activity persistence failure')
    expect(await readdir(path.join(storageRoot, 'transport', 'requests'))).toContain(operationId)

    const recovered: string[] = []
    expect(await backend.recover(async (accepted) => {
      recovered.push(accepted.operationId)
    })).toBe(1)
    expect(recovered).toEqual([operationId])
    expect(await readdir(path.join(storageRoot, 'transport', 'requests'))).toEqual([])
  })

  it('supports empty clone, initial main push, fetch, and fast-forward push with one activity each', async () => {
    const { owner, repository } = await provisionPersonal()
    const authorization = await issue(owner, repository.id, ['READ', 'WRITE'])
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    const first = path.join(clients, 'first')
    const second = path.join(clients, 'second')
    await mkdir(clients, { recursive: true })
    expect((await runGit(['clone', remoteUrl(repository.id), first], clients, authorization)).code).toBe(0)
    expect((await runGit(['checkout', '-b', 'main'], first)).code).toBe(0)
    await writeFile(path.join(first, 'Main.java'), 'class Main {}\n')
    expect((await runGit(['add', 'Main.java'], first)).code).toBe(0)
    expect((await runGit(['commit', '-m', 'Initial commit'], first)).code).toBe(0)
    const initialPush = await runGit(['push', 'origin', 'main'], first, authorization)
    expect(initialPush.code, initialPush.stderr).toBe(0)
    expect((await runGit(['clone', remoteUrl(repository.id), second], clients, authorization)).code).toBe(0)
    await writeFile(path.join(first, 'Main.java'), 'class Main { public static void main(String[] args) {} }\n')
    expect((await runGit(['commit', '-am', 'Fast-forward update'], first)).code).toBe(0)
    expect((await runGit(['push', 'origin', 'main'], first, authorization)).code).toBe(0)
    expect((await runGit(['fetch', 'origin'], second, authorization)).code).toBe(0)
    const activities = await prisma.repositoryActivity.findMany({ where: { repositoryId: repository.id, activityType: 'PUSH' } })
    expect(activities).toHaveLength(2)
    expect(activities.every((item) => item.userId === owner.id && item.actorType === 'USER')).toBe(true)
    expect(activities.every((item) => item.transportRequestId !== null)).toBe(true)
  })

  it('canonicalizes an exact legacy Windows locator before Smart HTTP execution', async () => {
    const { owner, repository } = await provisionPersonal()
    const legacyLocator = repository.storagePath!.replaceAll('/', '\\')
    await prisma.repository.update({
      where: { id: repository.id },
      data: { storagePath: legacyLocator },
    })
    let backendLocator: string | null = null
    const recordingBackend = {
      ...backend,
      async execute(input: Parameters<typeof backend.execute>[0]) {
        backendLocator = input.relativeRepositoryPath
        await backend.execute(input)
      },
    }
    const recordingService = createGitTransportService({
      enabled: true,
      credentialService,
      repository: transportRepository,
      storage,
      backend: recordingBackend,
      logger,
    })
    const local = await startLoopbackServer(recordingService)
    try {
      const authorization = await issue(owner, repository.id, ['READ'])
      const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
      await mkdir(clients, { recursive: true })
      expect((await runGit(
        ['clone', `${local.origin}/api/v1/git/repositories/${repository.id}`, path.join(clients, 'legacy')],
        clients,
        authorization,
      )).code).toBe(0)
      expect(backendLocator).toBe(repository.storagePath)
      expect(backendLocator).not.toContain('\\')
    } finally {
      await new Promise<void>((resolve) => local.server.close(() => resolve()))
    }
  })

  it('rejects force push, main deletion, tags, branch-case collisions, and oversized blobs without fake activities', async () => {
    const { owner, repository } = await provisionPersonal()
    const authorization = await issue(owner, repository.id, ['READ', 'WRITE'])
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    const work = path.join(clients, 'work')
    await mkdir(clients, { recursive: true })
    await runGit(['clone', remoteUrl(repository.id), work], clients, authorization)
    expect((await runGit(['checkout', '-b', 'main'], work)).code).toBe(0)
    await writeFile(path.join(work, 'Main.java'), 'class Main {}\n')
    await runGit(['add', 'Main.java'], work)
    await runGit(['commit', '-m', 'Initial'], work)
    const initialPush = await runGit(['push', 'origin', 'main'], work, authorization)
    expect(initialPush.code, initialPush.stderr).toBe(0)
    await writeFile(path.join(work, 'Main.java'), 'class Main { int version = 2; }\n')
    await runGit(['commit', '-am', 'Remote second commit'], work)
    expect((await runGit(['push', 'origin', 'main'], work, authorization)).code).toBe(0)
    const baseline = await prisma.repositoryActivity.count({ where: { repositoryId: repository.id, activityType: 'PUSH' } })
    expect((await runGit(['push', 'origin', ':main'], work, authorization)).code).not.toBe(0)
    await runGit(['tag', 'v1'], work)
    expect((await runGit(['push', 'origin', 'refs/tags/v1'], work, authorization)).code).not.toBe(0)
    await runGit(['checkout', '-b', 'Feature'], work)
    await writeFile(path.join(work, 'feature.txt'), 'feature\n')
    await runGit(['add', 'feature.txt'], work)
    await runGit(['commit', '-m', 'Feature'], work)
    expect((await runGit(['push', 'origin', 'Feature'], work, authorization)).code).toBe(0)
    await runGit(['checkout', '-b', 'feature', 'main'], work)
    await writeFile(path.join(work, 'case.txt'), 'collision\n')
    await runGit(['add', 'case.txt'], work)
    await runGit(['commit', '-m', 'Case collision'], work)
    expect((await runGit(['push', 'origin', 'feature'], work, authorization)).code).not.toBe(0)
    await runGit(['checkout', 'main'], work)
    await writeFile(path.join(work, 'large.bin'), Buffer.alloc(10_485_761))
    await runGit(['add', 'large.bin'], work)
    await runGit(['commit', '-m', 'Oversized blob'], work)
    expect((await runGit(['push', 'origin', 'main'], work, authorization)).code).not.toBe(0)
    await runGit(['reset', '--hard', 'HEAD~1'], work)
    await runGit(['reset', '--hard', 'HEAD~1'], work)
    await writeFile(path.join(work, 'rewrite.txt'), 'rewrite\n')
    await runGit(['add', 'rewrite.txt'], work)
    await runGit(['commit', '-m', 'Rewrite'], work)
    expect((await runGit(['push', '--force', 'origin', 'main'], work, authorization)).code).not.toBe(0)
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: repository.id, activityType: 'PUSH' } })).toBe(baseline + 1)
  })

  it('enforces repository scope, operation scope, revocation, and current account authority', async () => {
    const first = await provisionPersonal()
    const second = await provisionPersonal()
    const readCredential = await credentialService.issue(first.owner, first.repository.id, ['READ'])
    const authorization = basic(readCredential.username, readCredential.secret)
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    await mkdir(clients, { recursive: true })
    expect((await runGit(['clone', remoteUrl(second.repository.id), path.join(clients, 'wrong')], clients, authorization)).code).not.toBe(0)
    const allowed = path.join(clients, 'allowed')
    expect((await runGit(['clone', remoteUrl(first.repository.id), allowed], clients, authorization)).code).toBe(0)
    expect((await runGit(['checkout', '-b', 'main'], allowed)).code).toBe(0)
    await writeFile(path.join(allowed, 'Main.java'), 'class Main {}\n')
    await runGit(['add', 'Main.java'], allowed)
    await runGit(['commit', '-m', 'No write scope'], allowed)
    expect((await runGit(['push', 'origin', 'main'], allowed, authorization)).code).not.toBe(0)
    const admin = await createActiveUser(prisma, 'ADMIN', 'Credential Revocation Admin')
    const adminService = createAdminService({ repository: createPrismaAdminRepository(prisma) })
    const revoked = await adminService.revokeGitCredential(
      admin,
      readCredential.credentialId,
      { reason: 'Confirmed repository credential security response.' },
      crypto.randomUUID(),
    )
    expect(revoked).toMatchObject({ changed: true, lifecycle: 'REVOKED' })
    expect((await runGit(['fetch', 'origin'], allowed, authorization)).code).not.toBe(0)
    const replacement = await issue(first.owner, first.repository.id, ['READ'])
    await prisma.user.update({ where: { id: first.owner.id }, data: { status: 'SUSPENDED' } })
    expect((await runGit(['fetch', 'origin'], allowed, replacement)).code).not.toBe(0)
  })

  it('rejects malformed Basic authentication and repositories that are no longer READY', async () => {
    const { owner, repository } = await provisionPersonal()
    const credential = await credentialService.issue(owner, repository.id, ['READ'])
    const malformed = await fetch(`${remoteUrl(repository.id)}/info/refs?service=git-upload-pack`, {
      headers: { authorization: 'Basic malformed' },
    })
    expect(malformed.status).toBe(401)
    expect(malformed.headers.get('www-authenticate')).toContain('Basic')
    const authorization = basic(credential.username, credential.secret)
    await prisma.repository.update({
      where: { id: repository.id },
      data: {
        storageStatus: 'PENDING',
        storagePath: null,
        provisionedAt: null,
        storageVerifiedAt: null,
        storageSizeBytes: null,
      },
    })
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    await mkdir(clients, { recursive: true })
    expect((await runGit(['clone', remoteUrl(repository.id), path.join(clients, 'not-ready')], clients, authorization)).code).not.toBe(0)
  })

  it('keeps instructor source access read-only and administrators source-blind', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const admin = await createActiveUser(prisma, 'ADMIN')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const projectTask = await prisma.projectTask.create({
      data: { classId: classRecord.id, createdById: instructor.id, title: 'Smart HTTP Project', instructions: 'Test transport.', dueDate: new Date(Date.now() + 86_400_000), maxTeamSize: 3, status: 'PUBLISHED', publishedAt: new Date() },
    })
    const repositoryRecord = createPrismaRepositoryRepository(prisma)
    const created = await repositoryRecord.createClassProject({
      projectTaskId: projectTask.id,
      ownerId: owner.id,
      repository: { teamName: 'HTTP Team', repositoryName: 'HTTP Class Repository' },
      now: new Date(),
    })
    if (created.kind !== 'ok') throw new Error('CLASS_REPOSITORY_FIXTURE_FAILED')
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const job = await queue.claimNext({ workerId: crypto.randomUUID(), now: new Date(), leaseMs: 60_000 })
    if (!job) throw new Error('CLASS_PROVISIONING_JOB_MISSING')
    await createRepositoryProvisioningService({ queue, git, storage, logger }).process(job)
    const instructorRead = await issue(instructor, created.repository.id, ['READ'])
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    await mkdir(clients, { recursive: true })
    expect((await runGit(['clone', remoteUrl(created.repository.id), path.join(clients, 'instructor')], clients, instructorRead)).code).toBe(0)
    await expect(credentialService.issue(instructor, created.repository.id, ['WRITE'])).rejects.toMatchObject({ code: 'GIT_OPERATION_NOT_AUTHORIZED' })
    await expect(credentialService.issue(admin, created.repository.id, ['READ'])).rejects.toMatchObject({ code: 'GIT_OPERATION_NOT_AUTHORIZED' })
  })

  it('allows class members to push feature branches while protecting main and multi-ref atomicity', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT', 'Class Lead')
    const member = await createActiveUser(prisma, 'STUDENT', 'Class Member')
    const classmate = await createActiveUser(prisma, 'STUDENT', 'Metadata Only Classmate')
    const classRecord = await createActiveClass(prisma, instructor.id)
    for (const student of [owner, member, classmate]) {
      await createActiveMembership(prisma, classRecord.id, student.id)
    }
    const projectTask = await prisma.projectTask.create({
      data: { classId: classRecord.id, createdById: instructor.id, title: 'Branch Policy Project', instructions: 'Test branch policy.', dueDate: new Date(Date.now() + 86_400_000), maxTeamSize: 4, status: 'PUBLISHED', publishedAt: new Date() },
    })
    const repositoryRecord = createPrismaRepositoryRepository(prisma)
    const created = await repositoryRecord.createClassProject({
      projectTaskId: projectTask.id,
      ownerId: owner.id,
      repository: { teamName: 'Branch Team', repositoryName: 'Branch Policy Repository' },
      now: new Date(),
    })
    if (created.kind !== 'ok' || !created.repository.teamId) throw new Error('CLASS_REPOSITORY_FIXTURE_FAILED')
    await prisma.$transaction(async (transaction) => {
      await transaction.teamMember.create({
        data: { teamId: created.repository.teamId!, projectTaskId: projectTask.id, studentId: member.id, memberRole: 'MEMBER', status: 'ACTIVE' },
      })
      await transaction.repositoryMember.create({
        data: { repositoryId: created.repository.id, studentId: member.id, memberRole: 'MEMBER', status: 'ACTIVE' },
      })
    })
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const job = await queue.claimNext({ workerId: crypto.randomUUID(), now: new Date(), leaseMs: 60_000 })
    if (!job) throw new Error('CLASS_PROVISIONING_JOB_MISSING')
    await createRepositoryProvisioningService({ queue, git, storage, logger }).process(job)

    const ownerAuthorization = await issue(owner, created.repository.id, ['READ', 'WRITE'])
    const memberAuthorization = await issue(member, created.repository.id, ['READ', 'WRITE'])
    await expect(credentialService.issue(classmate, created.repository.id, ['READ']))
      .rejects.toMatchObject({ code: 'GIT_OPERATION_NOT_AUTHORIZED' })
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    const ownerWork = path.join(clients, 'owner')
    const memberWork = path.join(clients, 'member')
    await mkdir(clients, { recursive: true })
    await runGit(['clone', remoteUrl(created.repository.id), ownerWork], clients, ownerAuthorization)
    await runGit(['checkout', '-b', 'main'], ownerWork)
    await writeFile(path.join(ownerWork, 'Main.java'), 'class Main {}\n')
    await runGit(['add', 'Main.java'], ownerWork)
    await runGit(['commit', '-m', 'Initial main'], ownerWork)
    expect((await runGit(['push', 'origin', 'main'], ownerWork, ownerAuthorization)).code).toBe(0)

    expect((await runGit(['clone', remoteUrl(created.repository.id), memberWork], clients, memberAuthorization)).code).toBe(0)
    await runGit(['checkout', '-b', 'feature/member-work'], memberWork)
    await writeFile(path.join(memberWork, 'Member.java'), 'class Member {}\n')
    await runGit(['add', 'Member.java'], memberWork)
    await runGit(['commit', '-m', 'Member feature'], memberWork)
    expect((await runGit(['push', 'origin', 'feature/member-work'], memberWork, memberAuthorization)).code).toBe(0)
    expect((await runGit(['push', 'origin', 'HEAD:main'], memberWork, memberAuthorization)).code).not.toBe(0)

    await runGit(['checkout', '-b', 'feature/atomic'], memberWork)
    await writeFile(path.join(memberWork, 'Atomic.java'), 'class Atomic {}\n')
    await runGit(['add', 'Atomic.java'], memberWork)
    await runGit(['commit', '-m', 'Atomic multi-ref'], memberWork)
    expect((await runGit(['push', 'origin', 'HEAD:feature/atomic', 'HEAD:main'], memberWork, memberAuthorization)).code).not.toBe(0)
    const atomicRef = await runGit(['ls-remote', '--heads', 'origin', 'feature/atomic'], memberWork, memberAuthorization)
    expect(atomicRef.code).toBe(0)
    expect(atomicRef.stdout.trim()).toBe('')
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: created.repository.id, activityType: 'PUSH' } })).toBe(2)

    const repositoryMember = await prisma.repositoryMember.findUniqueOrThrow({
      where: { repositoryId_studentId: { repositoryId: created.repository.id, studentId: member.id } },
    })
    const teamMember = await prisma.teamMember.findUniqueOrThrow({
      where: { teamId_studentId: { teamId: created.repository.teamId, studentId: member.id } },
    })
    await prisma.$transaction(async (transaction) => {
      await transaction.teamMember.update({ where: { id: teamMember.id }, data: { status: 'REMOVED', removedAt: new Date() } })
      await transaction.repositoryMember.update({ where: { id: repositoryMember.id }, data: { status: 'REMOVED', removedAt: new Date() } })
    })
    expect((await runGit(['fetch', 'origin'], memberWork, memberAuthorization)).code).not.toBe(0)
  })

  it('enforces branch, ref-update, commit-count, and repository-size limits', async () => {
    const { owner, repository } = await provisionPersonal()
    const authorization = await issue(owner, repository.id, ['READ', 'WRITE'])
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    const work = path.join(clients, 'limits')
    await mkdir(clients, { recursive: true })
    await runGit(['clone', remoteUrl(repository.id), work], clients, authorization)
    await runGit(['checkout', '-b', 'main'], work)
    await writeFile(path.join(work, 'Main.java'), 'class Main {}\n')
    await runGit(['add', 'Main.java'], work)
    await runGit(['commit', '-m', 'Initial'], work)
    expect((await runGit(['push', 'origin', 'main'], work, authorization)).code).toBe(0)

    const branchNames = Array.from({ length: 99 }, (_, index) => `limit-${String(index + 1).padStart(3, '0')}`)
    for (const branch of branchNames) await runGit(['branch', branch], work)
    const firstBatch = branchNames.slice(0, 50).map((branch) => `refs/heads/${branch}:refs/heads/${branch}`)
    const secondBatch = branchNames.slice(50).map((branch) => `refs/heads/${branch}:refs/heads/${branch}`)
    expect((await runGit(['push', 'origin', ...firstBatch], work, authorization)).code).toBe(0)
    expect((await runGit(['push', 'origin', ...secondBatch], work, authorization)).code).toBe(0)
    await runGit(['branch', 'limit-100'], work)
    expect((await runGit(['push', 'origin', 'refs/heads/limit-100:refs/heads/limit-100'], work, authorization)).code).not.toBe(0)

    const tooMany = Array.from({ length: 51 }, (_, index) => `batch-${String(index + 1).padStart(3, '0')}`)
    for (const branch of tooMany) await runGit(['branch', branch], work)
    const refspecs = tooMany.map((branch) => `refs/heads/${branch}:refs/heads/${branch}`)
    expect((await runGit(['push', 'origin', ...refspecs], work, authorization)).code).not.toBe(0)
    expect((await runGit(['ls-remote', '--heads', 'origin', 'batch-001'], work, authorization)).stdout.trim()).toBe('')

    await runGit(['checkout', '-b', 'commit-limit', 'main'], work)
    for (let index = 0; index < 201; index += 1) {
      await runGit(['commit', '--allow-empty', '-m', `Commit ${index + 1}`], work)
    }
    expect((await runGit(['push', 'origin', 'commit-limit'], work, authorization)).code).not.toBe(0)

    await runGit(['checkout', 'main'], work)
    await writeFile(path.join(work, 'Main.java'), 'class Main { int version = 2; }\n')
    await runGit(['commit', '-am', 'Repository size check'], work)
    const ready = await prisma.repository.findUniqueOrThrow({ where: { id: repository.id } })
    const repositoryPath = await storage.resolveManagedRepository(repository.id, ready.storagePath!)
    await writeFile(path.join(repositoryPath, 'size-limit-fixture.bin'), Buffer.alloc(104_857_601))
    expect((await runGit(['push', 'origin', 'main'], work, authorization)).code).not.toBe(0)
    expect(await prisma.repositoryActivity.count({ where: { repositoryId: repository.id, activityType: 'PUSH' } })).toBe(3)
  }, 120_000)

  it('terminates timeout, request-limit, output-limit, and disconnected-client transports safely', async () => {
    const { owner, repository } = await provisionPersonal()
    const credential = await credentialService.issue(owner, repository.id, ['READ', 'WRITE'])
    const authorization = basic(credential.username, credential.secret)

    const timeoutServer = await startLoopbackServer(customTransport({ timeoutMs: 500 }))
    const timeoutStatus = await new Promise<number>((resolve) => {
      const request = nodeRequest(
        `${timeoutServer.origin}/api/v1/git/repositories/${repository.id}/git-receive-pack`,
        { method: 'POST', headers: { authorization, 'content-type': 'application/x-git-receive-pack-request' } },
        (response) => { response.resume(); response.once('end', () => resolve(response.statusCode ?? 0)) },
      )
      request.once('error', () => resolve(0))
      request.flushHeaders()
    })
    expect(timeoutStatus).toBe(504)
    await new Promise<void>((resolve) => timeoutServer.server.close(() => resolve()))

    const requestLimitServer = await startLoopbackServer(customTransport({ requestBytes: 1_024 }))
    const requestLimitStatus = await new Promise<number>((resolve) => {
      const request = nodeRequest(
        `${requestLimitServer.origin}/api/v1/git/repositories/${repository.id}/git-receive-pack`,
        { method: 'POST', headers: { authorization, 'content-type': 'application/x-git-receive-pack-request' } },
        (response) => { response.resume(); response.once('end', () => resolve(response.statusCode ?? 0)) },
      )
      request.once('error', () => resolve(0))
      request.end(Buffer.alloc(2_048))
    })
    expect(requestLimitStatus).toBe(413)
    await new Promise<void>((resolve) => requestLimitServer.server.close(() => resolve()))

    const outputLimitServer = await startLoopbackServer(customTransport({ responseBytes: 64 }))
    const clients = path.join(storageRoot, 'clients', crypto.randomUUID())
    await mkdir(clients, { recursive: true })
    expect((await runGit(['clone', `${outputLimitServer.origin}/api/v1/git/repositories/${repository.id}`, path.join(clients, 'limited')], clients, authorization)).code).not.toBe(0)
    await new Promise<void>((resolve) => outputLimitServer.server.close(() => resolve()))

    const disconnectServer = await startLoopbackServer(customTransport({ timeoutMs: 5_000 }))
    await new Promise<void>((resolve) => {
      const request = nodeRequest(
        `${disconnectServer.origin}/api/v1/git/repositories/${repository.id}/git-receive-pack`,
        { method: 'POST', headers: { authorization, 'content-type': 'application/x-git-receive-pack-request' } },
      )
      request.once('error', () => resolve())
      request.flushHeaders()
      setTimeout(() => { request.destroy(); resolve() }, 100)
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(await readdir(path.join(storageRoot, 'transport', 'requests'))).toEqual([])
    await new Promise<void>((resolve) => disconnectServer.server.close(() => resolve()))
  }, 30_000)
})
