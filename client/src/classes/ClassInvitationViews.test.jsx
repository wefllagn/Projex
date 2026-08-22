import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ClassContext } from './class-context.js'
import {
  InstructorClassInvitationPanel,
  StudentClassInvitationPanel,
} from './ClassInvitationViews.jsx'

const classRecord = {
  id: 'class-1',
  className: 'Programming Fundamentals',
  section: 'BSIT 1A',
  semester: 'First Semester',
  schoolYear: '2026-2027',
  status: 'ACTIVE',
  instructor: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}

function invitation(index) {
  return {
    invitationId: `invite-${index}`,
    status: 'PENDING',
    createdAt: `2026-08-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    respondedAt: null,
    class: {
      ...classRecord,
      id: undefined,
      classId: `class-${index}`,
      className: `Invited Class ${index}`,
    },
  }
}

function page(data, totalItems = data.length) {
  return {
    data,
    pagination: {
      page: 1,
      pageSize: 3,
      totalItems,
      totalPages: Math.ceil(totalItems / 3),
      hasNextPage: totalItems > 3,
      hasPreviousPage: false,
    },
  }
}

function renderWithClasses(element, value) {
  return render(
    <MemoryRouter>
      <ClassContext.Provider value={value}>{element}</ClassContext.Provider>
    </MemoryRouter>,
  )
}

describe('student class invitations', () => {
  it('hides an empty Home preview and limits a four-item preview to the newest three', async () => {
    const emptyApi = { listMyClassInvitations: vi.fn().mockResolvedValue(page([])) }
    const empty = renderWithClasses(
      <StudentClassInvitationPanel preview />,
      { api: emptyApi, upsertClass: vi.fn() },
    )
    await waitFor(() => expect(emptyApi.listMyClassInvitations).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Class Invitations' })).not.toBeInTheDocument()
    empty.unmount()

    const records = [invitation(4), invitation(3), invitation(2)]
    const api = { listMyClassInvitations: vi.fn().mockResolvedValue(page(records, 4)) }
    renderWithClasses(
      <StudentClassInvitationPanel preview />,
      { api, upsertClass: vi.fn() },
    )

    expect(await screen.findByText('Invited Class 4')).toBeInTheDocument()
    expect(screen.getByText('Invited Class 3')).toBeInTheDocument()
    expect(screen.getByText('Invited Class 2')).toBeInTheDocument()
    expect(screen.queryByText('Invited Class 1')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all 4 invitations' })).toHaveAttribute('href', '/student/invitations')
    expect(api.listMyClassInvitations).toHaveBeenCalledWith(
      { page: 1, pageSize: 3 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it.each([1, 3])('shows all %i pending invitations when the Home count is within the preview', async (count) => {
    const records = Array.from({ length: count }, (_, index) => invitation(count - index))
    renderWithClasses(
      <StudentClassInvitationPanel preview />,
      { api: { listMyClassInvitations: vi.fn().mockResolvedValue(page(records, count)) }, upsertClass: vi.fn() },
    )
    expect(await screen.findAllByRole('button', { name: 'Join Class' })).toHaveLength(count)
    expect(screen.queryByRole('link', { name: /View all/ })).not.toBeInTheDocument()
  })

  it('accepts once, adopts the authoritative class, and prevents duplicate clicks while pending', async () => {
    let resolveAccept
    const acceptPromise = new Promise((resolve) => { resolveAccept = resolve })
    const api = {
      listMyClassInvitations: vi.fn().mockResolvedValue(page([invitation(2), invitation(1)])),
      acceptClassInvitation: vi.fn().mockReturnValue(acceptPromise),
      declineClassInvitation: vi.fn(),
    }
    const upsertClass = vi.fn()
    const user = userEvent.setup()
    renderWithClasses(<StudentClassInvitationPanel />, { api, upsertClass })

    const joinButtons = await screen.findAllByRole('button', { name: 'Join Class' })
    const join = joinButtons[0]
    await user.click(join)
    expect(join).toBeDisabled()
    expect(joinButtons[1]).toBeDisabled()
    expect(api.acceptClassInvitation).toHaveBeenCalledTimes(1)
    resolveAccept({ data: { class: classRecord } })
    expect(await screen.findByText('Joined Programming Fundamentals.')).toBeInTheDocument()
    expect(upsertClass).toHaveBeenCalledWith(classRecord)
    expect(screen.queryByText('Invited Class 2')).not.toBeInTheDocument()
    expect(screen.getByText('Invited Class 1')).toBeInTheDocument()
  })

  it('requires confirmation before decline and reports request errors without mock fallback', async () => {
    const api = {
      listMyClassInvitations: vi.fn().mockResolvedValue(page([invitation(1)])),
      acceptClassInvitation: vi.fn(),
      declineClassInvitation: vi.fn().mockResolvedValue({ data: { status: 'DECLINED' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderWithClasses(<StudentClassInvitationPanel />, { api, upsertClass: vi.fn() })

    const decline = await screen.findByRole('button', { name: 'Decline' })
    await user.click(decline)
    expect(api.declineClassInvitation).not.toHaveBeenCalled()
    await user.click(decline)
    expect(api.declineClassInvitation).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Invitation to Invited Class 1 declined.')).toBeInTheDocument()
    expect(screen.queryByText('Invited Class 1')).not.toBeInTheDocument()
  })
})

describe('instructor class invitations', () => {
  it('checks an exact registered email, sends the invitation, and refreshes pending entries', async () => {
    const pending = {
      ...invitation(1),
      invitee: { fullName: 'Eligible Student', universityEmail: 'student@slu.edu.ph' },
    }
    const api = {
      listClassInvitations: vi.fn()
        .mockResolvedValueOnce(page([], 0))
        .mockResolvedValueOnce(page([pending], 1)),
      lookupInvitationStudent: vi.fn().mockResolvedValue({
        data: {
          eligibility: 'ELIGIBLE',
          student: pending.invitee,
          willReactivate: false,
        },
      }),
      createClassInvitation: vi.fn().mockResolvedValue({ data: pending }),
    }
    const user = userEvent.setup()
    renderWithClasses(
      <InstructorClassInvitationPanel />,
      { api, selectedClass: classRecord },
    )

    const input = screen.getByLabelText('University email')
    await user.type(input, 'STUDENT@SLU.EDU.PH')
    await user.click(screen.getByRole('button', { name: 'Check Student' }))
    expect(await screen.findByText('Eligible Student found.')).toBeInTheDocument()
    expect(api.lookupInvitationStudent).toHaveBeenCalledWith('STUDENT@SLU.EDU.PH', classRecord.id)
    await user.click(screen.getByRole('button', { name: 'Send Invitation' }))
    expect(await screen.findByText('Invitation created.')).toBeInTheDocument()
    expect(api.createClassInvitation).toHaveBeenCalledWith(classRecord.id, 'STUDENT@SLU.EDU.PH')
    expect(await screen.findByText('student@slu.edu.ph')).toBeInTheDocument()
  })

  it('shows truthful lookup outcomes and disables invitations for archived classes', async () => {
    const api = {
      listClassInvitations: vi.fn().mockResolvedValue(page([], 0)),
      lookupInvitationStudent: vi.fn().mockResolvedValue({ data: { eligibility: 'ALREADY_PENDING' } }),
    }
    const user = userEvent.setup()
    const rendered = renderWithClasses(
      <InstructorClassInvitationPanel />,
      { api, selectedClass: classRecord },
    )
    await user.type(screen.getByLabelText('University email'), 'student@slu.edu.ph')
    await user.click(screen.getByRole('button', { name: 'Check Student' }))
    expect(await screen.findByText('An invitation is already pending.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Invitation' })).toBeDisabled()
    rendered.unmount()

    renderWithClasses(
      <InstructorClassInvitationPanel />,
      { api, selectedClass: { ...classRecord, status: 'ARCHIVED' } },
    )
    expect(screen.getByText('Archived classes cannot create or respond to invitations.')).toBeInTheDocument()
    expect(screen.queryByLabelText('University email')).not.toBeInTheDocument()
  })
})
