import { Prisma, type PrismaClient } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { requireActiveUser, requireRole } from '../auth/auth.authorization.js'
import { listResponse, type PaginationMeta } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'

const common = {
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  classId: z.uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
}
const todoQuery = z.object({ ...common, due: z.enum(['all', 'upcoming', 'overdue']).default('all'), kind: z.enum(['all', 'activity', 'project']).default('all') }).strict()
const submissionQuery = z.object({ ...common, status: z.enum(['QUEUED', 'ASSESSING', 'ASSESSED', 'ASSESSMENT_FAILED', 'REVIEWED', 'RELEASED', 'FAILED_RESOLVED']).optional() }).strict()
const reviewQuery = z.object({ ...common, kind: z.enum(['all', 'submission', 'repository']).default('all') }).strict()

function pagination(page: number, pageSize: number, totalItems: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize)
  return { page, pageSize, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 }
}

const classSelect = {
  id: true, className: true, courseNumberSnapshot: true, courseNameSnapshot: true,
  officialClassCode: true, academicPeriod: true, schoolYear: true, section: true, semester: true,
} as const

function classProjection(record: { id: string; className: string; courseNumberSnapshot: string | null; courseNameSnapshot: string | null; officialClassCode: string | null; academicPeriod: string | null; schoolYear: string | null; section: string | null; semester: string | null }) {
  return { id: record.id, className: record.className, courseNumber: record.courseNumberSnapshot, courseName: record.courseNameSnapshot, officialClassCode: record.officialClassCode, academicPeriod: record.academicPeriod, schoolYear: record.schoolYear, section: record.section, semester: record.semester }
}

function pageOf<T>(rows: T[], page: number, pageSize: number) {
  return rows.slice((page - 1) * pageSize, page * pageSize)
}

function compareDateAndIdentity(a: { sortAt: Date; kind: string; id: string }, b: { sortAt: Date; kind: string; id: string }, descending = false) {
  const time = a.sortAt.getTime() - b.sortAt.getTime()
  return (descending ? -time : time) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)
}

