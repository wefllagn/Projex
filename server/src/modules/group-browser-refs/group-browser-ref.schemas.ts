import { z } from 'zod'
import { isValidGitBranchName } from '../../infrastructure/git/git-repository-reader.js'

export function isBrowserBranchName(value: string): boolean {
  return isValidGitBranchName(value) && !/^(HEAD|refs|projex)(\/|$)/i.test(value) && value.split('/').every(part =>
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part) && !part.endsWith('.') && !/\.lock$/i.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
}
export const browserBranchName = z.string().min(1).max(200).refine(isBrowserBranchName)
const hash = z.string().regex(/^[0-9a-f]{40}$/)
export const browserRefInput = z.object({
  operation: z.enum(['CREATE_BRANCH', 'FAST_FORWARD']),
  sourceBranchName: browserBranchName,
  targetBranchName: browserBranchName,
  expectedSourceCommitHash: hash,
  expectedTargetCommitHash: hash.nullable(),
}).strict().refine(value => value.sourceBranchName !== value.targetBranchName)
  .refine(value => value.operation === 'CREATE_BRANCH' ? value.expectedTargetCommitHash === null && value.targetBranchName.toLowerCase() !== 'main' : value.expectedTargetCommitHash !== null)
export const browserRefParams = z.object({ repositoryId: z.uuid() }).strict()
export const browserRefJobParams = z.object({ repositoryId: z.uuid(), refJobId: z.uuid() }).strict()
export const browserRefPreview = z.object({ sourceBranchName: browserBranchName, targetBranchName: browserBranchName }).strict().refine(value => value.sourceBranchName !== value.targetBranchName)
export type BrowserRefInput = z.infer<typeof browserRefInput>
