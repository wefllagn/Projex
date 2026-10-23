import { z } from 'zod'
import { idempotencyKeySchema } from '../submissions/submission.schemas.js'

const commitHash = z.string().regex(/^[0-9a-f]{40}$/)

export const checkpointActivityParamsSchema = z.object({ activityId: z.uuid() }).strict()
export const checkpointJobParamsSchema = z.object({ activityId: z.uuid(), checkpointId: z.uuid() }).strict()
export const createCheckpointSchema = z.object({
  sourceCode: z.string().min(1).max(100_000),
  expectedHeadCommitHash: commitHash.nullable(),
}).strict()

export { idempotencyKeySchema }
export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>
