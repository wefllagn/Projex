import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createWorkHubRouter } from './work-hub.routes.js'

function fixture(role = 'STUDENT', status = 'ACTIVE') {
  const transaction = {
    programmingActivity: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    activitySubmission: { groupBy: vi.fn().mockResolvedValue([]) },
    classMember: { groupBy: vi.fn().mockResolvedValue([]) },
    projectTask: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  }
  const prisma = { $transaction: vi.fn(async callback => callback(transaction)) } as unknown as PrismaClient
  const server = express()
  const auth: RequestHandler = (req, _res, next) => { req.auth = { user: { id: 'student-1', role, status } } as unknown as typeof req.auth; next() }
  server.use('/work-hub', createWorkHubRouter({ prisma, requireAuthentication: auth }))
  const errors: ErrorRequestHandler = (error, _req, res, _next) => { res.status(error.statusCode || 500).json({ code: error.code || 'INTERNAL_ERROR' }) }
  server.use(errors)
  return { server, transaction }
}

describe('Student To-do read contract', () => {
  it.each(['assigned', 'missing', 'done'])('filters %s before count/pagination with active Student scope', async state => {
    const { server, transaction: tx } = fixture()
    await request(server).get(`/work-hub/student/todo?state=${state}&page=2&pageSize=1`).expect(200)
    const activity = tx.programmingActivity.findMany.mock.calls[0]![0]
    const project = tx.projectTask.findMany.mock.calls[0]![0]
    expect(activity.take).toBe(2)
    expect(activity.where.class).toMatchObject({ status: 'ACTIVE', members: { some: { studentId: 'student-1', status: 'ACTIVE' } } })
    expect(tx.programmingActivity.count).toHaveBeenCalledWith({ where: activity.where })
    expect(tx.projectTask.count).toHaveBeenCalledWith({ where: project.where })
    if (state === 'done') {
      expect(activity.where.submissions).toEqual({ some: { studentId: 'student-1' } })
      expect(project.where.teams.some).toMatchObject({ members: { some: { studentId: 'student-1', status: 'ACTIVE' } }, repository: { is: { reviewStatus: { in: ['READY_FOR_REVIEW', 'APPROVED'] } } } })
      expect(activity.where.dueDate).toBeUndefined()
    } else {
      expect(activity.where.submissions).toEqual({ none: { studentId: 'student-1' } })
      expect(project.where.NOT.teams.some.repository.is.reviewStatus.in).toEqual(['READY_FOR_REVIEW', 'APPROVED'])
      expect(activity.where.dueDate[state === 'assigned' ? 'gte' : 'lt']).toBeInstanceOf(Date)
    }
  })
  it('does not treat team membership as completion or expose a source snapshot', async () => {
    const { server, transaction: tx } = fixture()
    const classRecord = { id: 'c', className: 'Programming', section: 'IT 1A', courseNumberSnapshot: null, courseNameSnapshot: null, officialClassCode: null, academicPeriod: null, schoolYear: null, semester: null }
    const future = new Date(Date.now() + 86400000)
    tx.projectTask.findMany.mockResolvedValue([{ id: 'p', title: 'Project', dueDate: future, class: classRecord, teams: [{ id: 't', repository: { status: 'ACTIVE', reviewStatus: 'WORKING' } }], sourceCode: 'PRIVATE_SOURCE' }] as never)
    tx.projectTask.count.mockResolvedValue(1)
    const response = await request(server).get('/work-hub/student/todo').expect(200)
    expect(response.body.data).toMatchObject([{ hasTeam: true, workState: 'assigned' }])
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_SOURCE')
  })
  it('keeps legacy all behavior and rejects invented state values before any query', async () => {
    const { server, transaction: tx } = fixture()
    await request(server).get('/work-hub/student/todo?state=unknown').expect(400)
    expect(tx.programmingActivity.findMany).not.toHaveBeenCalled()
    await request(server).get('/work-hub/student/todo').expect(200)
    expect(tx.programmingActivity.findMany.mock.calls[0]![0].where).toMatchObject({ status: 'PUBLISHED' })
    expect(tx.programmingActivity.findMany.mock.calls[0]![0].where.submissions).toBeUndefined()
  })
  it.each([['INSTRUCTOR','ACTIVE'],['ADMIN','ACTIVE'],['STUDENT','SUSPENDED']])('rejects %s/%s without reading academic records', async (role,status) => {
    const { server, transaction: tx } = fixture(role,status)
    await request(server).get('/work-hub/student/todo?state=done').expect(403)
    expect(tx.programmingActivity.findMany).not.toHaveBeenCalled()
    expect(tx.projectTask.findMany).not.toHaveBeenCalled()
  })
})


