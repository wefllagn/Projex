import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaActivityRepository } from '../../src/modules/activities/activity.repository.js'
import { createActivityService } from '../../src/modules/activities/activity.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createPrismaTestCaseRepository } from '../../src/modules/test-cases/test-case.repository.js'
import { createTestCaseService } from '../../src/modules/test-cases/test-case.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const page = { page: 1, pageSize: 20 }
const fixedNow = new Date('2030-08-04T02:00:00.000Z')
const futureDueDate = new Date('2030-08-20T09:00:00.000Z')

function createServices(at = fixedNow) {
  const classRepository = createPrismaClassRepository(prisma)
  const activityRepository = createPrismaActivityRepository(prisma)
  const activityService = createActivityService({
    repository: activityRepository,
    classRepository,
    logger,
    now: () => at,
  })
  const testCaseService = createTestCaseService({
    repository: createPrismaTestCaseRepository(prisma),
    activityRepository,
    logger,
    now: () => at,
  })
  return { activityService, testCaseService }
}

function activityInput(title = 'Loop Patterns') {
  return {
    title,
    instructions: 'Read values and print a deterministic loop summary.',
    dueDate: futureDueDate,
    language: 'JAVA' as const,
    entryClassName: 'Main',
    starterCode: 'public class Main { public static void main(String[] args) {} }',
    maxAttempts: 1,
    creditPolicy: 'LATEST' as const,
    totalPoints: 100,
  }
}

