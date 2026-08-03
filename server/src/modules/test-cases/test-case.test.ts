import { Prisma } from '@prisma/client'
import pino from 'pino'
import { describe, expect, it } from 'vitest'
import type { ActivityRepository } from '../activities/activity.repository.js'
import type { ActivityAccessRecord, ActivityRecord } from '../activities/activity.types.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ReplaceTestCasesResult, TestCaseRepository } from './test-case.repository.js'
import { createTestCaseService } from './test-case.service.js'
import type { TestCaseRecord } from './test-case.types.js'

const now = new Date('2026-08-04T02:00:00.000Z')
const instructor: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Instructor User',
  email: 'instructor@slu.edu.ph',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const student: SafeUserProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  fullName: 'Student User',
  email: 'student@slu.edu.ph',
  role: 'STUDENT',
  status: 'ACTIVE',
}
const activity: ActivityRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  classId: '44444444-4444-4444-8444-444444444444',
  createdById: instructor.id,
  title: 'Loops',
  instructions: 'Write a Java program.',
  dueDate: new Date('2026-08-10T09:00:00.000Z'),
  language: 'JAVA',
  entryClassName: 'Main',
  starterCode: 'public class Main {}',
  maxAttempts: 1,
  totalPoints: new Prisma.Decimal(100),
  status: 'DRAFT',
  createdAt: now,
  updatedAt: now,
  publishedAt: null,
  closedAt: null,
  archivedAt: null,
  class: {
    id: '44444444-4444-4444-8444-444444444444',
    instructorId: instructor.id,
    status: 'ACTIVE',
  },
  createdBy: { id: instructor.id, fullName: instructor.fullName },
}
const visibleTest: TestCaseRecord = {
  id: '55555555-5555-4555-8555-555555555555',
  activityId: activity.id,
  name: 'Visible sample',
  testCaseOrder: 1,
  inputData: '5',
  expectedOutput: '10',
  isHidden: false,
  points: new Prisma.Decimal(30),
  createdAt: now,
  updatedAt: now,
}
const hiddenTest: TestCaseRecord = {
  ...visibleTest,
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Hidden boundary',
  testCaseOrder: 2,
  inputData: 'secret-input',
  expectedOutput: 'secret-output',
  isHidden: true,
}

class FakeActivityRepository implements ActivityRepository {
  access: ActivityAccessRecord | null = { activity, membership: null }

  async create(): Promise<never> {
    throw new Error('not used')
  }
  async list() {
    return { activities: [], totalItems: 0 }
  }
  async findAccess() {
    return this.access
  }
  async update(): Promise<never> {
    throw new Error('not used')
  }
  async publish(): Promise<never> {
    throw new Error('not used')
  }
  async close(): Promise<never> {
    throw new Error('not used')
  }
  async archive(): Promise<never> {
    throw new Error('not used')
  }
  async restore(): Promise<never> {
    throw new Error('not used')
  }
}

class FakeTestCaseRepository implements TestCaseRepository {
  replaceResult: ReplaceTestCasesResult = {
    kind: 'updated',
    testCases: [visibleTest, hiddenTest],
    activityUpdatedAt: now,
  }
  includeHidden?: boolean

  async list(input: Parameters<TestCaseRepository['list']>[0]) {
    this.includeHidden = input.includeHidden
    const testCases = input.includeHidden ? [visibleTest, hiddenTest] : [visibleTest]
    return { testCases, totalItems: testCases.length }
  }
  async replace() {
    return this.replaceResult
  }
}

function createHarness() {
  const repository = new FakeTestCaseRepository()
  const activityRepository = new FakeActivityRepository()
  let logs = ''
  const logger = pino(
    { level: 'info' },
    { write: (chunk: string) => { logs += chunk } },
  )
  const service = createTestCaseService({
    repository,
    activityRepository,
    logger,
    now: () => now,
  })
  return { repository, activityRepository, service, logs: () => logs }
}

describe('test-case service policy', () => {
  it('returns all test details to the owning instructor', async () => {
    const { repository, service } = createHarness()
    const result = await service.list(instructor, activity.id, {
      page: 1,
      pageSize: 50,
    })
    expect(repository.includeHidden).toBe(true)
    expect(result.testCases).toHaveLength(2)
    expect(result.testCases[1]).toMatchObject({
      name: 'Hidden boundary',
      isHidden: true,
    })
  })

  it('returns only visible minimized test cases to active students', async () => {
    const { repository, activityRepository, service } = createHarness()
    activityRepository.access = {
      activity: { ...activity, status: 'PUBLISHED', publishedAt: now },
      membership: {
        id: '77777777-7777-4777-8777-777777777777',
        status: 'ACTIVE',
      },
    }
    const result = await service.list(student, activity.id, {
      page: 1,
      pageSize: 50,
    })
    expect(repository.includeHidden).toBe(false)
    expect(result.testCases).toHaveLength(1)
    expect(result.testCases[0]).not.toHaveProperty('isHidden')
    expect(JSON.stringify(result)).not.toContain('secret-input')
    expect(JSON.stringify(result)).not.toContain('secret-output')
    expect(result.pagination.totalItems).toBe(1)
  })

  it('denies draft and removed-member test visibility', async () => {
    const { activityRepository, service } = createHarness()
    activityRepository.access = {
      activity,
      membership: {
        id: '77777777-7777-4777-8777-777777777777',
        status: 'ACTIVE',
      },
    }
    await expect(
      service.list(student, activity.id, { page: 1, pageSize: 50 }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND' })
    activityRepository.access = {
      activity: { ...activity, status: 'PUBLISHED', publishedAt: now },
      membership: {
        id: '77777777-7777-4777-8777-777777777777',
        status: 'REMOVED',
      },
    }
    await expect(
      service.list(student, activity.id, { page: 1, pageSize: 50 }),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND' })
  })

  it('freezes replacement immediately after publication', async () => {
    const { activityRepository, service } = createHarness()
    activityRepository.access = {
      activity: { ...activity, status: 'PUBLISHED', publishedAt: now },
      membership: null,
    }
    await expect(
      service.replace(instructor, activity.id, {
        expectedUpdatedAt: now,
        testCases: [],
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_TEST_CASES_IMMUTABLE' })
  })

  it('maps point and stale failures and never logs hidden contents', async () => {
    const { repository, service, logs } = createHarness()
    repository.replaceResult = { kind: 'points_exceed_total' }
    await expect(
      service.replace(instructor, activity.id, {
        expectedUpdatedAt: now,
        testCases: [
          {
            name: 'Hidden boundary',
            inputData: 'secret-input',
            expectedOutput: 'secret-output',
            isHidden: true,
            points: 100,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'TEST_CASE_POINTS_EXCEED_TOTAL' })
    expect(logs()).not.toContain('secret-input')
    expect(logs()).not.toContain('secret-output')
    repository.replaceResult = { kind: 'stale' }
    await expect(
      service.replace(instructor, activity.id, {
        expectedUpdatedAt: now,
        testCases: [],
      }),
    ).rejects.toMatchObject({ code: 'STALE_ACTIVITY_VERSION' })
  })
})
