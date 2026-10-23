import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/api-client.js'
import InstructorReviewView from './InstructorReviewView.jsx'

const classes = [{ id: 'c1', className: 'Programming', status: 'ACTIVE' }, { id: 'c2', className: 'Capstone', status: 'ACTIVE' }]
const pagination = { page: 1, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
const row = { id: 'a', title: 'Current Activity', dueDate: '2026-10-30T00:00:00Z', gradingMode: 'COMPLETION', class: classes[1], submittedAttempts: 4, assignedStudents: 2, reviewedAttempts: 1, releasedAttempts: 0 }
afterEach(() => vi.restoreAllMocks())

describe('Instructor review navigation and refresh', () => {
  it('ignores a late prior-Class response and applies the selected Class to Project reviews too', async () => {
    let resolveOld
    const get = vi.spyOn(apiClient, 'get').mockImplementation(endpoint => {
      if (endpoint.includes('review-queue')) return Promise.resolve({ data: [], pagination })
      if (endpoint.includes('classId=c2')) return Promise.resolve({ data: [row], pagination })
      return new Promise(resolve => { resolveOld = resolve })
    })
    render(<MemoryRouter><InstructorReviewView classes={classes} /></MemoryRouter>)
    await waitFor(() => expect(resolveOld).toBeTypeOf('function'))
    fireEvent.click(screen.getByRole('combobox', { name: 'Filter by class' }))
    fireEvent.click(screen.getByRole('option', { name: 'Capstone' }))
    expect(await screen.findByText('Current Activity')).toBeInTheDocument()
    await act(async () => resolveOld({ data: [{ ...row, title: 'Stale Activity' }], pagination }))
    expect(screen.queryByText('Stale Activity')).not.toBeInTheDocument()
    expect(screen.getByText('Current Activity').closest('a')).toHaveAttribute('href', '/instructor/activity/a/submissions?classId=c2')
    expect(get).toHaveBeenCalledWith('/work-hub/instructor/review-queue?kind=repository&page=1&pageSize=20&classId=c2', expect.any(Object))
  })
  it('retains the current rows during automatic revalidation and replaces them only on success', async () => {
    let finishRefresh
    let activityReads = 0
    vi.spyOn(apiClient, 'get').mockImplementation(endpoint => {
      if (endpoint.includes('review-queue')) return Promise.resolve({ data: [], pagination })
      activityReads += 1
      if (activityReads === 1) return Promise.resolve({ data: [row], pagination })
      return new Promise(resolve => { finishRefresh = resolve })
    })
    render(<MemoryRouter><InstructorReviewView classes={classes} /></MemoryRouter>)
    await screen.findByText('Current Activity')
    act(() => window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(finishRefresh).toBeTypeOf('function'))
    expect(screen.getByText('Current Activity')).toBeInTheDocument()
    await act(async () => finishRefresh({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }))
    expect(await screen.findByText('No Activities to review.')).toBeInTheDocument()
    expect(screen.queryByText('Current Activity')).not.toBeInTheDocument()
  })
})
