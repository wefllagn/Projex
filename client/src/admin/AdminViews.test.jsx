import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AuthContext } from '../auth/auth-context.js'
import {
  AdminOverviewPage,
  AdminUserDetailPage,
  AdminUsersPage,
} from './AdminViews.jsx'

const directoryUser = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Synthetic Student',
  email: 'synthetic.student@slu.edu.ph',
  role: 'STUDENT',
  status: 'ACTIVE',
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-02T00:00:00.000Z',
}

function account(overrides = {}) {
  return {
    userId: directoryUser.id,
    fullName: directoryUser.fullName,
    universityEmail: directoryUser.email,
    role: directoryUser.role,
    status: directoryUser.status,
    createdAt: directoryUser.createdAt,
    updatedAt: directoryUser.updatedAt,
    passwordChangedAt: null,
    lastLoginAt: null,
    accountSetup: { state: 'COMPLETE', lastIssuedAt: null, expiresAt: null },
    sessions: { active: 2, revoked: 0, expired: 1 },
    memberships: [],
    ...overrides,
  }
}

function overview() {
  return {
    generatedAt: '2030-01-01T00:00:00.000Z',
    users: { total: 4, byRole: { STUDENT: 2, INSTRUCTOR: 1, ADMIN: 1 }, byStatus: { ACTIVE: 3, SETUP_PENDING: 1 }, accountSetup: { complete: 3, pending: 1, actionRequired: 0 } },
    academics: { classesByStatus: { ACTIVE: 2 }, membershipsByStatus: { ACTIVE: 3 }, activitiesByStatus: { PUBLISHED: 1 }, submissionsByStatus: { RELEASED: 2 }, projectTasksByStatus: { PUBLISHED: 1 }, teamsByStatus: { ACTIVE: 1 } },
    repositories: { byType: { PERSONAL: 1 }, byLifecycle: { ACTIVE: 1 }, byStorage: { READY: 1 }, byReview: { WORKING: 1 }, knownMeasuredBytes: '100', measuredRecords: 1, unmeasuredRecords: 0 },
    operations: { executionJobsByStatus: {}, provisioningJobsByStatus: {}, gitCredentials: { active: 0, expired: 0, revoked: 0 } },
  }
}

function locationProbe() {
  function Probe() {
    const location = useLocation()
    return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  }
  return <Probe />
}

function renderUsers(api, entry = '/admin/users') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="/admin/users" element={<><AdminUsersPage api={api} />{locationProbe()}</>} /></Routes>
    </MemoryRouter>,
  )
}

