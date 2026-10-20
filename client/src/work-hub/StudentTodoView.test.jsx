import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from '../api/api-client.js'
import StudentTodoView from './StudentTodoView.jsx'
import { deadlineGroup } from './todo-grouping.js'

const classId = '00000000-0000-4000-8000-000000000001'
const classRecord = { id: classId, className: 'Programming', section: 'IT 1A', status: 'ACTIVE' }
const pagination = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
const row = { id: 'activity-1', title: 'Loop practice', kind: 'activity', dueDate: '2099-10-30T09:00:00Z', class: classRecord, hasSubmission: false }
const result = rows => ({ data: rows, pagination: { ...pagination, totalItems: rows.length } })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('Student To-do', () => {
  it('queries server-side tabs before paging and preserves class selection', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(result([row]))
    render(<MemoryRouter initialEntries={[`/student/todo?classId=${classId}`]}><StudentTodoView classes={[classRecord]} /></MemoryRouter>)
    expect(await screen.findByText('Loop practice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Assigned', exact: true })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Missing', exact: true })).not.toHaveAttribute('aria-current')
    fireEvent.click(screen.getByRole('link', { name: 'Missing', exact: true }))
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(`/work-hub/student/todo?page=1&pageSize=20&state=missing&classId=${classId}`, expect.any(Object)))
    fireEvent.click(screen.getByRole('link', { name: 'Done', exact: true }))
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(`/work-hub/student/todo?page=1&pageSize=20&state=done&classId=${classId}`, expect.any(Object)))
    expect(screen.getByLabelText('Filter by class')).toHaveValue(classId)
  })
  it('uses full row navigation, class labels and concise Ungraded completion', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(result([{ ...row, gradingMode: 'COMPLETION', completionState: 'COMPLETE' }]))
    render(<MemoryRouter initialEntries={['/student/todo?tab=done']}><StudentTodoView /></MemoryRouter>)
    const title = await screen.findByText('Loop practice')
    expect(title.closest('a')).toHaveAttribute('href', `/student/activity/activity-1?classId=${classId}`)
    expect(screen.getByText('Programming · IT 1A')).toBeInTheDocument()
    expect(screen.getByText('Ungraded · Complete')).toBeInTheDocument()
    expect(screen.queryByText(/score|0\/0/i)).not.toBeInTheDocument()
  })
  it('does not replace errors with an empty Done view and retries only on request', async () => {
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new ApiError({ status: 503 })).mockResolvedValue(result([]))
    render(<MemoryRouter initialEntries={['/student/todo?tab=done']}><StudentTodoView /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.queryByText('No completed work yet.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No completed work yet.')).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })
  it('discards an obsolete response after changing views', async () => {
    let resolveOld
    vi.spyOn(apiClient, 'get').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue(result([]))
    render(<MemoryRouter><StudentTodoView /></MemoryRouter>)
    fireEvent.click(screen.getByRole('link', { name: 'Done', exact: true }))
    await screen.findByText('No completed work yet.')
    resolveOld(result([row]))
    await waitFor(() => expect(screen.queryByText('Loop practice')).not.toBeInTheDocument())
  })
  it('preserves a bookmarked class filter while the bounded class catalog is incomplete', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(result([]))
    render(<MemoryRouter initialEntries={[`/student/todo?classId=${classId}`]}><StudentTodoView classes={[]} moreClasses onMoreClasses={vi.fn()} /></MemoryRouter>)
    await screen.findByText('No assigned work.')
    expect(screen.getByLabelText('Filter by class')).toHaveValue(classId)
    expect(screen.getByRole('option', { name: 'Selected class' }).selected).toBe(true)
    expect(get).toHaveBeenCalledWith(`/work-hub/student/todo?page=1&pageSize=20&state=assigned&classId=${classId}`, expect.any(Object))
  })
  it('ignores an obsolete failure after a newer tab has loaded', async () => {
    let rejectOld
    vi.spyOn(apiClient, 'get').mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject })).mockResolvedValue(result([]))
    render(<MemoryRouter><StudentTodoView /></MemoryRouter>)
    fireEvent.click(screen.getByRole('link', { name: 'Done', exact: true }))
    await screen.findByText('No completed work yet.')
    await act(async () => rejectOld(new ApiError({ status: 503 })))
    await waitFor(() => expect(screen.getByText('No completed work yet.')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
  it('loads search automatically after typing and cancels intermediate searches', async () => {
    vi.useFakeTimers()
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(result([row]))
    render(<MemoryRouter><StudentTodoView /></MemoryRouter>)
    await act(async () => {})
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search work'), { target: { value: 'Java' } })
    await act(async () => vi.advanceTimersByTime(200))
    fireEvent.change(screen.getByLabelText('Search work'), { target: { value: 'Loops' } })
    await act(async () => vi.advanceTimersByTime(299))
    expect(get).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTime(1))
    expect(get).toHaveBeenLastCalledWith('/work-hub/student/todo?page=1&pageSize=20&state=assigned&search=Loops', expect.any(Object))
    expect(get).toHaveBeenCalledTimes(2)
  })
  it('refreshes visible work and returning tabs, keeps rows during reads and stops after unmount', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    let finishRefresh
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(result([row]))
    const view = render(<MemoryRouter><StudentTodoView /></MemoryRouter>)
    await act(async () => {})
    get.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve }))
    fireEvent.focus(window)
    expect(screen.getByText('Loop practice')).toBeInTheDocument()
    expect(view.container.querySelector('.academic-todo')).toHaveAttribute('aria-busy', 'true')
    await act(async () => finishRefresh(result([row])))
    await act(async () => vi.advanceTimersByTime(30000))
    expect(get).toHaveBeenCalledTimes(3)
    visibility.mockReturnValue('hidden')
    fireEvent(document, new Event('visibilitychange'))
    await act(async () => vi.advanceTimersByTime(30000))
    expect(get).toHaveBeenCalledTimes(3)
    visibility.mockReturnValue('visible')
    fireEvent(document, new Event('visibilitychange'))
    await act(async () => {})
    expect(get).toHaveBeenCalledTimes(4)
    view.unmount()
    await act(async () => vi.advanceTimersByTime(60000))
    expect(get).toHaveBeenCalledTimes(4)
  })
  it('groups local dates across week and month boundaries', () => {
    const now = new Date(2026, 9, 30, 10)
    expect(deadlineGroup(null, now)).toBe('No due date')
    expect(deadlineGroup(new Date(2026,9,29,10).toISOString(),now)).toBe('Earlier')
    expect(deadlineGroup(new Date(2026,9,30,12).toISOString(),now)).toBe('Today')
    expect(deadlineGroup(new Date(2026,10,1,12).toISOString(),now)).toBe('This week')
    expect(deadlineGroup(new Date(2026,10,2,12).toISOString(),now)).toBe('Next week')
    expect(deadlineGroup(new Date(2026,10,9,12).toISOString(),now)).toBe('Later')
  })
})
