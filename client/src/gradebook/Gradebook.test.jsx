import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClassContext } from '../classes/class-context.js'
import Gradebook from './Gradebook.jsx'

const selectedClass = { id: 'class-one' }
const data = {
  activities: [{ id: 'a', title: 'First', totalPoints: 100 }, { id: 'b', title: 'Second', totalPoints: 50 }, { id: 'c', title: 'Pending work', totalPoints: 100 }],
  rows: [{ studentId: 'own', fullName: 'Own Student', earned: 135, possible: 150, percentage: 90, scores: [{ activityId: 'a', status: 'RELEASED', earned: 90, possible: 100, hasUnreleasedAttempt: true }, { activityId: 'b', status: 'RELEASED', earned: 45, possible: 50 }, { activityId: 'c', status: 'PENDING' }] }],
}
const view = client => <ClassContext.Provider value={{ selectedClass }}><Gradebook client={client} /></ClassContext.Provider>

describe('Class Gradebook', () => {
  it('shows persisted totals and distinguishes an unreleased attempt without turning it into zero', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data }) }
    render(view(client))
    expect(await screen.findByText('135 / 150')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('Pending assessment')).toBeInTheDocument()
    expect(screen.getByText(/Another attempt not released/)).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grading period' }), 'UNASSIGNED')
    await waitFor(() => expect(client.get).toHaveBeenLastCalledWith('/classes/class-one/gradebook?period=UNASSIGNED', expect.any(Object)))
  })

  it('clears the previous period while loading and supports a failed request retry', async () => {
    const client = { get: vi.fn().mockResolvedValueOnce({ data }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { activities: [], rows: [] } }) }
    render(view(client))
    await screen.findByText('135 / 150')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Grading period' }), 'MIDTERM')
    expect(screen.queryByText('135 / 150')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No published Activities in this grading period.')).toBeInTheDocument()
  })
})
