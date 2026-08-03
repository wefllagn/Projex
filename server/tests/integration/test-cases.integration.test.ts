import type { PrismaClient } from '@prisma/client'
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
const fixedNow = new Date('2030-08-04T02:00:00.000Z')

function createServices(client: PrismaClient = prisma) {
  const classRepository = createPrismaClassRepository(client)
  const activityRepository = createPrismaActivityRepository(client)
  return {
    activityService: createActivityService({
      repository: activityRepository,
      classRepository,
      logger,
      now: () => fixedNow,
    }),
    testCaseService: createTestCaseService({
      repository: createPrismaTestCaseRepository(client),
      activityRepository,
      logger,
      now: () => fixedNow,
    }),
  }
}

function activityInput(totalPoints = 100) {
  return {
    title: 'Deterministic Java Tests',
    instructions: 'Implement the required Java behavior.',
    dueDate: new Date('2030-08-20T09:00:00.000Z'),
    language: 'JAVA' as const,
    entryClassName: 'Main',
    starterCode: 'public class Main { public static void main(String[] args) {} }',
    maxAttempts: 1,
    totalPoints,
  }
}

const visibleCase = {
  name: 'Visible sample',
  inputData: '5',
  expectedOutput: '10',
  isHidden: false,
  points: 30,
}
const hiddenCase = {
  name: 'Hidden boundary',
  inputData: 'secret-hidden-input',
  expectedOutput: 'secret-hidden-output',
  isHidden: true,
  points: 40,
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL test-case authoring', () => {
  it('replaces the ordered draft set atomically and rolls back partial failure', async () => {
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
      testCases: [visibleCase, hiddenCase],
    })
    expect(replaced.activityUpdatedAt.getTime()).toBeGreaterThan(
      draft.updatedAt.getTime(),
    )
    expect(replaced.testCases.map(({ name, testCaseOrder }) => ({ name, testCaseOrder }))).toEqual([
      { name: 'Visible sample', testCaseOrder: 1 },
      { name: 'Hidden boundary', testCaseOrder: 2 },
    ])

    const beforeCases = await prisma.testCase.findMany({
      where: { activityId: draft.id },
      orderBy: { testCaseOrder: 'asc' },
    })
    const beforeActivity = await prisma.programmingActivity.findUniqueOrThrow({
      where: { id: draft.id },
    })
    const failingClient = prisma.$extends({
      query: {
        testCase: {
          async createMany({ args, query }) {
            await query(args)
            throw new Error('forced test-case replacement failure')
          },
        },
      },
    })
    const failingRepository = createPrismaTestCaseRepository(
      failingClient as unknown as PrismaClient,
    )
    await expect(
      failingRepository.replace({
        activityId: draft.id,
        expectedUpdatedAt: replaced.activityUpdatedAt,
        testCases: [{ ...visibleCase, name: 'Replacement that must roll back' }],
        now: new Date('2030-08-04T02:00:01.000Z'),
      }),
    ).rejects.toThrow('forced test-case replacement failure')

    const afterCases = await prisma.testCase.findMany({
      where: { activityId: draft.id },
      orderBy: { testCaseOrder: 'asc' },
    })
    const afterActivity = await prisma.programmingActivity.findUniqueOrThrow({
      where: { id: draft.id },
    })
    expect(afterCases).toEqual(beforeCases)
    expect(afterActivity.updatedAt).toEqual(beforeActivity.updatedAt)
  })

  it('omits every hidden-test signal from the student projection', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const membership = await createActiveMembership(prisma, classRecord.id, student.id)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      activityInput(),
    )
    const replaced = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: [visibleCase, hiddenCase],
    })
    const published = await activityService.publish(instructor, draft.id, {
      expectedUpdatedAt: replaced.activityUpdatedAt,
    })

    const managerView = await testCaseService.list(instructor, draft.id, {
      page: 1,
      pageSize: 50,
    })
    expect(managerView.testCases).toHaveLength(2)
    const studentView = await testCaseService.list(student, draft.id, {
      page: 1,
      pageSize: 50,
    })
    expect(studentView.testCases).toHaveLength(1)
    expect(studentView.pagination.totalItems).toBe(1)
    expect(studentView.testCases[0]).not.toHaveProperty('isHidden')
    const serialized = JSON.stringify(studentView)
    expect(serialized).not.toContain('Hidden boundary')
    expect(serialized).not.toContain('secret-hidden-input')
    expect(serialized).not.toContain('secret-hidden-output')

    await expect(
      testCaseService.replace(instructor, draft.id, {
        expectedUpdatedAt: published.updatedAt,
        testCases: [visibleCase],
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_TEST_CASES_IMMUTABLE' })
    await prisma.classMember.update({
      where: { id: membership.id },
      data: { status: 'REMOVED', removedAt: fixedNow },
    })
    await expect(
      testCaseService.list(student, draft.id, { page: 1, pageSize: 50 }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND' })
  })

  it('enforces publication requirements and total-point boundaries', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const { activityService, testCaseService } = createServices()
    const draft = await activityService.create(
      instructor,
      classRecord.id,
      activityInput(),
    )

    await expect(
      activityService.publish(instructor, draft.id, {
        expectedUpdatedAt: draft.updatedAt,
      }),
    ).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_PUBLISHABLE',
      details: { reason: 'NO_TEST_CASES' },
    })
    const hiddenOnly = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: draft.updatedAt,
      testCases: [hiddenCase],
    })
    await expect(
      activityService.publish(instructor, draft.id, {
        expectedUpdatedAt: hiddenOnly.activityUpdatedAt,
      }),
    ).rejects.toMatchObject({
      details: { reason: 'NO_VISIBLE_TEST_CASE' },
    })
    const zeroPoints = await testCaseService.replace(instructor, draft.id, {
      expectedUpdatedAt: hiddenOnly.activityUpdatedAt,
      testCases: [{ ...visibleCase, points: 0 }],
    })
    await expect(
      activityService.publish(instructor, draft.id, {
        expectedUpdatedAt: zeroPoints.activityUpdatedAt,
      }),
    ).rejects.toMatchObject({
      details: { reason: 'TEST_CASE_POINTS_REQUIRED' },
    })
    await expect(
      testCaseService.replace(instructor, draft.id, {
        expectedUpdatedAt: zeroPoints.activityUpdatedAt,
        testCases: [{ ...visibleCase, points: 101 }],
      }),
    ).rejects.toMatchObject({ code: 'TEST_CASE_POINTS_EXCEED_TOTAL' })
  })

  it('enforces Phase 5 database check constraints independently of services', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    const base = {
      classId: classRecord.id,
      createdById: instructor.id,
      title: 'Constraint test',
      instructions: 'Constraint test instructions.',
      dueDate: new Date('2030-08-20T09:00:00.000Z'),
      language: 'JAVA' as const,
      entryClassName: 'Main',
      starterCode: 'public class Main {}',
      status: 'DRAFT' as const,
    }
    await expect(
      prisma.programmingActivity.create({
        data: { ...base, maxAttempts: 4, totalPoints: 100 },
      }),
    ).rejects.toBeDefined()
    await expect(
      prisma.programmingActivity.create({
        data: { ...base, maxAttempts: 1, totalPoints: 0 },
      }),
    ).rejects.toBeDefined()

    const valid = await prisma.programmingActivity.create({
      data: { ...base, maxAttempts: 1, totalPoints: 100 },
    })
    await expect(
      prisma.testCase.create({
        data: {
          activityId: valid.id,
          name: 'Invalid order',
          testCaseOrder: 0,
          expectedOutput: '',
          isHidden: false,
          points: 0,
        },
      }),
    ).rejects.toBeDefined()
  })
})
