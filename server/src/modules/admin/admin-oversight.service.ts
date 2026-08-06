import type { Prisma } from '@prisma/client'
import type { DatabaseHealth } from '../../infrastructure/database/prisma.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminOversightRepository } from './admin-oversight.repository.js'
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

function forbidden(): AppError {
  return new AppError({
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'You are not authorized to perform this action.',
  })
}

function requireActiveAdmin(caller: SafeUserProfile): void {
  if (caller.role !== 'ADMIN' || caller.status !== 'ACTIVE') throw forbidden()
}

function pagination(query: { page: number; pageSize: number }, totalItems: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / query.pageSize)
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1 && totalPages > 0,
  }
}

function grouped<T extends string>(
  rows: Array<Record<T, string> & { _count: { _all: number } }>,
  key: T,
): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row[key], row._count._all]))
}

function memberCounts(rows: Array<{ status: string }>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) result[row.status] = (result[row.status] ?? 0) + 1
  return result
}

function sanitizeFailureCode(value: string | null): string | null {
  if (value === null) return null
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : 'INTERNAL_FAILURE'
}

function isStuck(status: string, leaseExpiresAt: Date | null, now: Date): boolean {
  return status === 'RUNNING' && (leaseExpiresAt === null || leaseExpiresAt <= now)
}

function isObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === 'object'
}

function stringValue(object: Prisma.JsonObject, key: string): string | undefined {
  return typeof object[key] === 'string' ? object[key] : undefined
}

function booleanValue(object: Prisma.JsonObject, key: string): boolean | undefined {
  return typeof object[key] === 'boolean' ? object[key] : undefined
}

function numberValue(object: Prisma.JsonObject, key: string): number | undefined {
  return typeof object[key] === 'number' && Number.isSafeInteger(object[key]) && object[key] >= 0
    ? object[key]
    : undefined
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const userStatuses = new Set(['SETUP_PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'])

function safeAuditMetadata(action: string, value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || !isObject(value)) return null
  switch (action) {
    case 'USER_STUDENT_PROVISIONED':
    case 'USER_INSTRUCTOR_PROVISIONED': {
      const provisionedRole = stringValue(value, 'provisionedRole')
      const initialClassAssigned = booleanValue(value, 'initialClassAssigned')
      return (provisionedRole === 'STUDENT' || provisionedRole === 'INSTRUCTOR') && initialClassAssigned !== undefined
        ? { provisionedRole, initialClassAssigned }
        : null
    }
    case 'USER_SETUP_REISSUED': {
      const setupState = stringValue(value, 'setupState')
      return setupState === 'SETUP_PENDING' ? { setupState } : null
    }
    case 'USER_STATUS_CHANGED': {
      const previousStatus = stringValue(value, 'previousStatus')
      const newStatus = stringValue(value, 'newStatus')
      const revokedSessionCount = numberValue(value, 'revokedSessionCount')
      return previousStatus && newStatus && userStatuses.has(previousStatus) && userStatuses.has(newStatus) && revokedSessionCount !== undefined
        ? { previousStatus, newStatus, revokedSessionCount }
        : null
    }
    case 'USER_SESSIONS_REVOKED': {
      const revokedSessionCount = numberValue(value, 'revokedSessionCount')
      return revokedSessionCount === undefined ? null : { revokedSessionCount }
    }
    case 'CLASS_CREATED': {
      const instructorId = stringValue(value, 'instructorId')
      return instructorId && uuidPattern.test(instructorId) ? { instructorId } : null
    }
    case 'CLASS_UPDATED':
    case 'CLASS_ARCHIVED':
    case 'CLASS_RESTORED':
    case 'CLASS_JOIN_CODE_ROTATED':
    case 'CLASS_JOIN_CODE_REVOKED': {
      const changed = booleanValue(value, 'changed')
      return changed === undefined ? null : { changed }
    }
    case 'CLASS_MEMBER_REMOVED':
    case 'CLASS_MEMBER_REACTIVATED': {
      const classId = stringValue(value, 'classId')
      const studentId = stringValue(value, 'studentId')
      const changed = booleanValue(value, 'changed')
      return classId && studentId && uuidPattern.test(classId) && uuidPattern.test(studentId) && changed !== undefined
        ? { classId, studentId, changed }
        : null
    }
    default:
      return null
  }
}

