import { z } from 'zod'

const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value))
const titleSchema = z.string().trim().min(1).max(200)
const instructionsSchema = z.string().trim().min(1).max(20_000)

export const classProjectTaskParamsSchema = z.object({ classId: z.uuid() }).strict()
export const projectTaskParamsSchema = z.object({ projectTaskId: z.uuid() }).strict()

export const createProjectTaskSchema = z
  .object({
    title: titleSchema,
    instructions: instructionsSchema,
    dueDate: timestampSchema,
    maxTeamSize: z.number().int().min(2).max(8),
  })
  .strict()

export const updateProjectTaskSchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    title: titleSchema.optional(),
    instructions: instructionsSchema.optional(),
    dueDate: timestampSchema.optional(),
    maxTeamSize: z.number().int().min(2).max(8).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedUpdatedAt'),
    'At least one project-task field is required.',
  )

export const projectTaskTransitionSchema = z
  .object({ expectedUpdatedAt: timestampSchema })
  .strict()

export const projectTaskListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  })
  .strict()

export type CreateProjectTaskInput = z.infer<typeof createProjectTaskSchema>
export type UpdateProjectTaskInput = z.infer<typeof updateProjectTaskSchema>
export type ProjectTaskTransitionInput = z.infer<typeof projectTaskTransitionSchema>
export type ProjectTaskListQuery = z.infer<typeof projectTaskListQuerySchema>
