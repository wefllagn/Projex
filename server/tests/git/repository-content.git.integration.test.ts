import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import pino from 'pino'
import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createGitCommandRunner, createSanitizedGitEnvironment } from '../../src/infrastructure/git/git-command-runner.js'
import { createGitRepositoryReader } from '../../src/infrastructure/git/git-repository-reader.js'
import { createPostgresRepositoryProvisioningQueue } from '../../src/infrastructure/job-queue/repository-provisioning-queue.js'
import { createRepositoryStorage } from '../../src/infrastructure/storage/repository-storage.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import { createRepositoryContentRouter } from '../../src/modules/repository-content/repository-content.routes.js'
import { createRepositoryContentService } from '../../src/modules/repository-content/repository-content.service.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import { createRepositoryProvisioningService } from '../../src/modules/repositories/repository-provisioning.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from '../integration/database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const storageRoot = process.env.GIT_STORAGE_ROOT!
const gitExecutable = process.env.GIT_EXECUTABLE!
const storage = createRepositoryStorage({ root: storageRoot, repositorySizeLimitBytes: 104_857_600 })
const provisioningGit = createGitCommandRunner({ executable: gitExecutable, timeoutMs: 30_000, outputLimitBytes: 1_048_576 })
const accessRepository = createPrismaGitTransportRepository(prisma)
const reader = createGitRepositoryReader({
  executable: gitExecutable,
  timeoutMs: 30_000,
  commandOutputLimitBytes: 1_048_576,
  fileLimitBytes: 262_144,
  diffLimitBytes: 524_288,
  maxChangedFiles: 500,
  maxBranches: 100,
  maxConcurrent: 4,
})
const contentService = createRepositoryContentService({
  enabled: true,
  accessRepository,
  storage,
  reader,
  logger,
})

interface GitResult {
  code: number
  stdout: string
  stderr: string
}

function runGit(args: string[], cwd: string): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(gitExecutable, args, {
      cwd,
      env: {
        ...createSanitizedGitEnvironment(),
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: 'user.name',
        GIT_CONFIG_VALUE_0: 'Projex Test Student',
        GIT_CONFIG_KEY_1: 'user.email',
        GIT_CONFIG_VALUE_1: 'student@integration.test',
      },
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

async function provisionPersonal(ownerId: string) {
  const metadata = createPrismaRepositoryRepository(prisma)
  const created = await metadata.createPersonal({
    ownerId,
    repository: { repositoryName: `Inspection ${randomUUID()}`, description: null },
    now: new Date(),
  })
  if (created.kind !== 'ok') throw new Error('PERSONAL_REPOSITORY_CREATION_FAILED')
  const queue = createPostgresRepositoryProvisioningQueue(prisma)
  const job = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60_000 })
  if (!job) throw new Error('PROVISIONING_JOB_MISSING')
  await createRepositoryProvisioningService({ queue, git: provisioningGit, storage, logger }).process(job)
  const repository = await prisma.repository.findUniqueOrThrow({ where: { id: created.repository.id } })
  if (!repository.storagePath) throw new Error('REPOSITORY_STORAGE_PATH_MISSING')
  const repositoryPath = await storage.resolveManagedRepository(repository.id, repository.storagePath)
  return { repository, repositoryPath }
}

async function createHistory(repositoryPath: string) {
  const clients = path.join(storageRoot, 'inspection-clients', randomUUID())
  const work = path.join(clients, 'work')
  await mkdir(clients, { recursive: true })
  expect((await runGit(['clone', repositoryPath, work], clients)).code).toBe(0)
  expect((await runGit(['checkout', '-b', 'main'], work)).code).toBe(0)
  await mkdir(path.join(work, 'src'))
  await writeFile(path.join(work, 'README.md'), '# Inspection repository\n', 'utf8')
  await writeFile(path.join(work, 'src', 'Main.java'), 'class Main {}\n', 'utf8')
  await writeFile(path.join(work, 'binary.dat'), Buffer.from([0, 1, 2, 3]))
  await writeFile(path.join(work, 'large.txt'), 'x'.repeat(270_000), 'utf8')
  expect((await runGit(['add', '--all'], work)).code).toBe(0)
  expect((await runGit(['commit', '-m', 'Initial project files'], work)).code).toBe(0)
  const firstCommit = (await runGit(['rev-parse', 'HEAD'], work)).stdout.trim()
  expect((await runGit(['push', 'origin', 'main'], work)).code).toBe(0)
  expect((await runGit(['checkout', '-b', 'feature/demo'], work)).code).toBe(0)
  await writeFile(path.join(work, 'src', 'Main.java'), 'class Main { public static void main(String[] args) {} }\n', 'utf8')
  await writeFile(path.join(work, 'NOTES.md'), 'Feature notes\n', 'utf8')
  expect((await runGit(['add', '--all'], work)).code).toBe(0)
  expect((await runGit(['commit', '-m', 'Add demo entry point'], work)).code).toBe(0)
  const secondCommit = (await runGit(['rev-parse', 'HEAD'], work)).stdout.trim()
  expect((await runGit(['push', 'origin', 'feature/demo'], work)).code).toBe(0)
  return { firstCommit, secondCommit }
}

