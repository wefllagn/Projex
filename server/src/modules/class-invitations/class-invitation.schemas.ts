import { z } from 'zod'
import { normalizedEmailSchema } from '../auth/auth.schemas.js'

export const classInvitationParamsSchema = z
  .object({ invitationId: z.uuid() })
  .strict()

export const classInvitationClassParamsSchema = z
  .object({ classId: z.uuid() })
  .strict()

export const classInvitationLookupSchema = z
  .object({
    universityEmail: normalizedEmailSchema,
    classId: z.uuid().optional(),
  })
  .strict()

export const createClassInvitationSchema = z
  .object({ universityEmail: normalizedEmailSchema })
  .strict()

export const classInvitationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export type ClassInvitationLookupInput = z.infer<
  typeof classInvitationLookupSchema
>
export type CreateClassInvitationInput = z.infer<
  typeof createClassInvitationSchema
>
export type ClassInvitationListQuery = z.infer<
  typeof classInvitationListQuerySchema
>
