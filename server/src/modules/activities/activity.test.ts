import { Prisma } from '@prisma/client'
import pino from 'pino'
import { describe, expect, it } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ClassRepository } from '../classes/class.repository.js'
import type { ClassAccessRecord, ClassRecord } from '../classes/class.types.js'
import type {
  ActivityRepository,
  ActivityWriteResult,
  CreateActivityResult,
  PublishActivityResult,
} from './activity.repository.js'
import { createActivityService } from './activity.service.js'
import type { ActivityAccessRecord, ActivityRecord } from './activity.types.js'

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
const classRecord: ClassRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  instructorId: instructor.id,
  className: 'IT 112',
  classCode: 'ABCDEFGHJK',
  classCodeActive: true,
  classCodeChangedAt: now,
  section: 'BSIT 2A',
  semester: 'First Semester',
  schoolYear: '2026-2027',
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  instructor: { id: instructor.id, fullName: instructor.fullName },
}
const activityRecord: ActivityRecord = {
  id: '44444444-4444-4444-8444-444444444444',
  classId: classRecord.id,
  createdById: instructor.id,
  title: 'Loop Patterns',
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
    id: classRecord.id,
    instructorId: instructor.id,
    status: 'ACTIVE',
  },
  createdBy: { id: instructor.id, fullName: instructor.fullName },
}

class FakeClassRepository implements ClassRepository {
  access: ClassAccessRecord | null = { classRecord, membership: null }

  async create(): Promise<never> {
    throw new Error('not used')
  }
  async list() {
    return { classes: [classRecord], totalItems: 1 }
  }
  async findAccess() {
    return this.access
  }
  async updateMetadata() {
    return classRecord
  }
  async archive(): Promise<never> {
    throw new Error('not used')
  }
  async restore(): Promise<never> {
    throw new Error('not used')
  }
  async rotateCode(): Promise<never> {
    throw new Error('not used')
  }
  async revokeCode() {
    return classRecord
  }
}

class FakeActivityRepository implements ActivityRepository {
  access: ActivityAccessRecord | null = {
    activity: activityRecord,
    membership: null,
  }
  writeResult: ActivityWriteResult = {
    kind: 'updated',
    activity: activityRecord,
  }
  publishResult: PublishActivityResult = {
    kind: 'updated',
    activity: { ...activityRecord, status: 'PUBLISHED', publishedAt: now },
  }
  lastUpdate?: Parameters<ActivityRepository['update']>[0]

  async create(): Promise<CreateActivityResult> {
    return { kind: 'created', activity: activityRecord }
  }
  async list() {
    return { activities: [activityRecord], totalItems: 1 }
  }
  async findAccess() {
    return this.access
  }
  async update(input: Parameters<ActivityRepository['update']>[0]) {
    this.lastUpdate = input
    return this.writeResult
  }
  async publish() {
    return this.publishResult
  }
  async close() {
    return this.writeResult
  }
  async archive() {
    return this.writeResult
  }
  async restore() {
    return this.writeResult
  }
}

function createHarness() {
  const repository = new FakeActivityRepository()
  const classRepository = new FakeClassRepository()
  const service = createActivityService({
    repository,
    classRepository,
    logger: pino({ level: 'silent' }),
    now: () => now,
  })
  return { repository, classRepository, service }
}

