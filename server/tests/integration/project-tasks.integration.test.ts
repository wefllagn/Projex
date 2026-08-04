import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createPrismaProjectTaskRepository } from '../../src/modules/project-tasks/project-task.repository.js'
import { createProjectTaskService } from '../../src/modules/project-tasks/project-task.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const fixedNow = new Date('2030-09-01T00:00:00.000Z')
const dueDate = new Date('2030-09-20T00:00:00.000Z')
const page = { page: 1, pageSize: 20 }

function service(now = fixedNow) {
  const classRepository = createPrismaClassRepository(prisma)
  return createProjectTaskService({
    repository: createPrismaProjectTaskRepository(prisma),
    classRepository,
    logger,
    now: () => now,
  })
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL project-task lifecycle', () => {
  it('persists, filters, paginates, and scopes project tasks safely', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const unrelated = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const projectTasks = service()

    const draft = await projectTasks.create(instructor, classRecord.id, {
      title: 'Campus Navigation',
      instructions: 'Create and document a team repository.',
      dueDate,
      maxTeamSize: 4,
    })
    expect(draft).toMatchObject({ status: 'DRAFT', dueState: 'DRAFT', maxTeamSize: 4 })
    expect((await projectTasks.list(instructor, classRecord.id, page)).projectTasks).toHaveLength(1)
    expect((await projectTasks.list(admin, classRecord.id, page)).projectTasks).toHaveLength(1)
    expect((await projectTasks.list(student, classRecord.id, page)).projectTasks).toEqual([])
    await expect(projectTasks.list(unrelated, classRecord.id, page)).rejects.toMatchObject({
      code: 'CLASS_NOT_FOUND',
    })
    await expect(projectTasks.get(outsider, draft.id)).rejects.toMatchObject({ code: 'PROJECT_TASK_NOT_FOUND' })

    const published = await projectTasks.publish(instructor, draft.id, { expectedUpdatedAt: draft.updatedAt })
    expect(published.status).toBe('PUBLISHED')
    expect((await projectTasks.list(student, classRecord.id, page)).projectTasks).toHaveLength(1)
    await expect(projectTasks.get(student, draft.id)).resolves.toMatchObject({ dueState: 'OPEN' })
    expect((await projectTasks.list(student, classRecord.id, { ...page, search: 'Navigation' })).pagination.totalItems).toBe(1)
  })

  it('uses optimistic concurrency and restores archived tasks as closed', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const projectTasks = service()
    const draft = await projectTasks.create(instructor, classRecord.id, {
      title: 'Concurrent Project',
      instructions: 'Preserve versioned metadata.',
      dueDate,
      maxTeamSize: 4,
    })
    const concurrent = await Promise.allSettled([
      projectTasks.update(instructor, draft.id, { expectedUpdatedAt: draft.updatedAt, title: 'Version A' }),
      projectTasks.update(instructor, draft.id, { expectedUpdatedAt: draft.updatedAt, title: 'Version B' }),
    ])
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(concurrent.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'STALE_PROJECT_TASK_VERSION' },
    })
    const current = await projectTasks.get(instructor, draft.id)
    const published = await projectTasks.publish(instructor, draft.id, { expectedUpdatedAt: current.updatedAt })
    const closed = await projectTasks.close(instructor, draft.id, { expectedUpdatedAt: published.updatedAt })
    const archived = await projectTasks.archive(instructor, draft.id, { expectedUpdatedAt: closed.updatedAt })
    const restored = await projectTasks.restore(instructor, draft.id, { expectedUpdatedAt: archived.updatedAt })
    expect(restored).toMatchObject({ status: 'CLOSED', archivedAt: null })
  })
})