function publishableTestCases() {
  return [
    {
      name: 'Visible sample',
      inputData: '5',
      expectedOutput: '10',
      isHidden: false,
      points: 30,
    },
    {
      name: 'Hidden boundary',
      inputData: '-1',
      expectedOutput: '0',
      isHidden: true,
      points: 40,
    },
  ]
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL programming activity lifecycle', () => {
  it('persists drafts, filters lists, and enforces role-scoped visibility', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    const { activityService, testCaseService } = createServices()

    const draft = await activityService.create(
      instructor,
      classRecord.id,
      activityInput(),
    )
    expect(draft).toMatchObject({
      classId: classRecord.id,
      status: 'DRAFT',
      dueState: 'DRAFT',
      totalPoints: 100,
      maxAttempts: 1,
      creditPolicy: 'LATEST',
      entryClassName: 'Main',
    })
    expect(await prisma.programmingActivity.count()).toBe(1)
    expect((await activityService.list(instructor, classRecord.id, page)).activities).toHaveLength(1)
    const adminActivities = (
      await activityService.list(admin, classRecord.id, page)
    ).activities
    expect(adminActivities).toHaveLength(1)
    expect(adminActivities[0]).not.toHaveProperty('starterCode')
    expect(adminActivities[0]).not.toHaveProperty('instructions')
    await expect(
      activityService.create(admin, classRecord.id, activityInput('Admin Draft')),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    await expect(
      testCaseService.list(admin, draft.id, page),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND', statusCode: 404 })
    await expect(
      testCaseService.replace(admin, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
        testCases: publishableTestCases(),
      }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND', statusCode: 404 })
    expect((await activityService.list(student, classRecord.id, page)).activities).toEqual([])
    await expect(activityService.get(student, draft.id)).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_FOUND',
      statusCode: 404,
    })

    const configured = await activityService.update(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      creditPolicy: 'HIGHEST',
    })
    expect(configured.creditPolicy).toBe('HIGHEST')
    const replaced = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: configured.updatedAt,
      testCases: publishableTestCases(),
    })
    const published = await activityService.publish(instructor, draft.id, {
      expectedUpdatedAt: replaced.activityUpdatedAt,
    })
    expect(published.status).toBe('PUBLISHED')
    expect((await activityService.list(student, classRecord.id, page)).activities).toHaveLength(1)
    await expect(activityService.get(student, draft.id)).resolves.toMatchObject({
      status: 'PUBLISHED',
      dueState: 'OPEN',
    })
    expect(
      (
        await activityService.list(instructor, classRecord.id, {
          ...page,
          status: 'DRAFT',
        })
      ).activities,
    ).toEqual([])
  })

  it('freezes published scoring configuration and restores without reopening', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      activityInput(),
    )
    const replaced = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: publishableTestCases(),
    })
    const published = await activityService.publish(instructor, draft.id, {
      expectedUpdatedAt: replaced.activityUpdatedAt,
    })

    await expect(
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
        totalPoints: 120,
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    await expect(
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
        creditPolicy: 'LATEST',
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    await expect(
      testCaseService.replace(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
        testCases: publishableTestCases(),
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_TEST_CASES_IMMUTABLE' })
    await expect(
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
        dueDate: new Date('2030-08-10T09:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_DUE_DATE_CANNOT_DECREASE' })

    const corrected = await activityService.update(instructor, draft.id, {
      expectedUpdatedAt: published.updatedAt,
      title: 'Corrected Loop Patterns',
      dueDate: new Date('2030-08-25T09:00:00.000Z'),
      maxAttempts: 2,
    })
    expect(corrected).toMatchObject({
      title: 'Corrected Loop Patterns',
      maxAttempts: 2,
    })
    const closed = await activityService.close(instructor, draft.id, {
      expectedUpdatedAt: corrected.updatedAt,
    })
    const archived = await activityService.archive(instructor, draft.id, {
      expectedUpdatedAt: closed.updatedAt,
    })
    expect(archived.status).toBe('ARCHIVED')
    const restored = await activityService.restore(instructor, draft.id, {
      expectedUpdatedAt: archived.updatedAt,
    })
    expect(restored).toMatchObject({ status: 'CLOSED', archivedAt: null })
    expect(restored.publishedAt).not.toBeNull()
    await expect(
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: restored.updatedAt,
        title: 'Cannot edit closed activity',
      }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_EDITABLE' })
  })

  it('reopens only a closed activity without changing its deadline or published configuration', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      { ...activityInput(), maxAttempts: 3, creditPolicy: 'HIGHEST' },
    )
    await expect(
      activityService.reopen(instructor, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ACTIVITY_TRANSITION' })
    const configured = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: publishableTestCases(),
    })
    const published = await activityService.publish(instructor, draft.id, {
      expectedUpdatedAt: configured.activityUpdatedAt,
    })
    await expect(
      activityService.reopen(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ACTIVITY_TRANSITION' })
    const closed = await activityService.close(instructor, draft.id, {
      expectedUpdatedAt: published.updatedAt,
    })

    const reopened = await activityService.reopen(instructor, draft.id, {
      expectedUpdatedAt: closed.updatedAt,
    })
    expect(reopened).toMatchObject({
      status: 'PUBLISHED',
      dueDate: published.dueDate,
      publishedAt: published.publishedAt,
      closedAt: null,
      archivedAt: null,
      maxAttempts: 3,
      creditPolicy: 'HIGHEST',
      totalPoints: 100,
    })
    expect(reopened.updatedAt.getTime()).toBeGreaterThan(closed.updatedAt.getTime())
    expect(await prisma.testCase.count({ where: { activityId: draft.id } })).toBe(2)
    await expect(
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: reopened.updatedAt,
        creditPolicy: 'LATEST',
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })

    const closedAgain = await activityService.close(instructor, draft.id, {
      expectedUpdatedAt: reopened.updatedAt,
    })
    const concurrent = await Promise.allSettled([
      activityService.reopen(instructor, draft.id, {
        expectedUpdatedAt: closedAgain.updatedAt,
      }),
      activityService.reopen(instructor, draft.id, {
        expectedUpdatedAt: closedAgain.updatedAt,
      }),
    ])
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(concurrent.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: { code: 'STALE_ACTIVITY_VERSION' },
    })
  })

  it('reopens a past-due activity without changing its deadline or ordinary eligibility', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const dueDate = new Date(fixedNow.getTime() + 60_000)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      { ...activityInput(), dueDate },
    )
    const configured = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: publishableTestCases(),
    })
    const published = await activityService.publish(instructor, draft.id, {
      expectedUpdatedAt: configured.activityUpdatedAt,
    })
    const closed = await activityService.close(instructor, draft.id, {
      expectedUpdatedAt: published.updatedAt,
    })
    const afterDeadline = new Date(dueDate.getTime() + 1)
    const reopened = await createServices(afterDeadline).activityService.reopen(
      instructor,
      draft.id,
      { expectedUpdatedAt: closed.updatedAt },
    )

    expect(reopened).toMatchObject({
      status: 'PUBLISHED',
      dueDate,
      dueState: 'PAST_DUE',
    })
  })

  it('enforces ownership, active membership, and archived-class boundaries', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR', 'Activity Owner')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR', 'Other Instructor')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, owner.id)
    const membership = await createActiveMembership(prisma, classRecord.id, student.id)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(owner, classRecord.id, activityInput())

    await expect(activityService.get(outsider, draft.id)).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_FOUND',
    })
    await expect(
      testCaseService.replace(outsider, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
        testCases: publishableTestCases(),
      }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND' })

    const replaced = await testCaseService.replace(owner, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: publishableTestCases(),
    })
    await activityService.publish(owner, draft.id, {
      expectedUpdatedAt: replaced.activityUpdatedAt,
    })
    await prisma.classMember.update({
      where: { id: membership.id },
      data: { status: 'REMOVED', removedAt: fixedNow },
    })
    await expect(activityService.get(student, draft.id)).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_FOUND',
    })

    await prisma.class.update({
      where: { id: classRecord.id },
      data: { status: 'ARCHIVED', archivedAt: fixedNow, classCodeActive: false },
    })
    const current = await activityService.get(owner, draft.id)
    await expect(
      activityService.close(owner, draft.id, {
        expectedUpdatedAt: current.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'CLASS_ARCHIVED' })
  })

  it('allows only one concurrent write for the same expected version', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const { activityService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      activityInput(),
    )

    const results = await Promise.allSettled([
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
        title: 'Concurrent title A',
      }),
      activityService.update(instructor, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
        title: 'Concurrent title B',
      }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { code: 'STALE_ACTIVITY_VERSION' },
    })
    expect(await prisma.programmingActivity.count()).toBe(1)
  })
})
