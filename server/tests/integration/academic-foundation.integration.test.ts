import { randomUUID } from 'node:crypto'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createClassInvitationImportRouter } from '../../src/modules/class-invitations/class-invitation-import.routes.js'
import { createPrismaClassInvitationRepository } from '../../src/modules/class-invitations/class-invitation.repository.js'
import { createClassInvitationService } from '../../src/modules/class-invitations/class-invitation.service.js'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassService } from '../../src/modules/classes/class.service.js'
import { createClassStaffRouter } from '../../src/modules/classes/class-staff.routes.js'
import { createOfficialMetadataRouter } from '../../src/modules/classes/official-metadata.routes.js'
import { createCourseRouter } from '../../src/modules/courses/course.routes.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import { createRepositoryService } from '../../src/modules/repositories/repository.service.js'
import { cleanIntegrationDatabase, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
const classService = createClassService({ repository: createPrismaClassRepository(prisma), logger })
const pass: RequestHandler = (_req, _res, next) => next()

function app() {
  const server = express()
  server.use(express.json({ limit: '1mb' }))
  server.use(async (req, _res, next) => {
    try {
      req.requestId = randomUUID()
      const actor = req.header('x-test-actor')
      if (actor) {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: actor } })
        req.auth = { user } as unknown as typeof req.auth
      }
      next()
    } catch (error) { next(error) }
  })
  const dependencies = { prisma, requireAuthentication: pass, requireCsrf: pass }
  server.use('/courses', createCourseRouter(dependencies))
  server.use('/classes', createClassStaffRouter(dependencies))
  server.use('/classes', createOfficialMetadataRouter(dependencies))
  server.use('/classes', createClassInvitationImportRouter(dependencies))
  const failure: ErrorRequestHandler = (error, _req, response, _next) => {
    response.status(error.statusCode ?? 500).json({ code: error.code ?? 'INTERNAL_ERROR' })
  }
  server.use(failure)
  return server
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => { await cleanIntegrationDatabase(prisma); await prisma.$disconnect() })

