import { Router } from 'express'
import pino from 'pino'
import request, { type Response, type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js'
import {
  createAuthenticationMiddleware,
  createCsrfMiddleware,
} from '../../src/modules/auth/auth.middleware.js'
import { createPasswordService } from '../../src/modules/auth/auth.password.js'
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { createTokenService } from '../../src/modules/auth/auth.tokens.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassProjectTaskRouter } from '../../src/modules/project-tasks/class-project-task.routes.js'
import { createPrismaProjectTaskRepository } from '../../src/modules/project-tasks/project-task.repository.js'
import { createProjectTaskRouter } from '../../src/modules/project-tasks/project-task.routes.js'
import { createProjectTaskService } from '../../src/modules/project-tasks/project-task.service.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import { createRepositoryRouter } from '../../src/modules/repositories/repository.routes.js'
import { createRepositoryService } from '../../src/modules/repositories/repository.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const password = 'Phase7Integration1!'

function csrfFrom(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[]
  const csrfCookie = cookies.find((value) => value.startsWith('projex_csrf='))
  if (!csrfCookie) throw new Error('CSRF cookie missing from login response')
  return decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!)
}

function jsonMutation(test: Test, csrf: string): Test {
  return test.set('Content-Type', 'application/json').set('X-CSRF-Token', csrf)
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('Phase 7 HTTP and PostgreSQL workflow', () => {
  it('enforces auth, CSRF, server-owned visibility, and cross-class boundaries', async () => {
    const passwordService = createPasswordService()
    const passwordHash = await passwordService.hash(password)
    const [instructor, owner, classmate, outsider] = await Promise.all([
      prisma.user.create({
        data: {
          fullName: 'Phase 7 API Instructor',
          email: 'phase7-api-instructor@integration.test',
          passwordHash,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Phase 7 API Owner',
          email: 'phase7-api-owner@integration.test',
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Phase 7 API Classmate',
          email: 'phase7-api-classmate@integration.test',
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Phase 7 API Outsider',
          email: 'phase7-api-outsider@integration.test',
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      }),
    ])
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    await createActiveMembership(prisma, classRecord.id, classmate.id)

    const tokenService = createTokenService('x'.repeat(32), 15)
    const authRepository = createPrismaAuthRepository(prisma)
    const authService = createAuthService({
      repository: authRepository,
      passwordService,
      tokenService,
      logger,
      config: { refreshTokenTtlDays: 7 },
    })
    const requireAuthentication = createAuthenticationMiddleware({
      repository: authRepository,
      tokenService,
    })
    const requireCsrf = createCsrfMiddleware(authService)
    const classRepository = createPrismaClassRepository(prisma)
    const projectTaskService = createProjectTaskService({
      repository: createPrismaProjectTaskRepository(prisma),
      classRepository,
      logger,
    })
    const repositoryService = createRepositoryService({
      repository: createPrismaRepositoryRepository(prisma),
      logger,
    })
    const emptyRouter = () => Router()
    const app = createApp({
      config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb' },
      databaseHealth: createPrismaDatabaseHealth(prisma),
      logger,
      featureRouters: {
        auth: createAuthRouter({
          authService,
          cookieConfig: {
            secure: false,
            sameSite: 'lax',
            accessMaxAgeMs: 15 * 60_000,
            refreshMaxAgeMs: 7 * 86_400_000,
          },
          requireAuthentication,
          requireLogoutAuthentication: requireAuthentication,
          requireCsrf,
        }),
        accountSetup: emptyRouter(),
        users: emptyRouter(),
        classes: createClassProjectTaskRouter({
          service: projectTaskService,
          requireAuthentication,
          requireCsrf,
        }),
        activities: emptyRouter(),
        submissions: emptyRouter(),
        projectTasks: createProjectTaskRouter({
          service: projectTaskService,
          requireAuthentication,
          requireCsrf,
        }),
        repositories: createRepositoryRouter({
          service: repositoryService,
          requireAuthentication,
          requireCsrf,
        }),
      },
    })

    const instructorAgent = request.agent(app)
    const instructorLogin = await instructorAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: instructor.email, password })
      .expect(200)
    const instructorCsrf = csrfFrom(instructorLogin)

    const taskBody = {
      title: 'Phase 7 API Project',
      instructions: 'Create a class project repository.',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      maxTeamSize: 3,
    }
    await instructorAgent
      .post(`/api/v1/classes/${classRecord.id}/project-tasks`)
      .set('Content-Type', 'application/json')
      .send(taskBody)
      .expect(403)
    const taskCreate = await jsonMutation(
      instructorAgent.post(`/api/v1/classes/${classRecord.id}/project-tasks`),
      instructorCsrf,
    )
      .send(taskBody)
      .expect(201)
    expect(taskCreate.body.meta.requestId).toEqual(expect.any(String))
    const projectTaskId = taskCreate.body.data.id as string
    const published = await jsonMutation(
      instructorAgent.post(`/api/v1/project-tasks/${projectTaskId}/publish`),
      instructorCsrf,
    )
      .send({ expectedUpdatedAt: taskCreate.body.data.updatedAt })
      .expect(200)
    expect(published.body.data.status).toBe('PUBLISHED')

    const ownerAgent = request.agent(app)
    const ownerLogin = await ownerAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: owner.email, password })
      .expect(200)
    const ownerCsrf = csrfFrom(ownerLogin)
    await jsonMutation(
      ownerAgent.post(`/api/v1/project-tasks/${projectTaskId}/repositories`),
      ownerCsrf,
    )
      .send({
        teamName: 'API Team',
        repositoryName: 'Rejected Visibility',
        visibility: 'PUBLIC',
      })
      .expect(400)

    const created = await jsonMutation(
      ownerAgent.post(`/api/v1/project-tasks/${projectTaskId}/repositories`),
      ownerCsrf,
    )
      .send({ teamName: 'API Team', repositoryName: 'API Repository' })
      .expect(201)
    expect(created.body.data).toMatchObject({
      repositoryType: 'CLASS_PROJECT',
      visibility: 'CLASS_ONLY',
      reviewStatus: 'WORKING',
    })
    expect(created.body.data).not.toHaveProperty('storagePath')
    const repositoryId = created.body.data.id as string

    const classmateAgent = request.agent(app)
    await classmateAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: classmate.email, password })
      .expect(200)
    const classmateView = await classmateAgent
      .get(`/api/v1/repositories/${repositoryId}`)
      .expect(200)
    expect(classmateView.body.data.visibility).toBe('CLASS_ONLY')

    const outsiderAgent = request.agent(app)
    await outsiderAgent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: outsider.email, password })
      .expect(200)
    const denied = await outsiderAgent
      .get(`/api/v1/repositories/${repositoryId}`)
      .expect(404)
    expect(denied.body.error).toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    expect(denied.body.meta.requestId).toEqual(expect.any(String))

    const studentMembers = await classmateAgent
      .get(`/api/v1/repositories/${repositoryId}/members`)
      .expect(200)
    expect(studentMembers.body.data[0]).toEqual({
      memberId: expect.any(String),
      userId: owner.id,
      fullName: owner.fullName,
      memberRole: 'OWNER',
      teamRole: 'LEAD',
    })
    expect(JSON.stringify(studentMembers.body)).not.toContain(owner.email)
  })
})
