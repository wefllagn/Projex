import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import pino from 'pino'
import request from 'supertest'
import { beforeEach, afterAll, afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'
import { createPostgresExecutionQueue } from '../../src/infrastructure/job-queue/execution-queue.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import { createAuthenticationMiddleware, createCsrfMiddleware } from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createConsoleRouter } from '../../src/modules/interactive-console/console.routes.js'
import { createActivityPracticeRouter } from '../../src/modules/activity-practice/practice.routes.js'
import { createActivityPracticeService } from '../../src/modules/activity-practice/practice.service.js'
import type { RepositoryContentService } from '../../src/modules/repository-content/repository-content.service.js'
import { createPrismaSubmissionRepository } from '../../src/modules/submissions/submission.repository.js'
import { createSubmissionService } from '../../src/modules/submissions/submission.service.js'
import { executeConsoleJob } from '../../src/modules/interactive-console/console.worker.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const config = { mode: 'local_process' as const, sourceLimitBytes: 100000, practiceRunTtlHours: 24, practiceRunsPerMinute: 60, practiceMaxActivePerActivity: 1 }
let root: string
beforeEach(async () => { await cleanIntegrationDatabase(prisma); root = await mkdtemp(path.join(os.tmpdir(), 'projex-console-db-')) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })
afterAll(async () => { await prisma.$disconnect() })
const source = (body: string) => `public class Main { public static void main(String[] args) throws Exception { ${body} } }`
async function until<T>(load: () => Promise<T>, check: (value: T) => boolean) {
  for (let i = 0; i < 150; i++) { const value = await load(); if (check(value)) return value; await delay(100) }
  throw new Error('Console condition timed out')
}
async function fixture() {
  const passwordService = createPasswordService()
  const password = 'ConsoleQA1!LocalOnly'
  const passwordHash = await passwordService.hash(password)
  const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
  const student = await createActiveUser(prisma, 'STUDENT')
  const outsider = await createActiveUser(prisma, 'STUDENT')
  await prisma.user.updateMany({ where: { id: { in: [student.id, outsider.id, instructor.id] } }, data: { passwordHash } })
  const cls = await createActiveClass(prisma, instructor.id)
  await createActiveMembership(prisma, cls.id, student.id)
  const activity = await prisma.programmingActivity.create({ data: { classId: cls.id, createdById: instructor.id,
    title: 'Interactive Java QA', instructions: 'Console test', status: 'PUBLISHED', publishedAt: new Date(), dueDate: new Date(Date.now()+86400000),
    entryClassName: 'Main', starterCode: source(''), totalPoints: 1, maxAttempts: 2,
    testCases: { create: [{ name: 'Visible', testCaseOrder: 1, isHidden: false, expectedOutput: 'ok', points: 1 }] } } })
  const tokenService = createTokenService('console-test-key'.repeat(3), 15)
  const repository = createPrismaAuthRepository(prisma)
  const authService = createAuthService({ repository, passwordService, tokenService, logger, config: { refreshTokenTtlDays: 7 } })
  const requireAuthentication = createAuthenticationMiddleware({ repository, tokenService })
  const requireCsrf = createCsrfMiddleware(authService)
  const app = createApp({ config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' },
    logger, databaseHealth: { checkConnection: async () => {} }, featureRouters: {
      auth: createAuthRouter({ authService, cookieConfig: { secure: false, sameSite: 'lax', accessMaxAgeMs: 900000, refreshMaxAgeMs: 86400000 }, requireAuthentication, requireLogoutAuthentication: requireAuthentication, requireCsrf }),
      accountSetup: Router(), users: Router(), classes: Router(), activities: Router(), submissions: Router(),
      interactiveConsole: createConsoleRouter({ prisma, config, requireAuthentication, requireCsrf }),
      activityPractice: createActivityPracticeRouter({ prisma, config, requireAuthentication, requireCsrf, service: createActivityPracticeService({ prisma, enabled: true,
        // These API/execution tests do not inspect Git content. Native Git tests
        // separately exercise the real reader, initialization and publication.
        content: { file: async () => { throw new Error('UNEXPECTED_GIT_READ') } } as unknown as RepositoryContentService }) }),
    } })
  async function login(email: string) {
    const agent = request.agent(app)
    const response = await agent.post('/api/v1/auth/login').send({ email, password }).expect(200)
    const cookie = (response.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('projex_csrf='))!
    const csrf = decodeURIComponent(cookie.split(';')[0]!.split('=')[1]!)
    return { agent, post: (url: string, data: object) => agent.post('/api/v1'+url).set('X-CSRF-Token', csrf).send(data), get: (id: string) => agent.get('/api/v1/interactive-code-runs/'+id) }
  }
  const client = await login(student.email)
  const create = async (body: string, requestKey = randomUUID()) => {
    const response = await client.post(`/activities/${activity.id}/interactive-code-runs`, { sourceCode: source(body), requestKey }).expect(202)
    return response.body.data.id as string
  }
  const runner = createJavaRunner({ javaExecutable: 'java', javacExecutable: 'javac', release: 17, jobRoot: root,
    compileTimeoutMs: 10000, testTimeoutMs: 1000, outputLimitBytes: 4096, memoryLimitMb: 64 })
  async function work() {
    // Poll as the real worker does: database availability can lead the Node
    // clock by a few milliseconds on Windows immediately after creation.
    const queue = createPostgresExecutionQueue(prisma)
    const workerId = randomUUID()
    const job = await until(
      () => queue.claimNext({ workerId, now: new Date(), leaseMs: 5000 }),
      (candidate) => candidate !== null,
    )
    expect(job).not.toBeNull()
    return { done: executeConsoleJob(prisma, runner, job!, { leaseMs: 5000, stopping: () => false }), job: job! }
  }
  const record = (id: string) => prisma.interactiveConsole.findUniqueOrThrow({ where: { id } })
  return { app, client, create, work, record, activity, student, outsider, instructor, login, runner }
}

async function releasedPracticeFixture() {
  const f = await fixture()
  await prisma.programmingActivity.update({ where: { id: f.activity.id }, data: { maxAttempts: 1 } })
  const service = createSubmissionService({ repository: createPrismaSubmissionRepository(prisma), logger, config })
  const created = await service.create(f.student, f.activity.id, source('System.out.print("official");'), randomUUID())
  const submissionId = (created.submission as { id: string }).id
  const queue = createPostgresExecutionQueue(prisma)
  await prisma.executionJob.updateMany({ where: { status: 'QUEUED', claimAttempt: 0 }, data: { availableAt: new Date(0) } })
  const job = await queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60000 })
  if (!job) throw new Error('MISSING_OFFICIAL_JOB')
  await queue.complete(job, { compileStatus: 'SUCCESS', runtimeStatus: 'PASSED', compilerOutput: null,
    cases: job.cases.map(c => ({ id: c.id, status: 'PASSED', actualOutput: 'ok', errorMessage: null, executionTimeMs: 1, automatedPoints: c.maximumPoints ?? 0 })) }, new Date())
  const assessed = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId } })
  await service.review(f.instructor, submissionId, { expectedUpdatedAt: assessed.updatedAt, instructorPoints: 0, feedbackText: 'Try another solution.' })
  const reviewed = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submissionId } })
  await service.release(f.instructor, submissionId, { expectedUpdatedAt: reviewed.updatedAt })
  const entered = await f.client.post(`/activities/${f.activity.id}/practice`, {}).expect(202)
  const workspaceId = entered.body.data.workspaceId as string
  const workspace = await prisma.activityPracticeWorkspace.findUniqueOrThrow({ where: { id: workspaceId } })
  // Metadata-only fixture for Java admission. No Git command uses this locator.
  await prisma.repository.update({ where: { id: workspace.repositoryId }, data: { storageStatus: 'READY', storagePath: `repositories/${workspace.repositoryId.slice(0,2)}/${workspace.repositoryId}.git`, provisionedAt: new Date(), storageVerifiedAt: new Date(), storageSizeBytes: 0 } })
  await prisma.activityPracticeWorkspace.update({ where: { id: workspaceId }, data: { initializedAt: new Date() } })
  await prisma.programmingActivity.update({ where: { id: f.activity.id }, data: { dueDate: new Date(0) } })
  return { ...f, workspaceId, submissionId, queue, service }
}

