import { Prisma, type PrismaClient } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { parseBoundedCsv } from '../../shared/csv/preview-csv.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireActiveUser, requireAnyRole } from '../auth/auth.authorization.js'
import { normalizedEmailSchema } from '../auth/auth.schemas.js'

const params = z.object({ classId: z.uuid() }).strict()
const upload = z.object({ csv: z.string().min(1).max(262_144) }).strict()
const confirmation = upload.extend({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/) })

function rejected(code: string, statusCode = 409): never {
  throw new AppError({ statusCode, code, message: 'The student invitation import cannot proceed.' })
}

async function checkClass(tx: PrismaClient | Prisma.TransactionClient, classId: string, caller: { id: string; role: string }) {
  const record = await tx.class.findUnique({
    where: { id: classId },
    select: { status: true, instructorId: true, teachingStaff: { where: { instructorId: caller.id, status: 'ACTIVE' }, select: { id: true } } },
  })
  if (!record || (caller.role !== 'ADMIN' && record.instructorId !== caller.id && record.teachingStaff.length === 0)) rejected('CLASS_NOT_FOUND', 404)
  if (record.status !== 'ACTIVE') rejected('CLASS_NOT_ACTIVE')
}

async function preview(tx: PrismaClient | Prisma.TransactionClient, classId: string, csv: string) {
  const parsed = parseBoundedCsv(csv, ['email'], 100)
  const seen = new Set<string>()
  const rows = parsed.rows.map((columns, index) => {
    const email = columns.length === 1 ? (columns[0] ?? '').trim().toLowerCase() : ''
    const valid = normalizedEmailSchema.safeParse(email).success
    const result = { row: index + 2, email, status: !valid ? 'INVALID_EMAIL' : seen.has(email) ? 'DUPLICATE_ROW' : 'CHECKING' }
    seen.add(email)
    return result
  })
  const eligibleEmails = rows.filter((item) => item.status === 'CHECKING').map((item) => item.email)
  const users = eligibleEmails.length ? await tx.user.findMany({ where: { email: { in: eligibleEmails } }, select: { id: true, email: true, role: true, status: true, classMemberships: { where: { classId }, select: { status: true } }, classInvitationsReceived: { where: { classId, status: 'PENDING' }, select: { id: true } } } }) : []
  const byEmail = new Map(users.map((user) => [user.email, user]))
  const checked = rows.map((item) => {
    if (item.status !== 'CHECKING') return item
    const user = byEmail.get(item.email)
    if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE') return { ...item, status: 'INELIGIBLE_STUDENT' }
    if (user.classMemberships.some((member) => member.status === 'ACTIVE')) return { ...item, status: 'ALREADY_MEMBER' }
    if (user.classInvitationsReceived.length) return { ...item, status: 'ALREADY_PENDING' }
    return { ...item, status: user.classMemberships.some((member) => member.status === 'REMOVED') ? 'WILL_REACTIVATE_ON_ACCEPTANCE' : 'READY' }
  })
  return { fingerprint: parsed.fingerprint, rows: checked, valid: checked.every((item) => ['READY', 'WILL_REACTIVATE_ON_ACCEPTANCE', 'ALREADY_MEMBER', 'ALREADY_PENDING'].includes(item.status)), ready: checked.filter((item) => item.status === 'READY' || item.status === 'WILL_REACTIVATE_ON_ACCEPTANCE').length }
}

export function createClassInvitationImportRouter(dependencies: { prisma: PrismaClient; requireAuthentication: RequestHandler; requireCsrf: RequestHandler }): Router {
  const { prisma } = dependencies
  const router = Router()
  const mutation = [requireJson, dependencies.requireAuthentication, requireActiveUser, requireAnyRole(['ADMIN', 'INSTRUCTOR']), dependencies.requireCsrf]

  router.post('/:classId/invitations/import/preview', ...mutation, async (request, response, next) => {
    try {
      const { classId } = parseRequest(params, request.params)
      const { csv } = parseRequest(upload, request.body)
      await checkClass(prisma, classId, request.auth!.user)
      response.json(successResponse(await preview(prisma, classId, csv), request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/:classId/invitations/import/confirm', ...mutation, async (request, response, next) => {
    try {
      const { classId } = parseRequest(params, request.params)
      const { csv, fingerprint } = parseRequest(confirmation, request.body)
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "class_id" FROM "classes" WHERE "class_id" = ${classId}::uuid FOR UPDATE`
        await checkClass(tx, classId, request.auth!.user)
        const checked = await preview(tx, classId, csv)
        if (checked.fingerprint !== fingerprint || !checked.valid) rejected('INVITATION_IMPORT_REPREVIEW_REQUIRED')
        const emails = checked.rows.filter((item) => item.status === 'READY' || item.status === 'WILL_REACTIVATE_ON_ACCEPTANCE').map((item) => item.email)
        const users = emails.length ? await tx.user.findMany({ where: { email: { in: emails }, role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } }) : []
        if (users.length !== emails.length) rejected('INVITATION_IMPORT_REPREVIEW_REQUIRED')
        if (users.length) await tx.classInvitation.createMany({ data: users.map((user) => ({ classId, inviteeId: user.id, invitedById: request.auth!.user.id, status: 'PENDING' as const })) })
        return { invited: users.length, alreadyMember: checked.rows.filter((item) => item.status === 'ALREADY_MEMBER').length, alreadyPending: checked.rows.filter((item) => item.status === 'ALREADY_PENDING').length }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  })
  return router
}
