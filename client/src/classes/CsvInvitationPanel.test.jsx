import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CsvInvitationPanel from './CsvInvitationPanel.jsx'

describe('student invitation CSV', () => {
  it('requires preview before confirmation and keeps the action explicitly invitation-only', async () => {
    const user = userEvent.setup()
    const api = {
      previewStudentInvitationCsv: vi.fn().mockResolvedValue({ data: { fingerprint: 'a'.repeat(64), valid: true, ready: 1, rows: [{ row: 2, email: 'student@slu.edu.ph', status: 'READY' }] } }),
      confirmStudentInvitationCsv: vi.fn().mockResolvedValue({ data: { invited: 1, alreadyMember: 0, alreadyPending: 0 } }),
    }
    render(<CsvInvitationPanel api={api} classId="class-1" />)
    expect(screen.getByText(/Invitations are not official enrollment/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm invitations' })).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText('Student invitation CSV'), new File(['email\nstudent@slu.edu.ph'], 'students.csv', { type: 'text/csv' }))
    await user.click(screen.getByRole('button', { name: 'Preview invitations' }))
    await waitFor(() => expect(api.previewStudentInvitationCsv).toHaveBeenCalledWith('class-1', 'email\nstudent@slu.edu.ph'))
    expect(api.confirmStudentInvitationCsv).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirm invitations' }))
    await waitFor(() => expect(api.confirmStudentInvitationCsv).toHaveBeenCalledWith('class-1', 'email\nstudent@slu.edu.ph', 'a'.repeat(64)))
    expect(screen.getByRole('status')).toHaveTextContent('invitations created')
  })
})
