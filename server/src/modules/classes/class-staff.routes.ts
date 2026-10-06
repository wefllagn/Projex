import { Prisma, type PrismaClient } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { successResponse } from '../../shared/http/response.js'
import { parseRequest } from '../../shared/http/validation.js'
import { requireJson } from '../../middleware/require-json.js'
import { requireActiveUser, requireAnyRole, requireRole } from '../auth/auth.authorization.js'
import { normalizedEmailSchema } from '../auth/auth.schemas.js'
import { adminReasonSchema } from '../admin/admin.schemas.js'

const classParams = z.object({ classId: z.uuid() }).strict()
const staffParams = z.object({ classId: z.uuid(), instructorId: z.uuid() }).strict()
const inviteBody = z.object({ universityEmail: normalizedEmailSchema }).strict()
const transferBody = z.object({ nextPrimaryId: z.uuid(), formerPrimary: z.enum(['CO_INSTRUCTOR', 'LEAVE']) }).strict()
const assignmentBody = transferBody.extend({ reason: adminReasonSchema, expectedUpdatedAt: z.iso.datetime({ offset: true }).optional() })
const emptyBody = z.object({}).strict()

function failure(code: string, statusCode = 409): never {
  throw new AppError({ statusCode, code, message: 'The class staff action is not available.' })
}

async function lockClass(tx: Prisma.TransactionClient, classId: string) {
  await tx.$queryRaw`SELECT "class_id" FROM "classes" WHERE "class_id" = ${classId}::uuid FOR UPDATE`
  return tx.class.findUnique({ where: { id: classId }, select: { id: true, instructorId: true, status: true, updatedAt: true } })
}

