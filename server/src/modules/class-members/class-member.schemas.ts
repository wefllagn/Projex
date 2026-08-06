import { z } from 'zod'
import { adminReasonSchema } from '../admin/admin.schemas.js'

export const classMemberParamsSchema = z
  .object({
    classId: z.uuid(),
    memberId: z.uuid(),
  })
  .strict()

export const classRosterParamsSchema = z.object({ classId: z.uuid() }).strict()

export const classRosterQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()

export const updateClassMemberSchema = z
  .object({
    status: z.enum(['ACTIVE', 'REMOVED']),
    reason: adminReasonSchema.optional(),
    expectedUpdatedAt: z.coerce.date().optional(),
  })
  .strict()

export type ClassRosterQuery = z.infer<typeof classRosterQuerySchema>
export type UpdateClassMemberInput = z.infer<typeof updateClassMemberSchema>
