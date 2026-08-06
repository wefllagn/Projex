import { z } from 'zod'
import {
  isValidGitBranchName,
  isValidGitCommitId,
  normalizeGitRepositoryPath,
} from '../../infrastructure/git/git-repository-reader.js'

const branchNameSchema = z.string().min(1).max(200).refine(isValidGitBranchName, 'Invalid branch name.')
const commitIdSchema = z.string().length(40).refine(isValidGitCommitId, 'Invalid commit ID.')
const repositoryPathSchema = z.string().min(1).max(1_024).refine((value) => {
  try {
    normalizeGitRepositoryPath(value)
    return true
  } catch {
    return false
  }
}, 'Invalid repository path.')

export const repositoryContentParamsSchema = z.object({ repositoryId: z.uuid() }).strict()

export const repositoryCommitParamsSchema = z
  .object({ repositoryId: z.uuid(), commitId: commitIdSchema })
  .strict()

export const repositoryHistoryQuerySchema = z
  .object({
    branchName: branchNameSchema.optional(),
    page: z.coerce.number().int().min(1).max(1_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()

const revisionQueryFields = {
  branchName: branchNameSchema.optional(),
  commitId: commitIdSchema.optional(),
}

export const repositoryTreeQuerySchema = z
  .object({ ...revisionQueryFields, path: repositoryPathSchema.optional() })
  .strict()
  .refine((value) => !(value.branchName && value.commitId), 'Use either branchName or commitId, not both.')

export const repositoryFileQuerySchema = z
  .object({ ...revisionQueryFields, path: repositoryPathSchema })
  .strict()
  .refine((value) => !(value.branchName && value.commitId), 'Use either branchName or commitId, not both.')

export const repositoryDiffQuerySchema = z
  .object({
    baseCommitId: commitIdSchema,
    targetCommitId: commitIdSchema,
    path: repositoryPathSchema.optional(),
  })
  .strict()

export type RepositoryHistoryQuery = z.infer<typeof repositoryHistoryQuerySchema>
export type RepositoryTreeQuery = z.infer<typeof repositoryTreeQuerySchema>
export type RepositoryFileQuery = z.infer<typeof repositoryFileQuerySchema>
export type RepositoryDiffQuery = z.infer<typeof repositoryDiffQuerySchema>