describe('Instructor Activity review aggregation', () => {
  it.each(['to-review', 'reviewed'])('scopes %s to active teaching assignments before pagination and counts', async state => {
    const { server, transaction: tx } = fixture('INSTRUCTOR')
    const classId = '00000000-0000-4000-8000-000000000001'
    await request(server).get(`/work-hub/instructor/review-activities?state=${state}&classId=${classId}&page=2&pageSize=3`).expect(200)
    const selection = tx.programmingActivity.findMany.mock.calls[0]![0]
    expect(selection.where.class).toEqual({ status: 'ACTIVE', OR: [{ instructorId: 'student-1' }, { teachingStaff: { some: { instructorId: 'student-1', status: 'ACTIVE' } } }] })
    expect(selection.where).toMatchObject({ classId, status: { in: ['PUBLISHED', 'CLOSED'] } })
    expect(selection).toMatchObject({ skip: 3, take: 3, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }] })
    expect(tx.programmingActivity.count).toHaveBeenCalledWith({ where: selection.where })
    expect(state === 'reviewed' ? selection.where.AND : selection.where.OR).toHaveLength(2)
    expect(tx.activitySubmission.groupBy).not.toHaveBeenCalled()
  })
  it('keeps attempt, assigned-student, review and release units distinct without source or score projection', async () => {
    const { server, transaction: tx } = fixture('INSTRUCTOR')
    tx.programmingActivity.findMany.mockResolvedValue([{ id: 'a', title: 'Loops', dueDate: new Date('2026-10-30'), gradingMode: 'POINTS', status: 'PUBLISHED', class: { id: 'c', className: 'Programming', section: 'IT 1A' }, sourceCode: 'PRIVATE_SOURCE', finalScore: 90 }] as never)
    tx.programmingActivity.count.mockResolvedValue(1)
    tx.activitySubmission.groupBy.mockResolvedValue([{ activityId: 'a', _count: { _all: 7, reviewedAt: 3, releasedAt: 1 } }] as never)
    tx.classMember.groupBy.mockResolvedValue([{ classId: 'c', _count: { _all: 5 } }] as never)
    const response = await request(server).get('/work-hub/instructor/review-activities').expect(200)
    expect(response.body.data).toMatchObject([{ submittedAttempts: 7, assignedStudents: 5, reviewedAttempts: 3, releasedAttempts: 1 }])
    expect(response.body.pagination.totalItems).toBe(1)
    expect(tx.activitySubmission.groupBy).toHaveBeenCalledWith({ by: ['activityId'], where: { activityId: { in: ['a'] } }, _count: { _all: true, reviewedAt: true, releasedAt: true } })
    expect(tx.classMember.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { classId: { in: ['c'] }, status: 'ACTIVE', student: { role: 'STUDENT', status: 'ACTIVE' } } }))
    expect(JSON.stringify(response.body)).not.toMatch(/PRIVATE_SOURCE|finalScore/)
  })
  it.each([['STUDENT', 'ACTIVE'], ['ADMIN', 'ACTIVE'], ['INSTRUCTOR', 'SUSPENDED']])('denies %s/%s before aggregation', async (role, status) => {
    const { server, transaction: tx } = fixture(role, status)
    await request(server).get('/work-hub/instructor/review-activities').expect(403)
    expect(tx.programmingActivity.findMany).not.toHaveBeenCalled()
    expect(tx.activitySubmission.groupBy).not.toHaveBeenCalled()
  })
  it('rejects unsupported states and oversized pagination without a query', async () => {
    const { server, transaction: tx } = fixture('INSTRUCTOR')
    await request(server).get('/work-hub/instructor/review-activities?state=graded').expect(400)
    await request(server).get('/work-hub/instructor/review-activities?pageSize=1000').expect(400)
    expect(tx.programmingActivity.findMany).not.toHaveBeenCalled()
  })
})
