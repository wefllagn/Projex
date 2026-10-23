import { Router, type RequestHandler } from 'express'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { selectCreditedReleasedAttempt } from '../submissions/submission-credit.js'

export async function readGradebook(prisma: PrismaClient, caller: SafeUserProfile, classId: string, period: string, now = new Date()) {
  return prisma.$transaction(async tx => {
    const classRecord = await tx.class.findUnique({ where: { id: classId }, select: {
      id: true, className: true, instructorId: true,
      teachingStaff: { where: { instructorId: caller.id, status: 'ACTIVE' }, select: { id: true } },
      members: { where: { status: 'ACTIVE', ...(caller.role === 'STUDENT' ? { studentId: caller.id } : {}) }, select: { student: { select: { id: true, fullName: true } } } },
    } })
    const instructor = caller.role === 'INSTRUCTOR' && (classRecord?.instructorId === caller.id || Boolean(classRecord?.teachingStaff.length))
    const student = caller.role === 'STUDENT' && classRecord?.members.some(row => row.student.id === caller.id)
    if (caller.status !== 'ACTIVE' || !classRecord || (!instructor && !student)) throw new AppError({ statusCode: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found.' })
    const activities = await tx.programmingActivity.findMany({ where: { classId, publishedAt: { not: null }, gradingPeriod: period === 'UNASSIGNED' ? null : period }, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], select: { id: true, title: true, dueDate: true, gradingMode: true, creditPolicy: true, totalPoints: true } })
    const submissions = await tx.activitySubmission.findMany({ where: { activityId: { in: activities.map(row => row.id) }, studentId: { in: classRecord.members.map(row => row.student.id) } }, select: { id: true, studentId: true, activityId: true, attemptNumber: true, submissionStatus: true, releasedFinalScore: true, totalPointsSnapshot: true } })
    const rows = classRecord.members.map(({ student: member }) => {
      let earned = 0, possible = 0
      const scores = activities.map(activity => {
        const attempts = submissions.filter(row => row.activityId === activity.id && row.studentId === member.id)
        if (activity.gradingMode === 'COMPLETION') return { activityId: activity.id, status: 'UNGRADED', completionState: attempts.length ? 'COMPLETE' : 'NOT_SUBMITTED', earned: null, possible: null }
        const credited = selectCreditedReleasedAttempt(activity.creditPolicy, attempts.filter(row => row.submissionStatus === 'RELEASED' && row.releasedFinalScore !== null).map(row => ({ ...row, releasedFinalScore: Number(row.releasedFinalScore) })))
        if (credited) {
          earned += credited.releasedFinalScore; possible += Number(credited.totalPointsSnapshot)
          return { activityId: activity.id, status: 'RELEASED', earned: credited.releasedFinalScore, possible: Number(credited.totalPointsSnapshot), attemptNumber: credited.attemptNumber, hasUnreleasedAttempt: attempts.some(row => row.submissionStatus !== 'RELEASED') }
        }
        const status = attempts.some(row => ['ASSESSED', 'REVIEWED'].includes(row.submissionStatus)) ? 'UNRELEASED' : attempts.length ? 'PENDING' : activity.dueDate <= now ? 'MISSING' : 'NOT_SUBMITTED'
        return { activityId: activity.id, status, earned: null, possible: null }
      })
      earned = Math.round(earned * 100) / 100; possible = Math.round(possible * 100) / 100
      return { studentId: member.id, fullName: member.fullName, scores, earned, possible, percentage: possible > 0 ? Math.round(earned / possible * 10000) / 100 : null }
    })
    return { classId, className: classRecord.className, period, activities: activities.map(row => ({ id: row.id, title: row.title, gradingMode: row.gradingMode, totalPoints: row.gradingMode === 'COMPLETION' ? null : Number(row.totalPoints), creditPolicy: row.creditPolicy })), rows }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export function createGradebookRouter({ prisma, requireAuthentication }: { prisma: PrismaClient; requireAuthentication: RequestHandler }) {
  const router = Router()
  router.get('/classes/:classId/gradebook', requireAuthentication, async (request, response, next) => {
    try {
      const { classId } = parseRequest(z.object({ classId: z.uuid() }).strict(), request.params)
      const { period } = parseRequest(z.object({ period: z.enum(['PRELIM', 'MIDTERM', 'FINAL', 'UNASSIGNED']).default('PRELIM') }).strict(), request.query)
      response.setHeader('Cache-Control', 'no-store')
      response.json(successResponse(await readGradebook(prisma, request.auth!.user, classId, period), request.requestId))
    } catch (error) { next(error) }
  })
  return router
}