describe('Course and Class Offering foundation', () => {
  it('limits Course changes to Admin and imports only a fully valid CSV', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const server = app()
    await request(server).post('/courses').set('x-test-actor', instructor.id).send({ courseNumber: 'IT 112', courseName: 'Programming 1' }).expect(403)
    const invalid = 'courseNumber,courseName\nIT 112,Programming 1\nIT 112,Duplicate'
    const rejected = await request(server).post('/courses/import/preview').set('x-test-actor', admin.id).send({ csv: invalid }).expect(200)
    expect(rejected.body.data.valid).toBe(false)
    await request(server).post('/courses/import/confirm').set('x-test-actor', admin.id).send({ csv: invalid, fingerprint: rejected.body.data.fingerprint }).expect(409)
    expect(await prisma.course.count()).toBe(0)
    const csv = 'courseNumber,courseName\nIT 112,Programming 1\nIT 113,Programming 2'
    const preview = await request(server).post('/courses/import/preview').set('x-test-actor', admin.id).send({ csv }).expect(200)
    expect(preview.body.data.valid).toBe(true)
    await request(server).post('/courses/import/confirm').set('x-test-actor', admin.id).send({ csv, fingerprint: preview.body.data.fingerprint }).expect(200)
    expect(await prisma.course.count()).toBe(2)
    const list = await request(server).get('/courses').set('x-test-actor', instructor.id).expect(200)
    expect(list.body.data.items).toHaveLength(2)
  })

  it('rejects malformed, existing, stale, and oversized Course CSV without partial writes or duplicate retries', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const server = app()
    const actor = { 'x-test-actor': admin.id }
    await request(server).post('/courses/import/preview').set(actor).send({ csv: 'courseNumber,courseName\n"IT 120,Unclosed' }).expect(422)
    const malformed = await request(server).post('/courses/import/preview').set(actor).send({ csv: 'courseNumber,courseName\nIT 120' }).expect(200)
    expect(malformed.body.data).toMatchObject({ valid: false, rows: [{ reason: 'INVALID_ROW' }] })
    expect(await prisma.course.count()).toBe(0)
    await request(server).post('/courses/import/confirm').set(actor).send({ csv: 'courseNumber,courseName\nIT 120', fingerprint: malformed.body.data.fingerprint }).expect(409)
    expect(await prisma.course.count()).toBe(0)

    await request(server).post('/courses').set(actor).send({ courseNumber: 'IT 121', courseName: 'Existing Course' }).expect(201)
    const existingCsv = 'courseNumber,courseName\nIT 121,Another Name'
    const existing = await request(server).post('/courses/import/preview').set(actor).send({ csv: existingCsv }).expect(200)
    expect(existing.body.data.rows[0].reason).toBe('COURSE_ALREADY_EXISTS')
    await request(server).post('/courses/import/confirm').set(actor).send({ csv: existingCsv, fingerprint: existing.body.data.fingerprint }).expect(409)
    expect(await prisma.course.count()).toBe(1)

    const staleCsv = 'courseNumber,courseName\nIT 122,Fresh Course\nIT 123,Later Conflict'
    const stale = await request(server).post('/courses/import/preview').set(actor).send({ csv: staleCsv }).expect(200)
    expect(stale.body.data.valid).toBe(true)
    expect(await prisma.course.count()).toBe(1)
    await request(server).post('/courses').set(actor).send({ courseNumber: 'IT 123', courseName: 'Created After Preview' }).expect(201)
    await request(server).post('/courses/import/confirm').set(actor).send({ csv: staleCsv, fingerprint: stale.body.data.fingerprint }).expect(409)
    expect(await prisma.course.findUnique({ where: { courseNumber: 'IT 122' } })).toBeNull()
    expect(await prisma.course.count()).toBe(2)

    const validCsv = 'courseNumber,courseName\nIT 124,Retry Course'
    const valid = await request(server).post('/courses/import/preview').set(actor).send({ csv: validCsv }).expect(200)
    await request(server).post('/courses/import/confirm').set(actor).send({ csv: validCsv, fingerprint: valid.body.data.fingerprint }).expect(200)
    await request(server).post('/courses/import/confirm').set(actor).send({ csv: validCsv, fingerprint: valid.body.data.fingerprint }).expect(409)
    expect(await prisma.course.count({ where: { courseNumber: 'IT 124' } })).toBe(1)

    const tooManyRows = `courseNumber,courseName\n${Array.from({ length: 501 }, (_, index) => `IT ${index + 200},Course ${index}`).join('\n')}`
    await request(server).post('/courses/import/preview').set(actor).send({ csv: tooManyRows }).expect(422)
    await request(server).post('/courses/import/preview').set(actor).send({ csv: `courseNumber,courseName\nIT 999,${'x'.repeat(262_144)}` }).expect(400)
    expect(await prisma.course.count()).toBe(3)
  })

  it('converts an Instructor workspace in place while preserving membership and guarding history', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const course = await prisma.course.create({ data: { courseNumber: 'IT 112', courseName: 'Programming 1' } })
    const existing = await classService.create(instructor, { className: 'Programming workspace' })
    const member = await createActiveMembership(prisma, existing.id, student.id)
    const dueDate = new Date('2030-10-01T08:00:00.000Z')
    const activity = await prisma.programmingActivity.create({ data: { classId: existing.id, createdById: instructor.id, title: 'Existing exercise', instructions: 'Preserved instructions', dueDate, starterCode: 'class Main {}', totalPoints: 100 } })
    const submission = await prisma.activitySubmission.create({ data: { activityId: activity.id, studentId: student.id, attemptNumber: 1, sourceCode: 'class Main {}', sourceHash: 'a'.repeat(64), activityTitleSnapshot: activity.title, dueDateSnapshot: dueDate, totalPointsSnapshot: 100, automatedMaximum: 40, instructorMaximum: 60, submissionStatus: 'RELEASED', originalAutomatedScore: 30, instructorPoints: 20, releasedFinalScore: 50, reviewedAt: new Date(), releasedAt: new Date() } })
    const feedback = await prisma.submissionFeedback.create({ data: { submissionId: submission.id, instructorId: instructor.id, feedbackText: 'Preserved feedback' } })
    const correction = await prisma.submissionScoreCorrection.create({ data: { submissionId: submission.id, correctionNumber: 1, originalAutomatedScore: 30, previousEffectiveScore: 50, newEffectiveScore: 55, reason: 'Preserved correction', correctedById: instructor.id } })
    const task = await prisma.projectTask.create({ data: { classId: existing.id, createdById: instructor.id, title: 'Existing project', instructions: 'Preserved project work', dueDate, status: 'PUBLISHED', publishedAt: new Date() } })
    const repositories = createRepositoryService({ repository: createPrismaRepositoryRepository(prisma), logger })
    const repository = await repositories.createClassProject(student, task.id, { teamName: 'Team One', repositoryName: 'Existing repository' })
    const server = app()
    const impact = await request(server).get(`/classes/${existing.id}/official-metadata-impact`).set('x-test-actor', admin.id).expect(200)
    expect(impact.body.data.history.memberships).toBe(1)
    await request(server).get(`/classes/${existing.id}/official-metadata-impact`).set('x-test-actor', instructor.id).expect(403)
    const change = { courseId: course.id, officialClassCode: '9123A', academicPeriod: 'SECOND_SEMESTER', schoolYear: '2026-2027', expectedUpdatedAt: impact.body.data.class.updatedAt, reason: 'Correcting the approved academic offering after review.', acknowledgeHistory: false }
    await request(server).patch(`/classes/${existing.id}/official-metadata`).set('x-test-actor', admin.id).send(change).expect(409)
    await request(server).patch(`/classes/${existing.id}/official-metadata`).set('x-test-actor', admin.id).send({ ...change, acknowledgeHistory: true }).expect(200)
    const persisted = await prisma.class.findUniqueOrThrow({ where: { id: existing.id } })
    expect(persisted).toMatchObject({ id: existing.id, instructorId: instructor.id, courseId: course.id, officialClassCode: '9123A', academicPeriod: 'SECOND_SEMESTER' })
    expect((await prisma.classMember.findUniqueOrThrow({ where: { id: member.id } })).classId).toBe(existing.id)
    expect(await prisma.class.count()).toBe(1)
    expect((await prisma.programmingActivity.findUniqueOrThrow({ where: { id: activity.id } })).classId).toBe(existing.id)
    const preservedSubmission = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: submission.id } })
    expect(preservedSubmission).toMatchObject({ activityId: activity.id, sourceCode: 'class Main {}' })
    expect(preservedSubmission.releasedFinalScore?.toString()).toBe('50')
    expect((await prisma.submissionFeedback.findUniqueOrThrow({ where: { id: feedback.id } })).feedbackText).toBe('Preserved feedback')
    expect((await prisma.submissionScoreCorrection.findUniqueOrThrow({ where: { id: correction.id } })).reason).toBe('Preserved correction')
    expect((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).classId).toBe(existing.id)
    expect((await prisma.repository.findUniqueOrThrow({ where: { id: repository.id } })).projectTaskId).toBe(task.id)
    expect(await prisma.adminAuditEvent.count({ where: { action: 'CLASS_OFFICIAL_METADATA_CORRECTED', targetId: existing.id } })).toBe(1)
    await expect(classService.update(instructor, existing.id, { schoolYear: '2027-2028' })).rejects.toMatchObject({ code: 'OFFICIAL_METADATA_GUARDED' })
    await request(server).patch(`/courses/${course.id}`).set('x-test-actor', admin.id).send({ courseNumber: 'IT 112', courseName: 'Programming Fundamentals' }).expect(200)
    expect((await prisma.class.findUniqueOrThrow({ where: { id: existing.id } })).courseNameSnapshot).toBe('Programming 1')
    const secondOffering = await classService.create(admin, { className: 'Petitioned offering', courseId: course.id, officialClassCode: '9123A', academicPeriod: 'FIRST_SEMESTER', schoolYear: '2027-2028' }, randomUUID())
    expect(secondOffering.id).not.toBe(existing.id)
    expect(secondOffering.status).toBe('PREPARED')
    expect(secondOffering.instructor).toBeNull()
    expect((await prisma.class.findUniqueOrThrow({ where: { id: secondOffering.id } })).classCodeActive).toBe(false)
    await request(server).post(`/classes/${secondOffering.id}/staff/admin-assign-primary`).set('x-test-actor', admin.id).send({ nextPrimaryId: instructor.id, formerPrimary: 'LEAVE', reason: 'Assigning the approved active Instructor to this offering.' }).expect(200)
    expect(await prisma.class.findUniqueOrThrow({ where: { id: secondOffering.id } })).toMatchObject({ status: 'ACTIVE', instructorId: instructor.id, classCodeActive: true })
  })

  it('requires accepted Co-Instructor access and makes Primary-transfer disposition explicit', async () => {
    const primary = await createActiveUser(prisma, 'INSTRUCTOR')
    const nextPrimary = await createActiveUser(prisma, 'INSTRUCTOR')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR')
    const existing = await classService.create(primary, { className: 'Staffed class' })
    const server = app()
    await request(server).post(`/classes/${existing.id}/staff/invitations`).set('x-test-actor', outsider.id).send({ universityEmail: nextPrimary.email }).expect(404)
    await request(server).post(`/classes/${existing.id}/staff/invitations`).set('x-test-actor', primary.id).send({ universityEmail: nextPrimary.email }).expect(201)
    await expect(classService.get(nextPrimary, existing.id)).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    await request(server).post(`/classes/${existing.id}/staff/invitations/accept`).set('x-test-actor', nextPrimary.id).send({}).expect(200)
    await expect(classService.get(nextPrimary, existing.id)).resolves.toMatchObject({ id: existing.id })
    await request(server).post(`/classes/${existing.id}/staff/invitations`).set('x-test-actor', nextPrimary.id).send({ universityEmail: outsider.email }).expect(404)
    await request(server).post(`/classes/${existing.id}/staff/transfer`).set('x-test-actor', nextPrimary.id).send({ nextPrimaryId: outsider.id, formerPrimary: 'LEAVE' }).expect(404)
    await request(server).post(`/classes/${existing.id}/staff/${primary.id}/remove`).set('x-test-actor', nextPrimary.id).send({}).expect(404)
    await request(server).post(`/classes/${existing.id}/staff/transfer`).set('x-test-actor', primary.id).send({ nextPrimaryId: nextPrimary.id, formerPrimary: 'CO_INSTRUCTOR' }).expect(200)
    expect((await prisma.class.findUniqueOrThrow({ where: { id: existing.id } })).instructorId).toBe(nextPrimary.id)
    await expect(classService.get(primary, existing.id)).resolves.toMatchObject({ id: existing.id })
    await request(server).post(`/classes/${existing.id}/staff/transfer`).set('x-test-actor', nextPrimary.id).send({ nextPrimaryId: primary.id, formerPrimary: 'LEAVE' }).expect(200)
    await expect(classService.get(nextPrimary, existing.id)).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    expect(await prisma.classStaffEvent.count({ where: { classId: existing.id } })).toBe(4)
  })

  it('limits Admin recovery to Admin and preserves the Class while explicitly setting former access', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const primary = await createActiveUser(prisma, 'INSTRUCTOR')
    const replacement = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const existing = await classService.create(primary, { className: 'Staff recovery class' })
    const member = await createActiveMembership(prisma, existing.id, student.id)
    const server = app()
    const input = { nextPrimaryId: replacement.id, formerPrimary: 'LEAVE', reason: 'Replacing the Primary after the staffing decision.' }
    await request(server).post(`/classes/${existing.id}/staff/admin-assign-primary`).set('x-test-actor', primary.id).send(input).expect(403)
    await request(server).post(`/classes/${existing.id}/staff/admin-assign-primary`).set('x-test-actor', student.id).send(input).expect(403)
    await request(server).post(`/classes/${existing.id}/staff/admin-assign-primary`).set('x-test-actor', admin.id).send(input).expect(200)
    expect((await prisma.class.findUniqueOrThrow({ where: { id: existing.id } })).instructorId).toBe(replacement.id)
    expect((await prisma.classMember.findUniqueOrThrow({ where: { id: member.id } })).classId).toBe(existing.id)
    await expect(classService.get(primary, existing.id)).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' })
    await request(server).post(`/classes/${existing.id}/staff/admin-assign-primary`).set('x-test-actor', admin.id).send({ nextPrimaryId: primary.id, formerPrimary: 'CO_INSTRUCTOR', reason: 'Restoring the Primary with the previous Instructor remaining.' }).expect(200)
    await expect(classService.get(replacement, existing.id)).resolves.toMatchObject({ id: existing.id })
    const event = await prisma.classStaffEvent.findFirstOrThrow({ where: { classId: existing.id, action: 'ADMIN_PRIMARY_ASSIGNED' }, orderBy: { createdAt: 'desc' } })
    expect(event.detailsJson).toMatchObject({ formerPrimaryDisposition: 'CO_INSTRUCTOR' })
  })

  it('previews student CSV without enrollment and creates only pending invitations', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR')
    const existing = await classService.create(instructor, { className: 'Invitation class' })
    const csv = `email\n${student.email}`
    const server = app()
    await request(server).post(`/classes/${existing.id}/invitations/import/preview`).set('x-test-actor', outsider.id).send({ csv }).expect(404)
    const preview = await request(server).post(`/classes/${existing.id}/invitations/import/preview`).set('x-test-actor', instructor.id).send({ csv }).expect(200)
    expect(preview.body.data).toMatchObject({ valid: true, ready: 1 })
    expect(await prisma.classInvitation.count()).toBe(0)
    await request(server).post(`/classes/${existing.id}/invitations/import/confirm`).set('x-test-actor', instructor.id).send({ csv, fingerprint: preview.body.data.fingerprint }).expect(200)
    expect(await prisma.classInvitation.count({ where: { classId: existing.id, status: 'PENDING' } })).toBe(1)
    expect(await prisma.classMember.count({ where: { classId: existing.id } })).toBe(0)
  })

  it('classifies ineligible Student CSV rows and rejects malformed, stale, and oversized imports without writes', async () => {
    const primary = await createActiveUser(prisma, 'INSTRUCTOR')
    const outsider = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const inactive = await createActiveUser(prisma, 'STUDENT')
    await prisma.user.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } })
    const existing = await classService.create(primary, { className: 'CSV boundary class' })
    const server = app()
    const path = `/classes/${existing.id}/invitations/import`
    const actor = { 'x-test-actor': primary.id }
    const eligibleCsv = `email\n${student.email}`
    await request(server).post(`${path}/preview`).set('x-test-actor', outsider.id).send({ csv: eligibleCsv }).expect(404)
    await request(server).post(`${path}/confirm`).set('x-test-actor', outsider.id).send({ csv: eligibleCsv, fingerprint: 'a'.repeat(64) }).expect(404)
    await request(server).post(`${path}/preview`).set('x-test-actor', student.id).send({ csv: eligibleCsv }).expect(403)
    await request(server).post(`${path}/preview`).set(actor).send({ csv: 'email\n"unclosed' }).expect(422)
    const invalidCsv = `email\n${student.email},extra\n${student.email}\n${student.email}\nmissing@integration.test\n${inactive.email}\n${outsider.email}`
    const invalid = await request(server).post(`${path}/preview`).set(actor).send({ csv: invalidCsv }).expect(200)
    expect(invalid.body.data.valid).toBe(false)
    expect(invalid.body.data.rows.map((row: { status: string }) => row.status)).toEqual([
      'INVALID_EMAIL', 'READY', 'DUPLICATE_ROW', 'INELIGIBLE_STUDENT', 'INELIGIBLE_STUDENT', 'INELIGIBLE_STUDENT',
    ])
    expect(await prisma.classInvitation.count()).toBe(0)
    expect(await prisma.classMember.count()).toBe(0)
    await request(server).post(`${path}/confirm`).set(actor).send({ csv: invalidCsv, fingerprint: invalid.body.data.fingerprint }).expect(409)
    expect(await prisma.classInvitation.count()).toBe(0)

    const stale = await request(server).post(`${path}/preview`).set(actor).send({ csv: eligibleCsv }).expect(200)
    expect(stale.body.data).toMatchObject({ valid: true, ready: 1 })
    await prisma.user.update({ where: { id: student.id }, data: { status: 'INACTIVE' } })
    await request(server).post(`${path}/confirm`).set(actor).send({ csv: eligibleCsv, fingerprint: stale.body.data.fingerprint }).expect(409)
    expect(await prisma.classInvitation.count()).toBe(0)
    await prisma.user.update({ where: { id: student.id }, data: { status: 'ACTIVE' } })

    const tooManyRows = `email\n${Array.from({ length: 101 }, (_, index) => `student-${index}@integration.test`).join('\n')}`
    await request(server).post(`${path}/preview`).set(actor).send({ csv: tooManyRows }).expect(422)
    await request(server).post(`${path}/preview`).set(actor).send({ csv: `email\n${'x'.repeat(262_144)}` }).expect(400)
    expect(await prisma.classInvitation.count()).toBe(0)
    expect(await prisma.classMember.count()).toBe(0)
  })

  it('skips existing memberships and invitations, safely retries, and waits for Student acceptance', async () => {
    const primary = await createActiveUser(prisma, 'INSTRUCTOR')
    const member = await createActiveUser(prisma, 'STUDENT')
    const pending = await createActiveUser(prisma, 'STUDENT')
    const newStudent = await createActiveUser(prisma, 'STUDENT')
    const existing = await classService.create(primary, { className: 'CSV retry class' })
    await createActiveMembership(prisma, existing.id, member.id)
    await prisma.classInvitation.create({ data: { classId: existing.id, inviteeId: pending.id, invitedById: primary.id, status: 'PENDING' } })
    const server = app()
    const actor = { 'x-test-actor': primary.id }
    const path = `/classes/${existing.id}/invitations/import`
    const csv = `email\n${member.email}\n${pending.email}\n${newStudent.email}`
    const preview = await request(server).post(`${path}/preview`).set(actor).send({ csv }).expect(200)
    expect(preview.body.data.rows.map((row: { status: string }) => row.status)).toEqual(['ALREADY_MEMBER', 'ALREADY_PENDING', 'READY'])
    expect(await prisma.classInvitation.count()).toBe(1)
    expect(await prisma.classMember.count()).toBe(1)
    const first = await request(server).post(`${path}/confirm`).set(actor).send({ csv, fingerprint: preview.body.data.fingerprint }).expect(200)
    expect(first.body.data).toMatchObject({ invited: 1, alreadyMember: 1, alreadyPending: 1 })
    expect(await prisma.classInvitation.count({ where: { classId: existing.id, status: 'PENDING' } })).toBe(2)
    expect(await prisma.classMember.count()).toBe(1)
    const retry = await request(server).post(`${path}/confirm`).set(actor).send({ csv, fingerprint: preview.body.data.fingerprint }).expect(200)
    expect(retry.body.data).toMatchObject({ invited: 0, alreadyMember: 1, alreadyPending: 2 })
    expect(await prisma.classInvitation.count({ where: { classId: existing.id, status: 'PENDING' } })).toBe(2)
    const invitation = await prisma.classInvitation.findFirstOrThrow({ where: { classId: existing.id, inviteeId: newStudent.id, status: 'PENDING' } })
    const invitationService = createClassInvitationService({
      repository: createPrismaClassInvitationRepository(prisma),
      classRepository: createPrismaClassRepository(prisma),
      logger,
    })
    await invitationService.accept(newStudent, invitation.id)
    expect(await prisma.classMember.count({ where: { classId: existing.id, studentId: newStudent.id, status: 'ACTIVE' } })).toBe(1)
  })
})
