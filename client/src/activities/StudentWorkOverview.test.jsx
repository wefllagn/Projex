import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { ClassContext } from '../classes/class-context.js'
import StudentWorkOverview from './StudentWorkOverview.jsx'

const classRecord = { id: 'class-one', className: 'Programming' }
const pagination = { totalItems: 3, totalPages: 1, hasPreviousPage: false, hasNextPage: false }
const rows = ['assigned', 'missing', 'done'].map((state, index) => ({ id: String(index), kind: 'activity', class: { id: 'class-one' }, title: `Task ${index}`, dueDate: '2099-01-01', workState: state }))
function show(client) {
  render(<MemoryRouter initialEntries={['/student/activity?classId=class-one&view=work']}><AuthContext.Provider value={{ user: { fullName: 'Synthetic Student' } }}><ClassContext.Provider value={{ selectedClass: classRecord }}><StudentWorkOverview client={client} /></ClassContext.Provider></AuthContext.Provider></MemoryRouter>)
}
describe('Student own-work overview', () => {
  it('uses actual work states, class-scoped links and server filtering', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: rows, pagination }) }
    const user = userEvent.setup()
    show(client)
    expect(await screen.findByRole('link', { name: /Task 0/ })).toHaveAttribute('href', '/student/activity/0?classId=class-one')
    expect(screen.getByRole('heading', { name: 'Synthetic Student' })).toBeInTheDocument()
    expect(screen.getByText('Submitted', { selector: '.academic-work-state' })).toBeInTheDocument()
    expect(screen.getByText('Missing', { selector: '.academic-work-state' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Task filter'), 'done')
    await waitFor(() => expect(client.get).toHaveBeenLastCalledWith(expect.stringContaining('state=done'), expect.any(Object)))
    expect(client.get).toHaveBeenLastCalledWith(expect.stringContaining('classId=class-one'), expect.any(Object))
  })
  it('rejects a mismatched class instead of displaying another class records', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [{ ...rows[0], class: { id: 'other-class' } }], pagination }) }
    show(client)
    expect(await screen.findByRole('alert')).toHaveTextContent('The work list does not match this class.')
    expect(screen.queryByRole('link', { name: /Task 0/ })).not.toBeInTheDocument()
  })
})
