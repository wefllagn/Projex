import type { PrismaClient, Prisma } from '@prisma/client'
import type { Logger } from 'pino'
import { BrowserCommitError, type BrowserWrite, type GitGroupBrowserWriter } from '../../infrastructure/git/git-group-browser-writer.js'
import { createPrismaGitTransportRepository } from '../git-transport/git-transport.repository.js'
import { evaluateGitPermission } from '../git-transport/git-authorization.js'

export function createGroupBrowserCommitWorker(deps: { prisma: PrismaClient; writer: GitGroupBrowserWriter; logger: Logger }) {
  async function complete(tx: Prisma.TransactionClient, job: BrowserWrite, commitHash: string) {
    await tx.groupBrowserCommitJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', resultingCommitHash: commitHash, content: '', failureCode: null, completedAt: new Date(), workerId: null, leaseExpiresAt: null } })
    await tx.repositoryActivity.create({ data: { repositoryId: job.repositoryId, userId: job.actorId, actorType: 'USER', activityType: 'COMMIT', branchName: job.branchName, filePath: job.filePath, commitHash, message: 'Browser commit saved', metadataJson: { browserCommitJobId: job.id, source: 'GROUP_BROWSER_EDITOR' } } })
  }
  return {
    async processNext(workerId: string): Promise<boolean> {
      const row = await deps.prisma.$transaction(async tx => {
        const ids = await tx.$queryRaw<Array<{ browser_commit_id: string }>>`SELECT browser_commit_id FROM group_browser_commit_jobs WHERE (status = 'PENDING' AND available_at <= now()) OR (status = 'RUNNING' AND lease_expires_at <= now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`
        if (!ids[0]) return null
        return tx.groupBrowserCommitJob.update({ where: { id: ids[0].browser_commit_id }, data: { status: 'RUNNING', workerId, claimAttempt: { increment: 1 }, leaseExpiresAt: new Date(Date.now() + 120000) }, include: { repository: { select: { storagePath: true } } } })
      })
      if (!row) return false
      const job: BrowserWrite = { ...row, operation: row.operation as 'CREATE' | 'UPDATE', storagePath: row.repository.storagePath ?? '' }
      try {
        const existing = await deps.writer.receipt(job)
        if (!existing) {
          const access = await createPrismaGitTransportRepository(deps.prisma).findAccess(job.repositoryId, job.actorId)
          const permission = access && evaluateGitPermission(access,new Date())
          if (access?.repositoryType !== 'CLASS_PROJECT' || !permission?.write || (job.branchName.toLowerCase() === 'main' || !job.expectedHeadCommitHash) && !permission.canUpdateMain) throw new BrowserCommitError('BROWSER_ACCESS_REVOKED')
        }
        const commitHash = existing ?? await deps.writer.prepare(job)
        // Persist before the external ref operation: ambiguous outcomes must remain recoverable.
        await deps.prisma.groupBrowserCommitJob.updateMany({ where: { id: job.id, workerId, claimAttempt: row.claimAttempt, status: 'RUNNING' }, data: { publishStarted: true } })
        await deps.prisma.$transaction(async tx => {
          const locked = await tx.$queryRaw<Array<{ worker_id: string; claim_attempt: number; status: string; lease_expires_at: Date }>>`SELECT worker_id, claim_attempt, status, lease_expires_at FROM group_browser_commit_jobs WHERE browser_commit_id = ${job.id}::uuid FOR UPDATE`
          if (!locked[0] || locked[0].worker_id !== workerId || locked[0].claim_attempt !== row.claimAttempt || locked[0].status !== 'RUNNING' || locked[0].lease_expires_at <= new Date()) throw new BrowserCommitError('BROWSER_LEASE_LOST')
          const receipt = await deps.writer.receipt(job)
          if (receipt) { await complete(tx, job, receipt); return }
          // These locks fence every row owning the browser write policy through the atomic Git update.
          await tx.$queryRaw`SELECT r.repository_id FROM repositories r JOIN users u ON u.user_id = ${job.actorId}::uuid JOIN project_tasks p ON p.project_task_id = r.project_task_id JOIN classes c ON c.class_id = p.class_id JOIN class_members cm ON cm.class_id = c.class_id AND cm.student_id = u.user_id JOIN repository_members rm ON rm.repository_id = r.repository_id AND rm.student_id = u.user_id JOIN teams t ON t.team_id = r.team_id JOIN team_members tm ON tm.team_id = t.team_id AND tm.student_id = u.user_id WHERE r.repository_id = ${job.repositoryId}::uuid FOR SHARE OF r,u,p,c,cm,rm,t,tm`
          const access = await createPrismaGitTransportRepository(deps.prisma, tx).findAccess(job.repositoryId, job.actorId)
          const permission = access && evaluateGitPermission(access,new Date())
          if (access?.repositoryType !== 'CLASS_PROJECT' || !permission?.write || (job.branchName.toLowerCase() === 'main' || !job.expectedHeadCommitHash) && !permission.canUpdateMain) throw new BrowserCommitError('BROWSER_ACCESS_REVOKED')
          await deps.writer.publish(job, commitHash)
          await complete(tx, job, commitHash)
        }, { timeout: 60000 })
        deps.logger.info({ event: 'group_browser.commit_completed', repositoryId: job.repositoryId, jobId: job.id, actorId: job.actorId }, 'Group browser commit completed')
      } catch (error) {
        const code = error instanceof BrowserCommitError ? error.code : 'BROWSER_COMMIT_RETRY'
        const current = await deps.prisma.groupBrowserCommitJob.findUnique({ where: { id: job.id } })
        if (!current || current.status !== 'RUNNING' || current.workerId !== workerId || current.claimAttempt !== row.claimAttempt) return true
        // Known refusals cannot have updated the ref. Unknown post-publication failures retain payload/receipt recovery.
        const terminal = error instanceof BrowserCommitError && code !== 'BROWSER_LEASE_LOST' || !current.publishStarted && current.claimAttempt >= 3
        await deps.prisma.groupBrowserCommitJob.updateMany({ where: { id: job.id, status: 'RUNNING', workerId, claimAttempt: row.claimAttempt }, data: terminal ? { status: code === 'BROWSER_HEAD_CHANGED' ? 'CONFLICTED' : 'FAILED', failureCode: code, completedAt: new Date(), content: '', workerId: null, leaseExpiresAt: null } : { status: 'PENDING', availableAt: new Date(Date.now()+30000), failureCode: code, workerId: null, leaseExpiresAt: null } })
        deps.logger.warn({ event: 'group_browser.commit_deferred', jobId: job.id, code }, 'Group browser commit did not complete')
      }
      return true
    },
  }
}
