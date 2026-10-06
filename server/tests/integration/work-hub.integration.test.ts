import { randomUUID } from 'node:crypto'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createWorkHubRouter } from '../../src/modules/work-hub/work-hub.routes.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from './database.js'

const prisma = createIntegrationPrisma()
const pass: RequestHandler = (_request, _response, next) => next()

function app() {
  const server = express()
  server.use(async (req, _res, next) => {
    try {
      req.requestId = randomUUID()
      const actor = req.header('x-test-actor')
      if (actor) req.auth = { user: await prisma.user.findUniqueOrThrow({ where: { id: actor } }) } as unknown as typeof req.auth
      next()
    } catch (error) { next(error) }
  })
  server.use('/work-hub', createWorkHubRouter({ prisma, requireAuthentication: pass }))
  const failure: ErrorRequestHandler = (error, _req, response, _next) => response.status(error.statusCode ?? 500).json({ code: error.code ?? 'INTERNAL_ERROR' })
  server.use(failure)
  return server
}

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => { await cleanIntegrationDatabase(prisma); await prisma.$disconnect() })

describe('cross-class academic work hub', () => {
  it('shows only published work in active Student memberships with deadline and type filters', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const other = await createActiveUser(prisma, 'STUDENT')
    const first = await createActiveClass(prisma, instructor.id, 'First Class')
    const second = await createActiveClass(prisma, instructor.id, 'Second Class')
    const hidden = await createActiveClass(prisma, instructor.id, 'Hidden Class')
    await createActiveMembership(prisma, first.id, student.id)
    await createActiveMembership(prisma, second.id, student.id)
    await createActiveMembership(prisma, hidden.id, other.id)
    const yesterday = new Date(Date.now() - 86_400_000)
    const tomorrow = new Date(Date.now() + 86_400_000)
    await prisma.programmingActivity.create({ data: { classId: first.id, createdById: instructor.id, title: 'Overdue code', instructions: 'Write code', dueDate: yesterday, starterCode: 'class Main {}', totalPoints: 100, status: 'PUBLISHED', publishedAt: new Date() } })
    await prisma.projectTask.create({ data: { classId: second.id, createdById: instructor.id, title: 'Upcoming project', instructions: 'Build project', dueDate: tomorrow, status: 'PUBLISHED', publishedAt: new Date() } })
    await prisma.projectTask.create({ data: { classId: hidden.id, createdById: instructor.id, title: 'Private project', instructions: 'Hidden', dueDate: tomorrow, status: 'PUBLISHED', publishedAt: new Date() } })
    await prisma.programmingActivity.create({ data: { classId: first.id, createdById: instructor.id, title: 'Draft code', instructions: 'Draft', dueDate: tomorrow, starterCode: 'class Main {}', totalPoints: 100 } })
    const server = app()
    const all = await request(server).get('/work-hub/student/todo?pageSize=1').set('x-test-actor', student.id).expect(200)
    expect(all.body.data.map((row: { title: string }) => row.title)).toEqual(['Overdue code'])
    expect(all.body.pagination).toMatchObject({ totalItems: 2, hasNextPage: true })
    const next = await request(server).get('/work-hub/student/todo?page=2&pageSize=1').set('x-test-actor', student.id).expect(200)
    expect(next.body.data.map((row: { title: string }) => row.title)).toEqual(['Upcoming project'])
    const overdue = await request(server).get('/work-hub/student/todo?due=overdue').set('x-test-actor', student.id).expect(200)
    expect(overdue.body.pagination.totalItems).toBe(1)
    const projects = await request(server).get('/work-hub/student/todo?kind=project').set('x-test-actor', student.id).expect(200)
    expect(projects.body.data.map((row: { title: string }) => row.title)).toEqual(['Upcoming project'])
    await request(server).get('/work-hub/student/todo').set('x-test-actor', instructor.id).expect(403)
    await prisma.classMember.update({ where: { classId_studentId: { classId: second.id, studentId: student.id } }, data: { status: 'REMOVED' } })
    const removed = await request(server).get('/work-hub/student/todo').set('x-test-actor', student.id).expect(200)
    expect(removed.body.pagination.totalItems).toBe(1)
  })

  it('keeps global attempt history student-isolated and score-gated, including archived classes', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const student = await createActiveUser(prisma, 'STUDENT')
    const other = await createActiveUser(prisma, 'STUDENT')
    const first = await createActiveClass(prisma, instructor.id)
    const archived = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, first.id, student.id)
    await createActiveMembership(prisma, archived.id, student.id)
    await createActiveMembership(prisma, first.id, other.id)
    const activity = await prisma.programmingActivity.create({ data: { classId: first.id, createdById: instructor.id, title: 'Source task', instructions: 'Write code', dueDate: new Date(), starterCode: 'class Main {}', totalPoints: 100, status: 'PUBLISHED', publishedAt: new Date() } })
    const archivedActivity = await prisma.programmingActivity.create({ data: { classId: archived.id, createdById: instructor.id, title: 'Archived task', instructions: 'Old work', dueDate: new Date(), starterCode: 'class Main {}', totalPoints: 100, status: 'ARCHIVED', archivedAt: new Date() } })
    const create = (activityId: string, studentId: string, status: 'ASSESSED' | 'RELEASED', attemptNumber: number) => prisma.activitySubmission.create({ data: { activityId, studentId, attemptNumber, sourceCode: 'private source', sourceHash: 'a'.repeat(64), activityTitleSnapshot: 'Source task', dueDateSnapshot: new Date(), totalPointsSnapshot: 100, automatedMaximum: 50, instructorMaximum: 50, submissionStatus: status, originalAutomatedScore: 45, ...(status === 'RELEASED' ? { releasedFinalScore: 75, reviewedAt: new Date(), releasedAt: new Date() } : {}) } })
    await create(activity.id, student.id, 'ASSESSED', 1)
    await create(activity.id, student.id, 'RELEASED', 2)
    await create(archivedActivity.id, student.id, 'RELEASED', 1)
    await create(activity.id, other.id, 'RELEASED', 1)
    await prisma.class.update({ where: { id: archived.id }, data: { status: 'ARCHIVED' } })
    const server = app()
    const result = await request(server).get('/work-hub/student/submissions').set('x-test-actor', student.id).expect(200)
    expect(result.body.pagination.totalItems).toBe(3)
    expect(result.body.data.every((row: { class: { id: string } }) => [first.id, archived.id].includes(row.class.id))).toBe(true)
    expect(JSON.stringify(result.body)).not.toContain('private source')
    expect(JSON.stringify(result.body)).not.toContain('originalAutomatedScore')
    const unreleased = result.body.data.find((row: { status: string }) => row.status === 'assessed')
    expect(unreleased).not.toHaveProperty('finalScore')
    expect(result.body.data.filter((row: { status: string }) => row.status === 'released')).toHaveLength(2)
    await prisma.classMember.update({ where: { classId_studentId: { classId: archived.id, studentId: student.id } }, data: { status: 'REMOVED' } })
    const afterRemoval = await request(server).get('/work-hub/student/submissions').set('x-test-actor', student.id).expect(200)
    expect(afterRemoval.body.pagination.totalItems).toBe(2)
    await request(server).get('/work-hub/student/submissions').set('x-test-actor', instructor.id).expect(403)
  })

  it('limits review work to Primary and active Co-Instructors and omits terminal work', async () => {
    const primary = await createActiveUser(prisma, 'INSTRUCTOR')
    const co = await createActiveUser(prisma, 'INSTRUCTOR')
    const pending = await createActiveUser(prisma, 'INSTRUCTOR')
    const unrelated = await createActiveUser(prisma, 'INSTRUCTOR')
    const admin = await createActiveUser(prisma, 'ADMIN')
    const student = await createActiveUser(prisma, 'STUDENT')
    const first = await createActiveClass(prisma, primary.id)
    const archived = await createActiveClass(prisma, primary.id)
    await prisma.classTeachingStaff.createMany({ data: [{ classId: first.id, instructorId: co.id, invitedById: primary.id, status: 'ACTIVE', acceptedAt: new Date() }, { classId: first.id, instructorId: pending.id, invitedById: primary.id, status: 'INVITED' }] })
    const activity = await prisma.programmingActivity.create({ data: { classId: first.id, createdById: primary.id, title: 'Review work', instructions: 'Work', dueDate: new Date(), starterCode: 'class Main {}', totalPoints: 100, status: 'PUBLISHED', publishedAt: new Date() } })
    const oldActivity = await prisma.programmingActivity.create({ data: { classId: archived.id, createdById: primary.id, title: 'Old work', instructions: 'Old', dueDate: new Date(), starterCode: 'class Main {}', totalPoints: 100, status: 'ARCHIVED', archivedAt: new Date() } })
    const task = await prisma.projectTask.create({ data: { classId: first.id, createdById: primary.id, title: 'Team project', instructions: 'Collaborate', dueDate: new Date(), status: 'PUBLISHED', publishedAt: new Date() } })
    const repository = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { projectTaskId: task.id, leadStudentId: student.id, name: 'Team One', normalizedName: 'team one' } })
      await tx.teamMember.create({ data: { teamId: team.id, projectTaskId: task.id, studentId: student.id, memberRole: 'LEAD', status: 'ACTIVE' } })
      const record = await tx.repository.create({ data: { projectTaskId: task.id, teamId: team.id, ownerId: student.id, repositoryType: 'CLASS_PROJECT', repositoryName: 'Team repo', slug: 'team-repo', visibility: 'CLASS_ONLY', reviewStatus: 'READY_FOR_REVIEW', readyForReviewAt: new Date(), status: 'ACTIVE' } })
      await tx.repositoryMember.create({ data: { repositoryId: record.id, studentId: student.id, memberRole: 'OWNER', status: 'ACTIVE' } })
      return record
    })
    const create = (activityId: string, status: 'ASSESSED' | 'RELEASED') => prisma.activitySubmission.create({ data: { activityId, studentId: student.id, attemptNumber: 1, sourceCode: 'private source', sourceHash: 'a'.repeat(64), activityTitleSnapshot: 'Review work', dueDateSnapshot: new Date(), totalPointsSnapshot: 100, automatedMaximum: 50, instructorMaximum: 50, submissionStatus: status } })
    const review = await create(activity.id, 'ASSESSED')
    await create(oldActivity.id, 'ASSESSED')
    await prisma.class.update({ where: { id: archived.id }, data: { status: 'ARCHIVED' } })
    const server = app()
    for (const actor of [primary, co]) {
      const result = await request(server).get('/work-hub/instructor/review-queue').set('x-test-actor', actor.id).expect(200)
      expect(result.body.pagination.totalItems).toBe(2)
      expect(result.body.data.map((row: { id: string }) => row.id).sort()).toEqual([review.id, repository.id].sort())
      expect(JSON.stringify(result.body)).not.toContain('private source')
      const repoOnly = await request(server).get('/work-hub/instructor/review-queue?kind=repository').set('x-test-actor', actor.id).expect(200)
      expect(repoOnly.body.data).toMatchObject([{ id: repository.id, kind: 'repository', status: 'ready_for_review' }])
    }
    for (const actor of [pending, unrelated]) {
      const result = await request(server).get('/work-hub/instructor/review-queue').set('x-test-actor', actor.id).expect(200)
      expect(result.body.data).toEqual([])
    }
    for (const actor of [admin, student]) await request(server).get('/work-hub/instructor/review-queue').set('x-test-actor', actor.id).expect(403)
  })
})
