import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AdminUsersPage } from './AdminViews.jsx'
import { AdminClassListPage } from './AdminAcademicViews.jsx'
import { AdminAuditEventsPage } from './AdminOperationsViews.jsx'

const pagination = { page: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPreviousPage: false }
const account = { id: 'student-1', fullName: 'Current Student', email: 'current@integration.test', role: 'STUDENT', status: 'ACTIVE' }
const response = (data) => ({ data, pagination })
function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>Browser back</button> }

describe('Admin simplification regressions', () => {
  it('returns focus to Add User after dismissing a provisioning dialog', async () => {
    const api = { listUsers: vi.fn().mockResolvedValue(response([account])) }
    const user = userEvent.setup()
    render(<MemoryRouter><AdminUsersPage api={api} /></MemoryRouter>)
    await screen.findByText('Current Student')
    await user.click(screen.getByText('Add User'))
    await user.click(screen.getByRole('button', { name: 'Add student' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(document.querySelector('.admin-action-menu > summary')).toHaveFocus()
  })
  it('debounces bounded server search, preserves focus and restores URL-backed filters on Back', async () => {
    const api = { listUsers: vi.fn().mockResolvedValue(response([account])) }
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/admin/users?page=3']}><AdminUsersPage api={api} /><Back /></MemoryRouter>)
    await screen.findByText('Current Student')
    const search = screen.getByRole('searchbox', { name: 'Search' })
    await user.type(search, 'Current')
    expect(api.listUsers).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(2))
    expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20, search: 'Current' }), expect.any(Object))
    expect(search).toHaveFocus()
    await user.selectOptions(screen.getByLabelText('Role'), 'STUDENT')
    expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'STUDENT', search: 'Current' }), expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    await waitFor(() => expect(screen.getByLabelText('Role')).toHaveValue(''))
    expect(search).toHaveValue('Current')
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('ignores a late obsolete result even if transport ignores abort and recovers locally from denial', async () => {
    let resolve
    const api = { listUsers: vi.fn().mockImplementationOnce(() => new Promise((done) => { resolve = done })).mockResolvedValueOnce(response([account])).mockRejectedValueOnce(new ApiError({ status: 403, message: 'private SQL and endpoint', requestId: 'private-reference' })).mockResolvedValue(response([account])) }
    const user = userEvent.setup()
    render(<MemoryRouter><AdminUsersPage api={api} /></MemoryRouter>)
    await user.selectOptions(screen.getByLabelText('Role'), 'STUDENT')
    await screen.findByText('Current Student')
    await act(async () => resolve(response([{ ...account, fullName: 'Obsolete private result' }])))
    expect(screen.queryByText('Obsolete private result')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Status'), 'ACTIVE')
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/403|SQL|endpoint|private-reference/)
    expect(screen.queryByText('Current Student')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Current Student')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('ACTIVE')
  })

  it('automatically sends Class status and combined sort to the server', async () => {
    const api = { listAcademicClasses: vi.fn().mockResolvedValue(response([])) }
    const user = userEvent.setup()
    render(<MemoryRouter><AdminClassListPage api={api} /></MemoryRouter>)
    await user.selectOptions(screen.getByLabelText('Status'), 'ACTIVE')
    await user.selectOptions(screen.getByLabelText('Sort'), 'className:asc')
    expect(api.listAcademicClasses).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20, status: 'ACTIVE', sortBy: 'className', sortOrder: 'asc' }), expect.any(Object))
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('keeps Audit identifiers only in authorized details and automatically filters', async () => {
    const event = { id: 'event-1', action: 'CLASS_CREATED', targetType: 'CLASS', targetId: 'target-uuid', requestId: 'request-uuid', createdAt: '2030-01-01T00:00:00.000Z', actorAdmin: { id: 'admin-1', fullName: 'Review Admin', email: 'admin@integration.test' }, reason: null, metadata: {} }
    const api = { listAuditEvents: vi.fn().mockResolvedValue(response([event])) }
    const user = userEvent.setup()
    render(<MemoryRouter><AdminAuditEventsPage api={api} /></MemoryRouter>)
    await screen.findByText('Class created')
    expect(screen.queryByText(/target-uuid|request-uuid|No reason recorded/)).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Target type'), 'CLASS')
    expect(api.listAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: 'CLASS', pageSize: 20 }), expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'View details' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('target-uuid')).toBeInTheDocument()
    expect(within(dialog).getByText('request-uuid')).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View details' })).toHaveFocus()
  })
})
