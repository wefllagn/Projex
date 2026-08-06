import { z } from 'zod'

export const gitRepositoryParamsSchema = z.object({
  repositoryId: z.uuid(),
}).strict()

export const gitCredentialParamsSchema = z.object({
  credentialId: z.uuid(),
}).strict()

export const issueGitCredentialSchema = z.object({
  operations: z.array(z.enum(['READ', 'WRITE'])).min(1).max(2)
    .refine((operations) => new Set(operations).size === operations.length, 'Operations must be unique.'),
}).strict()

export const gitInfoRefsQuerySchema = z.object({
  service: z.enum(['git-upload-pack', 'git-receive-pack']),
}).strict()
