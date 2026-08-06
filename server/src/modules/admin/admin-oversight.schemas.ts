import { z } from 'zod'

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}

const search = z.string().trim().min(1).max(200).optional()
const uuid = z.uuid().optional()

export const adminClassQuerySchema = z.object({
  ...pagination,
  search,
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  instructorId: uuid,
  sortBy: z.enum(['createdAt', 'updatedAt', 'className']).default('createdAt'),
}).strict()

export const adminActivityQuerySchema = z.object({
  ...pagination,
  search,
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  classId: uuid,
  language: z.enum(['JAVA']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'title']).default('createdAt'),
}).strict()

export const adminSubmissionQuerySchema = z.object({
  ...pagination,
  status: z.enum(['QUEUED', 'ASSESSING', 'ASSESSED', 'ASSESSMENT_FAILED', 'REVIEWED', 'RELEASED', 'FAILED_RESOLVED']).optional(),
  classId: uuid,
  activityId: uuid,
  studentId: uuid,
  sortBy: z.enum(['submittedAt', 'updatedAt']).default('submittedAt'),
}).strict()

export const adminProjectTaskQuerySchema = z.object({
  ...pagination,
  search,
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  classId: uuid,
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'title']).default('createdAt'),
}).strict()

export const adminRepositoryQuerySchema = z.object({
  ...pagination,
  search,
  repositoryType: z.enum(['CLASS_PROJECT', 'PERSONAL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  storageStatus: z.enum(['PENDING', 'PROVISIONING', 'READY', 'FAILED', 'QUARANTINED']).optional(),
  reviewStatus: z.enum(['WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']).optional(),
  ownerId: uuid,
  projectTaskId: uuid,
  sortBy: z.enum(['createdAt', 'updatedAt', 'repositoryName', 'storageSizeBytes']).default('createdAt'),
}).strict()

const stuck = z.enum(['true', 'false']).transform((value) => value === 'true').optional()

export const adminExecutionJobQuerySchema = z.object({
  ...pagination,
  status: z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']).optional(),
  jobType: z.enum(['OFFICIAL_ASSESSMENT', 'VISIBLE_TEST_RUN']).optional(),
  submissionId: uuid,
  practiceExecutionId: uuid,
  stuck,
  sortBy: z.enum(['createdAt', 'updatedAt', 'availableAt']).default('createdAt'),
}).strict()

export const adminProvisioningJobQuerySchema = z.object({
  ...pagination,
  status: z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']).optional(),
  repositoryId: uuid,
  stuck,
  sortBy: z.enum(['createdAt', 'updatedAt', 'availableAt']).default('createdAt'),
}).strict()

export const adminGitCredentialQuerySchema = z.object({
  ...pagination,
  lifecycle: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
  operation: z.enum(['READ', 'WRITE']).optional(),
  userId: uuid,
  repositoryId: uuid,
  sortBy: z.enum(['createdAt', 'expiresAt']).default('createdAt'),
}).strict()

export const adminAuditEventQuerySchema = z.object({
  ...pagination,
  actorAdminId: uuid,
  targetId: uuid,
  action: z.enum([
    'USER_STUDENT_PROVISIONED', 'USER_INSTRUCTOR_PROVISIONED', 'USER_SETUP_REISSUED',
    'USER_STATUS_CHANGED', 'USER_SESSIONS_REVOKED', 'CLASS_CREATED', 'CLASS_UPDATED',
    'CLASS_ARCHIVED', 'CLASS_RESTORED', 'CLASS_JOIN_CODE_ROTATED',
    'CLASS_JOIN_CODE_REVOKED', 'CLASS_MEMBER_REMOVED', 'CLASS_MEMBER_REACTIVATED',
    'GIT_CREDENTIAL_REVOKED', 'REPOSITORY_PROVISIONING_RETRY_QUEUED',
  ]).optional(),
  targetType: z.enum([
    'USER', 'CLASS', 'CLASS_MEMBER', 'GIT_CREDENTIAL', 'REPOSITORY_PROVISIONING_JOB',
  ]).optional(),
}).strict()

export type AdminClassQuery = z.infer<typeof adminClassQuerySchema>
export type AdminActivityQuery = z.infer<typeof adminActivityQuerySchema>
export type AdminSubmissionQuery = z.infer<typeof adminSubmissionQuerySchema>
export type AdminProjectTaskQuery = z.infer<typeof adminProjectTaskQuerySchema>
export type AdminRepositoryQuery = z.infer<typeof adminRepositoryQuerySchema>
export type AdminExecutionJobQuery = z.infer<typeof adminExecutionJobQuerySchema>
export type AdminProvisioningJobQuery = z.infer<typeof adminProvisioningJobQuerySchema>
export type AdminGitCredentialQuery = z.infer<typeof adminGitCredentialQuerySchema>
export type AdminAuditEventQuery = z.infer<typeof adminAuditEventQuerySchema>
