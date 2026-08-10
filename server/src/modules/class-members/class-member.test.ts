import pino from 'pino'
import { describe, expect, it } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ClassRepository } from '../classes/class.repository.js'
import type { ClassAccessRecord, ClassRecord } from '../classes/class.types.js'
import type {
  ClassMemberRecord,
  ClassMemberRepository,
  JoinClassResult,
  MemberTransitionResult,
} from './class-member.repository.js'
import { createClassMemberService } from './class-member.service.js'

const instructor: SafeUserProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Instructor User',
  email: 'instructor@slu.edu.ph',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
}
const student: SafeUserProfile = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  fullName: 'Student User',
  email: 'student@slu.edu.ph',
  role: 'STUDENT',
  status: 'ACTIVE',
}
const admin: SafeUserProfile = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  fullName: 'Administrator User',
  email: 'admin@slu.edu.ph',
  role: 'ADMIN',
  status: 'ACTIVE',
}
const classRecord: ClassRecord = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  instructorId: instructor.id,
  className: 'IT 112',
  classCode: 'ABCDEFGHJK',
  classCodeActive: true,
  classCodeChangedAt: new Date('2026-07-31T00:00:00.000Z'),
  section: 'BSIT 2A',
  semester: 'First Semester',
  schoolYear: '2026-2027',
  status: 'ACTIVE',
  createdAt: new Date('2026-07-31T00:00:00.000Z'),
  updatedAt: new Date('2026-07-31T00:00:00.000Z'),
  archivedAt: null,
  instructor: { id: instructor.id, fullName: instructor.fullName },
}
const member: ClassMemberRecord = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  classId: classRecord.id,
  studentId: student.id,
  joinedAt: new Date('2026-07-31T00:00:00.000Z'),
  status: 'ACTIVE',
  updatedAt: new Date('2026-07-31T00:00:00.000Z'),
  removedAt: null,
  lastActivatedAt: new Date('2026-07-31T00:00:00.000Z'),
  student: {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    status: 'ACTIVE',
  },
}

class FakeMemberRepository implements ClassMemberRepository {
  joinResult: JoinClassResult = { kind: 'joined', member, classRecord }
  transitionResult: MemberTransitionResult = {
    kind: 'updated',
    member: { ...member, status: 'REMOVED', removedAt: new Date() },
    changed: true,
  }
  activeOnly?: boolean

  async joinByCode() {
    return this.joinResult
  }

  async list(
    _classId: string,
    _query: Parameters<ClassMemberRepository['list']>[1],
    activeOnly: boolean,
  ) {
    this.activeOnly = activeOnly
    return { members: [member], totalItems: 1 }
  }

  async transition() {
    return this.transitionResult
  }
}

class FakeClassRepository implements ClassRepository {
  access: ClassAccessRecord | null = {
    classRecord,
    membership: { id: member.id, status: 'ACTIVE' },
  }

  async create(): Promise<never> { throw new Error('not used') }
  async list(): Promise<never> { throw new Error('not used') }
  async findAccess() { return this.access }
  async updateMetadata(): Promise<never> { throw new Error('not used') }
  async archive(): Promise<never> { throw new Error('not used') }
  async restore(): Promise<never> { throw new Error('not used') }
  async rotateCode(): Promise<never> { throw new Error('not used') }
  async revokeCode(): Promise<never> { throw new Error('not used') }
}

function createHarness(
  repository = new FakeMemberRepository(),
  classRepository = new FakeClassRepository(),
) {
  const service = createClassMemberService({
    repository,
    classRepository,
    logger: pino({ level: 'silent' }),
    now: () => new Date('2026-07-31T01:00:00.000Z'),
  })
  return { classRepository, repository, service }
}

describe('class membership lifecycle', () => {
  it('creates an active membership without exposing the join code', async () => {
    const { service } = createHarness()
    const result = await service.join(student, 'ABCDEFGHJK')
    expect(result.created).toBe(true)
    expect(result.status).toBe('ACTIVE')
    expect(result.class).not.toHaveProperty('classCode')
  })

  it('treats an existing active membership as idempotent', async () => {
    const repository = new FakeMemberRepository()
    repository.joinResult = { kind: 'already_active', member, classRecord }
    const { service } = createHarness(repository)
    const result = await service.join(student, 'ABCDEFGHJK')
    expect(result.created).toBe(false)
    expect(result.membershipId).toBe(member.id)
  })

  it('prevents removed students from rejoining with a code', async () => {
    const repository = new FakeMemberRepository()
    repository.joinResult = { kind: 'removed' }
    const { service } = createHarness(repository)
    await expect(service.join(student, 'ABCDEFGHJK')).rejects.toMatchObject({
      code: 'CLASS_MEMBERSHIP_REMOVED',
      statusCode: 403,
    })
  })

  it('returns only userId and fullName to an active student roster caller', async () => {
    const { repository, service } = createHarness()
    const result = await service.list(student, classRecord.id, {
      page: 1,
      pageSize: 50,
    })
    expect(repository.activeOnly).toBe(true)
    expect(result.members).toEqual([
      { userId: student.id, fullName: student.fullName },
    ])
    expect(result.members[0]).not.toHaveProperty('email')
    expect(result.members[0]).not.toHaveProperty('membershipStatus')
    expect(result.members[0]).not.toHaveProperty('updatedAt')
  })

  it('returns detailed roster data to the class owner', async () => {
    const classRepository = new FakeClassRepository()
    classRepository.access = { classRecord, membership: null }
    const { repository, service } = createHarness(
      new FakeMemberRepository(),
      classRepository,
    )
    const result = await service.list(instructor, classRecord.id, {
      page: 1,
      pageSize: 50,
    })
    expect(repository.activeOnly).toBe(false)
    expect(result.members[0]).toMatchObject({
      memberId: member.id,
      email: student.email,
      membershipStatus: 'ACTIVE',
      updatedAt: member.updatedAt,
    })
  })

  it('maps a stale administrative membership version to the public conflict', async () => {
    const repository = new FakeMemberRepository()
    repository.transitionResult = { kind: 'stale' }
    const { service } = createHarness(repository)
    await expect(service.update(admin, classRecord.id, member.id, {
      status: 'REMOVED',
      reason: 'Approved administrative roster correction.',
      expectedUpdatedAt: member.updatedAt,
    }, 'ffffffff-ffff-4fff-8fff-ffffffffffff')).rejects.toMatchObject({
      code: 'STALE_CLASS_MEMBER_VERSION',
      statusCode: 409,
    })
  })

  it('gives a removed student no roster access', async () => {
    const classRepository = new FakeClassRepository()
    classRepository.access = {
      classRecord: { ...classRecord, status: 'ARCHIVED' },
      membership: { id: member.id, status: 'REMOVED' },
    }
    const { service } = createHarness(
      new FakeMemberRepository(),
      classRepository,
    )
    await expect(
      service.list(student, classRecord.id, { page: 1, pageSize: 50 }),
    ).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND', statusCode: 404 })
  })

  it('rejects membership mutations on archived classes', async () => {
    const classRepository = new FakeClassRepository()
    classRepository.access = {
      classRecord: { ...classRecord, status: 'ARCHIVED' },
      membership: null,
    }
    const { service } = createHarness(
      new FakeMemberRepository(),
      classRepository,
    )
    await expect(
      service.update(instructor, classRecord.id, member.id, {
        status: 'REMOVED',
      }),
    ).rejects.toMatchObject({ code: 'CLASS_ARCHIVED', statusCode: 409 })
  })
})
