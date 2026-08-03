import { z } from 'zod'

export const userDirectoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).optional(),
    status: z
      .enum(['SETUP_PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'])
      .optional(),
  })
  .strict()

export const userDirectoryParamsSchema = z
  .object({ userId: z.uuid() })
  .strict()

export type UserDirectoryQuery = z.infer<typeof userDirectoryQuerySchema>
