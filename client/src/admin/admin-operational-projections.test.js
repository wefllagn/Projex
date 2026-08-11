import { describe, expect, it } from 'vitest'
import { AdminProjectionError } from './admin-projections.js'
import {
  projectAuditEvent,
  projectExecutionJob,
  projectGitCredential,
  projectOperationalHealth,
  projectProvisioningJob,
  projectStorageSummary,
} from './admin-operational-projections.js'

const timestamps = {
  availableAt: '2031-01-01T00:00:00.000Z',
  claimedAt: null,
  leaseExpiresAt: null,
  completedAt: null,
  createdAt: '2031-01-01T00:00:00.000Z',
  updatedAt: '2031-01-01T00:00:00.000Z',
}

describe('admin operational projection allowlists', () => {
  it('projects measured health without inventing worker state', () => {
    const projected = projectOperationalHealth({
      api: { status: 'available', private: 'omit' },
      database: { status: 'connected', databaseUrl: 'omit' },
      queues: {
        source: 'persisted_job_and_lease_state',
        execution: { byStatus: { QUEUED: 2 }, stuck: 1, workerId: 'omit' },
        repositoryProvisioning: { byStatus: { FAILED: 1 }, stuck: 0 },
      },
      workerHealth: { status: 'not_observed', healthy: true },
      timestamp: '2031-01-01T00:00:00.000Z',
    })
    expect(projected).toMatchObject({ workerStatus: 'not_observed', execution: { stuck: 1 } })
    expect(JSON.stringify(projected)).not.toMatch(/healthy|workerId|databaseUrl|private/i)
  })

  it('projects degraded health and exact storage measurements', () => {
    expect(projectOperationalHealth({
      api: { status: 'available' }, database: { status: 'unavailable' },
      queues: { status: 'unavailable', source: 'database_unavailable' },
      workerHealth: { status: 'not_observed' }, timestamp: null,
    })).toMatchObject({ databaseStatus: 'unavailable', execution: null })
    expect(projectStorageSummary({ byStorageStatus: { READY: 2 }, knownMeasuredBytes: '12345678901234567890', measuredRecords: 2, unmeasuredRecords: 1, capacity: 99 })).toEqual({
      byStorageStatus: { READY: 2 }, knownMeasuredBytes: '12345678901234567890', measuredRecords: 2, unmeasuredRecords: 1,
    })
  })

  it('projects job fields and drops raw operational evidence', () => {
    const execution = projectExecutionJob({ id: 'job-1', jobType: 'OFFICIAL_ASSESSMENT', submissionId: 'submission-1', practiceExecutionId: null, status: 'RUNNING', claimAttempt: 1, maxClaimAttempts: 3, failureCode: 'SAFE_FAILURE', stuck: true, workerId: 'omit', rawOutput: 'omit', ...timestamps })
    const provisioning = projectProvisioningJob({ id: 'job-2', repositoryId: 'repo-1', status: 'FAILED', claimAttempt: 3, maxClaimAttempts: 3, failureCode: 'GIT_COMMAND_FAILED', stuck: false, storagePath: 'omit', quarantineKey: 'omit', ...timestamps })
    expect(execution).toMatchObject({ jobId: 'job-1', stuck: true })
    expect(provisioning).toMatchObject({ repositoryId: 'repo-1', status: 'FAILED' })
    expect(JSON.stringify({ execution, provisioning })).not.toMatch(/workerId|rawOutput|storagePath|quarantineKey/i)
  })

  it('projects credential metadata without secrets or issuance fields', () => {
    const credential = projectGitCredential({ id: 'credential-1', userId: 'user-1', repositoryId: 'repo-1', allowedOperations: ['READ', 'WRITE', 'ADMIN'], lifecycle: 'ACTIVE', createdAt: timestamps.createdAt, expiresAt: timestamps.availableAt, lastUsedAt: null, revokedAt: null, secretHash: 'omit', plaintextSecret: 'omit' })
    expect(credential.allowedOperations).toEqual(['READ', 'WRITE'])
    expect(JSON.stringify(credential)).not.toMatch(/secret|hash|verifier/i)
  })

  it('allowlists audit metadata by action and drops arbitrary values', () => {
    const event = projectAuditEvent({
      id: 'event-1', action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId: 'user-2',
      reason: 'Approved status correction.', requestId: 'request-1', createdAt: timestamps.createdAt,
      actorAdmin: { id: 'admin-1', fullName: 'Admin User', email: 'admin@example.test' },
      metadata: { previousStatus: 'INACTIVE', newStatus: 'ACTIVE', revokedSessionCount: 2, storagePath: 'omit', token: 'omit' },
    })
    expect(event.metadata).toEqual({ previousStatus: 'INACTIVE', newStatus: 'ACTIVE', revokedSessionCount: 2 })
    expect(JSON.stringify(event)).not.toMatch(/storagePath|token/i)
  })

  it('fails closed on invalid identity, health, storage, and version values', () => {
    expect(() => projectExecutionJob({ id: '', ...timestamps })).toThrow(AdminProjectionError)
    expect(() => projectOperationalHealth({ api: { status: 'available' } })).toThrow(AdminProjectionError)
    expect(() => projectStorageSummary({ knownMeasuredBytes: '12 GB' })).toThrow(AdminProjectionError)
    expect(() => projectProvisioningJob({ id: 'job-1', repositoryId: 'repo-1', status: 'FAILED', updatedAt: null })).toThrow(AdminProjectionError)
  })
})
