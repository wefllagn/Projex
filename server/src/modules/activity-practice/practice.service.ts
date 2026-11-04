import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { RepositoryContentService } from '../repository-content/repository-content.service.js'
import { AppError } from '../../shared/errors/app-error.js'
import { lockPracticePolicy, practiceBranch, practiceEligible } from './practice-policy.js'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function practiceError(code = 'PRACTICE_UNAVAILABLE', statusCode = 409): never {
  throw new AppError({ statusCode, code, message: 'Practice is unavailable. Return to the activity and try again.' })
}
export function createActivityPracticeService(deps: { prisma: PrismaClient; content: RepositoryContentService; enabled: boolean }) {
  const { prisma } = deps
  async function authorized(caller: SafeUserProfile, activityId: string) {
    if (!deps.enabled) practiceError('PRACTICE_UNAVAILABLE', 503)
    if (caller.role !== 'STUDENT' || caller.status !== 'ACTIVE' || !await practiceEligible(prisma, activityId, caller.id)) practiceError('PRACTICE_UNAVAILABLE', 404)
  }
  async function workspace(caller: SafeUserProfile, activityId: string) {
    await authorized(caller, activityId)
    const value = await prisma.activityPracticeWorkspace.findUnique({ where: { activityId_studentId: { activityId, studentId: caller.id } }, include: { repository: true, activity: { select: { classId: true } } } })
    if (!value) practiceError('PRACTICE_NOT_STARTED', 404)
    return value
  }
  return {
    async getJob(caller: SafeUserProfile, activityId: string, jobId: string) {
      const value = await workspace(caller, activityId)
      const job = await prisma.activityPracticeGitJob.findFirst({ where: { id: jobId, workspaceId: value.id } })
      if (!job) practiceError('PRACTICE_NOT_FOUND', 404)
      return { id: job.id, status: job.status, head: job.resultingHead, failureCode: job.failureCode }
    },
    async availability(caller: SafeUserProfile, activityId: string) {
      return { available: deps.enabled && caller.role === 'STUDENT' && caller.status === 'ACTIVE' && await practiceEligible(prisma, activityId, caller.id) }
    },
    async enter(caller: SafeUserProfile, activityId: string) {
      await authorized(caller, activityId)
      return prisma.$transaction(async tx => {
        // Serialize first entry, including late repository provisioning, without
        // broadening the ordinary repository creation endpoint's deadline policy.
        await tx.$queryRaw`SELECT activity_id FROM programming_activities WHERE activity_id = ${activityId}::uuid FOR UPDATE`
        await lockPracticePolicy(tx, activityId, caller.id)
        if (!await practiceEligible(tx, activityId, caller.id)) practiceError()
        let value = await tx.activityPracticeWorkspace.findUnique({ where: { activityId_studentId: { activityId, studentId: caller.id } } })
        if (!value) {
          const activity = await tx.programmingActivity.findUniqueOrThrow({ where: { id: activityId } })
          const repository = await tx.repository.findUnique({ where: { activityId_ownerId: { activityId, ownerId: caller.id } } })
            ?? await tx.repository.create({ data: { activityId, ownerId: caller.id, repositoryType: 'ACTIVITY_WORKSPACE', repositoryName: 'Activity workspace', slug: `activity-${activityId}`, visibility: 'PRIVATE',
              members: { create: { studentId: caller.id, memberRole: 'OWNER', status: 'ACTIVE', joinedAt: new Date(), lastActivatedAt: new Date() } }, provisioningJob: { create: {} } } })
          value = await tx.activityPracticeWorkspace.create({ data: { activityId, studentId: caller.id, repositoryId: repository.id,
            title: activity.title, instructions: activity.instructions, starterCode: activity.starterCode ?? '', entryClassName: activity.entryClassName } })
        }
        if (!value.initializedAt) {
          const job = await tx.activityPracticeGitJob.upsert({ where: { workspaceId_keyHash: { workspaceId: value.id, keyHash: hash('initialize') } },
            create: { workspaceId: value.id, keyHash: hash('initialize'), payloadHash: hash('initialize'), operation: 'INIT', content: value.starterCode }, update: {} })
          if (job.status === 'FAILED') await tx.activityPracticeGitJob.update({ where: { id: job.id }, data: { status: 'PENDING', content: value.starterCode, claimAttempt: 0, availableAt: new Date(), completedAt: null, failureCode: null, publishStarted: false } })
        }
        return { activityId, workspaceId: value.id }
      })
    },
    async get(caller: SafeUserProfile, activityId: string) {
      const value = await workspace(caller, activityId)
      const latest = await prisma.activityPracticeGitJob.findFirst({ where: { workspaceId: value.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
      const base = { activityId, classId: value.activity.classId, workspaceId: value.id, title: value.title, instructions: value.instructions,
        entryClassName: value.entryClassName, starterCode: value.starterCode, repositoryId: value.repositoryId, branchName: practiceBranch(value.id),
        ready: Boolean(value.initializedAt && value.repository.storageStatus === 'READY'),
        job: latest ? { id: latest.id, status: latest.status, operation: latest.operation, failureCode: latest.failureCode } : null }
      if (!base.ready) return { ...base, sourceCode: value.starterCode, head: null, canStartOver: false }
      let file
      try { file = await deps.content.file(caller, value.repositoryId, { branchName: practiceBranch(value.id), path: `${value.entryClassName}.java` }) }
      catch (e) {
        if (!(e instanceof AppError) || e.code !== 'GIT_CONTENT_NOT_FOUND') throw e
        const tree = await deps.content.tree(caller, value.repositoryId, { branchName: practiceBranch(value.id) })
        return { ...base, sourceCode: '', head: tree.commitId, canStartOver: true, entryMissing: true }
      }
      const tree = await deps.content.tree(caller, value.repositoryId, { commitId: file.commitId })
      return { ...base, sourceCode: file.content, head: file.commitId, canStartOver: file.content !== value.starterCode || tree.entries.length !== 1 }
    },
    async save(caller: SafeUserProfile, activityId: string, input: { operation: 'SAVE' | 'RESET'; sourceCode?: string; expectedHead: string; requestKey: string }) {
      const value = await workspace(caller, activityId)
      if (!value.initializedAt || value.repository.storageStatus !== 'READY') practiceError()
      const keyHash = hash(input.requestKey), payloadHash = hash(JSON.stringify(input))
      const job = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT practice_workspace_id FROM activity_practice_workspaces WHERE practice_workspace_id = ${value.id}::uuid FOR UPDATE`
        await lockPracticePolicy(tx, activityId, caller.id)
        if (!await practiceEligible(tx, activityId, caller.id)) practiceError()
        const existing = await tx.activityPracticeGitJob.findUnique({ where: { workspaceId_keyHash: { workspaceId: value.id, keyHash } } })
        if (existing) return existing
        if (await tx.activityPracticeGitJob.count({ where: { workspaceId: value.id, status: { in: ['PENDING', 'RUNNING'] } } })) practiceError('PRACTICE_SAVE_PENDING')
        return tx.activityPracticeGitJob.create({ data: { workspaceId: value.id, keyHash, payloadHash, operation: input.operation,
          expectedHead: input.expectedHead, content: input.operation === 'RESET' ? value.starterCode : input.sourceCode! } })
      })
      if (job.payloadHash !== payloadHash) practiceError('PRACTICE_REQUEST_CONFLICT')
      return { id: job.id, status: job.status, head: job.resultingHead }
    },
  }
}
