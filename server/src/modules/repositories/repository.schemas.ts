import { z } from 'zod'

const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value))
const repositoryNameSchema = z.string().trim().min(1).max(120)
const teamNameSchema = z.string().trim().min(1).max(120)
const descriptionSchema = z.string().trim().max(5_000).nullable().optional()
const feedbackSchema = z.string().trim().min(1).max(20_000)

export const repositoryParamsSchema = z.object({ repositoryId: z.uuid() }).strict()
export const repositoryMemberParamsSchema = z
  .object({ repositoryId: z.uuid(), memberId: z.uuid() })
  .strict()
export const repositoryInvitationParamsSchema = z.object({ invitationId: z.uuid() }).strict()
export const repositoryFeedbackParamsSchema = z.object({ feedbackId: z.uuid() }).strict()
export const projectRepositoryParamsSchema = z.object({ projectTaskId: z.uuid() }).strict()

export const createClassProjectRepositorySchema = z
  .object({
    teamName: teamNameSchema,
    repositoryName: repositoryNameSchema,
    description: descriptionSchema,
  })
  .strict()

export const createPersonalRepositorySchema = z
  .object({ repositoryName: repositoryNameSchema, description: descriptionSchema })
  .strict()

export const updateRepositorySchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    repositoryName: repositoryNameSchema.optional(),
    description: descriptionSchema,
  })
  .strict()
  .refine(
    (value) => value.repositoryName !== undefined || value.description !== undefined,
    'At least one repository metadata field is required.',
  )

export const repositoryTransitionSchema = z
  .object({ expectedUpdatedAt: timestampSchema })
  .strict()

export const repositoryListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    repositoryType: z.enum(['CLASS_PROJECT', 'PERSONAL']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    reviewStatus: z.enum(['WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']).optional(),
    projectTaskId: z.uuid().optional(),
  })
  .strict()

export const createInvitationSchema = z.object({ inviteeUserId: z.uuid() }).strict()
export const invitationActionSchema = z.object({ reason: z.string().trim().min(1).max(2_000).optional() }).strict()

export const memberTransitionSchema = z
  .object({
    action: z.enum(['REMOVE', 'REACTIVATE']),
    expectedUpdatedAt: timestampSchema,
    reason: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict()

export const createFeedbackDraftSchema = z.object({ feedbackText: feedbackSchema }).strict()
export const updateFeedbackDraftSchema = z
  .object({ expectedUpdatedAt: timestampSchema, feedbackText: feedbackSchema })
  .strict()

export const requestChangesSchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    feedbackId: z.uuid(),
    expectedFeedbackUpdatedAt: timestampSchema,
  })
  .strict()

export const approveRepositorySchema = z
  .object({
    expectedUpdatedAt: timestampSchema,
    feedbackId: z.uuid().optional(),
    expectedFeedbackUpdatedAt: timestampSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.feedbackId) === Boolean(value.expectedFeedbackUpdatedAt),
    'feedbackId and expectedFeedbackUpdatedAt must be supplied together.',
  )

export type CreateClassProjectRepositoryInput = z.infer<typeof createClassProjectRepositorySchema>
export type CreatePersonalRepositoryInput = z.infer<typeof createPersonalRepositorySchema>
export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>
export type RepositoryTransitionInput = z.infer<typeof repositoryTransitionSchema>
export type RepositoryListQuery = z.infer<typeof repositoryListQuerySchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type InvitationActionInput = z.infer<typeof invitationActionSchema>
export type MemberTransitionInput = z.infer<typeof memberTransitionSchema>
export type CreateFeedbackDraftInput = z.infer<typeof createFeedbackDraftSchema>
export type UpdateFeedbackDraftInput = z.infer<typeof updateFeedbackDraftSchema>
export type RequestChangesInput = z.infer<typeof requestChangesSchema>
export type ApproveRepositoryInput = z.infer<typeof approveRepositorySchema>
