import { Router, type RequestHandler } from 'express'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'
import { parseRequest } from '../../shared/http/validation.js'
import { successResponse } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { selectCreditedReleasedAttempt } from '../submissions/submission-credit.js'

export const GRADEBOOK_PERIODS = ['PRELIM', 'MIDTERM', 'FINAL', 'UNASSIGNED'] as const
function unavailable(): never {
  throw new AppError({ statusCode: 404, code: 'CLASS_NOT_FOUND', message: 'Class or Student record not found.' })
}

async function loadGradebook(prisma: PrismaClient, caller: SafeUserProfile, classId: string, studentId?: string) {
  if (caller.status !== 'ACTIVE' || !['INSTRUCTOR', 'STUDENT'].includes(caller.role) || caller.role === 'STUDENT' && studentId && studentId !== caller.id) unavailable()
  return prisma.$transaction(async tx => {
    const memberId = caller.role === 'STUDENT' ? caller.id : studentId
    const cls = await tx.class.findUnique({ where: { id: classId }, select: {
      id: true, className: true, instructorId: true,
      teachingStaff: { where: { instructorId: caller.id, status: 'ACTIVE' }, select: { id: true } },
      members: { where: { status: 'ACTIVE', ...(memberId ? { studentId: memberId } : {}) }, orderBy: [{ student: { fullName: 'asc' } }, { studentId: 'asc' }], select: { student: { select: { id: true, fullName: true } } } },
    } })
    const instructor = caller.role === 'INSTRUCTOR' && (cls?.instructorId === caller.id || Boolean(cls?.teachingStaff.length))
    const student = caller.role === 'STUDENT' && cls?.members.some(row => row.student.id === caller.id)
    if (!cls || (!instructor && !student) || studentId && !cls.members.length) unavailable()
    // Previously published/archived Activities remain evidence in their original period.
    const activities = await tx.programmingActivity.findMany({ where: { classId, publishedAt: { not: null } }, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], select: { id: true, title: true, dueDate: true, gradingMode: true, gradingPeriod: true, creditPolicy: true, totalPoints: true } })
    const submissions = await tx.activitySubmission.findMany({ where: { activityId: { in: activities.map(row => row.id) }, studentId: { in: cls.members.map(row => row.student.id) } }, select: { id: true, studentId: true, activityId: true, attemptNumber: true, submissionStatus: true, releasedFinalScore: true, totalPointsSnapshot: true }, orderBy: { attemptNumber: 'desc' } })
    return { classId, className: cls.className, viewerRole: caller.role, members: cls.members, activities, submissions }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
type GradebookData = Awaited<ReturnType<typeof loadGradebook>>
function attemptStatus(status: string): string {
  if (status === 'ASSESSED') return 'AWAITING_REVIEW'
  if (status === 'REVIEWED') return 'REVIEWED_UNRELEASED'
  if (status === 'ASSESSMENT_FAILED') return 'FAILED_ASSESSMENT'
  if (status === 'FAILED_RESOLVED') return 'FAILURE_RESOLVED'
  if (status === 'RELEASED') return 'RELEASED'
  return 'PENDING'
}
function buildScores(data: GradebookData, studentId: string, now: Date) {
  const byActivity = new Map<string, GradebookData['submissions']>()
  for (const row of data.submissions) if (row.studentId === studentId) byActivity.set(row.activityId, [...(byActivity.get(row.activityId) ?? []), row])
  return data.activities.map(activity => {
    const attempts = byActivity.get(activity.id) ?? []
    const latest = attempts[0]
    const graded = activity.gradingMode !== 'COMPLETION'
    const credited = graded ? selectCreditedReleasedAttempt(activity.creditPolicy, attempts.filter(row => row.submissionStatus === 'RELEASED' && row.releasedFinalScore !== null).map(row => ({ ...row, releasedFinalScore: Number(row.releasedFinalScore) }))) : null
    const outstanding = credited ? attempts.find(row => row.submissionStatus !== 'RELEASED' && (activity.creditPolicy === 'HIGHEST' || row.attemptNumber > credited.attemptNumber)) : null
    const status = credited ? 'RELEASED' : latest ? attemptStatus(latest.submissionStatus) : activity.dueDate <= now ? 'MISSING' : 'NOT_SUBMITTED'
    return { activityId: activity.id, title: activity.title, period: activity.gradingPeriod ?? 'UNASSIGNED', gradingMode: activity.gradingMode, activityPossible: graded ? Number(activity.totalPoints) : null,
      status, earned: credited?.releasedFinalScore ?? null, possible: credited ? Number(credited.totalPointsSnapshot) : null,
      attemptNumber: credited?.attemptNumber ?? latest?.attemptNumber ?? null, submissionId: latest?.id ?? null, creditedSubmissionId: credited?.id ?? null,
      latestAttemptStatus: latest ? attemptStatus(latest.submissionStatus) : null, outstandingSubmissionId: outstanding?.id ?? null, outstandingAttemptStatus: outstanding ? attemptStatus(outstanding.submissionStatus) : null, hasUnreleasedAttempt: Boolean(outstanding), completionState: graded ? null : latest ? 'COMPLETE' : 'NOT_SUBMITTED' }
  })
}
type Score = ReturnType<typeof buildScores>[number]
function summarize(period: string, scores: Score[]) {
  const graded = scores.filter(score => score.period === period && score.gradingMode !== 'COMPLETION')
  const released = graded.filter(score => score.earned !== null && score.possible !== null)
  const earned = released.reduce((sum, score) => sum + Math.round(score.earned! * 100), 0) / 100
  const possible = released.reduce((sum, score) => sum + Math.round(score.possible! * 100), 0) / 100
  const outstandingAttemptCount = graded.filter(score => score.hasUnreleasedAttempt).length
  return { period, earned, possible, percentage: possible > 0 ? Math.round(earned / possible * 10000) / 100 : null,
    releasedCount: released.length, activityCount: graded.length, ungradedCount: scores.filter(score => score.period === period && score.gradingMode === 'COMPLETION').length,
    outstandingAttemptCount, provisional: released.length < graded.length || outstandingAttemptCount > 0 }
}
export async function readGradebookOverview(prisma: PrismaClient, caller: SafeUserProfile, classId: string, now = new Date()) {
  const data = await loadGradebook(prisma, caller, classId)
  return { classId, className: data.className, viewerRole: data.viewerRole, rows: data.members.map(({ student }) => {
    const scores = buildScores(data, student.id, now)
    return { studentId: student.id, fullName: student.fullName, periods: GRADEBOOK_PERIODS.map(period => summarize(period, scores)) }
  }) }
}
export async function readGradebookStudent(prisma: PrismaClient, caller: SafeUserProfile, classId: string, studentId: string, now = new Date()) {
  const data = await loadGradebook(prisma, caller, classId, studentId)
  const student = data.members[0]!.student
  const scores = buildScores(data, student.id, now)
  return { classId, className: data.className, viewerRole: data.viewerRole, studentId: student.id, fullName: student.fullName,
    periods: GRADEBOOK_PERIODS.map(period => ({ ...summarize(period, scores), activities: scores.filter(score => score.period === period) })) }
}
/** Compatibility projection for existing period clients. */
export async function readGradebook(prisma: PrismaClient, caller: SafeUserProfile, classId: string, period: string, now = new Date()) {
  const data = await loadGradebook(prisma, caller, classId)
  const activities = data.activities.filter(row => (row.gradingPeriod ?? 'UNASSIGNED') === period)
  return { classId, className: data.className, period, activities: activities.map(row => ({ id: row.id, title: row.title, gradingMode: row.gradingMode, totalPoints: row.gradingMode === 'COMPLETION' ? null : Number(row.totalPoints), creditPolicy: row.creditPolicy })), rows: data.members.map(({ student }) => {
    const scores = buildScores(data, student.id, now).filter(row => row.period === period)
    const total = summarize(period, scores)
    return { studentId: student.id, fullName: student.fullName, scores: scores.map(score => ({ ...score, status: score.gradingMode === 'COMPLETION' ? 'UNGRADED' : ['AWAITING_REVIEW', 'REVIEWED_UNRELEASED'].includes(score.status) ? 'UNRELEASED' : score.status })), earned: total.earned, possible: total.possible, percentage: total.percentage }
  }) }
}
export function createGradebookRouter({ prisma, requireAuthentication }: { prisma: PrismaClient; requireAuthentication: RequestHandler }) {
  const router = Router()
  const params = z.object({ classId: z.uuid() }).strict()
  router.get('/classes/:classId/gradebook/overview', requireAuthentication, async (request, response, next) => {
    try { const { classId } = parseRequest(params, request.params); parseRequest(z.object({}).strict(), request.query); response.setHeader('Cache-Control', 'no-store'); response.json(successResponse(await readGradebookOverview(prisma, request.auth!.user, classId), request.requestId)) } catch (error) { next(error) }
  })
  router.get('/classes/:classId/gradebook/students/:studentId', requireAuthentication, async (request, response, next) => {
    try { const { classId, studentId } = parseRequest(z.object({ classId: z.uuid(), studentId: z.uuid() }).strict(), request.params); parseRequest(z.object({}).strict(), request.query); response.setHeader('Cache-Control', 'no-store'); response.json(successResponse(await readGradebookStudent(prisma, request.auth!.user, classId, studentId), request.requestId)) } catch (error) { next(error) }
  })
  router.get('/classes/:classId/gradebook', requireAuthentication, async (request, response, next) => {
    try { const { classId } = parseRequest(params, request.params); const { period } = parseRequest(z.object({ period: z.enum(GRADEBOOK_PERIODS).default('PRELIM') }).strict(), request.query); response.setHeader('Cache-Control', 'no-store'); response.json(successResponse(await readGradebook(prisma, request.auth!.user, classId, period), request.requestId)) } catch (error) { next(error) }
  })
  return router
}