function renderDetail(api, authUser = { id: 'admin-1', fullName: 'Admin', role: 'ADMIN', status: 'ACTIVE' }) {
  return render(
    <AuthContext.Provider value={{ user: authUser }}>
      <MemoryRouter initialEntries={[`/admin/users/${directoryUser.id}`]}>
        <Routes>
          <Route path="/admin/users" element={<span>directory</span>} />
          <Route path="/admin/users/:userId" element={<AdminUserDetailPage api={api} />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function detailApi(summary = account()) {
  return {
    getUser: vi.fn().mockResolvedValue({ data: directoryUser }),
    getAccountSummary: vi.fn().mockResolvedValue({ data: summary }),
    updateUserStatus: vi.fn(),
    resendSetup: vi.fn(),
    revokeUserSessions: vi.fn(),
  }
}

describe('Phase 10D.1 admin views', () => {
  it('renders only authoritative overview metrics and an honest later-milestone boundary', async () => {
    const api = { getOverview: vi.fn().mockResolvedValue({ data: overview() }) }
    render(<MemoryRouter><AdminOverviewPage api={api} /></MemoryRouter>)
    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open detailed academic administration.' })).toHaveAttribute('href', '/admin/academic')
    expect(screen.queryByText(/74%|worker healthy|integrity verified/i)).not.toBeInTheDocument()
  })

  it('owns directory search, role, status, and pagination in the URL and sends them to the backend', async () => {
    const api = { listUsers: vi.fn().mockResolvedValue({ data: [directoryUser], pagination: { page: 2, totalPages: 3, totalItems: 41, hasPreviousPage: true, hasNextPage: true } }) }
    const user = userEvent.setup()
    renderUsers(api, '/admin/users?page=2&search=Synthetic&role=STUDENT&status=ACTIVE')
    expect(await screen.findByText('Synthetic Student')).toBeInTheDocument()
    expect(api.listUsers).toHaveBeenCalledWith({ page: 2, pageSize: 20, search: 'Synthetic', role: 'STUDENT', status: 'ACTIVE' }, expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('location')).toHaveTextContent('page=3')
  })

  it('shows truthful loading, empty, and request failure states without mock fallback', async () => {
    const api = { listUsers: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, totalPages: 0, totalItems: 0, hasPreviousPage: false, hasNextPage: false } }) }
    renderUsers(api)
    expect(screen.getByText('Loading Projex')).toBeInTheDocument()
    expect(await screen.findByText('No users match these filters.')).toBeInTheDocument()
    expect(screen.queryByText('Alyssa Mendoza')).not.toBeInTheDocument()
  })

  it('shows a safe directory error without substituting prototype users', async () => {
    const api = { listUsers: vi.fn().mockRejectedValue(new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Directory unavailable.' })) }
    renderUsers(api)
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i)
    expect(screen.queryByText('Alyssa Mendoza')).not.toBeInTheDocument()
  })

  it('provisions students and instructors without admin or role-change controls', async () => {
    const api = {
      listUsers: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, totalPages: 0, totalItems: 0, hasPreviousPage: false, hasNextPage: false } }),
      provisionStudent: vi.fn().mockResolvedValue({ data: { ...directoryUser, status: 'SETUP_PENDING' } }),
      provisionInstructor: vi.fn().mockResolvedValue({ data: { ...directoryUser, id: 'instructor-1', fullName: 'Synthetic Instructor', email: 'instructor@slu.edu.ph', role: 'INSTRUCTOR', status: 'SETUP_PENDING' } }),
    }
    const user = userEvent.setup()
    renderUsers(api)
    await screen.findByText('No users match these filters.')
    await user.click(screen.getByRole('button', { name: 'Add student' }))
    await user.type(screen.getByLabelText('Full name'), 'Synthetic Student')
    await user.type(screen.getByLabelText('University email'), 'synthetic.student@slu.edu.ph')
    await user.click(screen.getByRole('button', { name: 'Provision account' }))
    await screen.findByText(/was provisioned/i)
    expect(api.provisionStudent).toHaveBeenCalledWith({ fullName: 'Synthetic Student', universityEmail: 'synthetic.student@slu.edu.ph' })
    await user.click(screen.getByRole('button', { name: 'Add instructor' }))
    await user.type(screen.getByLabelText('Full name'), 'Synthetic Instructor')
    await user.type(screen.getByLabelText('University email'), 'instructor@slu.edu.ph')
    await user.click(screen.getByRole('button', { name: 'Provision account' }))
    await screen.findByText(/Synthetic Instructor was provisioned/i)
    expect(api.provisionInstructor).toHaveBeenCalledWith({ fullName: 'Synthetic Instructor', universityEmail: 'instructor@slu.edu.ph' })
    expect(screen.queryByRole('button', { name: /add admin|change role/i })).not.toBeInTheDocument()
  })

  it('fails closed when account projections do not match the route identity', async () => {
    const api = detailApi({ ...account(), userId: 'different-user' })
    renderDetail(api)
    expect(await screen.findByText('The request could not be completed. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('Synthetic Student')).not.toBeInTheDocument()
  })

  it('chains authoritative updatedAt values through consecutive status changes', async () => {
    const api = detailApi()
    api.updateUserStatus
      .mockResolvedValueOnce({ data: { ...directoryUser, status: 'SUSPENDED', updatedAt: '2030-01-03T00:00:00.000Z' } })
      .mockResolvedValueOnce({ data: { ...directoryUser, status: 'ACTIVE', updatedAt: '2030-01-04T00:00:00.000Z' } })
    const user = userEvent.setup()
    renderDetail(api)
    await screen.findByText('Synthetic Student')
    await user.click(screen.getByRole('button', { name: 'Change status' }))
    await user.selectOptions(screen.getByLabelText('New status'), 'SUSPENDED')
    await user.type(screen.getByLabelText('Reason'), 'Approved temporary account suspension.')
    await user.click(screen.getByRole('button', { name: 'Confirm status change' }))
    await screen.findByText('Account status changed to Suspended.')
    await user.click(screen.getByRole('button', { name: 'Change status' }))
    await user.selectOptions(screen.getByLabelText('New status'), 'ACTIVE')
    await user.type(screen.getByLabelText('Reason'), 'Approved account reactivation request.')
    await user.click(screen.getByRole('button', { name: 'Confirm status change' }))
    expect(api.updateUserStatus).toHaveBeenNthCalledWith(1, directoryUser.id, expect.objectContaining({ expectedUpdatedAt: directoryUser.updatedAt }))
    expect(api.updateUserStatus).toHaveBeenNthCalledWith(2, directoryUser.id, expect.objectContaining({ expectedUpdatedAt: '2030-01-03T00:00:00.000Z' }))
  })

  it('requires an administrative reason before submitting a status change', async () => {
    const api = detailApi()
    const user = userEvent.setup()
    renderDetail(api)
    await user.click(await screen.findByRole('button', { name: 'Change status' }))
    await user.click(screen.getByRole('button', { name: 'Confirm status change' }))
    expect(api.updateUserStatus).not.toHaveBeenCalled()
  })

  it('refetches a stale account while retaining the administrative reason for deliberate retry', async () => {
    const api = detailApi()
    api.updateUserStatus.mockRejectedValue(new ApiError({ status: 409, code: 'STALE_USER_VERSION', message: 'The user account changed.' }))
    api.getUser.mockResolvedValueOnce({ data: directoryUser }).mockResolvedValue({ data: { ...directoryUser, updatedAt: '2030-01-03T00:00:00.000Z' } })
    api.getAccountSummary.mockResolvedValueOnce({ data: account() }).mockResolvedValue({ data: account({ updatedAt: '2030-01-03T00:00:00.000Z' }) })
    const user = userEvent.setup()
    renderDetail(api)
    await screen.findByText('Synthetic Student')
    await user.click(screen.getByRole('button', { name: 'Change status' }))
    await user.type(screen.getByLabelText('Reason'), 'Approved temporary account suspension.')
    await user.click(screen.getByRole('button', { name: 'Confirm status change' }))
    expect(await screen.findByDisplayValue('Approved temporary account suspension.')).toBeInTheDocument()
    expect(screen.getByText(/latest account version has been loaded/i)).toBeInTheDocument()
    expect(api.getAccountSummary).toHaveBeenCalledTimes(2)
  })

  it('resends setup only through the real account flow and never displays a token', async () => {
    const pending = account({ status: 'SETUP_PENDING', accountSetup: { state: 'PENDING', lastIssuedAt: '2030-01-01T00:00:00.000Z', expiresAt: '2030-01-02T00:00:00.000Z' } })
    const api = detailApi(pending)
    api.getUser.mockResolvedValue({ data: { ...directoryUser, status: 'SETUP_PENDING' } })
    api.resendSetup.mockResolvedValue({ data: { setupLinkSent: true, setupToken: 'must-not-render' } })
    const user = userEvent.setup()
    renderDetail(api)
    await user.click(await screen.findByRole('button', { name: 'Resend setup instructions' }))
    expect(await screen.findByText(/instructions were sent/i)).toBeInTheDocument()
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument()
  })

  it.each([
    [429, 'SETUP_RESEND_COOLDOWN', 'A setup link was sent recently. Try again later.'],
    [409, 'ACCOUNT_NOT_SETUP_PENDING', 'This record changed while you were working. Refresh it before trying again.'],
  ])('shows the safe setup-resend rejection for HTTP %s', async (status, code, expectedMessage) => {
    const pending = account({ status: 'SETUP_PENDING', accountSetup: { state: 'PENDING', lastIssuedAt: null, expiresAt: null } })
    const api = detailApi(pending)
    api.getUser.mockResolvedValue({ data: { ...directoryUser, status: 'SETUP_PENDING' } })
    api.resendSetup.mockRejectedValue(new ApiError({
      status,
      code,
      message: status === 409 ? 'Backend-safe rejection.' : expectedMessage,
    }))
    const user = userEvent.setup()
    renderDetail(api)
    await user.click(await screen.findByRole('button', { name: 'Resend setup instructions' }))
    expect(await screen.findByText(expectedMessage)).toBeInTheDocument()
  })

  it('revokes aggregate active sessions with confirmation and a mandatory reason', async () => {
    const api = detailApi()
    api.revokeUserSessions.mockResolvedValue({ data: { userId: directoryUser.id, revokedSessionCount: 2, revokedAt: '2030-01-03T00:00:00.000Z' } })
    api.getAccountSummary.mockResolvedValueOnce({ data: account() }).mockResolvedValue({ data: account({ sessions: { active: 0, revoked: 2, expired: 1 } }) })
    const user = userEvent.setup()
    renderDetail(api)
    await user.click(await screen.findByRole('button', { name: 'Revoke active sessions' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/sign .* out of every active device/i)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Approved account security recovery.' } })
    await user.click(within(dialog).getByRole('button', { name: 'Revoke sessions' }))
    expect(await screen.findByText('2 active sessions revoked.')).toBeInTheDocument()
    expect(api.revokeUserSessions).toHaveBeenCalledWith(directoryUser.id, { reason: 'Approved account security recovery.' })
  })
})
