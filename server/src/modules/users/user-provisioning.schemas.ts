import { z } from 'zod'
import { normalizedEmailSchema } from '../auth/auth.schemas.js'
import { adminReasonSchema } from '../admin/admin.schemas.js'

export const provisionStudentSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    universityEmail: normalizedEmailSchema,
    classId: z.uuid().optional(),
  })
  .strict()

export const provisionInstructorSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    universityEmail: normalizedEmailSchema,
  })
  .strict()

export const userIdParamsSchema = z.object({ userId: z.uuid() }).strict()

export const updateUserStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    reason: adminReasonSchema,
    expectedUpdatedAt: z.coerce.date(),
  })
  .strict()

export type ProvisionStudentInput = z.infer<typeof provisionStudentSchema>
export type ProvisionInstructorInput = z.infer<typeof provisionInstructorSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
