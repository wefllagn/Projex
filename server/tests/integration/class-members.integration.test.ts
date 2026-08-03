import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaClassMemberRepository } from '../../src/modules/class-members/class-member.repository.js'
import { createClassMemberService } from '../../src/modules/class-members/class-member.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassService } from '../../src/modules/classes/class.service.js'
import {
  cleanIntegrationDatabase,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL class membership lifecycle', () => {
  it('persists new and idempotent joins while preserving membership history through reactivation', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const concurrentStudent = await createActiveUser(prisma, 'STUDENT', 'Concurrent Student')
    const classRepository = createPrismaClassRepository(prisma)
    const classService = createClassService({
      repository: classRepository,
      logger,
      generateCode: () => 'MNPQR23456',
    })
    let currentTime = new Date('2026-07-31T01:00:00.000Z')
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository,
      logger,
      now: () => currentTime,
    })
    const createdClass = await classService.create(instructor, {
      className: 'IT 121',
      section: 'BSIT 3A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })

    const firstJoin = await memberService.join(student, 'MNPQR-23456')
    expect(firstJoin.created).toBe(true)
    expect(firstJoin.class).not.toHaveProperty('classCode')
    const duplicateJoin = await memberService.join(student, 'MNPQR23456')
    expect(duplicateJoin).toMatchObject({
      created: false,
      membershipId: firstJoin.membershipId,
    })

    const concurrentJoins = await Promise.all([
      memberService.join(concurrentStudent, 'MNPQR23456'),
      memberService.join(concurrentStudent, 'MNPQR23456'),
    ])
    expect(concurrentJoins.filter(({ created }) => created)).toHaveLength(1)
    expect(new Set(concurrentJoins.map(({ membershipId }) => membershipId)).size).toBe(1)
    expect(await prisma.classMember.count({ where: { classId: createdClass.id } })).toBe(2)

    const original = await prisma.classMember.findUniqueOrThrow({
      where: { id: firstJoin.membershipId },
    })
    currentTime = new Date('2026-07-31T02:00:00.000Z')
    const removed = await memberService.update(
      instructor,
      createdClass.id,
      firstJoin.membershipId,
      { status: 'REMOVED' },
    )
    expect(removed).toMatchObject({
      memberId: firstJoin.membershipId,
      membershipStatus: 'REMOVED',
      removedAt: currentTime,
    })
    await expect(memberService.join(student, 'MNPQR23456')).rejects.toMatchObject({
      code: 'CLASS_MEMBERSHIP_REMOVED',
    })
    await expect(
      memberService.list(student, createdClass.id, { page: 1, pageSize: 50 }),
    ).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })

    currentTime = new Date('2026-07-31T03:00:00.000Z')
    const reactivated = await memberService.update(
      instructor,
      createdClass.id,
      firstJoin.membershipId,
      { status: 'ACTIVE' },
    )
    expect(reactivated).toMatchObject({
      memberId: firstJoin.membershipId,
      membershipStatus: 'ACTIVE',
      joinedAt: original.joinedAt,
      removedAt: null,
      lastActivatedAt: currentTime,
    })
    const persisted = await prisma.classMember.findUniqueOrThrow({
      where: { id: firstJoin.membershipId },
    })
    expect(persisted).toMatchObject({
      id: original.id,
      joinedAt: original.joinedAt,
      status: 'ACTIVE',
      removedAt: null,
      lastActivatedAt: currentTime,
    })
    expect(await prisma.classMember.count({
      where: { classId: createdClass.id, studentId: student.id },
    })).toBe(1)
  })

  it('invalidates rotated and revoked codes for future joins', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const firstStudent = await createActiveUser(prisma, 'STUDENT', 'First Student')
    const secondStudent = await createActiveUser(prisma, 'STUDENT', 'Second Student')
    const classRepository = createPrismaClassRepository(prisma)
    const generatedCodes = ['STUVW23456', 'WXYZA6789B']
    let codeIndex = 0
    const classService = createClassService({
      repository: classRepository,
      logger,
      generateCode: () => generatedCodes[codeIndex++]!,
    })
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository,
      logger,
    })
    const createdClass = await classService.create(instructor, {
      className: 'IT 122',
      section: 'BSIT 3B',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })

    const rotated = await classService.rotateJoinCode(instructor, createdClass.id)
    expect(rotated).toMatchObject({ classCode: 'WXYZA-6789B', active: true })
    await expect(memberService.join(firstStudent, 'STUVW23456')).rejects.toMatchObject({
      code: 'CLASS_CODE_INVALID',
    })
    expect((await memberService.join(firstStudent, 'WXYZA6789B')).created).toBe(true)

    await classService.revokeJoinCode(instructor, createdClass.id)
    await expect(memberService.join(secondStudent, 'WXYZA6789B')).rejects.toMatchObject({
      code: 'CLASS_CODE_INVALID',
    })
    expect(await prisma.class.findUniqueOrThrow({ where: { id: createdClass.id } })).toMatchObject({
      classCode: 'WXYZA6789B',
      classCodeActive: false,
    })
  })

  it('rejects joins and mutations while archived and keeps the restored code inactive', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const enrolledStudent = await createActiveUser(prisma, 'STUDENT', 'Enrolled Student')
    const joiningStudent = await createActiveUser(prisma, 'STUDENT', 'Joining Student')
    const classRepository = createPrismaClassRepository(prisma)
    const generatedCodes = ['BCDEF6789A', 'CDEFG6789B']
    let codeIndex = 0
    const classService = createClassService({
      repository: classRepository,
      logger,
      generateCode: () => generatedCodes[codeIndex++]!,
    })
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository,
      logger,
    })
    const createdClass = await classService.create(instructor, {
      className: 'IT 123',
      section: 'BSIT 3C',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    const membership = await memberService.join(enrolledStudent, 'BCDEF6789A')
    await classService.archive(instructor, createdClass.id)

    await expect(memberService.join(joiningStudent, 'BCDEF6789A')).rejects.toMatchObject({
      code: 'CLASS_CODE_INVALID',
    })
    for (const operation of [
      classService.update(instructor, createdClass.id, { className: 'Blocked Update' }),
      classService.rotateJoinCode(instructor, createdClass.id),
      classService.revokeJoinCode(instructor, createdClass.id),
      memberService.update(instructor, createdClass.id, membership.membershipId, {
        status: 'REMOVED',
      }),
    ]) {
      await expect(operation).rejects.toMatchObject({ code: 'CLASS_ARCHIVED' })
    }

    await classService.restore(instructor, createdClass.id)
    expect(await classService.getJoinCode(instructor, createdClass.id)).toMatchObject({
      classCode: 'BCDEF-6789A',
      active: false,
    })
    await expect(memberService.join(joiningStudent, 'BCDEF6789A')).rejects.toMatchObject({
      code: 'CLASS_CODE_INVALID',
    })
    expect(
      await prisma.classMember.findUniqueOrThrow({
        where: { id: membership.membershipId },
      }),
    ).toMatchObject({ status: 'ACTIVE', removedAt: null })
  })

  it('uses minimal student rosters and approved detailed instructor/admin projections', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const activeStudent = await createActiveUser(prisma, 'STUDENT', 'Active Student')
    const removedStudent = await createActiveUser(prisma, 'STUDENT', 'Removed Student')
    const classRepository = createPrismaClassRepository(prisma)
    const classService = createClassService({
      repository: classRepository,
      logger,
      generateCode: () => 'DEFGH23456',
    })
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository,
      logger,
    })
    const createdClass = await classService.create(instructor, {
      className: 'IT 124',
      section: 'BSIT 3D',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    await memberService.join(activeStudent, 'DEFGH23456')
    const removedMembership = await memberService.join(removedStudent, 'DEFGH23456')
    await memberService.update(
      instructor,
      createdClass.id,
      removedMembership.membershipId,
      { status: 'REMOVED' },
    )

    const studentRoster = await memberService.list(activeStudent, createdClass.id, {
      page: 1,
      pageSize: 50,
    })
    expect(studentRoster.members).toEqual([
      { userId: activeStudent.id, fullName: activeStudent.fullName },
    ])

    const instructorRoster = await memberService.list(instructor, createdClass.id, {
      page: 1,
      pageSize: 50,
    })
    const adminRoster = await memberService.list(admin, createdClass.id, {
      page: 1,
      pageSize: 50,
    })
    expect(instructorRoster.members).toHaveLength(2)
    expect(adminRoster.members).toEqual(instructorRoster.members)
    for (const member of instructorRoster.members) {
      expect(Object.keys(member).sort()).toEqual(
        [
          'email',
          'fullName',
          'joinedAt',
          'lastActivatedAt',
          'memberId',
          'membershipStatus',
          'removedAt',
          'userId',
          'userStatus',
        ].sort(),
      )
    }
    expect(instructorRoster.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: activeStudent.id,
          email: activeStudent.email,
          userStatus: 'ACTIVE',
          membershipStatus: 'ACTIVE',
          removedAt: null,
        }),
        expect.objectContaining({
          userId: removedStudent.id,
          email: removedStudent.email,
          userStatus: 'ACTIVE',
          membershipStatus: 'REMOVED',
          removedAt: expect.any(Date),
        }),
      ]),
    )
  })
})
