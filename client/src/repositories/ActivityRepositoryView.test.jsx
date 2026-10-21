import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ActivityRepositoryView } from './ActivityRepositoryView.jsx'
import { ApiError } from '../api/api-client.js'
const activity = { id: 'activity', classId: 'class', title: 'Loops', status: 'PUBLISHED', dueState: 'OPEN', dueDate: '2099-01-01T00:00:00Z' }
const repository = { id: 'repo', repositoryName: 'Loops workspace', repositoryType: 'ACTIVITY_WORKSPACE', activityId: activity.id, owner: { userId: 'student', fullName: 'Student' }, visibility: 'PRIVATE', defaultBranch: 'main', status: 'ACTIVE', storageStatus: 'READY', createdAt: '2026-01-01T00:00:00Z' }
const head = { commitId: 'a'.repeat(40), authorName: 'Student', authoredAt: '2026-01-01T00:00:00Z', subject: 'Save loops', branchName: 'main', isDefault: true }
function dependencies(empty = false) {
  return { getAccess: vi.fn().mockResolvedValue({ data: { id: 'repo', gitPermissions: { read: true, write: false, canUpdateMain: false } } }), getSummary: vi.fn().mockResolvedValue({ data: { repositoryId: repository.id, repositoryStatus: 'ACTIVE', storageStatus: 'READY', empty, defaultBranch: 'main', commitCount: empty ? 0 : 1, branchCount: empty ? 0 : 1, latestCommit: empty ? null : head } }), listBranches: vi.fn().mockResolvedValue({ data: [head] }), getTree: vi.fn().mockResolvedValue({ data: { commitId: head.commitId, path: '', entries: [{ name: 'Main.java', path: 'Main.java', entryType: 'blob', objectId: 'b'.repeat(40), sizeBytes: 20 }] } }), getFile: vi.fn().mockResolvedValue({ data: { commitId: head.commitId, path: 'Main.java', encoding: 'utf-8', content: 'class Main {}', sizeBytes: 20 } }), listCommits: vi.fn().mockResolvedValue({ data: [head], pagination: { page: 1, totalPages: 1, totalItems: 1 } }), getCommit: vi.fn().mockResolvedValue({ data: { ...head, parentCommitIds: [], files: [] } }), getTransportUrl: vi.fn().mockReturnValue('http://localhost/git/repo'), issueCredential: vi.fn() }
}
function mount(gitApi, props = {}, entry = '/?classId=class') {
  return render(<MemoryRouter initialEntries={[entry]}><ActivityRepositoryView repository={repository} activity={activity} role="student" owner gitApi={gitApi} onReload={vi.fn()} {...props} /></MemoryRouter>)
}
describe('unified Activity repository', () => {
  it('shares the snapshot file browser and opens actual commit details with no Group controls', async () => {
    const gitApi = dependencies()
    mount(gitApi)
    fireEvent.click(await screen.findByRole('button', { name: 'File Main.java' }))
    expect(await screen.findByText('class Main {}')).toBeInTheDocument()
    expect(gitApi.getFile).toHaveBeenCalledWith(repository.id, { commitId: head.commitId, path: 'Main.java' }, expect.any(Object))
    fireEvent.click(screen.getByRole('button', { name: 'Save loops', exact: true }))
    expect(await screen.findByRole('heading', { name: 'Save loops' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Commits' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Members' })).not.toBeInTheDocument()
    expect(gitApi.issueCredential).not.toHaveBeenCalled()
  })
  it('keeps the empty state concise and exposes native Git only through Code', async () => {
    const gitApi = dependencies(true)
    mount(gitApi)
    expect(await screen.findByRole('heading', { name: 'No commits yet' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('main · no commits')
    expect(screen.getAllByRole('link', { name: 'Open IDE' })[0]).toHaveAttribute('href', '/student/activity/activity/workspace?classId=class')
    expect(screen.queryByText(/git checkout/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(screen.getByRole('dialog', { name: 'Activity native Git access' })).toBeInTheDocument()
    expect(gitApi.issueCredential).not.toHaveBeenCalled()
  })
  it('preserves source/search during temporary refresh failures and clears it on confirmed denial', async () => {
    const gitApi = dependencies()
    mount(gitApi)
    await screen.findByLabelText('Search files')
    gitApi.getSummary.mockRejectedValueOnce(new ApiError({ status: 503 }))
    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByRole('button', { name: 'Reload repository' }))
    await screen.findByRole('button', { name: 'Retry refresh' })
    expect(screen.getByLabelText('Search files')).toBeInTheDocument()
    gitApi.getSummary.mockRejectedValueOnce(new ApiError({ status: 403 }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }))
    await waitFor(() => expect(screen.queryByLabelText('Search files')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Code' })).toBeDisabled()
  })
  it('fails closed on a mismatched refreshed summary', async () => {
    const gitApi = dependencies()
    mount(gitApi)
    await screen.findByLabelText('Search files')
    gitApi.getSummary.mockResolvedValueOnce({ data: { repositoryId: 'wrong', empty: true } })
    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByRole('button', { name: 'Reload repository' }))
    await waitFor(() => expect(screen.queryByLabelText('Search files')).not.toBeInTheDocument())
  })
  it('retains repository browsing without inventing an IDE link if the Activity is unavailable', async () => {
    mount(dependencies(true), { activity: null, activityUnavailable: true })
    await screen.findByRole('heading', { name: 'No commits yet' })
    expect(screen.queryByRole('link', { name: 'Open IDE' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Repositories' })).toHaveAttribute('href', '/student/repositories')
    expect(screen.getByText('Linked Activity unavailable')).toBeInTheDocument()
  })
  it.each([{ role: 'student', owner: true, activity: { ...activity, status: 'CLOSED', dueState: 'CLOSED' } }, { role: 'instructor', owner: false }])('offers read-only native Git for closed Activities and instructors', async (props) => {
    mount(dependencies(true), props)
    fireEvent.click(await screen.findByRole('button', { name: 'Code' }))
    fireEvent.click(screen.getByRole('button', { name: 'Get Git access' }))
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    if (props.role === 'instructor') expect(screen.queryByRole('link', { name: 'Open IDE' })).not.toBeInTheDocument()
  })
})
