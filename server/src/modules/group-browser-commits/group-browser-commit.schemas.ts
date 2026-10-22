import { z } from 'zod'
import { isValidGitBranchName } from '../../infrastructure/git/git-repository-reader.js'

export const TEXT_EXTENSIONS = ['java','md','txt','json','js','ts','jsx','tsx','css','html','xml','yaml','yml','sql','py','c','h','cpp']
export function isBrowserFilePath(value: string): boolean {
  if (!value || value.length > 240 || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value)) return false
  const parts = value.split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || part.toLowerCase() === '.git' || part.endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || !/^[A-Za-z0-9]/.test(part))) return false
  return TEXT_EXTENSIONS.includes(value.split('.').at(-1)?.toLowerCase() ?? '')
}
export const browserCommitParams = z.object({ repositoryId: z.uuid() }).strict()
export const browserCommitJobParams = z.object({ repositoryId: z.uuid(), commitJobId: z.uuid() }).strict()
export const browserCommitInput = z.object({
  branchName: z.string().min(1).max(200).refine(isValidGitBranchName),
  filePath: z.string().refine(isBrowserFilePath),
  operation: z.enum(['CREATE','UPDATE']),
  content: z.string().max(65536).refine(value => Buffer.byteLength(value, 'utf8') <= 65536 && !value.includes('\0') && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)),
  commitMessage: z.string().trim().min(1).max(300).refine(value => [...value].every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)),
  expectedHeadCommitHash: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
}).strict()
export const browserCommitKey = z.string().min(16).max(100).regex(/^[a-zA-Z0-9:_-]+$/)
export type BrowserCommitInput = z.infer<typeof browserCommitInput>
