import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ClassContext } from './class-context.js'
import { StudentInvitationProvider, StudentNotificationMenu } from './StudentInvitationNotifications.jsx'

const classRecord = { id: 'class-1', className: 'Programming Fundamentals', section: 'IT 1A', instructor: { fullName: 'Sam Cruz' } }
const invitation = { invitationId: 'invite-1', class: classRecord }
const envelope = rows => ({ data: rows, pagination: { page: 1, pageSize: 100, totalItems: rows.length, hasNextPage: false } })
function show(api) {
  const upsertClass = vi.fn()
  const view = render(<MemoryRouter><ClassContext.Provider value={{ api, classes: [], upsertClass }}><StudentInvitationProvider><StudentNotificationMenu /><main>Home classes</main></StudentInvitationProvider></ClassContext.Provider></MemoryRouter>)
  return { ...view, upsertClass }
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('Student invitation notifications', () => {
  it('shows a pending badge, opens invitations only in the overlay and adopts the accepted class once', async () => {
    let records = [invitation]
    const api = {
      listMyClassInvitations: vi.fn(() => Promise.resolve(envelope(records))),
      acceptClassInvitation: vi.fn(async () => { records = []; return { data: { class: classRecord } } }),
      declineClassInvitation: vi.fn(),
    }
    const user = userEvent.setup()
    const { upsertClass } = show(api)
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 pending class invitation' })
    expect(within(bell).getByText('!')).toBeInTheDocument()
    expect(screen.queryByText('Programming Fundamentals')).not.toBeInTheDocument()
    await user.click(bell)
    const overlay = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(await within(overlay).findByText('Programming Fundamentals')).toBeInTheDocument()
    await user.click(within(overlay).getByRole('button', { name: 'Join Class' }))
    expect(await within(overlay).findByText('Joined Programming Fundamentals.')).toBeInTheDocument()
    expect(upsertClass).toHaveBeenCalledWith(classRecord)
    expect(api.acceptClassInvitation).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Notifications', exact: true })).not.toHaveTextContent('!')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(bell).toHaveFocus()
  })
  it('keeps decline behind its existing confirmation and preserves invitations on cancel', async () => {
    const api = { listMyClassInvitations: vi.fn().mockResolvedValue(envelope([invitation])), acceptClassInvitation: vi.fn(), declineClassInvitation: vi.fn() }
    const user = userEvent.setup()
    show(api)
    await user.click(await screen.findByRole('button', { name: /Notifications, 1/ }))
    await user.click(await screen.findByRole('button', { name: 'Decline', exact: true }))
    const confirmation = screen.getByRole('dialog', { name: 'Decline invitation' })
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Programming Fundamentals')).toBeInTheDocument()
    expect(api.declineClassInvitation).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument()
  })
  it('reports a failed invitation read and retries without inventing a pending count', async () => {
    const api = { listMyClassInvitations: vi.fn().mockRejectedValue(new ApiError({ status: 503 })) }
    const user = userEvent.setup()
    show(api)
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.getByRole('button', { name: 'Notifications' })).not.toHaveTextContent('!')
    api.listMyClassInvitations.mockResolvedValue(envelope([]))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('You have no pending class invitations.')).toBeInTheDocument()
  })
  it('polls only while visible and aborts a pending badge read on unmount', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const api = { listMyClassInvitations: vi.fn().mockResolvedValue(envelope([])) }
    const view = show(api)
    await act(async () => {})
    await act(async () => vi.advanceTimersByTime(30000))
    expect(api.listMyClassInvitations).toHaveBeenCalledTimes(2)
    visibility.mockReturnValue('hidden')
    await act(async () => vi.advanceTimersByTime(60000))
    expect(api.listMyClassInvitations).toHaveBeenCalledTimes(2)
    visibility.mockReturnValue('visible')
    api.listMyClassInvitations.mockImplementationOnce(() => new Promise(() => {}))
    fireEvent(document, new Event('visibilitychange'))
    const signal = api.listMyClassInvitations.mock.calls.at(-1)[1].signal
    view.unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => vi.advanceTimersByTime(60000))
    expect(api.listMyClassInvitations).toHaveBeenCalledTimes(3)
  })
})
