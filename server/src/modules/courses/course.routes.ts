import { Prisma, type PrismaClient } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { parseBoundedCsv } from '../../shared/csv/preview-csv.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireActiveUser, requireAnyRole, requireRole } from '../auth/auth.authorization.js'

const courseFields = z.object({
  courseNumber: z.string().trim().min(1).max(40),
  courseName: z.string().trim().min(1).max(200),
}).strict()
const csvBody = z.object({ csv: z.string().min(1).max(262_144) }).strict()
const confirmBody = csvBody.extend({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/) })
const courseParams = z.object({ courseId: z.uuid() }).strict()

function normalizedNumber(value: string): string { return value.trim().replace(/\s+/g, ' ').toUpperCase() }
function conflict(): never { throw new AppError({ statusCode: 409, code: 'COURSE_NUMBER_EXISTS', message: 'A Course with this number already exists.' }) }

async function preview(prisma: PrismaClient | Prisma.TransactionClient, csv: string) {
  const parsed = parseBoundedCsv(csv, ['courseNumber', 'courseName'], 500)
  const seen = new Set<string>()
  const rows = parsed.rows.map((columns, index) => {
    const candidate = columns.length === 2 ? courseFields.safeParse({ courseNumber: normalizedNumber(columns[0] ?? ''), courseName: columns[1] }) : null
    const courseNumber = candidate?.success ? candidate.data.courseNumber : columns[0] ?? ''
    const reason = !candidate?.success ? 'INVALID_ROW' : seen.has(courseNumber) ? 'DUPLICATE_ROW' : null
    seen.add(courseNumber)
    return { row: index + 2, courseNumber, courseName: candidate?.success ? candidate.data.courseName : columns[1] ?? '', reason }
  })
  const numbers = rows.filter((item) => !item.reason).map((item) => item.courseNumber)
  const existing = numbers.length ? await prisma.course.findMany({ where: { courseNumber: { in: numbers } }, select: { courseNumber: true } }) : []
  const existingNumbers = new Set(existing.map((item) => item.courseNumber))
  const checked = rows.map((item) => ({ ...item, reason: item.reason ?? (existingNumbers.has(item.courseNumber) ? 'COURSE_ALREADY_EXISTS' : null) }))
  return { fingerprint: parsed.fingerprint, valid: checked.every((item) => !item.reason), rows: checked, count: checked.length }
}

export function createCourseRouter(dependencies: { prisma: PrismaClient; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }): Router {
  const { prisma } = dependencies
  const router = Router()
  const mutation = [requireJson, dependencies.requireAuthentication, requireActiveUser, requireRole('ADMIN'), dependencies.requireCsrf]

  router.get('/', dependencies.requireAuthentication, requireActiveUser, requireAnyRole(['ADMIN', 'INSTRUCTOR']), async (request, response, next) => {
    try {
      const query = parseRequest(z.object({ search: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50) }).strict(), request.query)
      const where: Prisma.CourseWhereInput = query.search ? { OR: [{ courseNumber: { contains: query.search, mode: 'insensitive' } }, { courseName: { contains: query.search, mode: 'insensitive' } }] } : {}
      const [items, totalItems] = await prisma.$transaction([
        prisma.course.findMany({ where, orderBy: [{ courseNumber: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        prisma.course.count({ where }),
      ])
      response.json(successResponse({ items, totalItems, page: query.page, pageSize: query.pageSize }, request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/', ...mutation, async (request, response, next) => {
    try {
      const input = parseRequest(courseFields, request.body)
      const course = await prisma.course.create({ data: { courseNumber: normalizedNumber(input.courseNumber), courseName: input.courseName } }).catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') conflict()
        throw error
      })
      response.status(201).json(successResponse(course, request.requestId))
    } catch (error) { next(error) }
  })

  router.patch('/:courseId', ...mutation, async (request, response, next) => {
    try {
      const { courseId } = parseRequest(courseParams, request.params)
      const input = parseRequest(courseFields, request.body)
      const course = await prisma.course.update({ where: { id: courseId }, data: { courseNumber: normalizedNumber(input.courseNumber), courseName: input.courseName } }).catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') conflict()
        throw error
      })
      response.json(successResponse(course, request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/import/preview', ...mutation, async (request, response, next) => {
    try {
      const { csv } = parseRequest(csvBody, request.body)
      response.json(successResponse(await preview(prisma, csv), request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/import/confirm', ...mutation, async (request, response, next) => {
    try {
      const { csv, fingerprint } = parseRequest(confirmBody, request.body)
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(1948293702) IS NULL AS acquired`
        const checked = await preview(tx, csv)
        if (checked.fingerprint !== fingerprint || !checked.valid) {
          throw new AppError({ statusCode: 409, code: 'COURSE_IMPORT_REPREVIEW_REQUIRED', message: 'The Course import needs a fresh preview.' })
        }
        await tx.course.createMany({ data: checked.rows.map((item) => ({ courseNumber: item.courseNumber, courseName: item.courseName })) })
        return { imported: checked.rows.length }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  })

  return router
}
