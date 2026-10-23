import { z } from 'zod'
import { gradingPeriodSchema, rubricCriteriaSchema } from './activity-grading.js'
import { gradingConfigurationSchema } from './weighted-grading.js'

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
const creditPolicySchema = z.enum(['LATEST', 'HIGHEST'])

export const classActivityParamsSchema = z.object({ classId: z.uuid() }).strict()
export const activityIdParamsSchema = z.object({ activityId: z.uuid() }).strict()

export const createActivitySchema = z
  .object({
    creationRequestId: z.uuid().optional(),
    gradingConfiguration: gradingConfigurationSchema.nullable().optional(),
    gradingPeriod: gradingPeriodSchema.nullable().optional(),
    rubricCriteria: rubricCriteriaSchema.optional(),
    title: titleSchema,
    instructions: instructionsSchema,
    dueDate: timestampSchema,
    language: z.literal('JAVA').default('JAVA'),
    entryClassName: entryClassNameSchema.default('Main'),
    starterCode: starterCodeSchema,
    maxAttempts: z.number().int().min(1).max(3),
    creditPolicy: creditPolicySchema.default('LATEST'),
    gradingMode: z.enum(['GRADED', 'COMPLETION']).default('GRADED'),
    topicId: z.uuid().nullable().optional(),
    totalPoints: pointsSchema.nullable(),
  })
  .strict()
  .refine(value => value.gradingMode === 'COMPLETION' ? value.totalPoints === null : value.totalPoints !== null, { path: ['totalPoints'], message: 'Choose points for Graded or no points for Ungraded.' })

export const updateActivitySchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    gradingConfiguration: gradingConfigurationSchema.nullable().optional(),
    gradingPeriod: gradingPeriodSchema.nullable().optional(),
    rubricCriteria: rubricCriteriaSchema.optional(),
    title: titleSchema.optional(),
    instructions: instructionsSchema.optional(),
    dueDate: timestampSchema.optional(),
    language: z.literal('JAVA').optional(),
    entryClassName: entryClassNameSchema.optional(),
    starterCode: starterCodeSchema.optional(),
    maxAttempts: z.number().int().min(1).max(3).optional(),
    creditPolicy: creditPolicySchema.optional(),
    gradingMode: z.enum(['GRADED', 'COMPLETION']).optional(),
    topicId: z.uuid().nullable().optional(),
    totalPoints: pointsSchema.nullable().optional(),
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
    topicId: z.union([z.uuid(), z.literal('none')]).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  })
  .strict()

export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>
export type ActivityTransitionInput = z.infer<typeof activityTransitionSchema>
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>