describe('released practice API and safe Java execution', () => {
  it('runs real interactive Java after the deadline, preserves official evidence, and cancels on archival', async () => {
    const f = await releasedPracticeFixture()
    const evidence = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: f.submissionId }, include: { feedback: true, execution: true } })
    const requestKey = randomUUID(), program = source('System.out.print("practice:"); System.out.println(new java.util.Scanner(System.in).nextLine());')
    const response = await f.client.post(`/activities/${f.activity.id}/practice/interactive-code-runs`, { sourceCode: program, requestKey }).expect(202)
    const id = response.body.data.id
    await f.client.post(`/activities/${f.activity.id}/interactive-code-runs`, { sourceCode: program, requestKey }).expect(409)
    const { done } = await f.work()
    await until(() => f.record(id), r => r.phase === 'RUNNING')
    await f.client.post(`/interactive-code-runs/${id}/input`, { sequence: 1, text: 'hello', eof: false }).expect(200)
    await done
    expect((await f.record(id)).phase).toBe('COMPLETED')
    expect((await f.record(id)).stdout.replaceAll('\r\n', '\n')).toBe('practice:hello\n')
    expect(await prisma.practiceExecution.findUniqueOrThrow({ where: { id } })).toMatchObject({ activityPracticeWorkspaceId: f.workspaceId })
    expect(await prisma.activitySubmission.findUniqueOrThrow({ where: { id: f.submissionId }, include: { feedback: true, execution: true } })).toEqual(evidence)
    const next = await f.client.post(`/activities/${f.activity.id}/practice/interactive-code-runs`, { sourceCode: source('Thread.sleep(20000);'), requestKey: randomUUID() }).expect(202)
    const second = await f.work()
    await until(() => f.record(next.body.data.id), r => r.phase === 'RUNNING')
    await prisma.class.update({ where: { id: f.activity.classId }, data: { status: 'ARCHIVED' } })
    await second.done
    expect(await f.record(next.body.data.id)).toMatchObject({ phase: 'CANCELLED' })
    await f.client.get(id).expect(404)
    await f.client.post(`/activities/${f.activity.id}/practice/interactive-code-runs`, { sourceCode: program, requestKey: randomUUID() }).expect(409)
  })
  it('queues only visible cases after the deadline and never consumes attempts or runs hidden tests', async () => {
    const f = await releasedPracticeFixture()
    await prisma.testCase.create({ data: { activityId: f.activity.id, name: 'Hidden private', testCaseOrder: 2, isHidden: true, expectedOutput: 'SECRET_EXPECTED', inputData: 'SECRET_INPUT', points: 0 } })
    const response = await f.client.post(`/activities/${f.activity.id}/practice/visible-test-runs`, { sourceCode: source('System.out.print("ok");') }).expect(202)
    expect(JSON.stringify(response.body)).not.toMatch(/SECRET_|Hidden private/)
    expect(response.body.data.visibleTestOutcomes).toHaveLength(1)
    const job = await until(() => f.queue.claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 60000 }), value => value !== null)
    expect(job!.submissionId).toBeNull()
    expect(job!.cases).toHaveLength(1)
    const result = await f.runner.execute({ sourceCode: job!.sourceCode, entryClassName: job!.entryClassName, cases: job!.cases })
    await f.queue.complete(job!, result, new Date())
    expect(await prisma.practiceExecution.findUniqueOrThrow({ where: { id: response.body.data.id } })).toMatchObject({ compileStatus: 'SUCCESS', runtimeStatus: 'PASSED', activityPracticeWorkspaceId: f.workspaceId })
    expect(await prisma.activitySubmission.count()).toBe(1)
    await prisma.classMember.update({ where: { classId_studentId: { classId: f.activity.classId, studentId: f.student.id } }, data: { status: 'REMOVED' } })
    await expect(f.service.getPracticeRun(f.student, response.body.data.id)).rejects.toMatchObject({ code: 'PRACTICE_RUN_NOT_FOUND' })
    await prisma.classMember.update({ where: { classId_studentId: { classId: f.activity.classId, studentId: f.student.id } }, data: { status: 'ACTIVE' } })
    await expect(f.service.create(f.student, f.activity.id, source(''), randomUUID())).rejects.toMatchObject({ code: 'ACTIVITY_NOT_ACCEPTING_SUBMISSIONS' })
  })
  it('requires session, CSRF, released feedback and current ownership for every practice mutation', async () => {
    const f = await releasedPracticeFixture(), base = `/activities/${f.activity.id}/practice`
    await request(f.app).post('/api/v1' + base).send({}).expect(401)
    await f.client.agent.post('/api/v1' + base).send({}).expect(403)
    const outsider = await f.login(f.outsider.email), instructor = await f.login(f.instructor.email)
    await outsider.post(base, {}).expect(404)
    await instructor.post(base, {}).expect(403)
    await f.client.post(base + '/saves', { operation: 'SAVE', sourceCode: source(''), expectedHead: 'a'.repeat(40), requestKey: randomUUID(), branchName: 'main' }).expect(400)
    await f.client.post(base + '/saves', { operation: 'RESET', expectedHead: '../main', requestKey: randomUUID() }).expect(400)
    const first = await f.client.post(base + '/saves', { operation: 'SAVE', sourceCode: source(''), expectedHead: 'a'.repeat(40), requestKey: randomUUID() }).expect(409)
    expect(JSON.stringify(first.body)).not.toContain('source_code')
    await prisma.submissionFeedback.update({ where: { submissionId: f.submissionId }, data: { releasedAt: null, releasedById: null } })
    await f.client.post(base, {}).expect(404)
    await f.client.post(base + '/interactive-code-runs', { sourceCode: source(''), requestKey: randomUUID() }).expect(409)
    await f.client.post(base + '/visible-test-runs', { sourceCode: source('') }).expect(409)
  })
})

