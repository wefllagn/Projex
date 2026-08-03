import { z } from 'zod'

const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value))
const testCasePointsSchema = z
  .number()
  .min(0)
  .max(1_000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    'Points may have at most two decimal places.',
  )

export const testCaseActivityParamsSchema = z.object({ activityId: z.uuid() }).strict()

export const testCaseListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strict()

export const replaceTestCasesSchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    testCases: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(200),
            inputData: z.string().max(32_000).nullable().optional().default(null),
            expectedOutput: z.string().max(32_000),
            isHidden: z.boolean(),
            points: testCasePointsSchema,
          })
          .strict(),
      )
      .max(50),
  })
  .strict()

export type TestCaseListQuery = z.infer<typeof testCaseListQuerySchema>
export type ReplaceTestCasesInput = z.infer<typeof replaceTestCasesSchema>
export type TestCaseInput = ReplaceTestCasesInput['testCases'][number]