async function lockAccountStatus(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(1948293701) IS NULL AS acquired`
}

async function recordEvent(tx: Prisma.TransactionClient, classId: string, actorId: string, subjectInstructorId: string, action: string, details?: Prisma.InputJsonValue) {
  await tx.classStaffEvent.create({ data: { classId, actorId, subjectInstructorId, action, ...(details ? { detailsJson: details } : {}) } })
}

export function createClassStaffRouter(dependencies: {
  prisma: PrismaClient
  requireAuthentication: RequestHandler
  requireCsrf: RequestHandler
}): Router {
  const { prisma } = dependencies
  const router = Router()
  const mutation = [requireJson, dependencies.requireAuthentication, requireActiveUser, dependencies.requireCsrf]

  router.get('/staff-invitations', dependencies.requireAuthentication, requireActiveUser, requireRole('INSTRUCTOR'), async (request, response, next) => {
    try {
      const records = await prisma.classTeachingStaff.findMany({
        where: { instructorId: request.auth!.user.id, status: 'INVITED', class: { status: 'ACTIVE' } },
        select: { id: true, classId: true, createdAt: true, class: { select: { className: true, instructor: { select: { fullName: true } } } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 100,
      })
      response.json(successResponse(records, request.requestId))
    } catch (error) { next(error) }
  })

  router.get('/:classId/staff', dependencies.requireAuthentication, requireActiveUser, requireAnyRole(['INSTRUCTOR', 'ADMIN']), async (request, response, next) => {
    try {
      const { classId } = parseRequest(classParams, request.params)
      const record = await prisma.class.findUnique({
        where: { id: classId },
        select: { instructorId: true, instructor: { select: { id: true, fullName: true } }, teachingStaff: { where: { status: 'ACTIVE' }, select: { instructorId: true, instructor: { select: { fullName: true } } } } },
      })
      if (!record) failure('CLASS_NOT_FOUND', 404)
      const caller = request.auth!.user
      if (caller.role !== 'ADMIN' && record.instructorId !== caller.id && !record.teachingStaff.some((item) => item.instructorId === caller.id)) failure('CLASS_NOT_FOUND', 404)
      response.json(successResponse({ primary: record.instructor, coInstructors: record.teachingStaff.map((item) => ({ userId: item.instructorId, fullName: item.instructor.fullName })) }, request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/:classId/staff/invitations', ...mutation, requireRole('INSTRUCTOR'), async (request, response, next) => {
    try {
      const { classId } = parseRequest(classParams, request.params)
      const { universityEmail } = parseRequest(inviteBody, request.body)
      const caller = request.auth!.user
      const result = await prisma.$transaction(async (tx) => {
        await lockAccountStatus(tx)
        const record = await lockClass(tx, classId)
        if (!record || record.instructorId !== caller.id) failure('CLASS_NOT_FOUND', 404)
        const activeCaller = await tx.user.findUnique({ where: { id: caller.id }, select: { role: true, status: true } })
        if (activeCaller?.role !== 'INSTRUCTOR' || activeCaller.status !== 'ACTIVE') failure('CLASS_NOT_FOUND', 404)
        if (record.status !== 'ACTIVE') failure('CLASS_NOT_ACTIVE')
        const target = await tx.user.findUnique({ where: { email: universityEmail }, select: { id: true, role: true, status: true } })
        if (!target || target.role !== 'INSTRUCTOR' || target.status !== 'ACTIVE' || target.id === caller.id) failure('ELIGIBLE_INSTRUCTOR_NOT_FOUND', 404)
        const existing = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId: target.id } } })
        if (existing && existing.status !== 'REMOVED') failure('STAFF_ALREADY_INVITED_OR_ACTIVE')
        const invitation = existing
          ? await tx.classTeachingStaff.update({ where: { id: existing.id }, data: { status: 'INVITED', invitedById: caller.id, acceptedAt: null, removedAt: null, createdAt: new Date() }, select: { id: true, createdAt: true } })
          : await tx.classTeachingStaff.create({ data: { classId, instructorId: target.id, invitedById: caller.id }, select: { id: true, createdAt: true } })
        await recordEvent(tx, classId, caller.id, target.id, 'CO_INVITED')
        return invitation
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.status(201).json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/:classId/staff/invitations/accept', ...mutation, requireRole('INSTRUCTOR'), async (request, response, next) => {
    try {
      const { classId } = parseRequest(classParams, request.params)
      parseRequest(emptyBody, request.body)
      const caller = request.auth!.user
      const result = await prisma.$transaction(async (tx) => {
        await lockAccountStatus(tx)
        const record = await lockClass(tx, classId)
        if (!record || record.status !== 'ACTIVE') failure('CLASS_NOT_FOUND', 404)
        const activeCaller = await tx.user.findUnique({ where: { id: caller.id }, select: { role: true, status: true } })
        if (activeCaller?.role !== 'INSTRUCTOR' || activeCaller.status !== 'ACTIVE') failure('STAFF_INVITATION_NOT_FOUND', 404)
        const invitation = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId: caller.id } } })
        if (!invitation || invitation.status !== 'INVITED' || record.instructorId === caller.id) failure('STAFF_INVITATION_NOT_FOUND', 404)
        const updated = await tx.classTeachingStaff.update({ where: { id: invitation.id }, data: { status: 'ACTIVE', acceptedAt: new Date() }, select: { id: true, status: true } })
        await recordEvent(tx, classId, caller.id, caller.id, 'CO_ACCEPTED')
        return updated
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  })

  async function transfer(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2], administrative: boolean) {
    try {
      const { classId } = parseRequest(classParams, request.params)
      const input = administrative ? parseRequest(assignmentBody, request.body) : parseRequest(transferBody, request.body)
      const caller = request.auth!.user
      const result = await prisma.$transaction(async (tx) => {
        await lockAccountStatus(tx)
        const record = await lockClass(tx, classId)
        if (!record) failure('CLASS_NOT_FOUND', 404)
        const activeCaller = await tx.user.findUnique({ where: { id: caller.id }, select: { role: true, status: true } })
        if (activeCaller?.status !== 'ACTIVE' || activeCaller.role !== (administrative ? 'ADMIN' : 'INSTRUCTOR')) failure('CLASS_NOT_FOUND', 404)
        if (!administrative && (record.status !== 'ACTIVE' || record.instructorId !== caller.id)) failure('CLASS_NOT_FOUND', 404)
        if (record.status === 'ARCHIVED') failure('CLASS_ARCHIVED')
        if ('expectedUpdatedAt' in input && typeof input.expectedUpdatedAt === 'string' && record.updatedAt.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) failure('STALE_CLASS_VERSION')
        const nextInstructor = await tx.user.findUnique({ where: { id: input.nextPrimaryId }, select: { role: true, status: true } })
        if (!nextInstructor || nextInstructor.role !== 'INSTRUCTOR' || nextInstructor.status !== 'ACTIVE') failure('ELIGIBLE_INSTRUCTOR_NOT_FOUND', 404)
        if (record.instructorId === input.nextPrimaryId) failure('ALREADY_PRIMARY')
        const nextStaff = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId: input.nextPrimaryId } } })
        if (!administrative && nextStaff?.status !== 'ACTIVE') failure('CO_INSTRUCTOR_REQUIRED')
        if (nextStaff && nextStaff.status !== 'REMOVED') await tx.classTeachingStaff.update({ where: { id: nextStaff.id }, data: { status: 'REMOVED', removedAt: new Date() } })
        if (record.instructorId) {
          const former = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId: record.instructorId } } })
          if (input.formerPrimary === 'CO_INSTRUCTOR') {
            const formerUser = await tx.user.findUnique({ where: { id: record.instructorId }, select: { role: true, status: true } })
            if (formerUser?.role !== 'INSTRUCTOR' || formerUser.status !== 'ACTIVE') failure('FORMER_PRIMARY_NOT_ACTIVE')
            await tx.classTeachingStaff.upsert({ where: { classId_instructorId: { classId, instructorId: record.instructorId } }, update: { status: 'ACTIVE', invitedById: caller.id, acceptedAt: new Date(), removedAt: null }, create: { classId, instructorId: record.instructorId, invitedById: caller.id, status: 'ACTIVE', acceptedAt: new Date() } })
          } else if (former && former.status !== 'REMOVED') {
            await tx.classTeachingStaff.update({ where: { id: former.id }, data: { status: 'REMOVED', removedAt: new Date() } })
          }
        }
        const updated = await tx.class.update({ where: { id: classId }, data: { instructorId: input.nextPrimaryId, ...(record.status === 'PREPARED' ? { status: 'ACTIVE', classCodeActive: true, classCodeChangedAt: new Date() } : {}) }, select: { id: true, instructorId: true, status: true, updatedAt: true } })
        await recordEvent(tx, classId, caller.id, input.nextPrimaryId, administrative ? 'ADMIN_PRIMARY_ASSIGNED' : 'PRIMARY_TRANSFERRED', { formerPrimaryId: record.instructorId, formerPrimaryDisposition: input.formerPrimary, ...(administrative && 'reason' in input && typeof input.reason === 'string' ? { reason: input.reason } : {}) })
        return updated
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse(result, request.requestId))
    } catch (error) { next(error) }
  }

  router.post('/:classId/staff/transfer', ...mutation, requireRole('INSTRUCTOR'), (request, response, next) => transfer(request, response, next, false))
  router.post('/:classId/staff/admin-assign-primary', ...mutation, requireRole('ADMIN'), (request, response, next) => transfer(request, response, next, true))

  router.post('/:classId/staff/leave', ...mutation, requireRole('INSTRUCTOR'), async (request, response, next) => {
    try {
      const { classId } = parseRequest(classParams, request.params)
      parseRequest(emptyBody, request.body)
      const caller = request.auth!.user
      await prisma.$transaction(async (tx) => {
        const record = await lockClass(tx, classId)
        if (!record || record.status !== 'ACTIVE' || record.instructorId === caller.id) failure('PRIMARY_MUST_TRANSFER_FIRST')
        const staff = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId: caller.id } } })
        if (!staff || staff.status !== 'ACTIVE') failure('CLASS_NOT_FOUND', 404)
        await tx.classTeachingStaff.update({ where: { id: staff.id }, data: { status: 'REMOVED', removedAt: new Date() } })
        await recordEvent(tx, classId, caller.id, caller.id, 'CO_LEFT')
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse({ left: true }, request.requestId))
    } catch (error) { next(error) }
  })

  router.post('/:classId/staff/:instructorId/remove', ...mutation, requireAnyRole(['INSTRUCTOR', 'ADMIN']), async (request, response, next) => {
    try {
      const { classId, instructorId } = parseRequest(staffParams, request.params)
      parseRequest(emptyBody, request.body)
      const caller = request.auth!.user
      await prisma.$transaction(async (tx) => {
        const record = await lockClass(tx, classId)
        if (!record || record.status !== 'ACTIVE' || (caller.role !== 'ADMIN' && record.instructorId !== caller.id)) failure('CLASS_NOT_FOUND', 404)
        if (record.instructorId === instructorId) failure('PRIMARY_MUST_TRANSFER_FIRST')
        const staff = await tx.classTeachingStaff.findUnique({ where: { classId_instructorId: { classId, instructorId } } })
        if (!staff || staff.status === 'REMOVED') failure('CLASS_STAFF_NOT_FOUND', 404)
        await tx.classTeachingStaff.update({ where: { id: staff.id }, data: { status: 'REMOVED', removedAt: new Date() } })
        await recordEvent(tx, classId, caller.id, instructorId, 'CO_REMOVED')
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      response.json(successResponse({ removed: true }, request.requestId))
    } catch (error) { next(error) }
  })

  return router
}