describe('authenticated durable interactive console with real Java', () => {
  it('streams Scanner prompts, deduplicates input and never creates academic or Git records', async () => {
    const f = await fixture()
    const id = await f.create('java.util.Scanner s=new java.util.Scanner(System.in); System.out.print("Enter your name: "); String n=s.nextLine(); System.out.print("Enter your age: "); int a=s.nextInt(); System.out.println("Hello, "+n+"!\\nAge: "+a);')
    const { done } = await f.work()
    await until(() => f.record(id), (r) => r.stdout.includes('Enter your name: '))
    expect((await f.record(id)).phase).toBe('RUNNING')
    const line = { sequence: 1, text: 'Julius', eof: false }
    await f.client.post(`/interactive-code-runs/${id}/input`, line).expect(200)
    await f.client.post(`/interactive-code-runs/${id}/input`, line).expect(200)
    await until(() => f.record(id), (r) => r.stdout.includes('Enter your age: '))
    await f.client.post(`/interactive-code-runs/${id}/input`, { sequence: 2, text: '23', eof: false }).expect(200)
    await done
    const response = await f.client.get(id).expect(200)
    expect(response.body.data).toMatchObject({ phase: 'COMPLETED', exitCode: 0, nextSequence: 3 })
    expect(response.body.data.transcript.replaceAll('\r\n', '\n')).toContain('Enter your name: Julius\nEnter your age: 23\nHello, Julius!\nAge: 23\n')
    expect(response.body.data).not.toHaveProperty('sourceCode')
    expect(response.body.data).not.toHaveProperty('workerId')
    expect(await prisma.activitySubmission.count()).toBe(0)
    expect(await prisma.repositoryActivity.count()).toBe(0)
    expect(await readdir(root)).toEqual([])
    await rm(root, { recursive: true })
  })
  it('replays start requests and rejects wrong source, auth, CSRF, roles, foreign control and skipped sequences', async () => {
    const f = await fixture()
    const key = randomUUID()
    const [id, replay] = await Promise.all([f.create('System.in.read();', key), f.create('System.in.read();', key)])
    expect(replay).toBe(id)
    expect(await f.create('System.in.read();', key)).toBe(id)
    expect(await prisma.executionJob.count()).toBe(1)
    await request(f.app).get('/api/v1/interactive-code-runs/'+id).expect(401)
    await f.client.agent.post('/api/v1/interactive-code-runs/'+id+'/stop').send({}).expect(403)
    for (const email of [f.outsider.email, f.instructor.email]) {
      const stranger = await f.login(email)
      expect([403,404]).toContain((await stranger.get(id)).status)
      expect([403,404]).toContain((await stranger.post(`/interactive-code-runs/${id}/stop`, {})).status)
      expect([403,404]).toContain((await stranger.post(`/interactive-code-runs/${id}/input`, {sequence:1,text:'secret'})).status)
    }
    await f.client.post(`/activities/${f.activity.id}/interactive-code-runs`, { sourceCode: source('different();'), requestKey:key }).expect(404)
    const { done } = await f.work()
    await until(() => f.record(id), (r) => r.phase === 'RUNNING')
    await f.client.post(`/interactive-code-runs/${id}/input`, { sequence: 2, text:'out of order' }).expect(409)
    await f.client.post(`/interactive-code-runs/${id}/stop`, {}).expect(200)
    await done
    expect((await f.record(id)).phase).toBe('CANCELLED')
  })
  it('preserves whitespace and blank lines and closes stdin using EOF', async () => {
    const f = await fixture()
    const id = await f.create('java.util.Scanner s=new java.util.Scanner(System.in); System.out.print("Ready:"); while(s.hasNextLine()) System.out.println("["+s.nextLine()+"]");')
    const { done } = await f.work()
    await until(() => f.record(id), (r) => r.stdout.includes('Ready:'))
    for (const [index,text] of ['  Julius  ', '', '23'].entries()) await f.client.post(`/interactive-code-runs/${id}/input`, { sequence:index+1, text }).expect(200)
    await f.client.post(`/interactive-code-runs/${id}/input`, { sequence:4, text:'', eof:true }).expect(200)
    await done
    expect((await f.record(id)).stdout.replaceAll('\r\n', '\n')).toBe('Ready:[  Julius  ]\n[]\n[23]\n')
  })
  it('expires disconnected sessions and revalidates revoked membership while running', async () => {
    const f = await fixture()
    let id = await f.create('System.out.print("Waiting"); System.in.read();')
    let { done } = await f.work()
    await until(() => f.record(id), (r) => r.phase === 'RUNNING')
    await prisma.interactiveConsole.update({ where:{id}, data:{lastSeenAt:new Date(Date.now()-31000)} })
    await done
    expect((await f.record(id)).phase).toBe('EXPIRED')
    id = await f.create('System.in.read();')
    ;({done} = await f.work())
    await until(() => f.record(id), (r) => r.phase === 'RUNNING')
    await prisma.classMember.updateMany({ where:{studentId:f.student.id}, data:{status:'REMOVED'} })
    await done
    expect((await f.record(id)).phase).toBe('CANCELLED')
    await f.client.get(id).expect(404)
  })
  it('does not execute or retry an interrupted session on worker lease expiry', async () => {
    const f = await fixture()
    const id = await f.create('System.out.print("must not restart");')
    const queue = createPostgresExecutionQueue(prisma)
    const claimed = await queue.claimNext({ workerId:'interrupted', now:new Date(), leaseMs:1 })
    expect(claimed).not.toBeNull()
    await delay(5)
    expect(await queue.claimNext({ workerId:'replacement', now:new Date(), leaseMs:5000 })).toBeNull()
    expect((await f.client.get(id)).body.data.phase).toBe('FAILED')
    expect((await prisma.executionJob.findUniqueOrThrow({where:{id:claimed!.id}})).claimAttempt).toBe(1)
  })
  it('enforces line and total input limits and rejects stale writes', async () => {
    const f = await fixture()
    const id = await f.create('while(true) Thread.sleep(100);')
    const {done} = await f.work()
    await until(() => f.record(id), (r) => r.phase === 'RUNNING')
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:1,text:'\0'}).expect(400)
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:1,text:'line\nbreak'}).expect(400)
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:1,text:'x'.repeat(4001)}).expect(400)
    for(let sequence=1;sequence<=4;sequence++) await f.client.post(`/interactive-code-runs/${id}/input`, {sequence,text:'x'.repeat(4000)}).expect(200)
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:5,text:'x'.repeat(4000)}).expect(413)
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:1,text:'changed'}).expect(409)
    await f.client.post(`/interactive-code-runs/${id}/stop`,{}).expect(200)
    await done
    await f.client.post(`/interactive-code-runs/${id}/input`, {sequence:5,text:'stale'}).expect(409)
  })
  it('persists compiler and runtime failures truthfully without academic assessment', async () => {
    const f = await fixture()
    for (const [body, phase, compileStatus, runtimeStatus] of [
      ['not valid Java;', 'COMPILE_ERROR', 'STUDENT_ERROR', 'NOT_RUN'],
      ['throw new IllegalStateException("runtime-test");', 'RUNTIME_ERROR', 'SUCCESS', 'ERROR'],
    ] as const) {
      const id = await f.create(body)
      const {done} = await f.work()
      await done
      const record = await f.record(id)
      expect(record.phase).toBe(phase)
      expect(record.stderr).not.toBe('')
      const practice = await prisma.practiceExecution.findUniqueOrThrow({where:{id}})
      expect(practice).toMatchObject({compileStatus,runtimeStatus})
    }
    expect(await prisma.activitySubmission.count()).toBe(0)
  })

})
