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
    const job = await createPostgresExecutionQueue(prisma).claimNext({ workerId: randomUUID(), now: new Date(), leaseMs: 5000 })
    expect(job).not.toBeNull()
    return { done: executeConsoleJob(prisma, runner, job!, { leaseMs: 5000, stopping: () => false }), job: job! }
  }
  const record = (id: string) => prisma.interactiveConsole.findUniqueOrThrow({ where: { id } })
  return { app, client, create, work, record, activity, student, outsider, instructor, login }
}

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
    expect(response.body.data.transcript).toContain('Enter your name: Julius\nEnter your age: 23\nHello, Julius!\nAge: 23\n')
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
    expect((await f.record(id)).stdout).toBe('Ready:[  Julius  ]\n[]\n[23]\n')
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
