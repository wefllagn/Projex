import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaClassInvitationRepository } from '../../src/modules/class-invitations/class-invitation.repository.js'
import { createClassInvitationService } from '../../src/modules/class-invitations/class-invitation.service.js'
import { createPrismaClassMemberRepository } from '../../src/modules/class-members/class-member.repository.js'
import { createClassMemberService } from '../../src/modules/class-members/class-member.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassService } from '../../src/modules/classes/class.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const fixedNow = new Date('2031-08-23T02:00:00.000Z')

function services(now = fixedNow) {
  const classRepository = createPrismaClassRepository(prisma)
  return {
    invitations: createClassInvitationService({
      repository: createPrismaClassInvitationRepository(prisma),
      classRepository,
      logger,
      now: () => now,
    }),
    members: createClassMemberService({
      repository: createPrismaClassMemberRepository(prisma),
      classRepository,
      logger,
      now: () => now,
    }),
  }
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

describe('registered-email class invitations', () => {
  it('enforces exact owner, role, account, class, membership, and duplicate eligibility', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR', 'Owning Instructor')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR', 'Other Instructor')
    const activeStudent = await createActiveUser(prisma, 'STUDENT', 'Eligible Student')
    const inactiveStudent = await createActiveUser(prisma, 'STUDENT', 'Inactive Student')
    await prisma.user.update({ where: { id: inactiveStudent.id }, data: { status: 'INACTIVE' } })
    const admin = await createActiveUser(prisma, 'ADMIN', 'Administrator')
    const classRecord = await createActiveClass(prisma, owner.id)
    const invitationService = services().invitations

    await expect(invitationService.lookup(owner, {
      universityEmail: activeStudent.email,
      classId: classRecord.id,
    })).resolves.toMatchObject({
      eligibility: 'ELIGIBLE',
      student: { fullName: activeStudent.fullName, universityEmail: activeStudent.email },
      willReactivate: false,
    })
    for (const universityEmail of [
      inactiveStudent.email,
      owner.email,
      admin.email,
      'missing.student@integration.test',
    ]) {
      await expect(invitationService.lookup(owner, { universityEmail, classId: classRecord.id }))
        .resolves.toEqual({ eligibility: 'NOT_FOUND' })
    }
    await expect(invitationService.create(outsider, classRecord.id, {
      universityEmail: activeStudent.email,
    })).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    await expect(invitationService.create(activeStudent, classRecord.id, {
      universityEmail: activeStudent.email,
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(invitationService.create(admin, classRecord.id, {
      universityEmail: activeStudent.email,
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(invitationService.create({ ...owner, status: 'SUSPENDED' }, classRecord.id, {
      universityEmail: activeStudent.email,
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const created = await invitationService.create(owner, classRecord.id, {
      universityEmail: activeStudent.email,
    })
    expect(created).toMatchObject({
      status: 'PENDING',
      invitee: { fullName: activeStudent.fullName, universityEmail: activeStudent.email },
    })
    expect(JSON.stringify(created)).not.toContain('classCode')
    await expect(invitationService.create(owner, classRecord.id, {
      universityEmail: activeStudent.email,
    })).rejects.toMatchObject({ code: 'CLASS_INVITATION_ALREADY_PENDING' })

    const memberStudent = await createActiveUser(prisma, 'STUDENT', 'Existing Member')
    await createActiveMembership(prisma, classRecord.id, memberStudent.id)
    await expect(invitationService.create(owner, classRecord.id, {
      universityEmail: memberStudent.email,
    })).rejects.toMatchObject({ code: 'CLASS_MEMBER_ALREADY_ACTIVE' })

    await prisma.class.update({
      where: { id: classRecord.id },
      data: { status: 'ARCHIVED', archivedAt: fixedNow, classCodeActive: false },
    })
    await expect(invitationService.create(owner, classRecord.id, {
      universityEmail: inactiveStudent.email,
    })).rejects.toMatchObject({ code: 'CLASS_ARCHIVED' })
  })

  it('declines durably, permits reinvitation, and accepts exactly once under concurrency', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const otherStudent = await createActiveUser(prisma, 'STUDENT', 'Other Student')
    const classRecord = await createActiveClass(prisma, owner.id)
    const invitationService = services().invitations
    const first = await invitationService.create(owner, classRecord.id, {
      universityEmail: student.email,
    })

    await expect(invitationService.decline(otherStudent, first.invitationId))
      .rejects.toMatchObject({ code: 'CLASS_INVITATION_NOT_FOUND' })
    await expect(invitationService.decline(student, first.invitationId))
      .resolves.toMatchObject({ status: 'DECLINED' })
    await expect(invitationService.decline(student, first.invitationId))
      .resolves.toMatchObject({ status: 'DECLINED' })
    expect(await prisma.classMember.count()).toBe(0)

    const second = await invitationService.create(owner, classRecord.id, {
      universityEmail: student.email,
    })
    const accepted = await Promise.all([
      invitationService.accept(student, second.invitationId),
      invitationService.accept(student, second.invitationId),
    ])
    expect(accepted[0].membership.membershipId).toBe(accepted[1].membership.membershipId)
    expect(await prisma.classMember.count({ where: { classId: classRecord.id, studentId: student.id } })).toBe(1)
    expect(await prisma.classInvitation.count({
      where: { classId: classRecord.id, inviteeId: student.id, status: 'ACCEPTED' },
    })).toBe(1)
    expect((await invitationService.listForStudent(student, { page: 1, pageSize: 20 })).invitations).toEqual([])
  })

  it('resolves a pending invitation when class-code membership wins the race', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, owner.id)
    const invitationService = services().invitations
    const invitation = await invitationService.create(owner, classRecord.id, {
      universityEmail: student.email,
    })

    const joined = await services().members.join(student, classRecord.classCode)
    expect(joined.created).toBe(true)
    expect(await prisma.classMember.count({ where: { classId: classRecord.id, studentId: student.id } })).toBe(1)
    expect(await prisma.classInvitation.findUniqueOrThrow({ where: { id: invitation.invitationId } }))
      .toMatchObject({ status: 'ACCEPTED', respondedAt: fixedNow })
    expect((await invitationService.listForStudent(student, { page: 1, pageSize: 20 })).invitations).toEqual([])
    await expect(invitationService.accept(student, invitation.invitationId))
      .resolves.toMatchObject({ membership: { membershipId: joined.membershipId } })
  })

  it('reactivates the existing removed membership only after a new invitation is accepted', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const classRecord = await createActiveClass(prisma, owner.id)
    const membership = await createActiveMembership(prisma, classRecord.id, student.id)
    const removedAt = new Date(fixedNow.getTime() - 60_000)
    await prisma.classMember.update({
      where: { id: membership.id },
      data: { status: 'REMOVED', removedAt },
    })
    const invitationService = services().invitations
    await expect(invitationService.lookup(owner, {
      universityEmail: student.email,
      classId: classRecord.id,
    })).resolves.toMatchObject({ eligibility: 'ELIGIBLE', willReactivate: true })
    const invitation = await invitationService.create(owner, classRecord.id, {
      universityEmail: student.email,
    })
    expect((await prisma.classMember.findUniqueOrThrow({ where: { id: membership.id } })).status).toBe('REMOVED')
    const accepted = await invitationService.accept(student, invitation.invitationId)
    expect(accepted.membership.membershipId).toBe(membership.id)
    expect(await prisma.classMember.findUniqueOrThrow({ where: { id: membership.id } }))
      .toMatchObject({ status: 'ACTIVE', joinedAt: membership.joinedAt, removedAt: null, lastActivatedAt: fixedNow })
  })

  it('creates a class and optional invitations atomically after validating every target', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR')
    const first = await createActiveUser(prisma, 'STUDENT', 'First Invitee')
    const second = await createActiveUser(prisma, 'STUDENT', 'Second Invitee')
    const classService = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      generateCode: () => 'ABCDE23456',
      now: () => fixedNow,
    })
    const created = await classService.create(owner, {
      className: 'Invited Class',
      section: 'BSIT 4A',
      semester: 'First Semester',
      schoolYear: '2031-2032',
      invitationEmails: [first.email, second.email],
    })
    expect(created).toMatchObject({ invitationsCreated: 2 })
    expect(await prisma.classInvitation.count({ where: { classId: created.id, status: 'PENDING' } })).toBe(2)
    expect(await prisma.classMember.count({ where: { classId: created.id } })).toBe(0)

    const before = await prisma.class.count()
    const invalidService = createClassService({
      repository: createPrismaClassRepository(prisma),
      logger,
      generateCode: () => 'FGHJK23456',
      now: () => fixedNow,
    })
    const invalidCreation = invalidService.create(owner, {
      className: 'Must Roll Back',
      section: 'BSIT 4B',
      semester: 'First Semester',
      schoolYear: '2031-2032',
      invitationEmails: [first.email, 'missing.student@integration.test'],
    })
    await expect(invalidCreation).rejects.toMatchObject({
      code: 'CLASS_INVITATION_TARGET_INVALID',
      details: undefined,
    })
    expect(await prisma.class.count()).toBe(before)
    expect(await prisma.class.findFirst({ where: { className: 'Must Roll Back' } })).toBeNull()

    const noInvites = await invalidService.create(owner, {
      className: 'No Invitations',
      section: 'BSIT 4C',
      semester: 'First Semester',
      schoolYear: '2031-2032',
    })
    expect(noInvites).toMatchObject({ invitationsCreated: 0 })
  })

  it('lists only the authenticated student pending invitations in newest-first bounded order', async () => {
    const owner = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const otherStudent = await createActiveUser(prisma, 'STUDENT', 'Other Student')
    const invitationIds: string[] = []
    for (let index = 0; index < 4; index += 1) {
      const classRecord = await createActiveClass(prisma, owner.id, `Class ${index + 1}`)
      const created = await services(new Date(fixedNow.getTime() + index)).invitations.create(
        owner,
        classRecord.id,
        { universityEmail: student.email },
      )
      invitationIds.push(created.invitationId)
    }
    const unrelatedClass = await createActiveClass(prisma, owner.id, 'Unrelated Class')
    await services().invitations.create(owner, unrelatedClass.id, {
      universityEmail: otherStudent.email,
    })
    const result = await services().invitations.listForStudent(student, {
      page: 1,
      pageSize: 3,
    })
    expect(result.pagination).toMatchObject({ totalItems: 4, hasNextPage: true })
    expect(result.invitations.map(({ invitationId }) => invitationId)).toEqual(
      invitationIds.reverse().slice(0, 3),
    )
    expect(JSON.stringify(result)).not.toContain(student.email)
    expect(JSON.stringify(result)).not.toContain('classCode')
    expect(JSON.stringify(result)).not.toContain(otherStudent.fullName)
  })
})
