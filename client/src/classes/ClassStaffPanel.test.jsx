import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassStaffPanel } from './ClassStaffPanel.jsx'

const mocks = vi.hoisted(() => ({
  user: { id: 'primary-1' },
  api: {
    listClassStaff: vi.fn(),
    transferPrimary: vi.fn(),
    leaveClassStaff: vi.fn(),
  },
  refreshClasses: vi.fn(),
}))

vi.mock('../auth/auth-context.js', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('./class-context.js', () => ({ useClasses: () => ({ api: mocks.api, refreshClasses: mocks.refreshClasses }) }))

const classRecord = { id: 'class-1', status: 'ACTIVE', instructor: { userId: 'primary-1' } }

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.user.id = 'primary-1'
})

describe('teaching staff access changes', () => {
  it('routes a former Primary away after choosing to leave during transfer', async () => {
    mocks.api.listClassStaff.mockResolvedValue({ data: { primary: { fullName: 'Primary' }, coInstructors: [{ userId: 'co-1', fullName: 'Co Instructor' }] } })
    mocks.api.transferPrimary.mockResolvedValue({ data: { instructorId: 'co-1' } })
    mocks.refreshClasses.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/instructor/class-info']}><Routes>
      <Route path="/instructor/class-info" element={<ClassStaffPanel classRecord={classRecord} />} />
      <Route path="/instructor/classes" element={<p>Class list</p>} />
    </Routes></MemoryRouter>)

    await user.selectOptions(await screen.findByLabelText('New Primary'), 'co-1')
    await user.selectOptions(screen.getByLabelText('Former Primary access'), 'LEAVE')
    await user.click(screen.getByRole('button', { name: 'Transfer Primary' }))

    expect(await screen.findByText('Class list')).toBeInTheDocument()
    expect(mocks.api.transferPrimary).toHaveBeenCalledWith('class-1', 'co-1', 'LEAVE')
    await waitFor(() => expect(mocks.refreshClasses).toHaveBeenCalledOnce())
    expect(mocks.api.listClassStaff).toHaveBeenCalledOnce()
  })
})
