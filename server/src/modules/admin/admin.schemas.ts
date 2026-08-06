import { z } from 'zod'
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
} from './admin-audit.js'

export const adminUserParamsSchema = z.object({ userId: z.uuid() }).strict()
export const adminGitCredentialParamsSchema = z.object({ credentialId: z.uuid() }).strict()
export const adminProvisioningJobParamsSchema = z.object({ jobId: z.uuid() }).strict()

export const adminReasonSchema = z
  .string()
  .trim()
  .min(ADMIN_REASON_MIN_LENGTH)
  .max(ADMIN_REASON_MAX_LENGTH)

export const revokeUserSessionsSchema = z
  .object({ reason: adminReasonSchema })
  .strict()

export const revokeAdminGitCredentialSchema = z
  .object({ reason: adminReasonSchema })
  .strict()

export const retryRepositoryProvisioningJobSchema = z
  .object({
    reason: adminReasonSchema,
    expectedUpdatedAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  })
  .strict()

export type RevokeUserSessionsInput = z.infer<typeof revokeUserSessionsSchema>
export type RevokeAdminGitCredentialInput = z.infer<typeof revokeAdminGitCredentialSchema>
export type RetryRepositoryProvisioningJobInput = z.infer<typeof retryRepositoryProvisioningJobSchema>
