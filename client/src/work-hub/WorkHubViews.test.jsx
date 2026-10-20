import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/api-client.js'
import { ReviewPreview, WorkHubList } from './WorkHubViews.jsx'

const pagination = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
const classRecord = { id: 'class-1', className: 'Programming 1', courseNumber: 'IT 112', officialClassCode: '9123A', academicPeriod: 'FIRST_SEMESTER', schoolYear: '2026-2027' }

afterEach(() => vi.restoreAllMocks())

describe('Academic Work Hub views', () => {
  it.each(['todo', 'submissions'])('keeps Ungraded %s links navigable and omits academic scores', async (view) => {
    const item = { id: view === 'todo' ? 'activity-1' : 'submission-1', kind: 'activity', activityId: 'activity-1', title: 'Practice', gradingMode: 'COMPLETION', completionState: 'COMPLETE', dueDate: '2026-10-30T00:00:00.000Z', submittedAt: '2026-10-01T00:00:00.000Z', status: 'released', finalScore: null, totalPoints: null, class: classRecord }
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [item], pagination })
    render(<MemoryRouter><WorkHubList view={view} /></MemoryRouter>)
    expect(await screen.findByText('Practice')).toBeInTheDocument()
    expect(view === 'todo' ? screen.getByText('Practice').closest('a') : screen.getByRole('link', { name: 'Open record' })).toHaveAttribute('href', view === 'todo' ? '/student/activity/activity-1?classId=class-1' : '/student/activity/activity-1/submissions/submission-1?classId=class-1')
    expect(screen.getByText(view === 'todo' ? 'Ungraded · Complete' : /Complete ·/)).toBeInTheDocument()
    expect(screen.queryByText(/Released score|0\/0|null\/null/)).not.toBeInTheDocument()
  })

  it.each([2, 3, 4])('renders all %i real preview records and requests only four', async (count) => {
    const rows = Array.from({ length: count }, (_, i) => ({ id: `s-${i}`, kind: 'submission', activityId: `a-${i}`, title: `Review ${i + 1}`, student: { fullName: `Student ${i}` }, action: 'Review submission', class: classRecord }))
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: rows })
    render(<MemoryRouter><ReviewPreview /></MemoryRouter>)
    expect(await screen.findByText('Review 1')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(count)
    expect(get).toHaveBeenCalledWith('/work-hub/instructor/review-queue?page=1&pageSize=4', expect.any(Object))
  })

  it('shows a pending Student attempt without unreleased score and supports bounded filters', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'submission-1', activityId: 'activity-1', activityTitle: 'Java exercise', attemptNumber: 2, submittedAt: '2026-10-01T00:00:00.000Z', status: 'assessed', class: classRecord }], pagination })
    render(<MemoryRouter><WorkHubList view="submissions" /></MemoryRouter>)
    expect(await screen.findByText('Java exercise')).toBeInTheDocument()
    expect(screen.getByText(/Result pending release/)).toBeInTheDocument()
    expect(screen.queryByText(/Released score/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open record' })).toHaveAttribute('href', '/student/activity/activity-1/submissions/submission-1?classId=class-1')
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'RELEASED' } })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/work-hub/student/submissions?page=1&pageSize=20&status=RELEASED', expect.any(Object)))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3))
  })

  it('shows exact Instructor review targets and an honest empty state', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: [{ id: 'submission-1', kind: 'submission', title: 'Java exercise', activityId: 'activity-1', student: { id: 'student-1', fullName: 'Student One' }, status: 'assessed', action: 'Review submission', class: classRecord }], pagination }).mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
    render(<MemoryRouter><WorkHubList view="review" /></MemoryRouter>)
    expect(await screen.findByText('Java exercise')).toBeInTheDocument()
    expect(screen.getByText(/Review submission/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open record' })).toHaveAttribute('href', '/instructor/activity/activity-1/submissions/submission-1?classId=class-1')
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'repository' } })
    expect(await screen.findByText('No records match these filters.')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/work-hub/instructor/review-queue?page=1&pageSize=20&kind=repository', expect.any(Object))
  })

  it('exposes a retry after a failed load', async () => {
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('network')).mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
    render(<MemoryRouter><WorkHubList view="todo" /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('The request could not be completed')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No assigned work.')).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })
})