function csrfFrom(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))
  if (!csrfCookie) throw new Error('CSRF_COOKIE_MISSING')
  return decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!)
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => {
  await cleanIntegrationDatabase(prisma)
  await prisma.$disconnect()
})

describe('Phase 8C repository inspection', () => {
  it('reads summary, branches, history, commit, tree, text file, and diff from reachable refs', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { repository, repositoryPath } = await provisionPersonal(owner.id)
    const { firstCommit, secondCommit } = await createHistory(repositoryPath)

    await expect(contentService.summary(owner, repository.id)).resolves.toMatchObject({
      empty: false,
      defaultBranch: 'main',
      branchCount: 2,
      commitCount: 2,
    })
    const branches = await contentService.branches(owner, repository.id)
    expect(branches.map((branch) => branch.branchName).sort()).toEqual(['feature/demo', 'main'])
    expect(branches.find((branch) => branch.branchName === 'main')?.isDefault).toBe(true)

    const history = await contentService.history(owner, repository.id, { branchName: 'feature/demo', page: 1, limit: 1 })
    expect(history.commits).toHaveLength(1)
    expect(history.commits[0]).toMatchObject({ commitId: secondCommit, subject: 'Add demo entry point' })
    expect(history.pagination).toMatchObject({ totalItems: 2, totalPages: 2, hasNextPage: true })

    const detail = await contentService.commit(owner, repository.id, secondCommit)
    expect(detail.parentCommitIds).toEqual([firstCommit])
    expect(detail.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'A', path: 'NOTES.md' }),
      expect.objectContaining({ status: 'M', path: 'src/Main.java' }),
    ]))

    const tree = await contentService.tree(owner, repository.id, { commitId: secondCommit, path: 'src' })
    expect(tree.entries).toEqual([
      expect.objectContaining({ name: 'Main.java', path: 'src/Main.java', entryType: 'blob' }),
    ])
    await expect(contentService.file(owner, repository.id, { commitId: secondCommit, path: 'src/Main.java' }))
      .resolves.toMatchObject({ encoding: 'utf-8', content: expect.stringContaining('public static void main') })
    await expect(contentService.diff(owner, repository.id, { baseCommitId: firstCommit, targetCommitId: secondCommit }))
      .resolves.toMatchObject({ patch: expect.stringContaining('+class Main { public static void main') })
  })

  it('returns safe empty-repository projections without inventing refs or history', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { repository } = await provisionPersonal(owner.id)
    await expect(contentService.summary(owner, repository.id)).resolves.toMatchObject({ empty: true, branchCount: 0, commitCount: 0 })
    await expect(contentService.branches(owner, repository.id)).resolves.toEqual([])
    await expect(contentService.history(owner, repository.id, { page: 1, limit: 20 })).resolves.toMatchObject({ commits: [] })
    await expect(contentService.tree(owner, repository.id, {})).resolves.toMatchObject({ commitId: null, entries: [] })
  })

  it('inspects existing archived READY storage through an exact legacy Windows locator', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { repository } = await provisionPersonal(owner.id)
    await prisma.repository.update({
      where: { id: repository.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        storagePath: repository.storagePath!.replaceAll('/', '\\'),
      },
    })
    await expect(contentService.summary(owner, repository.id)).resolves.toMatchObject({
      repositoryId: repository.id,
      repositoryStatus: 'ARCHIVED',
      storageStatus: 'READY',
      empty: true,
    })
  })

  it('rejects binary, oversized, unreachable, and traversal content safely', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { repository, repositoryPath } = await provisionPersonal(owner.id)
    const { secondCommit } = await createHistory(repositoryPath)
    await expect(contentService.file(owner, repository.id, { commitId: secondCommit, path: 'binary.dat' }))
      .rejects.toMatchObject({ code: 'GIT_BINARY_FILE_UNSUPPORTED', statusCode: 415 })
    await expect(contentService.file(owner, repository.id, { commitId: secondCommit, path: 'large.txt' }))
      .rejects.toMatchObject({ code: 'GIT_FILE_LIMIT_EXCEEDED', statusCode: 413 })
    await expect(contentService.commit(owner, repository.id, 'a'.repeat(40)))
      .rejects.toMatchObject({ code: 'GIT_REVISION_NOT_FOUND', statusCode: 404 })
    await expect(contentService.file(owner, repository.id, { commitId: secondCommit, path: '../server/.env' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 400 })
  })

  it('rechecks current authority and preserves instructor-read/admin-metadata-only rules', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const sameClassNonmember = await createActiveUser(prisma, 'STUDENT')
    const admin = await createActiveUser(prisma, 'ADMIN')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    await createActiveMembership(prisma, classRecord.id, sameClassNonmember.id)
    const projectTask = await prisma.projectTask.create({
      data: {
        classId: classRecord.id,
        createdById: instructor.id,
        title: 'Inspection task',
        instructions: 'Inspect source safely.',
        dueDate: new Date(Date.now() + 86_400_000),
        maxTeamSize: 3,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    })
    const repository = await prisma.$transaction(async (transaction) => {
      const team = await transaction.team.create({
        data: { projectTaskId: projectTask.id, leadStudentId: owner.id, name: 'Inspection Team', normalizedName: 'inspection team' },
      })
      await transaction.teamMember.create({
        data: { teamId: team.id, projectTaskId: projectTask.id, studentId: owner.id, memberRole: 'LEAD', status: 'ACTIVE' },
      })
      const record = await transaction.repository.create({
        data: {
          projectTaskId: projectTask.id,
          teamId: team.id,
          ownerId: owner.id,
          repositoryType: 'CLASS_PROJECT',
          repositoryName: 'Class inspection',
          slug: `class-inspection-${randomUUID()}`,
          visibility: 'CLASS_ONLY',
          status: 'ACTIVE',
          reviewStatus: 'WORKING',
          storageStatus: 'PENDING',
          members: { create: { studentId: owner.id, memberRole: 'OWNER', status: 'ACTIVE' } },
          provisioningJob: { create: { maxClaimAttempts: 3 } },
        },
      })
      return record
    })
    const queue = createPostgresRepositoryProvisioningQueue(prisma)
    const job = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60_000 })
    if (!job) throw new Error('PROVISIONING_JOB_MISSING')
    await createRepositoryProvisioningService({ queue, git: provisioningGit, storage, logger }).process(job)

    await expect(contentService.summary(instructor, repository.id)).resolves.toMatchObject({ empty: true })
    await expect(contentService.summary(sameClassNonmember, repository.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    await expect(contentService.summary(admin, repository.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    await prisma.user.update({ where: { id: owner.id }, data: { status: 'SUSPENDED' } })
    await expect(contentService.summary(owner, repository.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
  })

  it('enforces cookie authentication and strict safe HTTP projections', async () => {
    const password = 'Phase8CInspection1!'
    const passwordService = createPasswordService()
    const owner = await prisma.user.create({
      data: {
        fullName: 'Inspection Student',
        email: 'inspection-student@integration.test',
        passwordHash: await passwordService.hash(password),
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const { repository, repositoryPath } = await provisionPersonal(owner.id)
    const { secondCommit } = await createHistory(repositoryPath)
    const tokenService = createTokenService('x'.repeat(32), 15)
    const authRepository = createPrismaAuthRepository(prisma)
    const authService = createAuthService({
      repository: authRepository,
      passwordService,
      tokenService,
      logger,
      config: { refreshTokenTtlDays: 7 },
    })
    const requireAuthentication = createAuthenticationMiddleware({ repository: authRepository, tokenService })
    const requireCsrf = createCsrfMiddleware(authService)
    const emptyRouter = () => Router()
    const app = createApp({
      config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' },
      databaseHealth: createPrismaDatabaseHealth(prisma),
      logger,
      featureRouters: {
        auth: createAuthRouter({
          authService,
          cookieConfig: { secure: false, sameSite: 'lax', accessMaxAgeMs: 900_000, refreshMaxAgeMs: 604_800_000 },
          requireAuthentication,
          requireLogoutAuthentication: requireAuthentication,
          requireCsrf,
        }),
        accountSetup: emptyRouter(),
        users: emptyRouter(),
        classes: emptyRouter(),
        activities: emptyRouter(),
        submissions: emptyRouter(),
        repositoryContent: createRepositoryContentRouter({ service: contentService, requireAuthentication }),
      },
    })
    await request(app).get(`/api/v1/repositories/${repository.id}/source/summary`).expect(401)
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').set('Content-Type', 'application/json')
      .send({ email: owner.email, password }).expect(200)
    expect(csrfFrom(login)).toEqual(expect.any(String))
    const summary = await agent.get(`/api/v1/repositories/${repository.id}/source/summary`).expect(200)
    expect(summary.body.data).toMatchObject({ repositoryId: repository.id, empty: false })
    expect(JSON.stringify(summary.body)).not.toContain(storageRoot)
    expect(JSON.stringify(summary.body)).not.toContain('storagePath')
    const file = await agent.get(`/api/v1/repositories/${repository.id}/source/file`)
      .query({ commitId: secondCommit, path: 'src/Main.java' }).expect(200)
    expect(file.body.data.content).toContain('public static void main')
    await agent.get(`/api/v1/repositories/${repository.id}/source/file`)
      .query({ commitId: secondCommit, path: '../server/.env' }).expect(400)
    await agent.get(`/api/v1/repositories/${repository.id}/source/diff`)
      .query({ baseCommitId: `${secondCommit}^`, targetCommitId: secondCommit }).expect(400)
  })
})
