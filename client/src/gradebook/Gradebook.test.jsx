import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ClassContext } from '../classes/class-context.js'
import Gradebook, { PeriodResult } from './Gradebook.jsx'

const periods = ['PRELIM', 'MIDTERM', 'FINAL', 'UNASSIGNED'].map(period => ({ period, earned: period === 'PRELIM' ? 135 : 0, possible: period === 'PRELIM' ? 150 : 0, percentage: period === 'PRELIM' ? 90 : null, releasedCount: period === 'PRELIM' ? 2 : 0, activityCount: period === 'PRELIM' ? 5 : 0, provisional: period === 'PRELIM', outstandingAttemptCount: 0 }))
const overview = { viewerRole: 'INSTRUCTOR', rows: [{ studentId: 'alex', fullName: 'Alex Morgan', periods }] }
const scores = [
  { activityId: 'a', title: 'First Activity', gradingMode: 'GRADED', status: 'RELEASED', earned: 90, possible: 100, submissionId: 'latest', creditedSubmissionId: 'credited', outstandingSubmissionId: 'latest', outstandingAttemptStatus: 'PENDING', hasUnreleasedAttempt: true },
  ...['MISSING', 'FAILED_ASSESSMENT', 'AWAITING_REVIEW', 'REVIEWED_UNRELEASED', 'PENDING'].map((status, i) => ({ activityId: `b${i}`, title: status, gradingMode: 'GRADED', status, earned: null, possible: null, submissionId: status === 'MISSING' ? null : `s${i}` })),
]
const details = { viewerRole: 'INSTRUCTOR', studentId: 'alex', fullName: 'Alex Morgan', periods: periods.map(period => ({ ...period, activities: period.period === 'PRELIM' ? scores : [] })) }
function view(client, entry = '/instructor/gradebook?classId=class-one') {
  return <MemoryRouter initialEntries={[entry]}><ClassContext.Provider value={{ selectedClass: { id: 'class-one' } }}><Gradebook client={client} /></ClassContext.Provider></MemoryRouter>
}

describe('Student-centered Gradebook', () => {
  it('shows all period summaries and drills down to distinct states and the correct review/credited links', async () => {
    const client = { get: vi.fn(path => Promise.resolve({ data: path.endsWith('/overview') ? overview : details })) }
    render(view(client))
    expect(await screen.findByText(/135\/150 · 90% · Provisional/)).toBeInTheDocument()
    expect(screen.getByText(/2\/5 released/)).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Midterm' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Alex Morgan' }))
    expect(await screen.findByText('Failed assessment')).toBeInTheDocument()
    expect(screen.getByText('Missing', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Awaiting review', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Reviewed · not released')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Unassigned Activity records' })).toBeInTheDocument()
    const first = screen.getByRole('row', { name: /First Activity/ })
    expect(within(first).getByRole('link', { name: 'Open review' })).toHaveAttribute('href', '/instructor/activity/a/submissions/latest?classId=class-one')
    expect(within(first).getByRole('link', { name: 'Credited released result' })).toHaveAttribute('href', '/instructor/activity/a/submissions/credited?classId=class-one')
    await userEvent.click(screen.getByRole('link', { name: 'Back to Class overview' }))
    expect(screen.getByRole('link', { name: 'Alex Morgan' })).toBeInTheDocument()
  })
  it('opens only the authenticated Student record and uses Student submission routes', async () => {
    const client = { get: vi.fn(path => Promise.resolve({ data: path.endsWith('/overview') ? { ...overview, viewerRole: 'STUDENT' } : { ...details, viewerRole: 'STUDENT' } })) }
    render(view(client, '/student/gradebook?classId=class-one&studentId=someone-else'))
    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument()
    expect(client.get).toHaveBeenCalledWith('/classes/class-one/gradebook/students/alex', expect.any(Object))
    expect(screen.queryByRole('link', { name: 'Back to Class overview' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'View submission' })[0]).toHaveAttribute('href', '/student/activity/a/submissions/latest?classId=class-one')
  })
  it('retains a way back to the Class when Student detail cannot load', async () => {
    const client = { get: vi.fn(path => path.endsWith('/overview') ? Promise.resolve({ data: overview }) : Promise.reject(new Error('offline'))) }
    render(view(client))
    await userEvent.click(await screen.findByRole('link', { name: 'Alex Morgan' }))
    await screen.findByRole('button', { name: 'Try again' })
    await userEvent.click(screen.getByRole('link', { name: 'Back to Class overview' }))
    expect(screen.getByRole('link', { name: 'Alex Morgan' })).toBeInTheDocument()
  })
  it('hides stale totals during refresh, supports retry, and reports no enrolled Students', async () => {
    const client = { get: vi.fn().mockResolvedValueOnce({ data: overview }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { viewerRole: 'INSTRUCTOR', rows: [] } }) }
    render(view(client))
    await screen.findByText(/135\/150/)
    await userEvent.click(screen.getByRole('button', { name: 'Refresh grades' }))
    expect(screen.queryByText(/135\/150/)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No enrolled Students in this Class.')).toBeInTheDocument()
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(3))
  })
  it('distinguishes a released zero from an absent grade', () => {
    render(<PeriodResult period={{ ...periods[0], earned: 0, possible: 100, percentage: 0, releasedCount: 1, activityCount: 1, provisional: false }} />)
    expect(screen.getByText(/0\/100 · 0%/)).toBeInTheDocument()
    expect(screen.queryByText(/Provisional/)).not.toBeInTheDocument()
  })
})