export function createAdminOversightService(dependencies: {
  repository: AdminOversightRepository
  databaseHealth: DatabaseHealth
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())

  return {
    async overview(caller: SafeUserProfile) {
      requireActiveAdmin(caller)
      const at = now()
      const result = await dependencies.repository.overview(at)
      const usersByStatus = grouped(result.usersByStatus, 'status')
      const setupPending = result.setupPendingUsers.filter(({ accountSetupTokens }) => {
        const token = accountSetupTokens[0]
        return token && token.usedAt === null && token.invalidatedAt === null && token.expiresAt > at
      }).length
      const totalUsers = result.usersByRole.reduce((sum, row) => sum + row._count._all, 0)
      const setupRequired = usersByStatus.SETUP_PENDING ?? 0
      return {
        generatedAt: at,
        users: {
          total: totalUsers,
          byRole: grouped(result.usersByRole, 'role'),
          byStatus: usersByStatus,
          accountSetup: {
            complete: totalUsers - setupRequired,
            pending: setupPending,
            actionRequired: setupRequired - setupPending,
          },
        },
        academics: {
          classesByStatus: grouped(result.classesByStatus, 'status'),
          membershipsByStatus: grouped(result.membershipsByStatus, 'status'),
          activitiesByStatus: grouped(result.activitiesByStatus, 'status'),
          submissionsByStatus: grouped(result.submissionsByStatus, 'submissionStatus'),
          projectTasksByStatus: grouped(result.projectTasksByStatus, 'status'),
          teamsByStatus: grouped(result.teamsByStatus, 'status'),
        },
        repositories: {
          byType: grouped(result.repositoriesByType, 'repositoryType'),
          byLifecycle: grouped(result.repositoriesByStatus, 'status'),
          byStorage: grouped(result.repositoriesByStorageStatus, 'storageStatus'),
          byReview: grouped(result.repositoriesByReviewStatus, 'reviewStatus'),
          knownMeasuredBytes: (result.storage._sum.storageSizeBytes ?? 0n).toString(),
          measuredRecords: result.storage._count.storageSizeBytes,
          unmeasuredRecords: result.storage._count._all - result.storage._count.storageSizeBytes,
        },
        operations: {
          executionJobsByStatus: grouped(result.executionJobsByStatus, 'status'),
          provisioningJobsByStatus: grouped(result.provisioningJobsByStatus, 'status'),
          gitCredentials: result.credentials,
        },
      }
    },

    async listClasses(caller: SafeUserProfile, query: AdminClassQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listClasses(query)
      return {
        items: result.items.map(({ members, ...item }) => ({ ...item, membershipCounts: memberCounts(members) })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listActivities(caller: SafeUserProfile, query: AdminActivityQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listActivities(query)
      return {
        items: result.items.map(({ testCases, _count, totalPoints, ...item }) => ({
          ...item,
          totalPoints: Number(totalPoints),
          testCaseCount: testCases.length,
          testCasePointTotal: testCases.reduce((sum, testCase) => sum + Number(testCase.points), 0),
          submissionCount: _count.submissions,
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listSubmissions(caller: SafeUserProfile, query: AdminSubmissionQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listSubmissions(query)
      return {
        items: result.items.map(({ releasedFinalScore, ...item }) => ({
          ...item,
          releasedScore: item.submissionStatus === 'RELEASED' && releasedFinalScore !== null
            ? Number(releasedFinalScore)
            : null,
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listProjectTasks(caller: SafeUserProfile, query: AdminProjectTaskQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listProjectTasks(query)
      return {
        items: result.items.map(({ _count, ...item }) => ({ ...item, counts: _count })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listRepositories(caller: SafeUserProfile, query: AdminRepositoryQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listRepositories(query)
      return {
        items: result.items.map(({ storageSizeBytes, _count, ...item }) => ({
          ...item,
          storageSizeBytes: storageSizeBytes?.toString() ?? null,
          counts: _count,
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async health(caller: SafeUserProfile) {
      requireActiveAdmin(caller)
      const at = now()
      try {
        await dependencies.databaseHealth.checkConnection()
      } catch {
        return {
          statusCode: 503,
          data: {
            api: { status: 'available' as const },
            database: { status: 'unavailable' as const },
            queues: { status: 'unavailable' as const, source: 'database_unavailable' as const },
            workerHealth: { status: 'not_observed' as const },
            timestamp: at,
          },
        }
      }
      try {
        const queues = await dependencies.repository.queueObservations(at)
        return { statusCode: 200, data: {
          api: { status: 'available' as const },
          database: { status: 'connected' as const },
          queues: {
            source: 'persisted_job_and_lease_state' as const,
            execution: { byStatus: grouped(queues.execution, 'status'), stuck: queues.stuckExecution },
            repositoryProvisioning: { byStatus: grouped(queues.provisioning, 'status'), stuck: queues.stuckProvisioning },
          },
          workerHealth: { status: 'not_observed' as const },
          timestamp: at,
        } }
      } catch {
        return {
          statusCode: 503,
          data: {
            api: { status: 'available' as const },
            database: { status: 'connected' as const },
            queues: { status: 'unavailable' as const, source: 'query_unavailable' as const },
            workerHealth: { status: 'not_observed' as const },
            timestamp: at,
          },
        }
      }
    },

    async storage(caller: SafeUserProfile) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.storageSummary()
      return {
        byStorageStatus: grouped(result.grouped, 'storageStatus'),
        knownMeasuredBytes: (result.aggregate._sum.storageSizeBytes ?? 0n).toString(),
        measuredRecords: result.aggregate._count.storageSizeBytes,
        unmeasuredRecords: result.aggregate._count._all - result.aggregate._count.storageSizeBytes,
      }
    },

    async listExecutionJobs(caller: SafeUserProfile, query: AdminExecutionJobQuery) {
      requireActiveAdmin(caller)
      const at = now()
      const result = await dependencies.repository.listExecutionJobs(query, at)
      return {
        items: result.items.map(({ lastFailureCode, ...item }) => ({
          ...item,
          failureCode: sanitizeFailureCode(lastFailureCode),
          stuck: isStuck(item.status, item.leaseExpiresAt, at),
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listProvisioningJobs(caller: SafeUserProfile, query: AdminProvisioningJobQuery) {
      requireActiveAdmin(caller)
      const at = now()
      const result = await dependencies.repository.listProvisioningJobs(query, at)
      return {
        items: result.items.map(({ lastFailureCode, ...item }) => ({
          ...item,
          failureCode: sanitizeFailureCode(lastFailureCode),
          stuck: isStuck(item.status, item.leaseExpiresAt, at),
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listGitCredentials(caller: SafeUserProfile, query: AdminGitCredentialQuery) {
      requireActiveAdmin(caller)
      const at = now()
      const result = await dependencies.repository.listGitCredentials(query, at)
      return {
        items: result.items.map((item) => ({
          ...item,
          lifecycle: item.revokedAt !== null ? 'REVOKED' : item.expiresAt <= at ? 'EXPIRED' : 'ACTIVE',
        })),
        pagination: pagination(query, result.totalItems),
      }
    },

    async listAuditEvents(caller: SafeUserProfile, query: AdminAuditEventQuery) {
      requireActiveAdmin(caller)
      const result = await dependencies.repository.listAuditEvents(query)
      return {
        items: result.items.map(({ metadataJson, ...item }) => ({
          ...item,
          metadata: safeAuditMetadata(item.action, metadataJson),
        })),
        pagination: pagination(query, result.totalItems),
      }
    },
  }
}

export type AdminOversightService = ReturnType<typeof createAdminOversightService>
