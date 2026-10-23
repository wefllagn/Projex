import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'
import type { BrowserCommitInput } from './group-browser-commit.schemas.js'

export function browserJobResponse(job: { id: string; repositoryId: string; status: string; branchName: string; filePath: string; resultingCommitHash: string | null; failureCode: string | null; createdAt: Date; completedAt: Date | null }) {
  return { jobId: job.id, repositoryId: job.repositoryId, status: job.status, branchName: job.branchName, filePath: job.filePath, commitHash: job.resultingCommitHash, failureCode: job.failureCode, createdAt: job.createdAt.toISOString(), completedAt: job.completedAt?.toISOString() ?? null }
}
export function createGroupBrowserCommitService(deps: { prisma: PrismaClient; accessRepository: GitTransportRepository; enabled: boolean }) {
  async function access(caller: SafeUserProfile, repositoryId: string) {
    const value = await deps.accessRepository.findAccess(repositoryId, caller.id)
    if (caller.role !== 'STUDENT' || caller.status !== 'ACTIVE' || value?.repositoryType !== 'CLASS_PROJECT' || !evaluateGitPermission(value, new Date()).read) throw new AppError({ statusCode: 404, code: 'REPOSITORY_NOT_FOUND', message: 'Repository not found.' })
    return value
  }
  return {
    async create(caller: SafeUserProfile, repositoryId: string, input: BrowserCommitInput, key: string) {
      if (!deps.enabled) throw new AppError({ statusCode: 503, code: 'BROWSER_EDITOR_UNAVAILABLE', message: 'Browser commits are unavailable.' })
      const current = await access(caller, repositoryId)
      const hash = (value: string) => createHash('sha256').update(value).digest('hex')
      const idempotencyKeyHash = hash(key)
      const payloadHash = hash(JSON.stringify(input))
      const where = { actorId_repositoryId_idempotencyKeyHash: { actorId: caller.id, repositoryId, idempotencyKeyHash } }
      const replay = await deps.prisma.groupBrowserCommitJob.findUnique({ where })
      if (replay) {
        if (replay.payloadHash !== payloadHash) throw new AppError({ statusCode: 409, code: 'BROWSER_IDEMPOTENCY_CONFLICT', message: 'This request key was already used for different changes.' })
        return browserJobResponse(replay)
      }
      const permission = evaluateGitPermission(current, new Date())
      if (!permission.write || (input.branchName.toLowerCase() === 'main' || input.expectedHeadCommitHash === null) && !permission.canUpdateMain) throw new AppError({ statusCode: 403, code: 'BROWSER_WRITE_DENIED', message: 'This branch is not writable with your current permissions.' })
      if (!input.expectedHeadCommitHash && (input.branchName !== 'main' || input.operation !== 'CREATE')) throw new AppError({ statusCode: 409, code: 'BROWSER_INITIALIZATION_DENIED', message: 'Only an authorized Maintainer can initialize an empty main branch.' })
      const job = await deps.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT repository_id FROM repositories WHERE repository_id = ${repositoryId}::uuid FOR UPDATE`
        const existing = await tx.groupBrowserCommitJob.findUnique({ where })
        if (existing) return existing
        if (await tx.groupBrowserRefJob.count({ where: { actorId: caller.id, repositoryId, status: { in: ['PENDING','RUNNING'] } } }) || await tx.groupBrowserCommitJob.count({ where: { actorId: caller.id, repositoryId, status: { in: ['PENDING','RUNNING'] } } })) throw new AppError({ statusCode: 409, code: 'BROWSER_COMMIT_IN_PROGRESS', message: 'Your previous commit is still processing. Check its result before starting another.' })
        return tx.groupBrowserCommitJob.create({ data: { ...input, repositoryId, actorId: caller.id, idempotencyKeyHash, payloadHash } })
      })
      if (job.payloadHash !== payloadHash) throw new AppError({ statusCode: 409, code: 'BROWSER_IDEMPOTENCY_CONFLICT', message: 'This request key was already used for different changes.' })
      return browserJobResponse(job)
    },
    async get(caller: SafeUserProfile, repositoryId: string, jobId: string) {
      await access(caller, repositoryId)
      const job = await deps.prisma.groupBrowserCommitJob.findFirst({ where: { id: jobId, repositoryId, actorId: caller.id } })
      if (!job) throw new AppError({ statusCode: 404, code: 'BROWSER_COMMIT_NOT_FOUND', message: 'Commit request not found.' })
      return browserJobResponse(job)
    },
  }
}
export type GroupBrowserCommitService = ReturnType<typeof createGroupBrowserCommitService>