describe('programming activity service policy', () => {
  it('creates only instructor-owned draft activities', async () => {
    const { service } = createHarness()
    const created = await service.create(instructor, classRecord.id, {
      title: 'Loop Patterns',
      instructions: 'Write a Java program.',
      dueDate: activityRecord.dueDate,
      language: 'JAVA',
      entryClassName: 'Main',
      starterCode: activityRecord.starterCode,
      maxAttempts: 1,
      totalPoints: 100,
    })
    expect(created.status).toBe('DRAFT')
    await expect(
      service.create(student, classRecord.id, {
        title: 'Unauthorized',
        instructions: 'No.',
        dueDate: activityRecord.dueDate,
        language: 'JAVA',
        entryClassName: 'Main',
        starterCode: activityRecord.starterCode,
        maxAttempts: 1,
        totalPoints: 100,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('hides draft activities from students and removed members', async () => {
    const { repository, service } = createHarness()
    repository.access = {
      activity: activityRecord,
      membership: {
        id: '55555555-5555-4555-8555-555555555555',
        status: 'ACTIVE',
      },
    }
    await expect(service.get(student, activityRecord.id)).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_FOUND',
    })
    repository.access = {
      activity: { ...activityRecord, status: 'PUBLISHED' },
      membership: {
        id: '55555555-5555-4555-8555-555555555555',
        status: 'REMOVED',
      },
    }
    await expect(service.get(student, activityRecord.id)).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_FOUND',
    })
  })

  it('allows active students to read published activities with derived due state', async () => {
    const { repository, service } = createHarness()
    repository.access = {
      activity: { ...activityRecord, status: 'PUBLISHED', publishedAt: now },
      membership: {
        id: '55555555-5555-4555-8555-555555555555',
        status: 'ACTIVE',
      },
    }
    await expect(service.get(student, activityRecord.id)).resolves.toMatchObject({
      status: 'PUBLISHED',
      dueState: 'OPEN',
      totalPoints: 100,
    })
  })

  it('freezes scoring and test configuration after publication', async () => {
    const { repository, service } = createHarness()
    repository.access = {
      activity: { ...activityRecord, status: 'PUBLISHED', publishedAt: now },
      membership: null,
    }
    await expect(
      service.update(instructor, activityRecord.id, {
        expectedUpdatedAt: now,
        totalPoints: 120,
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
    await expect(
      service.update(instructor, activityRecord.id, {
        expectedUpdatedAt: now,
        starterCode: 'public class Changed {}',
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_ACTIVITY_FIELD_IMMUTABLE' })
  })

  it('permits only deadline extensions and attempt-limit increases after publication', async () => {
    const { repository, service } = createHarness()
    repository.access = {
      activity: { ...activityRecord, status: 'PUBLISHED', publishedAt: now },
      membership: null,
    }
    await expect(
      service.update(instructor, activityRecord.id, {
        expectedUpdatedAt: now,
        dueDate: new Date('2026-08-09T09:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'PUBLISHED_DUE_DATE_CANNOT_DECREASE' })
    await service.update(instructor, activityRecord.id, {
      expectedUpdatedAt: now,
      dueDate: new Date('2026-08-11T09:00:00.000Z'),
      maxAttempts: 2,
    })
    expect(repository.lastUpdate?.fields).toMatchObject({ maxAttempts: 2 })
  })

  it('returns safe publication validation and stale-version errors', async () => {
    const { repository, service } = createHarness()
    repository.publishResult = {
      kind: 'not_publishable',
      reason: 'NO_VISIBLE_TEST_CASE',
    }
    await expect(
      service.publish(instructor, activityRecord.id, { expectedUpdatedAt: now }),
    ).rejects.toMatchObject({
      code: 'ACTIVITY_NOT_PUBLISHABLE',
      details: { reason: 'NO_VISIBLE_TEST_CASE' },
    })
    repository.writeResult = { kind: 'stale' }
    await expect(
      service.update(instructor, activityRecord.id, {
        expectedUpdatedAt: now,
        title: 'Changed',
      }),
    ).rejects.toMatchObject({ code: 'STALE_ACTIVITY_VERSION' })
  })

  it('rejects all mutations when the owning class is archived', async () => {
    const { repository, service } = createHarness()
    repository.access = {
      activity: {
        ...activityRecord,
        class: { ...activityRecord.class, status: 'ARCHIVED' },
      },
      membership: null,
    }
    await expect(
      service.update(instructor, activityRecord.id, {
        expectedUpdatedAt: now,
        title: 'Changed',
      }),
    ).rejects.toMatchObject({ code: 'CLASS_ARCHIVED' })
  })
})
