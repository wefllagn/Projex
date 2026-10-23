import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { GitCheckpointError } from '../../infrastructure/git/git-activity-checkpoint-writer.js'
import type { ClaimedRepositoryCheckpointJob, RepositoryCheckpointQueue } from '../../infrastructure/job-queue/repository-checkpoint-queue.js'
import type { GitTransportAccess } from '../git-transport/git-transport.types.js'
import { createActivityWorkspaceCheckpointWorkerService } from './activity-workspace-checkpoint-worker.service.js'

const now = new Date('2030-01-01T00:00:00.000Z')
const job: ClaimedRepositoryCheckpointJob = {
  id: '11111111-1111-4111-8111-111111111111',
  repositoryId: '22222222-2222-4222-8222-222222222222',
  activityId: '33333333-3333-4333-8333-333333333333',
  studentId: '44444444-4444-4444-8444-444444444444',
  sourceCode: 'public class Main {}',
  expectedHeadCommitHash: null,
  entryFilePath: 'Main.java',
  storagePath: 'repositories/22/22/repository.git',
  defaultBranch: 'main',
  workerId: 'worker-1',
  claimAttempt: 1,
  maxClaimAttempts: 3,
}

function writableAccess(): GitTransportAccess {
  return {
    repositoryId: job.repositoryId, repositoryType: 'ACTIVITY_WORKSPACE', ownerId: job.studentId,
    status: 'ACTIVE', storageStatus: 'READY', storagePath: job.storagePath, defaultBranch: 'main', reviewStatus: 'WORKING',
    user: { id: job.studentId, role: 'STUDENT', status: 'ACTIVE' },
    repositoryMember: { memberRole: 'OWNER', status: 'ACTIVE' }, teamMember: null, projectTask: null, classWorkspace: null,
    activityWorkspace: { status: 'PUBLISHED', dueDate: new Date('2030-01-02T00:00:00.000Z'), class: { status: 'ACTIVE', instructorId: null, teachingStaff: [], membership: { status: 'ACTIVE' } } },
    teamLeadStudentId: null,
  }
}

function queue() {
  return {
    claimNext: vi.fn(),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue('failed'),
  } satisfies RepositoryCheckpointQueue
}

describe('Activity Workspace checkpoint worker', () => {
  it('revalidates write authorization before writing and records the commit', async () => {
    const jobs = queue()
    const writer = { write: vi.fn().mockResolvedValue({ commitHash: 'a'.repeat(40) }) }
    const service = createActivityWorkspaceCheckpointWorkerService({
      queue: jobs,
      writer,
      accessRepository: { findAccess: vi.fn().mockResolvedValue(writableAccess()) } as never,
      logger: pino({ level: 'silent' }),
      now: () => now,
    })
    await service.process(job)
    expect(writer.write).toHaveBeenCalledWith(expect.objectContaining(job))
    const beforePush = writer.write.mock.calls[0]![0].beforePush
    await expect(beforePush()).resolves.toBeUndefined()
    expect(jobs.complete).toHaveBeenCalledWith({ job, commitHash: 'a'.repeat(40), now })
  })

  it('marks an expected-head race as a conflict without retrying', async () => {
    const jobs = queue()
    jobs.fail.mockResolvedValue('conflicted')
    const service = createActivityWorkspaceCheckpointWorkerService({
      queue: jobs,
      writer: { write: vi.fn().mockRejectedValue(new GitCheckpointError('CHECKPOINT_HEAD_CHANGED', true)) },
      accessRepository: { findAccess: vi.fn().mockResolvedValue(writableAccess()) } as never,
      logger: pino({ level: 'silent' }),
      now: () => now,
    })
    await service.process(job)
    expect(jobs.fail).toHaveBeenCalledWith({ job, failureCode: 'CHECKPOINT_HEAD_CHANGED', conflict: true, retryable: false, now })
    expect(jobs.complete).not.toHaveBeenCalled()
  })
})
