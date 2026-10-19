import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GroupMembersView } from './GroupMembersView.jsx'

const repository = { id: 'repo', projectTaskId: 'task', owner: { userId: 'owner' } }
const members = [{ memberId: 'm1', userId: 'owner', fullName: 'Maintainer Name', memberRole: 'OWNER', membershipStatus: 'ACTIVE' }, { memberId: 'm2', userId: 'member', fullName: 'Developer Name', memberRole: 'MEMBER', membershipStatus: 'ACTIVE', updatedAt: '2026-10-18T00:00:00Z' }]
const pending = { invitationId: 'i1', repositoryId: 'repo', projectTaskId: 'task', invitee: { userId: 'pending', fullName: 'Pending Name' }, status: 'PENDING', expiresAt: '2099-10-30T00:00:00Z' }
function props(overrides = {}) { return { role: 'student', owner: true, repository, project: { classId: 'class', maxTeamSize: 8 }, members, invitations: [pending, { ...pending, invitationId: 'old', invitee: { userId: 'old', fullName: 'Historical Name' }, status: 'ACCEPTED' }], permissions: { canInviteMembers: true, canManageMembers: true }, reasons: {}, setReasons: vi.fn(), onTransition: vi.fn(), onRefresh: vi.fn().mockResolvedValue(), ...overrides } }

describe('Compact Group members and invitations', () => {
  it('confirms member removal before invoking the unchanged transition', async () => {
    const values = props()
    render(<GroupMembersView {...values} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
    expect(values.onTransition).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Remove Member' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Remove' }))
    await waitFor(() => expect(values.onTransition).toHaveBeenCalledWith(members[1], 'REMOVE', undefined))
  })

  it('confirms revocation and refreshes through the existing invitation API', async () => {
    const api = { revokeInvitation: vi.fn().mockResolvedValue({ data: pending }) }
    const values = props({ api })
    render(<GroupMembersView {...values} />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke', exact: true }))
    expect(api.revokeInvitation).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Revoke Invitation' })).getByRole('button', { name: 'Confirm Revoke' }))
    await waitFor(() => expect(api.revokeInvitation).toHaveBeenCalledWith(pending.invitationId, {}))
    expect(values.onRefresh).toHaveBeenCalled()
  })

  it('shows actual configured capacity, reservations and secondary invitation history', () => {
    render(<GroupMembersView {...props({ project: { maxTeamSize: 4 } })} />)
    expect(screen.getByRole('heading', { name: 'Members', exact: true })).toBeInTheDocument()
    expect(screen.getByText('2/4 members')).toBeInTheDocument()
    expect(screen.getByText('1 pending')).toBeInTheDocument()
    expect(screen.getByText('1 slot available')).toBeInTheDocument()
    expect(screen.getByText('Historical Name').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('searches loaded roster, excludes known members/pending, paginates and sends through existing API', async () => {
    const classApi = { listMembers: vi.fn().mockResolvedValueOnce({ data: [...members.map(({ userId, fullName }) => ({ userId, fullName })), { userId: 'pending', fullName: 'Pending Name' }, { userId: 'candidate', fullName: 'Candidate Name' }], pagination: { page: 1, hasNextPage: true } }).mockResolvedValue({ data: [{ userId: 'another', fullName: 'Another Classmate' }], pagination: { page: 2, hasNextPage: false } }) }
    const api = { createInvitation: vi.fn().mockResolvedValue({ data: { ...pending, invitationId: 'new', invitee: { userId: 'candidate', fullName: 'Candidate Name' } } }) }
    const options = props({ classApi, api })
    const user = userEvent.setup()
    render(<GroupMembersView {...options} />)
    await user.click(screen.getByRole('button', { name: 'Invite Member' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite Member' })
    expect(await within(dialog).findByRole('radio', { name: 'Candidate Name' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: /Maintainer|Developer|Pending/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Load more classmates' }))
    expect(await within(dialog).findByRole('radio', { name: 'Another Classmate' })).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Search loaded classmates'), 'candidate')
    expect(within(dialog).queryByRole('radio', { name: 'Another Classmate' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: 'Candidate Name' }))
    await user.click(within(dialog).getByRole('button', { name: 'Send Invitation' }))
    expect(api.createInvitation).toHaveBeenCalledWith('repo', { inviteeUserId: 'candidate' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(options.onRefresh).toHaveBeenCalledOnce()
    expect(screen.getByText('Invitation sent.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite Member' })).toHaveFocus()
  })

  it('keeps backend failures visible, refreshes authority, traps focus and closes on Escape', async () => {
    const options = props({ classApi: { listMembers: vi.fn().mockResolvedValue({ data: [{ userId: 'candidate', fullName: 'Candidate Name' }], pagination: { page: 1, hasNextPage: false } }) }, api: { createInvitation: vi.fn().mockRejectedValue(new Error('ineligible')) } })
    const user = userEvent.setup()
    render(<GroupMembersView {...options} />)
    await user.click(screen.getByRole('button', { name: 'Invite Member' }))
    const dialog = screen.getByRole('dialog')
    await user.click(await within(dialog).findByRole('radio', { name: 'Candidate Name' }))
    await user.click(within(dialog).getByRole('button', { name: 'Send Invitation' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(options.onRefresh).toHaveBeenCalledOnce()
    within(dialog).getByRole('button', { name: 'Close dialog' }).focus()
    await user.tab({ shift: true })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides invitation controls from Developers and permits reasoned Instructor correction only', async () => {
    const { rerender } = render(<GroupMembersView {...props({ owner: false, permissions: { canInviteMembers: false, canManageMembers: false } })} />)
    expect(screen.queryByRole('button', { name: 'Invite Member' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    const onTransition = vi.fn()
    rerender(<GroupMembersView {...props({ role: 'instructor', owner: false, onTransition, permissions: { canInviteMembers: false, canManageMembers: true } })} />)
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Invite Member' })).not.toBeInTheDocument()
  })
})