export function createWorkHubRouter({ prisma, requireAuthentication }: { prisma: PrismaClient; requireAuthentication: RequestHandler }) {
  const router = Router()
  router.use(requireAuthentication, requireActiveUser)

  router.get('/student/todo', requireRole('STUDENT'), async (request, response, next) => {
    try {
      const query = parseRequest(todoQuery, request.query)
      const studentId = request.auth!.user.id
      const now = new Date()
      const dueDate = query.due === 'upcoming' ? { gte: now } : query.due === 'overdue' ? { lt: now } : undefined
      const classWhere = { status: 'ACTIVE' as const, members: { some: { studentId, status: 'ACTIVE' as const } } }
      const base = { class: classWhere, ...(query.classId ? { classId: query.classId } : {}), ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}), ...(dueDate ? { dueDate } : {}) }
      const activityWhere = { ...base, status: 'PUBLISHED' as const }
      const taskWhere = { ...base, status: 'PUBLISHED' as const }
      const take = query.page * query.pageSize
      const result = await prisma.$transaction(async (tx) => {
        const [activities, tasks, activityCount, taskCount] = await Promise.all([
          query.kind === 'project' ? [] : tx.programmingActivity.findMany({ where: activityWhere, select: { id: true, title: true, dueDate: true, class: { select: classSelect }, submissions: { where: { studentId }, select: { id: true }, take: 1 } }, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], take }),
          query.kind === 'activity' ? [] : tx.projectTask.findMany({ where: taskWhere, select: { id: true, title: true, dueDate: true, class: { select: classSelect }, teams: { where: { members: { some: { studentId, status: 'ACTIVE' } } }, select: { id: true }, take: 1 } }, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], take }),
          query.kind === 'project' ? 0 : tx.programmingActivity.count({ where: activityWhere }),
          query.kind === 'activity' ? 0 : tx.projectTask.count({ where: taskWhere }),
        ])
        return { activities, tasks, total: activityCount + taskCount }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
      const rows = [
        ...result.activities.map((row) => ({ id: row.id, kind: 'activity', title: row.title, dueDate: row.dueDate, dueState: row.dueDate < now ? 'overdue' : 'upcoming', hasSubmission: row.submissions.length > 0, class: classProjection(row.class), sortAt: row.dueDate })),
        ...result.tasks.map((row) => ({ id: row.id, kind: 'project', title: row.title, dueDate: row.dueDate, dueState: row.dueDate < now ? 'overdue' : 'upcoming', hasTeam: row.teams.length > 0, class: classProjection(row.class), sortAt: row.dueDate })),
      ].sort((a, b) => compareDateAndIdentity(a, b))
      response.json(listResponse(pageOf(rows, query.page, query.pageSize).map(({ sortAt: _sortAt, ...row }) => row), pagination(query.page, query.pageSize, result.total), request.requestId))
    } catch (error) { next(error) }
  })

  router.get('/student/submissions', requireRole('STUDENT'), async (request, response, next) => {
    try {
      const query = parseRequest(submissionQuery, request.query)
      const where: Prisma.ActivitySubmissionWhereInput = {
        studentId: request.auth!.user.id,
        activity: { ...(query.classId ? { classId: query.classId } : {}), class: { members: { some: { studentId: request.auth!.user.id, status: 'ACTIVE' } }, status: { in: ['ACTIVE', 'ARCHIVED'] } } },
        ...(query.status ? { submissionStatus: query.status } : {}),
        ...(query.search ? { activityTitleSnapshot: { contains: query.search, mode: 'insensitive' as const } } : {}),
      }
      const result = await prisma.$transaction(async (tx) => {
        const [rows, total] = await Promise.all([
          tx.activitySubmission.findMany({ where, select: { id: true, activityId: true, activityTitleSnapshot: true, attemptNumber: true, submittedAt: true, submissionStatus: true, isLate: true, releasedFinalScore: true, totalPointsSnapshot: true, activity: { select: { class: { select: classSelect } } } }, orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
          tx.activitySubmission.count({ where }),
        ])
        return { rows, total }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
      const rows = result.rows.map((row) => ({ id: row.id, activityId: row.activityId, activityTitle: row.activityTitleSnapshot, attemptNumber: row.attemptNumber, submittedAt: row.submittedAt, status: row.submissionStatus.toLowerCase(), isLate: row.isLate, class: classProjection(row.activity.class), ...(row.submissionStatus === 'RELEASED' ? { finalScore: Number(row.releasedFinalScore), totalPoints: Number(row.totalPointsSnapshot) } : {}) }))
      response.json(listResponse(rows, pagination(query.page, query.pageSize, result.total), request.requestId))
    } catch (error) { next(error) }
  })

  router.get('/instructor/review-queue', requireRole('INSTRUCTOR'), async (request, response, next) => {
    try {
      const query = parseRequest(reviewQuery, request.query)
      const instructorId = request.auth!.user.id
      const classWhere = { status: 'ACTIVE' as const, OR: [{ instructorId }, { teachingStaff: { some: { instructorId, status: 'ACTIVE' as const } } }] }
      const base = { class: classWhere, ...(query.classId ? { classId: query.classId } : {}) }
      const submissionWhere: Prisma.ActivitySubmissionWhereInput = { activity: { ...base, status: { not: 'ARCHIVED' }, ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}) }, submissionStatus: { in: ['ASSESSED', 'ASSESSMENT_FAILED', 'REVIEWED'] } }
      const repositoryWhere = { status: 'ACTIVE' as const, reviewStatus: 'READY_FOR_REVIEW' as const, projectTask: { ...base, status: { not: 'ARCHIVED' as const }, ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}) } }
      const take = query.page * query.pageSize
      const result = await prisma.$transaction(async (tx) => {
        const [submissions, repositories, submissionCount, repositoryCount] = await Promise.all([
          query.kind === 'repository' ? [] : tx.activitySubmission.findMany({ where: submissionWhere, select: { id: true, activityId: true, activityTitleSnapshot: true, submittedAt: true, updatedAt: true, submissionStatus: true, student: { select: { id: true, fullName: true } }, activity: { select: { class: { select: classSelect } } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take }),
          query.kind === 'submission' ? [] : tx.repository.findMany({ where: repositoryWhere, select: { id: true, readyForReviewAt: true, updatedAt: true, projectTask: { select: { id: true, title: true, class: { select: classSelect } } } }, orderBy: [{ readyForReviewAt: 'desc' }, { id: 'asc' }], take }),
          query.kind === 'repository' ? 0 : tx.activitySubmission.count({ where: submissionWhere }),
          query.kind === 'submission' ? 0 : tx.repository.count({ where: repositoryWhere }),
        ])
        return { submissions, repositories, total: submissionCount + repositoryCount }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
      const rows = [
        ...result.submissions.map((row) => ({ id: row.id, kind: 'submission', title: row.activityTitleSnapshot, activityId: row.activityId, student: row.student, status: row.submissionStatus.toLowerCase(), action: row.submissionStatus === 'ASSESSMENT_FAILED' ? 'Resolve assessment failure' : row.submissionStatus === 'ASSESSED' ? 'Review submission' : 'Release reviewed result', class: classProjection(row.activity.class), sortAt: row.updatedAt })),
        ...result.repositories.filter((row) => row.projectTask).map((row) => ({ id: row.id, kind: 'repository', title: row.projectTask!.title, projectTaskId: row.projectTask!.id, status: 'ready_for_review', action: 'Review repository', class: classProjection(row.projectTask!.class), sortAt: row.readyForReviewAt ?? row.updatedAt })),
      ].sort((a, b) => compareDateAndIdentity(a, b, true))
      response.json(listResponse(pageOf(rows, query.page, query.pageSize).map(({ sortAt: _sortAt, ...row }) => row), pagination(query.page, query.pageSize, result.total), request.requestId))
    } catch (error) { next(error) }
  })

  return router
}
