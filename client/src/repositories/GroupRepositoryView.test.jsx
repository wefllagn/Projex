import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GroupRepositoryView } from './GroupRepositoryView.jsx'
import { GroupCodeMenu } from './GroupCodeMenu.jsx'

const repository = { id: 'group-repo', projectTaskId: 'project-1', teamId: 'team-1', repositoryName: 'Enrollment repository', repositoryType: 'CLASS_PROJECT', defaultBranch: 'main', status: 'ACTIVE', storageStatus: 'READY', reviewStatus: 'WORKING', owner: { userId: 'a', fullName: 'Student A' }, updatedAt: '2026-10-18T00:00:00Z' }
const keys = ['canRead', 'canWrite', 'canUpdateMain', 'canManageMembers', 'canInviteMembers', 'canReview', 'canRequestChanges', 'canSubmitForReview', 'canViewActivity', 'canEditFeedback', 'canArchive', 'canRestore']
function context(overrides = {}) {
  return { repositoryId: repository.id, project: { id: 'project-1', title: 'Enrollment System', dueDate: '2099-10-30T00:00:00Z', status: 'PUBLISHED' }, class: { id: 'class-1', className: 'CS101', status: 'ACTIVE' }, team: { id: 'team-1', name: 'Group 3', status: 'ACTIVE', activeMemberCount: 2 }, teachingStaff: [{ userId: 'i', fullName: 'Teacher', role: 'PRIMARY' }], currentRole: 'DEVELOPER', permissions: { ...Object.fromEntries(keys.map((key) => [key, false])), canRead: true, canWrite: true, canViewActivity: true }, ...overrides }
}
const branch = { branchName: 'main', isDefault: true, commitId: 'a'.repeat(40), authorName: 'Claimed Author', authoredAt: '2026-10-18T00:00:00Z', subject: 'Add enrollment form' }
function dependencies(value = context()) {
  return {
    api: { getGroupContext: vi.fn().mockResolvedValue({ data: value }), listMembers: vi.fn().mockResolvedValue({ data: [{ memberId: 'm', userId: 'a', fullName: 'Student A', teamRole: 'LEAD', memberRole: 'OWNER' }] }), listFeedback: vi.fn().mockResolvedValue({ data: [] }), listRecordedActivity: vi.fn().mockResolvedValue({ data: { repositoryId: repository.id, events: [], contributions: [], pagination: { page: 1, totalPages: 0 } } }) },
    gitApi: { getTransportUrl: vi.fn().mockReturnValue('http://localhost:3300/api/v1/git/repositories/group-repo'), getSummary: vi.fn().mockResolvedValue({ data: { repositoryId: repository.id, repositoryStatus: 'ACTIVE', storageStatus: 'READY', empty: false, defaultBranch: 'main', branchCount: 1, commitCount: 1, latestCommit: branch } }), listBranches: vi.fn().mockResolvedValue({ data: [branch] }), getTree: vi.fn().mockResolvedValue({ data: { commitId: branch.commitId, path: '', entries: [{ name: 'README.md', path: 'README.md', entryType: 'blob', objectId: 'b'.repeat(40), sizeBytes: 40 }] } }), getFile: vi.fn().mockResolvedValue({ data: { commitId: branch.commitId, path: 'README.md', encoding: 'utf-8', content: '<img src=x onerror="alert(1)">', sizeBytes: 40 } }), issueCredential: vi.fn().mockResolvedValue({ data: { credentialId: 'credential', repositoryId: repository.id, username: 'synthetic-user', secret: 'synthetic-test-secret', operations: ['READ', 'WRITE'], createdAt: '2026-10-18T00:00:00Z', expiresAt: '2099-10-18T00:00:00Z' } }) },
  }
}
afterEach(() => vi.useRealTimers())
describe('Group Repository MVP', () => {
  it('uses real academic context and branch tip, escapes README, and marks main protected', async () => {
    const deps = dependencies()
    render(<MemoryRouter><GroupRepositoryView repository={repository} role="student" {...deps} onReload={vi.fn()} /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Enrollment System' })).toBeInTheDocument()
    expect(screen.getByText('Group Project · CS101 · Group 3')).toBeInTheDocument()
    expect(await screen.findByText('Add enrollment form')).toBeInTheDocument()
    expect(await screen.findByText('<img src=x onerror="alert(1)">')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Code' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Activity' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Branches' }))
    expect(await screen.findByText('Protected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Merge' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Members' }))
    await waitFor(() => expect(deps.api.listMembers).toHaveBeenCalled())
    await waitFor(() => expect(screen.getAllByText('Maintainer')).toHaveLength(2))
    expect(screen.queryByRole('button', { name: /Send Invitation/ })).not.toBeInTheDocument()
  })

  it('keeps class-visible metadata separate from source and activity', async () => {
    const deps = dependencies(context({ currentRole: 'METADATA_ONLY', permissions: Object.fromEntries(keys.map((key) => [key, false])) }))
    render(<MemoryRouter><GroupRepositoryView repository={repository} role="student" {...deps} onReload={vi.fn()} /></MemoryRouter>)
    expect(await screen.findByText('Class-visible project metadata')).toBeInTheDocument()
    expect(deps.gitApi.getSummary).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Code' })).toBeDisabled()
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(deps.api.listRecordedActivity).not.toHaveBeenCalled()
  })

  it('retains an open token during unchanged authority refresh, but clears it when authority changes', async () => {
    const deps = dependencies()
    render(<MemoryRouter><GroupRepositoryView repository={repository} role="student" {...deps} onReload={vi.fn()} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Enrollment System' })
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(await screen.findByText('synthetic-test-secret')).toBeInTheDocument()
    const calls = deps.api.getGroupContext.mock.calls.length
    fireEvent.focus(window)
    await waitFor(() => expect(deps.api.getGroupContext.mock.calls.length).toBeGreaterThan(calls))
    expect(screen.getByText('synthetic-test-secret')).toBeInTheDocument()
    deps.api.getGroupContext.mockResolvedValue({ data: context({ permissions: { ...context().permissions, canWrite: false } }) })
    fireEvent.focus(window)
    await waitFor(() => expect(screen.queryByText('synthetic-test-secret')).not.toBeInTheDocument())
  })

  it.each([['DEVELOPER', true, ['READ', 'WRITE']], ['MAINTAINER', true, ['READ', 'WRITE']], ['INSTRUCTOR', false, ['READ']], ['DEVELOPER', false, ['READ']]])('derives scope from fresh server authority for %s writable=%s', async (currentRole, canWrite, operations) => {
    const live = context({ currentRole, permissions: { ...context().permissions, canWrite } })
    const deps = dependencies(live)
    render(<GroupCodeMenu repository={repository} context={context()} {...deps} available />)
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(await screen.findByText('synthetic-test-secret')).toBeInTheDocument()
    expect(deps.gitApi.issueCredential).toHaveBeenCalledWith(repository.id, operations)
    const cloneUrl = deps.gitApi.getTransportUrl.mock.results[0].value
    expect(cloneUrl).not.toContain('synthetic-test-secret')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('synthetic-test-secret')).not.toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('ignores late issuance after closing and unmounting', async () => {
    const deps = dependencies()
    let finish
    deps.gitApi.issueCredential.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const view = render(<GroupCodeMenu repository={repository} context={context()} {...deps} available />)
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    await waitFor(() => expect(deps.gitApi.issueCredential).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Close Code menu' }))
    await act(async () => finish({ data: { credentialId: 'late', repositoryId: repository.id, username: 'late', secret: 'late-test-secret', operations: ['READ'], expiresAt: '2099-10-18T00:00:00Z' } }))
    expect(screen.queryByText('late-test-secret')).not.toBeInTheDocument()
    view.unmount()
  })

  it('clears an expired token and never issues when fresh authority denies read', async () => {
    vi.useFakeTimers()
    const deps = dependencies()
    deps.gitApi.issueCredential.mockResolvedValue({ data: { credentialId: 'short', repositoryId: repository.id, username: 'short', secret: 'short-test-secret', operations: ['READ'], expiresAt: new Date(Date.now() + 1000).toISOString() } })
    const view = render(<GroupCodeMenu repository={repository} context={context()} {...deps} available />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Code' })))
    expect(screen.getByText('short-test-secret')).toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(1001))
    expect(screen.queryByText('short-test-secret')).not.toBeInTheDocument()
    view.unmount()
    vi.useRealTimers()
    const denied = dependencies(context({ permissions: { ...context().permissions, canRead: false, canWrite: false } }))
    render(<GroupCodeMenu repository={repository} context={context()} {...denied} available />)
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    await waitFor(() => expect(denied.api.getGroupContext).toHaveBeenCalled())
    expect(denied.gitApi.issueCredential).not.toHaveBeenCalled()
  })
})
