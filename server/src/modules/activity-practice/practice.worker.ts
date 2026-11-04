import type { Prisma, PrismaClient } from '@prisma/client'
import type { Logger } from 'pino'
import { PracticeWriteError, type GitPracticeWriter, type PracticeWrite } from '../../infrastructure/git/git-practice-writer.js'
import { lockPracticePolicy, practiceEligible } from './practice-policy.js'

export function createActivityPracticeWorker(deps: { prisma: PrismaClient; writer: GitPracticeWriter; logger: Logger }) {
  async function complete(tx: Prisma.TransactionClient, job: PracticeWrite, head: string) {
    await tx.activityPracticeGitJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', resultingHead: head, content: '', completedAt: new Date(), workerId: null, leaseExpiresAt: null, failureCode: null } })
    if (job.operation === 'INIT') await tx.activityPracticeWorkspace.update({ where: { id: job.workspaceId }, data: { initializedAt: new Date() } })
  }
  return { async processNext(workerId: string) {
    const row = await deps.prisma.$transaction(async tx => {
      const ids = await tx.$queryRaw<Array<{ practice_git_job_id: string }>>`SELECT j.practice_git_job_id FROM activity_practice_git_jobs j JOIN activity_practice_workspaces w ON w.practice_workspace_id = j.workspace_id JOIN repositories r ON r.repository_id = w.repository_id WHERE r.storage_status = 'READY' AND ((j.status = 'PENDING' AND j.available_at <= now()) OR (j.status = 'RUNNING' AND j.lease_expires_at <= now())) ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`
      if (!ids[0]) return null
      return tx.activityPracticeGitJob.update({ where: { id: ids[0].practice_git_job_id }, data: { status: 'RUNNING', workerId, claimAttempt: { increment: 1 }, leaseExpiresAt: new Date(Date.now() + 120000) }, include: { workspace: { include: { repository: true } } } })
    })
    if (!row) return false
    const job: PracticeWrite = { ...row, repositoryId: row.workspace.repositoryId, studentId: row.workspace.studentId, entryClassName: row.workspace.entryClassName, storagePath: row.workspace.repository.storagePath ?? '' }
    try {
      const receipt = await deps.writer.receipt(job)
      if (!receipt && !await practiceEligible(deps.prisma, row.workspace.activityId, job.studentId)) throw new PracticeWriteError('PRACTICE_ACCESS_REVOKED')
      const head = receipt ?? await deps.writer.prepare(job)
      await deps.prisma.activityPracticeGitJob.updateMany({ where: { id: job.id, workerId, claimAttempt: row.claimAttempt, status: 'RUNNING' }, data: { publishStarted: true } })
      await deps.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT practice_git_job_id FROM activity_practice_git_jobs WHERE practice_git_job_id = ${job.id}::uuid FOR UPDATE`
        const current = await tx.activityPracticeGitJob.findUniqueOrThrow({ where: { id: job.id } })
        if (current.workerId !== workerId || current.claimAttempt !== row.claimAttempt || current.status !== 'RUNNING' || !current.leaseExpiresAt || current.leaseExpiresAt <= new Date()) throw new PracticeWriteError('PRACTICE_LEASE_LOST')
        const published = await deps.writer.receipt(job)
        if (published) { await complete(tx, job, published); return }
        await lockPracticePolicy(tx, row.workspace.activityId, job.studentId)
        if (!await practiceEligible(tx, row.workspace.activityId, job.studentId)) throw new PracticeWriteError('PRACTICE_ACCESS_REVOKED')
        await deps.writer.publish(job, head)
        await complete(tx, job, head)
      }, { timeout: 60000 })
    } catch (e) {
      const current = await deps.prisma.activityPracticeGitJob.findUnique({ where: { id: job.id } })
      if (!current || current.workerId !== workerId || current.claimAttempt !== row.claimAttempt || current.status !== 'RUNNING') return true
      const terminal = e instanceof PracticeWriteError && e.code !== 'PRACTICE_LEASE_LOST' || !current.publishStarted && current.claimAttempt >= 3
      const code = e instanceof PracticeWriteError ? e.code : 'PRACTICE_RETRY'
      await deps.prisma.activityPracticeGitJob.updateMany({ where: { id: job.id, status: 'RUNNING', workerId, claimAttempt: row.claimAttempt }, data: terminal
        ? { status: code === 'PRACTICE_HEAD_CHANGED' ? 'CONFLICTED' : 'FAILED', failureCode: code, completedAt: new Date(), content: '', workerId: null, leaseExpiresAt: null }
        : { status: 'PENDING', availableAt: new Date(Date.now() + 30000), failureCode: code, workerId: null, leaseExpiresAt: null } })
      deps.logger.warn({ event: 'practice.save_deferred', jobId: job.id, code }, 'Practice save did not complete')
    }
    return true
  } }
}
