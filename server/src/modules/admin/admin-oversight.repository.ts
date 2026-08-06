import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  AdminActivityQuery,
  AdminAuditEventQuery,
  AdminClassQuery,
  AdminExecutionJobQuery,
  AdminGitCredentialQuery,
  AdminProjectTaskQuery,
  AdminProvisioningJobQuery,
  AdminRepositoryQuery,
  AdminSubmissionQuery,
} from './admin-oversight.schemas.js'

const safeUserSelect = { id: true, fullName: true, email: true } as const
const safeClassSelect = {
  id: true,
  className: true,
  section: true,
  semester: true,
  schoolYear: true,
  status: true,
} as const

function page(query: { page: number; pageSize: number }) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize }
}

export function createPrismaAdminOversightRepository(prisma: PrismaClient) {
  return {
    async overview(now: Date) {
      const [
        usersByRole,
        usersByStatus,
        setupPendingUsers,
        classesByStatus,
        membershipsByStatus,
        activitiesByStatus,
        submissionsByStatus,
        projectTasksByStatus,
        teamsByStatus,
        repositoriesByType,
        repositoriesByStatus,
        repositoriesByStorageStatus,
        repositoriesByReviewStatus,
        executionJobsByStatus,
        provisioningJobsByStatus,
        activeCredentials,
        expiredCredentials,
        revokedCredentials,
        storage,
      ] = await prisma.$transaction([
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.user.findMany({
          where: { status: 'SETUP_PENDING' },
          select: {
            accountSetupTokens: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { expiresAt: true, usedAt: true, invalidatedAt: true },
            },
          },
        }),
        prisma.class.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.classMember.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.programmingActivity.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.activitySubmission.groupBy({ by: ['submissionStatus'], _count: { _all: true } }),
        prisma.projectTask.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.team.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.repository.groupBy({ by: ['repositoryType'], _count: { _all: true } }),
        prisma.repository.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.repository.groupBy({ by: ['storageStatus'], _count: { _all: true } }),
        prisma.repository.groupBy({ by: ['reviewStatus'], _count: { _all: true } }),
        prisma.executionJob.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.repositoryProvisioningJob.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.gitCredential.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
        prisma.gitCredential.count({ where: { revokedAt: null, expiresAt: { lte: now } } }),
        prisma.gitCredential.count({ where: { revokedAt: { not: null } } }),
        prisma.repository.aggregate({
          _count: { _all: true, storageSizeBytes: true },
          _sum: { storageSizeBytes: true },
        }),
      ])
      return {
        usersByRole,
        usersByStatus,
        setupPendingUsers,
        classesByStatus,
        membershipsByStatus,
        activitiesByStatus,
        submissionsByStatus,
        projectTasksByStatus,
        teamsByStatus,
        repositoriesByType,
        repositoriesByStatus,
        repositoriesByStorageStatus,
        repositoriesByReviewStatus,
        executionJobsByStatus,
        provisioningJobsByStatus,
        credentials: { active: activeCredentials, expired: expiredCredentials, revoked: revokedCredentials },
        storage,
      }
    },

    async listClasses(query: AdminClassQuery) {
      const where: Prisma.ClassWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.instructorId ? { instructorId: query.instructorId } : {}),
        ...(query.search ? { OR: [
          { className: { contains: query.search, mode: 'insensitive' } },
          { section: { contains: query.search, mode: 'insensitive' } },
          { semester: { contains: query.search, mode: 'insensitive' } },
          { schoolYear: { contains: query.search, mode: 'insensitive' } },
        ] } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.class.findMany({
          where,
          select: {
            ...safeClassSelect,
            createdAt: true,
            updatedAt: true,
            archivedAt: true,
            instructor: { select: safeUserSelect },
            members: { select: { status: true } },
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.class.count({ where }),
      ])
      return { items, totalItems }
    },

    async listActivities(query: AdminActivityQuery) {
      const where: Prisma.ProgrammingActivityWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.language ? { language: query.language } : {}),
        ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.programmingActivity.findMany({
          where,
          select: {
            id: true, title: true, status: true, language: true, dueDate: true,
            totalPoints: true, maxAttempts: true, createdAt: true, updatedAt: true,
            publishedAt: true, closedAt: true, archivedAt: true,
            class: { select: safeClassSelect },
            createdBy: { select: safeUserSelect },
            testCases: { select: { points: true } },
            _count: { select: { submissions: true } },
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.programmingActivity.count({ where }),
      ])
      return { items, totalItems }
    },

    async listSubmissions(query: AdminSubmissionQuery) {
      const where: Prisma.ActivitySubmissionWhereInput = {
        ...(query.status ? { submissionStatus: query.status } : {}),
        ...(query.activityId ? { activityId: query.activityId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.classId ? { activity: { classId: query.classId } } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.activitySubmission.findMany({
          where,
          select: {
            id: true, attemptNumber: true, submissionStatus: true, isLate: true,
            submittedAt: true, updatedAt: true, reviewedAt: true, releasedAt: true,
            releasedFinalScore: true,
            student: { select: safeUserSelect },
            activity: { select: { id: true, title: true, status: true, class: { select: safeClassSelect } } },
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.activitySubmission.count({ where }),
      ])
      return { items, totalItems }
    },

    async listProjectTasks(query: AdminProjectTaskQuery) {
      const where: Prisma.ProjectTaskWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.projectTask.findMany({
          where,
          select: {
            id: true, title: true, dueDate: true, maxTeamSize: true, status: true,
            createdAt: true, updatedAt: true, publishedAt: true, closedAt: true, archivedAt: true,
            class: { select: safeClassSelect },
            createdBy: { select: safeUserSelect },
            _count: { select: { teams: true, repositories: true, invitations: true } },
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.projectTask.count({ where }),
      ])
      return { items, totalItems }
    },

    async listRepositories(query: AdminRepositoryQuery) {
      const where: Prisma.RepositoryWhereInput = {
        ...(query.repositoryType ? { repositoryType: query.repositoryType } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.storageStatus ? { storageStatus: query.storageStatus } : {}),
        ...(query.reviewStatus ? { reviewStatus: query.reviewStatus } : {}),
        ...(query.ownerId ? { ownerId: query.ownerId } : {}),
        ...(query.projectTaskId ? { projectTaskId: query.projectTaskId } : {}),
        ...(query.search ? { OR: [
          { repositoryName: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ] } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.repository.findMany({
          where,
          select: {
            id: true, repositoryType: true, repositoryName: true, slug: true,
            visibility: true, status: true, reviewStatus: true, storageStatus: true,
            storageSizeBytes: true, createdAt: true, updatedAt: true, provisionedAt: true,
            storageVerifiedAt: true, readyForReviewAt: true, approvedAt: true, archivedAt: true,
            owner: { select: safeUserSelect },
            projectTask: { select: { id: true, title: true, status: true, class: { select: safeClassSelect } } },
            team: { select: { id: true, name: true, status: true, leadStudentId: true } },
            _count: { select: { members: true, invitations: true } },
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.repository.count({ where }),
      ])
      return { items, totalItems }
    },

    async storageSummary() {
      const [grouped, aggregate] = await prisma.$transaction([
        prisma.repository.groupBy({ by: ['storageStatus'], _count: { _all: true } }),
        prisma.repository.aggregate({
          _count: { _all: true, storageSizeBytes: true },
          _sum: { storageSizeBytes: true },
        }),
      ])
      return { grouped, aggregate }
    },

    async queueObservations(now: Date) {
      const [execution, provisioning] = await prisma.$transaction([
        prisma.executionJob.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.repositoryProvisioningJob.groupBy({ by: ['status'], _count: { _all: true } }),
      ])
      const [stuckExecution, stuckProvisioning] = await prisma.$transaction([
        prisma.executionJob.count({ where: { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] } }),
        prisma.repositoryProvisioningJob.count({ where: { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] } }),
      ])
      return { execution, provisioning, stuckExecution, stuckProvisioning }
    },

    async listExecutionJobs(query: AdminExecutionJobQuery, now: Date) {
      const stuckWhere: Prisma.ExecutionJobWhereInput | undefined = query.stuck === undefined ? undefined : query.stuck
        ? { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }
        : { NOT: { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] } }
      const where: Prisma.ExecutionJobWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.jobType ? { jobType: query.jobType } : {}),
        ...(query.submissionId ? { submissionId: query.submissionId } : {}),
        ...(query.practiceExecutionId ? { practiceExecutionId: query.practiceExecutionId } : {}),
        ...(stuckWhere ? { AND: [stuckWhere] } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.executionJob.findMany({
          where,
          select: {
            id: true, jobType: true, submissionId: true, practiceExecutionId: true,
            status: true, claimAttempt: true, maxClaimAttempts: true, availableAt: true,
            claimedAt: true, leaseExpiresAt: true, completedAt: true, lastFailureCode: true,
            createdAt: true, updatedAt: true,
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.executionJob.count({ where }),
      ])
      return { items, totalItems }
    },

    async listProvisioningJobs(query: AdminProvisioningJobQuery, now: Date) {
      const stuckWhere: Prisma.RepositoryProvisioningJobWhereInput | undefined = query.stuck === undefined ? undefined : query.stuck
        ? { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }
        : { NOT: { status: 'RUNNING', OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] } }
      const where: Prisma.RepositoryProvisioningJobWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.repositoryId ? { repositoryId: query.repositoryId } : {}),
        ...(stuckWhere ? { AND: [stuckWhere] } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.repositoryProvisioningJob.findMany({
          where,
          select: {
            id: true, repositoryId: true, status: true, claimAttempt: true,
            maxClaimAttempts: true, availableAt: true, claimedAt: true,
            leaseExpiresAt: true, completedAt: true, lastFailureCode: true,
            createdAt: true, updatedAt: true,
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.repositoryProvisioningJob.count({ where }),
      ])
      return { items, totalItems }
    },

    async listGitCredentials(query: AdminGitCredentialQuery, now: Date) {
      const lifecycleWhere: Prisma.GitCredentialWhereInput = query.lifecycle === 'ACTIVE'
        ? { revokedAt: null, expiresAt: { gt: now } }
        : query.lifecycle === 'EXPIRED'
          ? { revokedAt: null, expiresAt: { lte: now } }
          : query.lifecycle === 'REVOKED'
            ? { revokedAt: { not: null } }
            : {}
      const where: Prisma.GitCredentialWhereInput = {
        ...lifecycleWhere,
        ...(query.operation ? { allowedOperations: { has: query.operation } } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.repositoryId ? { repositoryId: query.repositoryId } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.gitCredential.findMany({
          where,
          select: {
            id: true, userId: true, repositoryId: true, allowedOperations: true,
            createdAt: true, expiresAt: true, lastUsedAt: true, revokedAt: true,
          },
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.gitCredential.count({ where }),
      ])
      return { items, totalItems }
    },

    async listAuditEvents(query: AdminAuditEventQuery) {
      const where: Prisma.AdminAuditEventWhereInput = {
        ...(query.actorAdminId ? { actorAdminId: query.actorAdminId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
      }
      const [items, totalItems] = await prisma.$transaction([
        prisma.adminAuditEvent.findMany({
          where,
          select: {
            id: true, action: true, targetType: true, targetId: true, reason: true,
            requestId: true, metadataJson: true, createdAt: true,
            actorAdmin: { select: safeUserSelect },
          },
          orderBy: [{ createdAt: query.sortOrder }, { id: 'asc' }],
          ...page(query),
        }),
        prisma.adminAuditEvent.count({ where }),
      ])
      return { items, totalItems }
    },
  }
}

export type AdminOversightRepository = ReturnType<typeof createPrismaAdminOversightRepository>
