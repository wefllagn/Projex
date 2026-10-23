import { Prisma, type PrismaClient } from '@prisma/client'

export interface InstructorReviewQuery {
  page: number; pageSize: number; state: 'to-review' | 'reviewed'; classId?: string; search?: string
}

// Read-only Activity aggregation. Accepted attempts and current assigned students
// are different units; neither automated assessment nor release is called review.
export async function listInstructorReviewActivities(prisma: PrismaClient, instructorId: string, query: InstructorReviewQuery) {
  const reviewed: Prisma.ActivitySubmissionWhereInput = { OR: [
    { submissionStatus: { in: ['REVIEWED', 'RELEASED'] } },
    { submissionStatus: 'FAILED_RESOLVED', reviewedAt: { not: null } },
  ] }
  const pending: Prisma.ActivitySubmissionWhereInput = { NOT: reviewed }
  const where: Prisma.ProgrammingActivityWhereInput = {
    status: { in: ['PUBLISHED', 'CLOSED'] },
    class: { status: 'ACTIVE', OR: [{ instructorId }, { teachingStaff: { some: { instructorId, status: 'ACTIVE' } } }] },
    ...(query.classId ? { classId: query.classId } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.state === 'reviewed'
      ? { AND: [{ submissions: { some: reviewed } }, { submissions: { none: pending } }] }
      : { OR: [{ submissions: { none: {} } }, { submissions: { some: pending } }] }),
  }
  return prisma.$transaction(async tx => {
    const [activities, totalItems] = await Promise.all([
      tx.programmingActivity.findMany({ where, select: {
        id: true, title: true, dueDate: true, gradingMode: true, status: true,
        class: { select: { id: true, className: true, section: true } },
      }, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.programmingActivity.count({ where }),
    ])
    const ids = activities.map(row => row.id)
    const classIds = [...new Set(activities.map(row => row.class.id))]
    const [attemptCounts, assignedCounts] = ids.length ? await Promise.all([
      tx.activitySubmission.groupBy({ by: ['activityId'], where: { activityId: { in: ids } }, _count: { _all: true, reviewedAt: true, releasedAt: true } }),
      tx.classMember.groupBy({ by: ['classId'], where: { classId: { in: classIds }, status: 'ACTIVE', student: { role: 'STUDENT', status: 'ACTIVE' } }, _count: { _all: true } }),
    ]) : [[], []]
    const attempts = new Map(attemptCounts.map(row => [row.activityId, row._count]))
    const assigned = new Map(assignedCounts.map(row => [row.classId, row._count._all]))
    const totalPages = Math.ceil(totalItems / query.pageSize)
    return {
      rows: activities.map(row => ({ id: row.id, title: row.title, dueDate: row.dueDate, gradingMode: row.gradingMode, status: row.status, class: { id: row.class.id, className: row.class.className, section: row.class.section },
        submittedAttempts: attempts.get(row.id)?._all ?? 0,
        reviewedAttempts: attempts.get(row.id)?.reviewedAt ?? 0,
        releasedAttempts: attempts.get(row.id)?.releasedAt ?? 0,
        assignedStudents: assigned.get(row.class.id) ?? 0,
      })),
      pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 },
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
