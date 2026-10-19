import { randomBytes } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { cleanIntegrationDatabase, createIntegrationPrisma } from './database.js'
import { requireTestDatabaseUrl } from './test-database-url.js'

const prisma = createIntegrationPrisma()
let apiProcess: ChildProcess | undefined
async function stopApi() {
  if (!apiProcess || apiProcess.exitCode !== null || apiProcess.signalCode !== null) return
  const exited = new Promise<void>((resolve) => apiProcess!.once('exit', () => resolve()))
  apiProcess.kill('SIGTERM')
  await exited
}
beforeEach(async () => { await stopApi(); await cleanIntegrationDatabase(prisma) })
afterAll(async () => { await stopApi(); await prisma.$disconnect() })
function csrf(response: Response) {
  const cookie = (response.headers['set-cookie'] as unknown as string[]).find((value) => value.startsWith('projex_csrf='))
  if (!cookie) throw new Error('Fixture sign-in did not return CSRF protection.')
  return decodeURIComponent(cookie.split(';')[0]!.slice('projex_csrf='.length))
}
const mutate = (test: Test, token: string) => test.set('Content-Type', 'application/json').set('X-CSRF-Token', token)

describe('Admin and Instructor Class provisioning MVP', () => {
  it('connects account provisioning, self-service Class, join, teaching and safe Admin oversight through real cookie/CSRF HTTP', async () => {
    // Production composition, not a bypass authentication router. Load source
    // through the existing test runtime so a clean checkout needs no dist files.
    // All children inherit only the guarded test DB target.
    const password = `Provision!${randomBytes(20).toString('hex')}`
    const passwordHash = await createPasswordService().hash(password)
    const admin = await prisma.user.create({ data: { fullName: 'Fixture Admin', email: 'provision.admin@slu.edu.ph', role: 'ADMIN', status: 'ACTIVE', passwordHash } })
    const student = await prisma.user.create({ data: { fullName: 'Fixture Student', email: 'provision.student@slu.edu.ph', role: 'STUDENT', status: 'ACTIVE', passwordHash } })
    const co = await prisma.user.create({ data: { fullName: 'Fixture Co-Instructor', email: 'provision.co@slu.edu.ph', role: 'INSTRUCTOR', status: 'ACTIVE', passwordHash } })
    const socket = createServer()
    await new Promise<void>((resolve) => socket.listen(0, '127.0.0.1', resolve))
    const address = socket.address()
    if (!address || typeof address === 'string') throw new Error('Fixture port unavailable.')
    const port = address.port
    await new Promise<void>((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()))
    const root = await mkdtemp(path.join(os.tmpdir(), 'projex-class-provision-http-'))
    apiProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: process.cwd(), shell: false, stdio: 'ignore', env: {
      ...process.env, NODE_ENV: 'test', DATABASE_URL: requireTestDatabaseUrl(process.env.TEST_DATABASE_URL),
      HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: 'http://localhost:5173', LOG_LEVEL: 'silent',
      ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'), MAIL_TRANSPORT: 'preview', MAIL_FROM_NAME: 'Projex Fixture',
      MAIL_FROM_ADDRESS: 'fixture@integration.test', MAIL_PREVIEW_DIR: path.join(root, 'mail'),
      JAVA_EXECUTION_MODE: 'disabled', GIT_EXECUTION_MODE: 'local_process', GIT_SMART_HTTP_ENABLED: 'false',
      GIT_EXECUTABLE: process.env.GIT_EXECUTABLE || (process.platform === 'win32' ? 'C:\\Program Files\\Git\\cmd\\git.exe' : '/usr/bin/git'), GIT_STORAGE_ROOT: path.join(root, 'git'),
    } })
    let failed = false
    apiProcess.on('error', () => { failed = true })
    const base = `http://127.0.0.1:${port}`
    let ready = false
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (failed || apiProcess.exitCode !== null) throw new Error('Disposable API stopped before readiness.')
      try { if ((await fetch(`${base}/api/v1/health`)).ok) { ready = true; break } } catch { /* bounded startup retry */ }
      await delay(100)
    }
    if (!ready) throw new Error('Disposable API did not become ready.')
    const administrator = request.agent(base), teacher = request.agent(base), learner = request.agent(base), colleague = request.agent(base)
    const adminToken = csrf(await administrator.post('/api/v1/auth/login').send({ email: admin.email, password }).expect(200))
    const studentToken = csrf(await learner.post('/api/v1/auth/login').send({ email: student.email, password }).expect(200))
    const coToken = csrf(await colleague.post('/api/v1/auth/login').send({ email: co.email, password }).expect(200))
    const provisioned = await mutate(administrator.post('/api/v1/users/instructors'), adminToken).send({ fullName: 'Fixture Primary', universityEmail: 'provision.primary@slu.edu.ph' }).expect(201)
    const setupLink = provisioned.body.data.manualSetup.setupLink as string
    const setupToken = new URLSearchParams(new URL(setupLink).hash.slice(1)).get('token')
    await teacher.post('/api/v1/account-setup/complete').send({ setupToken, password, confirmPassword: password }).expect(200)
    const teacherToken = csrf(await teacher.post('/api/v1/auth/login').send({ email: 'provision.primary@slu.edu.ph', password }).expect(200))
    const classInput = { className: 'Self-service Programming', semester: 'Short Term', schoolYear: '2026-2027', section: 'A', room: 'Lab 1' }
    await teacher.post('/api/v1/classes').send(classInput).expect(403)
    await mutate(learner.post('/api/v1/classes'), studentToken).send(classInput).expect(403)
    for (const invalid of [{ semester: 'summer-ish' }, { schoolYear: '2026-2028' }, { semester: undefined }, { schoolYear: undefined }]) {
      await mutate(teacher.post('/api/v1/classes'), teacherToken).send({ ...classInput, ...invalid }).expect(400)
    }
    await mutate(teacher.post('/api/v1/classes'), teacherToken).send({ ...classInput, instructorId: co.id }).expect(400)
    const created = (await mutate(teacher.post('/api/v1/classes'), teacherToken).send(classInput).expect(201)).body.data
    expect(created).toMatchObject({ status: 'ACTIVE', semester: 'Short Term', schoolYear: '2026-2027', courseId: null })
    expect(created).not.toHaveProperty('classCode')
    expect((await teacher.get('/api/v1/classes').expect(200)).body.data.map((item: { id: string }) => item.id)).toContain(created.id)
    const join = (await teacher.get(`/api/v1/classes/${created.id}/join-code`).expect(200)).body.data
    await mutate(learner.post('/api/v1/classes/join'), studentToken).send({ classCode: join.classCode }).expect(201)
    expect((await teacher.get(`/api/v1/classes/${created.id}/members`).expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ userId: student.id })]))
    await mutate(colleague.patch(`/api/v1/classes/${created.id}`), coToken).send({ room: 'Unauthorized' }).expect(404)
    await mutate(teacher.post(`/api/v1/classes/${created.id}/staff/invitations`), teacherToken).send({ universityEmail: co.email }).expect(201)
    await mutate(colleague.post(`/api/v1/classes/${created.id}/staff/invitations/accept`), coToken).send({}).expect(200)
    await colleague.get(`/api/v1/classes/${created.id}/members`).expect(200)
    await mutate(colleague.patch(`/api/v1/classes/${created.id}`), coToken).send({ room: 'Not Primary' }).expect(404)
    const dueDate = new Date(Date.now() + 86_400_000).toISOString()
    const activity = (await mutate(teacher.post(`/api/v1/classes/${created.id}/activities`), teacherToken).send({ title: 'Hello Java', instructions: 'Print Hello.', dueDate, entryClassName: 'Main', starterCode: 'class Main {}', maxAttempts: 1, totalPoints: 100, creditPolicy: 'LATEST' }).expect(201)).body.data
    const configured = await mutate(teacher.put(`/api/v1/activities/${activity.id}/test-cases`), teacherToken).send({ expectedUpdatedAt: activity.updatedAt, testCases: [{ name: 'Hello', inputData: '', expectedOutput: 'Hello', isHidden: false, points: 40 }] }).expect(200)
    await mutate(teacher.post(`/api/v1/activities/${activity.id}/publish`), teacherToken).send({ expectedUpdatedAt: configured.body.data.activityUpdatedAt }).expect(200)
    await learner.get(`/api/v1/activities/${activity.id}`).expect(200)
    const project = (await mutate(teacher.post(`/api/v1/classes/${created.id}/project-tasks`), teacherToken).send({ title: 'Enrollment System', instructions: 'Collaborate using Git.', dueDate, maxTeamSize: 8 }).expect(201)).body.data
    await mutate(teacher.post(`/api/v1/project-tasks/${project.id}/publish`), teacherToken).send({ expectedUpdatedAt: project.updatedAt }).expect(200)
    const repository = (await mutate(learner.post(`/api/v1/project-tasks/${project.id}/repositories`), studentToken).send({ teamName: 'Team A', repositoryName: 'enrollment-system' }).expect(201)).body.data
    await learner.get(`/api/v1/repositories/${repository.id}`).expect(200)
    await administrator.get(`/api/v1/admin/academic/classes?search=Self-service`).expect(200)
    await administrator.get(`/api/v1/classes/${created.id}`).expect(200)
    // Metadata oversight does not confer private content/credential authority.
    await administrator.get(`/api/v1/repositories/${repository.id}/source/tree`).expect(404)
    const supported = (await mutate(administrator.post('/api/v1/classes'), adminToken).send({ ...classInput, className: 'Support-created Class', instructorId: created.instructor.userId, semester: 'Second Semester' }).expect(201)).body.data
    expect(supported.status).toBe('ACTIVE')
    const secondCode = (await teacher.get(`/api/v1/classes/${supported.id}/join-code`).expect(200)).body.data
    expect(secondCode.classCode).not.toBe(join.classCode)
    expect(await prisma.course.count()).toBe(0)
    await stopApi()
  }, 60_000)
})
