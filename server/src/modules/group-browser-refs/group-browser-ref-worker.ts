import type { PrismaClient, Prisma } from '@prisma/client'
import type { Logger } from 'pino'
import { BrowserCommitError } from '../../infrastructure/git/git-group-browser-writer.js'
import type { BrowserRefWrite, GitGroupBrowserRefWriter } from '../../infrastructure/git/git-group-browser-ref-writer.js'
import { createPrismaGitTransportRepository } from '../git-transport/git-transport.repository.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'

export function createGroupBrowserRefWorker(deps: { prisma: PrismaClient; writer: GitGroupBrowserRefWriter; logger: Logger }) {
  async function complete(tx: Prisma.TransactionClient, job: BrowserRefWrite, commitHash: string) {
    await tx.groupBrowserRefJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', resultingCommitHash: commitHash, failureCode: null, completedAt: new Date(), workerId: null, leaseExpiresAt: null } })
    await tx.repositoryActivity.create({ data: { repositoryId: job.repositoryId, userId: job.actorId, actorType: 'USER', activityType: job.operation === 'CREATE_BRANCH' ? 'BRANCH' : 'MERGE', branchName: job.targetBranchName, commitHash, message: job.operation === 'CREATE_BRANCH' ? 'Browser branch created' : 'Branch fast-forwarded', metadataJson: { browserRefJobId: job.id, source: 'GROUP_BROWSER_EDITOR', sourceBranchName: job.sourceBranchName, targetBranchName: job.targetBranchName } } })
  }
  return {
    async processNext(workerId: string): Promise<boolean> {
      const row = await deps.prisma.$transaction(async tx => {
        const ids = await tx.$queryRaw<Array<{ browser_ref_id: string }>>`SELECT browser_ref_id FROM group_browser_ref_jobs WHERE (status = 'PENDING' AND available_at <= now()) OR (status = 'RUNNING' AND lease_expires_at <= now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`
        if (!ids[0]) return null
        return tx.groupBrowserRefJob.update({ where: { id: ids[0].browser_ref_id }, data: { status: 'RUNNING', workerId, claimAttempt: { increment: 1 }, leaseExpiresAt: new Date(Date.now() + 120000) }, include: { repository: { select: { storagePath: true } } } })
      })
      if (!row) return false
      const job: BrowserRefWrite = { ...row, operation: row.operation as 'CREATE_BRANCH' | 'FAST_FORWARD', storagePath: row.repository.storagePath ?? '' }
      try {
        const existing = await deps.writer.receipt(job)
        if (!existing) {
          const access = await createPrismaGitTransportRepository(deps.prisma).findAccess(job.repositoryId, job.actorId)
          const permission = access && evaluateGitPermission(access,new Date())
          if (access?.repositoryType !== 'CLASS_PROJECT' || !permission?.write || job.targetBranchName.toLowerCase() === 'main' && !permission.canUpdateMain) throw new BrowserCommitError('BROWSER_ACCESS_REVOKED')
        }
        const commitHash = existing ?? await deps.writer.prepare(job)
        // Persist before the external ref operation: ambiguous outcomes must remain recoverable.
        await deps.prisma.groupBrowserRefJob.updateMany({ where: { id: job.id, workerId, claimAttempt: row.claimAttempt, status: 'RUNNING' }, data: { publishStarted: true } })
        await deps.prisma.$transaction(async tx => {
          const locked = await tx.$queryRaw<Array<{ worker_id: string; claim_attempt: number; status: string; lease_expires_at: Date }>>`SELECT worker_id, claim_attempt, status, lease_expires_at FROM group_browser_ref_jobs WHERE browser_ref_id = ${job.id}::uuid FOR UPDATE`
          if (!locked[0] || locked[0].worker_id !== workerId || locked[0].claim_attempt !== row.claimAttempt || locked[0].status !== 'RUNNING' || locked[0].lease_expires_at <= new Date()) throw new BrowserCommitError('BROWSER_LEASE_LOST')
          const receipt = await deps.writer.receipt(job)
          if (receipt) { await complete(tx, job, receipt); return }
          // Serialize browser ref publications per repository, including case/prefix and branch-count checks.
          await tx.$queryRaw`SELECT repository_id FROM repositories WHERE repository_id = ${job.repositoryId}::uuid FOR UPDATE`
          // These locks fence every row owning the browser write policy through the atomic Git update.
          await tx.$queryRaw`SELECT r.repository_id FROM repositories r JOIN users u ON u.user_id = ${job.actorId}::uuid JOIN project_tasks p ON p.project_task_id = r.project_task_id JOIN classes c ON c.class_id = p.class_id JOIN class_members cm ON cm.class_id = c.class_id AND cm.student_id = u.user_id JOIN repository_members rm ON rm.repository_id = r.repository_id AND rm.student_id = u.user_id JOIN teams t ON t.team_id = r.team_id JOIN team_members tm ON tm.team_id = t.team_id AND tm.student_id = u.user_id WHERE r.repository_id = ${job.repositoryId}::uuid FOR SHARE OF r,u,p,c,cm,rm,t,tm`
          const access = await createPrismaGitTransportRepository(deps.prisma, tx).findAccess(job.repositoryId, job.actorId)
          const permission = access && evaluateGitPermission(access,new Date())
          if (access?.repositoryType !== 'CLASS_PROJECT' || !permission?.write || job.targetBranchName.toLowerCase() === 'main' && !permission.canUpdateMain) throw new BrowserCommitError('BROWSER_ACCESS_REVOKED')
          await deps.writer.prepare(job)
          // Locked policy rows cannot change; reevaluate time-sensitive cutoffs after Git inspection.
          const publishPermission = access && evaluateGitPermission(access,new Date())
          if (!publishPermission?.write || job.targetBranchName.toLowerCase() === 'main' && !publishPermission.canUpdateMain) throw new BrowserCommitError('BROWSER_ACCESS_REVOKED')
          await deps.writer.publish(job)
          await complete(tx, job, commitHash)
        }, { timeout: 60000 })
        deps.logger.info({ event: 'group_browser.ref_completed', repositoryId: job.repositoryId, jobId: job.id, actorId: job.actorId }, 'Group browser Git action completed')
      } catch (error) {
        const code = error instanceof BrowserCommitError ? error.code : 'BROWSER_ACTION_RETRY'
        const current = await deps.prisma.groupBrowserRefJob.findUnique({ where: { id: job.id } })
        if (!current || current.status !== 'RUNNING' || current.workerId !== workerId || current.claimAttempt !== row.claimAttempt) return true
        // Known refusals cannot have updated the ref. Unknown post-publication failures retain payload/receipt recovery.
        const terminal = error instanceof BrowserCommitError && code !== 'BROWSER_LEASE_LOST' || !current.publishStarted && current.claimAttempt >= 3
        await deps.prisma.groupBrowserRefJob.updateMany({ where: { id: job.id, status: 'RUNNING', workerId, claimAttempt: row.claimAttempt }, data: terminal ? { status: ['BROWSER_REF_CHANGED','BROWSER_BRANCH_EXISTS','BROWSER_BRANCH_DIVERGED','BROWSER_ALREADY_UP_TO_DATE'].includes(code) ? 'CONFLICTED' : 'FAILED', failureCode: code, completedAt: new Date(), workerId: null, leaseExpiresAt: null } : { status: 'PENDING', availableAt: new Date(Date.now()+30000), failureCode: code, workerId: null, leaseExpiresAt: null } })
        deps.logger.warn({ event: 'group_browser.ref_deferred', jobId: job.id, code }, 'Group browser Git action did not complete')
      }
      return true
    },
  }
}
