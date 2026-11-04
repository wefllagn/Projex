import type { Prisma } from '@prisma/client'

export const practiceBranch = (id: string) => `practice/${id}`

export function officialPracticeComplete(maxAttempts: number, attempts: Array<{ countsTowardAttemptLimit: boolean; submissionStatus: string; gradingModeSnapshot: string; releasedAt: Date | null; releasedFinalScore: unknown; feedback: { releasedAt: Date | null } | null }>, replacementAvailable: boolean) {
  const final = attempts[0] // repository orders by attemptNumber descending, independently of credited score
  return !replacementAvailable && attempts.filter(a => a.countsTowardAttemptLimit).length >= maxAttempts
    && attempts.every(a => ['RELEASED', 'FAILED_RESOLVED'].includes(a.submissionStatus))
    && Boolean(final && final.gradingModeSnapshot === 'GRADED' && final.submissionStatus === 'RELEASED'
      && final.releasedAt && final.releasedFinalScore !== null && final.feedback?.releasedAt)
}

export async function practiceEligible(tx: Prisma.TransactionClient, activityId: string, studentId: string) {
  const activity = await tx.programmingActivity.findFirst({ where: { id: activityId,
    status: { in: ['PUBLISHED', 'CLOSED'] }, class: { status: 'ACTIVE', members: { some: { studentId, status: 'ACTIVE', student: { role: 'STUDENT', status: 'ACTIVE' } } } },
    workspaceRepositories: { none: { ownerId: studentId, OR: [{ status: { not: 'ACTIVE' } }, { members: { none: { studentId, status: 'ACTIVE', memberRole: 'OWNER' } } }] } },
  }, select: { maxAttempts: true, submissions: { where: { studentId }, orderBy: { attemptNumber: 'desc' }, select: { countsTowardAttemptLimit: true, submissionStatus: true, gradingModeSnapshot: true, releasedAt: true, releasedFinalScore: true, feedback: { select: { releasedAt: true } } } } } })
  if (!activity) return false
  const replacement = await tx.submissionFailureResolution.findFirst({ where: { resolutionType: 'REPLACEMENT_GRANTED', replacementSubmissionId: null, replacementExpiresAt: { gt: new Date() }, failedSubmission: { activityId, studentId } }, select: { id: true } })
  return officialPracticeComplete(activity.maxAttempts, activity.submissions, Boolean(replacement))
}

// Fence lifecycle and membership changes through publication/execution admission.
export async function lockPracticePolicy(tx: Prisma.TransactionClient, activityId: string, studentId: string) {
  await tx.$queryRaw`SELECT a.activity_id FROM programming_activities a JOIN classes c ON c.class_id = a.class_id JOIN users u ON u.user_id = ${studentId}::uuid JOIN class_members cm ON cm.class_id = c.class_id AND cm.student_id = u.user_id WHERE a.activity_id = ${activityId}::uuid FOR SHARE OF a,c,u,cm`
  await tx.$queryRaw`SELECT r.repository_id FROM repositories r JOIN repository_members rm ON rm.repository_id = r.repository_id AND rm.student_id = ${studentId}::uuid WHERE r.activity_id = ${activityId}::uuid AND r.owner_id = ${studentId}::uuid FOR SHARE OF r,rm`
  await tx.$queryRaw`SELECT submission_id FROM activity_submissions WHERE activity_id = ${activityId}::uuid AND student_id = ${studentId}::uuid FOR SHARE`
  await tx.$queryRaw`SELECT r.failure_resolution_id FROM submission_failure_resolutions r JOIN activity_submissions s ON s.submission_id = r.failed_submission_id WHERE s.activity_id = ${activityId}::uuid AND s.student_id = ${studentId}::uuid FOR SHARE OF r`
  await tx.$queryRaw`SELECT f.feedback_id FROM submission_feedback f JOIN activity_submissions s ON s.submission_id = f.submission_id WHERE s.activity_id = ${activityId}::uuid AND s.student_id = ${studentId}::uuid FOR SHARE OF f`
}
