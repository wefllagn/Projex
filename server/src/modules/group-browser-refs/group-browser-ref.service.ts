import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { GitRepositoryReader } from '../../infrastructure/git/git-repository-reader.js'
import { GitRepositoryReadError } from '../../infrastructure/git/git-repository-reader.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'
import type { GitTransportRepository } from '../git-transport/git-transport.repository.js'
import { browserRefInput, type BrowserRefInput } from './group-browser-ref.schemas.js'

export function refJobResponse(job: { id: string; repositoryId: string; operation: string; status: string; sourceBranchName: string; targetBranchName: string; resultingCommitHash: string | null; failureCode: string | null }) {
  return { jobId:job.id,repositoryId:job.repositoryId,operation:job.operation,status:job.status,sourceBranchName:job.sourceBranchName,targetBranchName:job.targetBranchName,commitHash:job.resultingCommitHash,failureCode:job.failureCode }
}
export function createGroupBrowserRefService(deps: { prisma: PrismaClient; accessRepository: GitTransportRepository; enabled: boolean; reader: Pick<GitRepositoryReader,'branchComparison'>; storage: {resolveManagedRepository(id: string,locator: string): Promise<string>} }) {
  async function access(caller: SafeUserProfile, repositoryId: string) {
    if(!deps.enabled) throw new AppError({statusCode:503,code:'BROWSER_EDITOR_UNAVAILABLE',message:'Browser Git actions are unavailable.'})
    const current=await deps.accessRepository.findAccess(repositoryId,caller.id)
    if(caller.role!=='STUDENT' || caller.status!=='ACTIVE' || current?.repositoryType!=='CLASS_PROJECT' || !evaluateGitPermission(current,new Date()).read) throw new AppError({statusCode:404,code:'REPOSITORY_NOT_FOUND',message:'Repository not found.'})
    return current
  }
  return {
    async preview(caller: SafeUserProfile,repositoryId: string,sourceBranchName: string,targetBranchName: string) {
      const current=await access(caller,repositoryId), permission=evaluateGitPermission(current,new Date())
      if(!permission.write || targetBranchName.toLowerCase()==='main' && !permission.canUpdateMain) throw new AppError({statusCode:403,code:'BROWSER_WRITE_DENIED',message:'This target branch is not writable.'})
      try {
        const root=await deps.storage.resolveManagedRepository(repositoryId,current.storagePath!)
        return {repositoryId,...await deps.reader.branchComparison(root,sourceBranchName,targetBranchName)}
      } catch(error) {
        throw new AppError({statusCode:error instanceof GitRepositoryReadError && error.code==='GIT_REVISION_NOT_FOUND'?409:503,code:'BROWSER_PREVIEW_UNAVAILABLE',message:'Could not compare these branches. Refresh the branch list and try again.'})
      }
    },
    async create(caller: SafeUserProfile,repositoryId: string,raw: BrowserRefInput,key: string) {
      const input=browserRefInput.parse(raw)
      const current=await access(caller,repositoryId)
      const hash=(value: string)=>createHash('sha256').update(value).digest('hex')
      const idempotencyKeyHash=hash(key), payloadHash=hash(JSON.stringify(input))
      const where={actorId_repositoryId_idempotencyKeyHash:{actorId:caller.id,repositoryId,idempotencyKeyHash}}
      const replay=await deps.prisma.groupBrowserRefJob.findUnique({where})
      if(replay) {
        if(replay.payloadHash!==payloadHash) throw new AppError({statusCode:409,code:'BROWSER_IDEMPOTENCY_CONFLICT',message:'This request key already identifies another action.'})
        return refJobResponse(replay)
      }
      const permission=evaluateGitPermission(current,new Date())
      if(!permission.write || input.targetBranchName.toLowerCase()==='main' && !permission.canUpdateMain) throw new AppError({statusCode:403,code:'BROWSER_WRITE_DENIED',message:'This target branch is not writable.'})
      const job=await deps.prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT repository_id FROM repositories WHERE repository_id = ${repositoryId}::uuid FOR UPDATE`
        const existing=await tx.groupBrowserRefJob.findUnique({where})
        if(existing) return existing
        if(await tx.groupBrowserRefJob.count({where:{actorId:caller.id,repositoryId,status:{in:['PENDING','RUNNING']}}}) || await tx.groupBrowserCommitJob.count({where:{actorId:caller.id,repositoryId,status:{in:['PENDING','RUNNING']}}})) throw new AppError({statusCode:409,code:'BROWSER_ACTION_IN_PROGRESS',message:'Your previous Git action is still processing. Check it before starting another.'})
        return tx.groupBrowserRefJob.create({data:{...input,repositoryId,actorId:caller.id,idempotencyKeyHash,payloadHash}})
      })
      if(job.payloadHash!==payloadHash) throw new AppError({statusCode:409,code:'BROWSER_IDEMPOTENCY_CONFLICT',message:'This request key already identifies another action.'})
      return refJobResponse(job)
    },
    async get(caller: SafeUserProfile,repositoryId: string,jobId: string) {
      await access(caller,repositoryId)
      const job=await deps.prisma.groupBrowserRefJob.findFirst({where:{id:jobId,repositoryId,actorId:caller.id}})
      if(!job) throw new AppError({statusCode:404,code:'BROWSER_ACTION_NOT_FOUND',message:'Git action not found.'})
      return refJobResponse(job)
    },
  }
}
export type GroupBrowserRefService=ReturnType<typeof createGroupBrowserRefService>
