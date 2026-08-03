import type { PrismaClient } from '@prisma/client'
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
const page = { page: 1, pageSize: 20 }

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL class lifecycle', () => {
  it('enforces the unique class-code constraint and retries collisions', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const generatedCodes = ['ABCDE23456', 'ABCDE23456', 'FGHJK6789A']
    let codeIndex = 0
    const service = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      generateCode: () => generatedCodes[codeIndex++]!,
    })

    await service.create(instructor, {
      className: 'IT 111',
      section: 'BSIT 2A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    await service.create(instructor, {
      className: 'IT 112',
      section: 'BSIT 2B',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })

    const persisted = await prisma.class.findMany({
      orderBy: { className: 'asc' },
      select: { classCode: true },
    })
    expect(codeIndex).toBe(3)
    expect(persisted).toEqual([
      { classCode: 'ABCDE23456' },
      { classCode: 'FGHJK6789A' },
    ])
  })

  it('scopes class lists by role and keeps class codes out of student projections', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const firstInstructor = await createActiveUser(prisma, 'INSTRUCTOR', 'First Owner')
    const secondInstructor = await createActiveUser(prisma, 'INSTRUCTOR', 'Second Owner')
    const student = await createActiveUser(prisma, 'STUDENT')
    const unrelatedStudent = await createActiveUser(prisma, 'STUDENT', 'Unrelated Student')
    const repository = createPrismaClassRepository(prisma)
    const firstService = createClassService({
      repository,
      logger,
      generateCode: () => 'MNPQR23456',
    })
    const secondService = createClassService({
      repository,
      logger,
      generateCode: () => 'STUVW23456',
    })
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository: repository,
      logger,
    })
    const firstClass = await firstService.create(firstInstructor, {
      className: 'IT 113',
      section: 'BSIT 2C',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    const secondClass = await secondService.create(secondInstructor, {
      className: 'IT 114',
      section: 'BSIT 2D',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    await memberService.join(student, 'MNPQR23456')

    expect((await firstService.list(admin, page)).classes.map(({ id }) => id).sort()).toEqual(
      [firstClass.id, secondClass.id].sort(),
    )
    expect((await firstService.list(firstInstructor, page)).classes.map(({ id }) => id)).toEqual([
      firstClass.id,
    ])
    expect((await firstService.list(secondInstructor, page)).classes.map(({ id }) => id)).toEqual([
      secondClass.id,
    ])
    const studentClasses = await firstService.list(student, page)
    expect(studentClasses.classes.map(({ id }) => id)).toEqual([firstClass.id])
    expect((await firstService.list(unrelatedStudent, page)).classes).toEqual([])

    const studentProjection = await firstService.get(student, firstClass.id)
    expect(studentProjection).not.toHaveProperty('classCode')
    expect(studentProjection).not.toHaveProperty('classCodeActive')
    expect(studentProjection.instructor).toEqual({
      userId: firstInstructor.id,
      fullName: firstInstructor.fullName,
    })
  })

  it('restores an archived class without reactivating its previous code', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const service = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      generateCode: () => 'WXYZA23456',
    })
    const created = await service.create(admin, {
      instructorId: instructor.id,
      className: 'IT 115',
      section: 'BSIT 2E',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })

    await service.archive(admin, created.id)
    expect(await service.getJoinCode(admin, created.id)).toMatchObject({ active: false })
    const restored = await service.restore(admin, created.id)
    expect(restored.status).toBe('ACTIVE')
    expect(await service.getJoinCode(admin, created.id)).toMatchObject({ active: false })
    expect(await prisma.class.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      status: 'ACTIVE',
      classCode: 'WXYZA23456',
      classCodeActive: false,
      archivedAt: null,
    })
  })

  it('enforces instructor ownership and rejects cross-class access safely', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR', 'Owner')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR', 'Outsider')
    const student = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaClassRepository(prisma)
    const service = createClassService({
      repository,
      logger,
      generateCode: () => 'BCDEF23456',
    })
    const memberService = createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository: repository,
      logger,
    })
    const created = await service.create(owner, {
      className: 'IT 116',
      section: 'BSIT 2F',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    const membership = await memberService.join(student, 'BCDEF23456')

    for (const operation of [
      service.get(outsider, created.id),
      service.update(outsider, created.id, { className: 'Unauthorized' }),
      service.rotateJoinCode(outsider, created.id),
      service.revokeJoinCode(outsider, created.id),
      memberService.list(outsider, created.id, { page: 1, pageSize: 50 }),
      memberService.update(outsider, created.id, membership.membershipId, {
        status: 'REMOVED',
      }),
    ]) {
      await expect(operation).rejects.toMatchObject({
        code: 'CLASS_NOT_FOUND',
        statusCode: 404,
      })
    }
    expect(await prisma.class.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      className: 'IT 116',
      classCode: 'BCDEF23456',
      classCodeActive: true,
    })
    expect(
      await prisma.classMember.findUniqueOrThrow({
        where: { id: membership.membershipId },
      }),
    ).toMatchObject({ status: 'ACTIVE' })
  })

  it('rolls back an archive when a failure occurs after the transactional write', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const baseService = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      generateCode: () => 'CDEFG23456',
    })
    const created = await baseService.create(instructor, {
      className: 'IT 117',
      section: 'BSIT 2G',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    })
    const failingClient = prisma.$extends({
      query: {
        class: {
          async update({ args, query }) {
            await query(args)
            throw new Error('forced post-write integration failure')
          },
        },
      },
    })
    const failingService = createClassService({
      repository: createPrismaClassRepository(
        failingClient as unknown as PrismaClient,
      ),
      logger,
    })

    await expect(failingService.archive(instructor, created.id)).rejects.toThrow(
      'forced post-write integration failure',
    )
    expect(await prisma.class.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      status: 'ACTIVE',
      classCodeActive: true,
      archivedAt: null,
    })
  })
})
