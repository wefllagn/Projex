import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import {
  AdminAuditEventsPage,
  AdminOperationalListPage,
  AdminOperationsOverviewPage,
} from './AdminOperationsViews.jsx'

const page = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
}

const timestamps = {
  availableAt: '2031-01-01T00:00:00.000Z',
  claimedAt: null,
  leaseExpiresAt: null,
  completedAt: null,
  createdAt: '2031-01-01T00:00:00.000Z',
  updatedAt: '2031-01-02T00:00:00.000Z',
}

function listResponse(data) {
  return { data, pagination: { ...page, totalItems: data.length } }
}

function renderRoute(ui, route = '/admin/operations') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

describe('Phase 10D.3 admin operational views', () => {
  it('shows measured health and storage without fabricating worker or capacity state', async () => {
    const api = {
      getOperationalHealth: vi.fn().mockResolvedValue({ data: {
        api: { status: 'available' },
        database: { status: 'connected' },
        queues: {
          source: 'persisted_job_and_lease_state',
          execution: { byStatus: { QUEUED: 2 }, stuck: 1 },
          repositoryProvisioning: { byStatus: { FAILED: 1 }, stuck: 0 },
        },
        workerHealth: { status: 'not_observed' },
        timestamp: timestamps.updatedAt,
      } }),
      getStorageSummary: vi.fn().mockResolvedValue({ data: {
        byStorageStatus: { READY: 2, FAILED: 1 },
        knownMeasuredBytes: '2048',
        measuredRecords: 2,
        unmeasuredRecords: 1,
      } }),
    }

    renderRoute(<AdminOperationsOverviewPage api={api} />)

    expect(await screen.findByText('Not observed')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByText('1 lease-derived stuck record')).toBeInTheDocument()
    expect(screen.queryByText(/capacity percentage|worker online|integrity verified/i)).not.toBeInTheDocument()
    expect(api.getOperationalHealth).toHaveBeenCalledTimes(1)
  })

  it('renders the structured degraded observation instead of claiming worker failure', async () => {
    const api = {
      getOperationalHealth: vi.fn().mockResolvedValue({ data: {
        api: { status: 'available' },
        database: { status: 'unavailable' },
        queues: { status: 'unavailable', source: 'database_unavailable' },
        workerHealth: { status: 'not_observed' },
        timestamp: timestamps.updatedAt,
      }, meta: { httpStatus: 503 } }),
      getStorageSummary: vi.fn().mockRejectedValue(new ApiError({ status: 503 })),
    }

    renderRoute(<AdminOperationsOverviewPage api={api} />)

    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Not observed')).toBeInTheDocument()
    expect(screen.getAllByText(/temporarily unavailable/i)).toHaveLength(2)
    expect(screen.queryByText(/worker offline/i)).not.toBeInTheDocument()
  })

  it('uses server filters for execution jobs and displays only sanitized evidence', async () => {
    const api = { listExecutionJobs: vi.fn().mockResolvedValue(listResponse([{
      id: 'execution-job-1',
      jobType: 'OFFICIAL_ASSESSMENT',
      submissionId: 'submission-1',
      practiceExecutionId: null,
      status: 'RUNNING',
      claimAttempt: 2,
      maxClaimAttempts: 3,
      failureCode: 'SAFE_FAILURE',
      stuck: true,
      rawOutput: 'private compiler output',
      workerId: 'private-host',
      ...timestamps,
    }])) }

    renderRoute(<AdminOperationalListPage kind="execution" api={api} />, '/admin/operations/execution-jobs?status=RUNNING&jobType=OFFICIAL_ASSESSMENT&stuck=true&sortBy=updatedAt&sortOrder=asc')

    expect(await screen.findByText('Lease-derived stuck')).toBeInTheDocument()
    expect(screen.getByText('Safe failure')).toBeInTheDocument()
    expect(screen.queryByText(/private compiler output|private-host/i)).not.toBeInTheDocument()
    expect(api.listExecutionJobs).toHaveBeenCalledWith(expect.objectContaining({
      page: 1, pageSize: 20, status: 'RUNNING', jobType: 'OFFICIAL_ASSESSMENT',
      stuck: 'true', sortBy: 'updatedAt', sortOrder: 'asc',
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('preserves the retry reason and adopts the newest job version after a stale conflict', async () => {
    const failed = {
      id: 'provisioning-job-1', repositoryId: 'repository-1', status: 'FAILED',
      claimAttempt: 3, maxClaimAttempts: 3, failureCode: 'GIT_COMMAND_FAILED', stuck: false,
      ...timestamps,
    }
    const refreshed = { ...failed, updatedAt: '2031-01-03T00:00:00.000Z' }
    const queued = { ...refreshed, status: 'PENDING', failureCode: null }
    const api = {
      listProvisioningJobs: vi.fn()
        .mockResolvedValueOnce(listResponse([failed]))
        .mockResolvedValueOnce(listResponse([refreshed]))
        .mockResolvedValueOnce(listResponse([queued])),
      retryProvisioningJob: vi.fn()
        .mockRejectedValueOnce(new ApiError({ status: 409, code: 'STALE_PROVISIONING_JOB_VERSION' }))
        .mockResolvedValueOnce({ data: queued }),
    }
    const user = userEvent.setup()

    renderRoute(<AdminOperationalListPage kind="provisioning" api={api} />, '/admin/operations/repository-provisioning-jobs?status=FAILED')
    await user.click(await screen.findByRole('button', { name: 'Review retry' }))
    const dialog = screen.getByRole('dialog')
    const reason = within(dialog).getByLabelText('Reason')
    await user.type(reason, 'Approved controlled retry after review.')
    await user.click(within(dialog).getByRole('button', { name: 'Queue retry' }))

    expect(await within(dialog).findByText(/latest job version was loaded/i)).toBeInTheDocument()
    expect(reason).toHaveValue('Approved controlled retry after review.')
    await user.click(within(dialog).getByRole('button', { name: 'Queue retry' }))

    await waitFor(() => expect(api.retryProvisioningJob).toHaveBeenLastCalledWith('provisioning-job-1', {
      reason: 'Approved controlled retry after review.',
      expectedUpdatedAt: refreshed.updatedAt,
    }))
    expect(await screen.findByText(/retry queued/i)).toBeInTheDocument()
  })

  it('disables stale retry when the authoritative version cannot be reloaded', async () => {
    const failed = {
      id: 'provisioning-job-2', repositoryId: 'repository-2', status: 'FAILED',
      claimAttempt: 3, maxClaimAttempts: 3, failureCode: 'GIT_COMMAND_FAILED', stuck: false,
      ...timestamps,
    }
    const api = {
      listProvisioningJobs: vi.fn()
        .mockResolvedValueOnce(listResponse([failed]))
        .mockRejectedValueOnce(new ApiError({ status: 503 })),
      retryProvisioningJob: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_PROVISIONING_JOB_VERSION' })),
    }
    const user = userEvent.setup()

    renderRoute(<AdminOperationalListPage kind="provisioning" api={api} />)
    await user.click(await screen.findByRole('button', { name: 'Review retry' }))
    const dialog = screen.getByRole('dialog')
    const reason = within(dialog).getByLabelText('Reason')
    await user.type(reason, 'Approved retry requires current evidence.')
    await user.click(within(dialog).getByRole('button', { name: 'Queue retry' }))

    expect(await within(dialog).findByText(/latest job version could not be loaded/i)).toBeInTheDocument()
    expect(reason).toHaveValue('Approved retry requires current evidence.')
    expect(within(dialog).getByRole('button', { name: 'Queue retry' })).toBeDisabled()
  })

  it('revokes eligible credential metadata and handles an idempotent response truthfully', async () => {
    const credential = {
      id: 'credential-1', userId: 'user-1', repositoryId: 'repository-1',
      allowedOperations: ['READ'], lifecycle: 'EXPIRED', createdAt: timestamps.createdAt,
      expiresAt: timestamps.availableAt, lastUsedAt: null, revokedAt: null,
      plaintextSecret: 'must-not-render', verifierHash: 'must-not-render',
    }
    const revoked = { ...credential, lifecycle: 'REVOKED', revokedAt: timestamps.updatedAt }
    const api = {
      listGitCredentials: vi.fn().mockResolvedValueOnce(listResponse([credential])).mockResolvedValueOnce(listResponse([revoked])),
      revokeGitCredential: vi.fn().mockResolvedValue({ data: { changed: false } }),
    }
    const user = userEvent.setup()

    renderRoute(<AdminOperationalListPage kind="credentials" api={api} />, '/admin/operations/git-credentials?lifecycle=EXPIRED&operation=READ')
    await user.click(await screen.findByRole('button', { name: 'Revoke' }))
    const dialog = screen.getByRole('dialog')
    const reason = within(dialog).getByLabelText('Reason')
    expect(reason).toBeRequired()
    expect(reason).toHaveAttribute('minlength', '10')
    await user.type(reason, 'Approved expiry cleanup.')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke credential' }))

    expect(api.revokeGitCredential).toHaveBeenCalledWith('credential-1', { reason: 'Approved expiry cleanup.' })
    expect(await screen.findByText('The Git credential was already revoked.')).toBeInTheDocument()
    expect(screen.queryByText(/must-not-render/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /issue credential/i })).not.toBeInTheDocument()
  })

  it('uses server-backed audit filters and renders only allowlisted event metadata', async () => {
    const api = { listAuditEvents: vi.fn().mockResolvedValue(listResponse([{
      id: 'audit-event-1', action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId: 'user-2',
      reason: 'Approved account status correction.', requestId: 'request-1', createdAt: timestamps.createdAt,
      actorAdmin: { id: 'admin-1', fullName: 'Synthetic Admin', email: 'admin@example.test' },
      metadata: { previousStatus: 'INACTIVE', newStatus: 'ACTIVE', revokedSessionCount: 1, storagePath: 'private-path', token: 'private-token' },
    }])) }
    const user = userEvent.setup()

    renderRoute(<AdminAuditEventsPage api={api} />, '/admin/audit-events?action=USER_STATUS_CHANGED&targetType=USER&sortOrder=asc')
    await user.click(await screen.findByRole('button', { name: 'View details' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Inactive')).toBeInTheDocument()
    expect(within(dialog).getByText('Active')).toBeInTheDocument()
    expect(within(dialog).queryByText(/private-path|private-token|storage path|token/i)).not.toBeInTheDocument()
    expect(api.listAuditEvents).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_STATUS_CHANGED', targetType: 'USER', sortOrder: 'asc' }), expect.any(Object))
  })
})
