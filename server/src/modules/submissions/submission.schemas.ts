import { z } from 'zod'

const uuid = z.uuid()
const expectedUpdatedAt = z.iso.datetime({ offset: true }).transform((value) => new Date(value))

export const activitySubmissionParamsSchema = z.object({ activityId: uuid }).strict()
export const submissionParamsSchema = z.object({ submissionId: uuid }).strict()
export const practiceRunParamsSchema = z.object({ runId: uuid }).strict()

export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/)

export const createSubmissionSchema = z
  .object({ sourceCode: z.string().min(1).max(100_000) })
  .strict()

export const createPracticeRunSchema = createSubmissionSchema

export const submissionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum([
        'QUEUED',
        'ASSESSING',
        'ASSESSED',
        'ASSESSMENT_FAILED',
        'REVIEWED',
        'RELEASED',
        'FAILED_RESOLVED',
      ])
      .optional(),
  })
  .strict()

export const scoreCorrectionSchema = z
  .object({
    newEffectiveScore: z.number().finite().min(0).max(1000),
    reason: z.string().trim().min(10).max(2000),
    expectedUpdatedAt,
  })
  .strict()

export const reviewSubmissionSchema = z
  .object({
    instructorPoints: z.number().finite().min(0).max(1000),
    feedbackText: z.string().trim().max(20_000).optional(),
    expectedUpdatedAt,
  })
  .strict()

export const submissionTransitionSchema = z
  .object({ expectedUpdatedAt })
  .strict()

export const failureResolutionSchema = z
  .object({
    resolutionType: z.enum([
      'CLOSED_WITHOUT_REPLACEMENT',
      'REPLACEMENT_GRANTED',
    ]),
    reason: z.string().trim().min(10).max(2000),
    replacementExpiresAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    expectedUpdatedAt,
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.resolutionType === 'REPLACEMENT_GRANTED' &&
      !input.replacementExpiresAt
    ) {
      context.addIssue({
        code: 'custom',
        path: ['replacementExpiresAt'],
        message: 'A replacement expiration is required.',
      })
    }
    if (
      input.resolutionType === 'CLOSED_WITHOUT_REPLACEMENT' &&
      input.replacementExpiresAt
    ) {
      context.addIssue({
        code: 'custom',
        path: ['replacementExpiresAt'],
        message: 'A non-replacement resolution cannot have an expiration.',
      })
    }
  })

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>
export type ScoreCorrectionInput = z.infer<typeof scoreCorrectionSchema>
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>
export type SubmissionTransitionInput = z.infer<typeof submissionTransitionSchema>
export type FailureResolutionInput = z.infer<typeof failureResolutionSchema>
