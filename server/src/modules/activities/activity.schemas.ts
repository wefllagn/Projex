import { z } from 'zod'

const titleSchema = z.string().trim().min(1).max(200)
const instructionsSchema = z.string().trim().min(1).max(20_000)
const entryClassNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, 'Entry class name must be a Java identifier.')
const starterCodeSchema = z
  .string()
  .max(100_000)
  .refine((value) => value.trim().length > 0, 'Starter code is required.')
const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value))
const pointsSchema = z
  .number()
  .positive()
  .max(1_000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    'Points may have at most two decimal places.',
  )

export const classActivityParamsSchema = z.object({ classId: z.uuid() }).strict()
export const activityIdParamsSchema = z.object({ activityId: z.uuid() }).strict()

export const createActivitySchema = z
  .object({
    title: titleSchema,
    instructions: instructionsSchema,
    dueDate: timestampSchema,
    language: z.literal('JAVA').default('JAVA'),
    entryClassName: entryClassNameSchema.default('Main'),
    starterCode: starterCodeSchema,
    maxAttempts: z.number().int().min(1).max(3),
    totalPoints: pointsSchema,
  })
  .strict()

export const updateActivitySchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    title: titleSchema.optional(),
    instructions: instructionsSchema.optional(),
    dueDate: timestampSchema.optional(),
    language: z.literal('JAVA').optional(),
    entryClassName: entryClassNameSchema.optional(),
    starterCode: starterCodeSchema.optional(),
    maxAttempts: z.number().int().min(1).max(3).optional(),
    totalPoints: pointsSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedUpdatedAt'),
    'At least one activity field is required.',
  )

export const activityTransitionSchema = z
  .object({ expectedUpdatedAt: timestampSchema })
  .strict()

export const activityListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  })
  .strict()

export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>
export type ActivityTransitionInput = z.infer<typeof activityTransitionSchema>
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>
