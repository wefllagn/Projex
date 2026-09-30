import { Prisma, type PrismaClient } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { requireJson } from '../../middleware/require-json.js'
import { adminReasonSchema } from '../admin/admin.schemas.js'
import { requireActiveUser, requireRole } from '../auth/auth.authorization.js'

const params = z.object({ classId: z.uuid() }).strict()
const text = (max: number) => z.string().trim().min(1).max(max)
const body = z.object({
  courseId: z.uuid(),
  officialClassCode: text(100),
  academicPeriod: z.enum(['FIRST_SEMESTER', 'SECOND_SEMESTER']),
  schoolYear: text(20),
  schedule: text(200).nullable().optional(),
  days: text(100).nullable().optional(),
  room: text(100).nullable().optional(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  acknowledgeHistory: z.boolean(),
  reason: adminReasonSchema,
}).strict()

function error(code: string, statusCode = 409): never {
  throw new AppError({ statusCode, code, message: 'Official metadata could not be changed.' })
}

async function historyCounts(tx: Prisma.TransactionClient | PrismaClient, classId: string) {
  const [memberships, activities, projectTasks, submissions, repositories] = await Promise.all([
    tx.classMember.count({ where: { classId } }),
    tx.programmingActivity.count({ where: { classId } }),
    tx.projectTask.count({ where: { classId } }),
    tx.activitySubmission.count({ where: { activity: { classId } } }),
    tx.repository.count({ where: { projectTask: { classId } } }),
  ])
  return { memberships, activities, projectTasks, submissions, repositories }
}

export function createOfficialMetadataRouter(dependencies: { prisma: PrismaClient; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }): Router {
  const { prisma } = dependencies
  const router = Router()
  const admin = [dependencies.requireAuthentication, requireActiveUser, requireRole('ADMIN')]

  router.get('/:classId/official-metadata-impact', ...admin, async (request, response, next) => {
    try {
      const { classId } = parseRequest(params, request.params)
      const record = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, status: true, updatedAt: true, courseNumberSnapshot: true, courseNameSnapshot: true, officialClassCode: true, academicPeriod: true, schoolYear: true } })
      if (!record) error('CLASS_NOT_FOUND', 404)
      response.json(successResponse({ class: record, history: await historyCounts(prisma, classId) }, request.requestId))
    } catch (cause) { next(cause) }
  })

  router.patch('/:classId/official-metadata', requireJson, ...admin, dependencies.requireCsrf, async (request, response, next) => {
    try {
      const { classId } = parseRequest(params, request.params)
      const input = parseRequest(body, request.body)
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "class_id" FROM "classes" WHERE "class_id" = ${classId}::uuid FOR UPDATE`
        const existing = await tx.class.findUnique({ where: { id: classId }, select: { id: true, status: true, updatedAt: true, courseId: true, courseNumberSnapshot: true, courseNameSnapshot: true, officialClassCode: true, academicPeriod: true, schoolYear: true, schedule: true, days: true, room: true } })
        if (!existing) error('CLASS_NOT_FOUND', 404)
        if (existing.status === 'ARCHIVED') error('CLASS_ARCHIVED')
        if (existing.updatedAt.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) error('STALE_CLASS_VERSION')
        const course = await tx.course.findUnique({ where: { id: input.courseId }, select: { courseNumber: true, courseName: true } })
        if (!course) error('COURSE_NOT_FOUND', 404)
        const history = await historyCounts(tx, classId)
        if (Object.values(history).some((count) => count > 0) && !input.acknowledgeHistory) error('HISTORY_ACKNOWLEDGMENT_REQUIRED')
        const result = await tx.class.update({ where: { id: classId }, data: {
          courseId: input.courseId,
          courseNumberSnapshot: course.courseNumber,
          courseNameSnapshot: course.courseName,
          officialClassCode: input.officialClassCode,
          academicPeriod: input.academicPeriod,
          schoolYear: input.schoolYear,
          ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
          ...(input.days !== undefined ? { days: input.days } : {}),
          ...(input.room !== undefined ? { room: input.room } : {}),
        }, select: { id: true, updatedAt: true, courseId: true, courseNumberSnapshot: true, courseNameSnapshot: true, officialClassCode: true, academicPeriod: true, schoolYear: true, schedule: true, days: true, room: true } })
        await tx.adminAuditEvent.create({ data: {
          actorAdminId: request.auth!.user.id,
          action: 'CLASS_OFFICIAL_METADATA_CORRECTED', targetType: 'CLASS', targetId: classId,
          requestId: request.requestId, reason: input.reason,
          metadataJson: { before: { courseId: existing.courseId, courseNumber: existing.courseNumberSnapshot, courseName: existing.courseNameSnapshot, officialClassCode: existing.officialClassCode, academicPeriod: existing.academicPeriod, schoolYear: existing.schoolYear }, after: { courseId: result.courseId, courseNumber: result.courseNumberSnapshot, courseName: result.courseNameSnapshot, officialClassCode: result.officialClassCode, academicPeriod: result.academicPeriod, schoolYear: result.schoolYear }, historyPresent: Object.values(history).some((count) => count > 0) },
        } })
        return result
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse(updated, request.requestId))
    } catch (cause) { next(cause) }
  })

  return router
}
