import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RepositoryActivityPanel } from './RepositoryActivityPanel.jsx'

const first = {
  repositoryId: 'repo-1',
  events: [
    { id: 'event-2', activityType: 'PUSH', activityAt: '2026-09-24T10:00:00.000Z', actor: { userId: 'student-1', fullName: 'Verified Student' }, metadataJson: { unsafe: 'hidden' } },
    { id: 'event-1', activityType: 'REPOSITORY_PROVISIONED', activityAt: '2026-09-24T09:00:00.000Z', actor: null },
  ],
  contributions: [{ userId: 'student-1', fullName: 'Verified Student', acceptedPushes: 1 }],
  pagination: { page: 1, pageSize: 20, totalItems: 21, totalPages: 2, hasNextPage: true, hasPreviousPage: false },
}

describe('recorded repository activity', () => {
  it('shows authenticated push evidence without projecting raw metadata or percentages and pages explicitly', async () => {
    const api = { listRecordedActivity: vi.fn()
      .mockResolvedValueOnce({ data: first })
      .mockResolvedValueOnce({ data: { ...first, events: [], pagination: { ...first.pagination, page: 2, hasNextPage: false, hasPreviousPage: true } } }) }
    render(<RepositoryActivityPanel repositoryId="repo-1" api={api} />)
    expect(await screen.findByText('Accepted push')).toBeInTheDocument()
    expect(screen.getAllByText('Verified Student')).toHaveLength(2)
    expect(screen.getByText('1 accepted push')).toBeInTheDocument()
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(api.listRecordedActivity).toHaveBeenLastCalledWith('repo-1', { page: 2, pageSize: 20 }, expect.any(Object)))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('fails closed on a mismatched repository response', async () => {
    const api = { listRecordedActivity: vi.fn().mockResolvedValue({ data: { ...first, repositoryId: 'other-repo' } }) }
    render(<RepositoryActivityPanel repositoryId="repo-1" api={api} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/request could not be completed/i)
    expect(screen.queryByText('Accepted push')).not.toBeInTheDocument()
  })

  it('keeps the newer manual refresh when an older request finishes last', async () => {
    let finishOld
    const oldRequest = new Promise((resolve) => { finishOld = resolve })
    const api = { listRecordedActivity: vi.fn()
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce({ data: { ...first, events: [first.events[0]], contributions: first.contributions, pagination: { ...first.pagination, totalItems: 1, totalPages: 1, hasNextPage: false } } }) }
    render(<RepositoryActivityPanel repositoryId="repo-1" api={api} />)
    await waitFor(() => expect(api.listRecordedActivity).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('Accepted push')).toBeInTheDocument()
    expect(screen.queryByText('Repository provisioned')).not.toBeInTheDocument()
    await act(async () => { finishOld({ data: first }) })
    expect(screen.queryByText('Repository provisioned')).not.toBeInTheDocument()
  })
})
