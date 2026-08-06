import { z } from 'zod'
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
} from './admin-audit.js'

export const adminUserParamsSchema = z.object({ userId: z.uuid() }).strict()

export const adminReasonSchema = z
  .string()
  .trim()
  .min(ADMIN_REASON_MIN_LENGTH)
  .max(ADMIN_REASON_MAX_LENGTH)

export const revokeUserSessionsSchema = z
  .object({ reason: adminReasonSchema })
  .strict()

export type RevokeUserSessionsInput = z.infer<typeof revokeUserSessionsSchema>
