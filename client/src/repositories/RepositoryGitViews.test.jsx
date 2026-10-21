import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { CapabilityContext } from '../capabilities/capability-context.js'
import { HistoryView, BranchesView, RepositoryGitPanel } from './RepositoryGitViews.jsx'

const commitA = 'a'.repeat(40)
const commitB = 'b'.repeat(40)
const repository = {
  id: 'repo-1', repositoryType: 'PERSONAL', status: 'ACTIVE', storageStatus: 'READY',
  reviewStatus: 'WORKING', defaultBranch: 'main', owner: { userId: 'student-1', fullName: 'Student' },
}
const summary = {
  repositoryId: 'repo-1', repositoryStatus: 'ACTIVE', storageStatus: 'READY', empty: false,
  defaultBranch: 'main', branchCount: 1, commitCount: 2,
  latestCommit: { commitId: commitB, authorName: 'Git Author', authoredAt: '2026-08-01T00:00:00.000Z', subject: 'Latest' },
}

function apiMock(overrides = {}) {
  return {
    getAccess: vi.fn().mockResolvedValue({ data: { id: 'repo-1', gitPermissions: { read: true, write: false, canUpdateMain: false } } }),
    getSummary: vi.fn().mockResolvedValue({ data: summary }),
    listBranches: vi.fn().mockResolvedValue({ data: [{ ...summary.latestCommit, branchName: 'main', isDefault: true }] }),
    getTree: vi.fn().mockResolvedValue({ data: { commitId: commitB, path: '', entries: [{ name: 'README.md', path: 'README.md', entryType: 'blob', objectId: commitA, sizeBytes: 12 }] } }),
    getFile: vi.fn().mockResolvedValue({ data: { commitId: commitB, path: 'README.md', sizeBytes: 12, encoding: 'utf-8', content: '# Projex' } }),
    listCommits: vi.fn().mockResolvedValue({ data: [summary.latestCommit], pagination: { page: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false } }),
    getCommit: vi.fn().mockResolvedValue({ data: { ...summary.latestCommit, parentCommitIds: [commitA], files: [{ status: 'M', path: 'README.md' }] } }),
    getDiff: vi.fn().mockResolvedValue({ data: { baseCommitId: commitA, targetCommitId: commitB, path: null, patch: '+Projex' } }),
    getTransportUrl: vi.fn().mockReturnValue('http://localhost:3000/api/v1/git/repositories/repo-1'),
    listCredentials: vi.fn().mockResolvedValue({ data: [] }),
    issueCredential: vi.fn().mockResolvedValue({ data: { credentialId: 'credential-1', repositoryId: 'repo-1', operations: ['READ'], createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2099-08-01T00:15:00.000Z', lastUsedAt: null, revokedAt: null, username: 'credential-1', secret: 'synthetic-one-time-secret' } }),
    revokeCredential: vi.fn(),
    ...overrides,
  }
}

function renderWithCapabilities(ui, git) {
  return render(
    <CapabilityContext.Provider value={{ status: 'ready', profile: 'LOCAL_FULL', java: { execution: true }, git, refresh: vi.fn() }}>
      {ui}
    </CapabilityContext.Provider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function openGitAccess() {
  fireEvent.click(await screen.findByRole('button', { name: 'Code' }))
  fireEvent.click(screen.getByRole('button', { name: 'Get Git access' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeEnabled())
}
describe('repository Git panel', () => {
  it('groups Group commits by local date and retains copy, selection and parent comparisons', async () => {
    const commitC = 'c'.repeat(40)
    const patch = 'diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1 @@\n-old\n+new\n'
    const api = apiMock({
      listCommits: vi.fn().mockResolvedValue({ data: [summary.latestCommit, { ...summary.latestCommit, commitId: commitA, authoredAt: '2026-07-20T00:00:00Z', subject: 'Earlier' }], pagination: { page: 1, totalPages: 2, hasNextPage: true } }),
      getCommit: vi.fn().mockResolvedValue({ data: { ...summary.latestCommit, parentCommitIds: [commitA, commitC], files: [{ status: 'M', path: 'a' }] } }),
      getDiff: vi.fn((_id, query) => Promise.resolve({ data: { ...query, patch } })),
    })
    const copy = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } })
    render(<HistoryView group api={api} repositoryId={repository.id} summary={summary} branches={[]} selectedBranch="main" onSelectBranch={vi.fn()} />)
    await screen.findByText('Earlier')
    expect(screen.getAllByRole('heading', { name: /Commits on/ })).toHaveLength(2)
    expect(document.querySelector('.repository-git-commit-detail')).toBeNull()
    expect(screen.queryByText('About Git authors')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy commit hash bbbbbbbb' }))
    await screen.findByText('Copied!')
    expect(screen.queryByText('Commit hash copied.')).not.toBeInTheDocument()
    expect(document.querySelector('.group-copy-feedback')).toHaveAttribute('role', 'status')
    expect(copy).toHaveBeenCalledWith(commitB)
    fireEvent.click(screen.getByRole('button', { name: 'View commit bbbbbbbb' }))
    expect(screen.getByRole('button', { name: 'View commit bbbbbbbb' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByLabelText('Commit diff')).toHaveTextContent('new')
    fireEvent.change(screen.getByLabelText('Compare with parent'), { target: { value: commitC } })
    await waitFor(() => expect(api.getDiff).toHaveBeenLastCalledWith(repository.id, { baseCommitId: commitC, targetCommitId: commitB }, expect.any(Object)))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(api.listCommits).toHaveBeenLastCalledWith(repository.id, expect.objectContaining({ page: 2 }), expect.any(Object)))
  })

  it('presents Group branches as compact rows with main protection and no invented actions', () => {
    render(<BranchesView group summary={summary} branches={[{ ...summary.latestCommit, branchName: 'main', isDefault: true }]} />)
    expect(screen.getByText('Protected')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Merge|Pull Request/ })).not.toBeInTheDocument()
  })

  it('loads real tree and text content without mock fallback', async () => {
    const api = apiMock()
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: /README.md/i }))
    expect(await screen.findByText('# Projex')).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledWith('repo-1', { branchName: 'main', path: '' }, expect.any(Object))
    expect(api.getFile).toHaveBeenCalledWith('repo-1', { branchName: 'main', path: 'README.md' }, expect.any(Object))
    expect(screen.queryByText(/campus navigation/i)).not.toBeInTheDocument()
  })

  it('reuses Group file browsing for Activity repositories and pins reads to the selected commit', async () => {
    const api = apiMock()
    render(<RepositoryGitPanel repository={{ ...repository, repositoryType: 'ACTIVITY_WORKSPACE', activityId: 'activity-1' }} api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'File README.md' }))
    expect(await screen.findByText('# Projex')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search files' })).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledWith(repository.id, { commitId: commitB, path: '' }, expect.any(Object))
    expect(api.getFile).toHaveBeenCalledWith(repository.id, { commitId: commitB, path: 'README.md' }, expect.any(Object))
    fireEvent.click(screen.getByRole('button', { name: `View commit ${commitB.slice(0,8)}` }))
    expect(await screen.findByLabelText('Commit diff')).toHaveTextContent('Projex')
    expect(api.getCommit).toHaveBeenCalledWith(repository.id, commitB, expect.any(Object))
  })

  it('acknowledges browser checkpoints for an empty writable Activity repository', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    render(<RepositoryGitPanel owner repository={{ ...repository, repositoryType: 'ACTIVITY_WORKSPACE', activityId: 'a' }} activity={{ id: 'a', status: 'PUBLISHED', dueState: 'OPEN' }} api={api} />)
    expect(await screen.findByRole('heading', { name: 'No commits yet' })).toBeInTheDocument()
    expect(screen.getByText(/Save your first commit from the coding workspace with Save to Git/)).toBeInTheDocument()
    expect(screen.queryByText(/does not edit or commit files in the browser/)).not.toBeInTheDocument()
    expect(api.issueCredential).not.toHaveBeenCalled()
  })

  it('guides a Personal repository owner into the native Git initial-main workflow', async () => {
    const emptySummary = { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null }
    const api = apiMock({
      getAccess: vi.fn().mockResolvedValue({ data: { id: 'repo-1', gitPermissions: { read: true, write: true, canUpdateMain: true } } }),
      getSummary: vi.fn().mockResolvedValue({ data: emptySummary }),
      issueCredential: vi.fn().mockResolvedValue({ data: {
        credentialId: 'credential-write', repositoryId: 'repo-1', operations: ['READ', 'WRITE'],
        createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2099-08-01T00:15:00.000Z',
        lastUsedAt: null, revokedAt: null, username: 'credential-write', secret: 'synthetic-write-secret',
      } }),
    })
    render(<RepositoryGitPanel repository={repository} owner api={api} />)
    expect(await screen.findByText('Empty Git repository')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Initialize your repository' })).toBeInTheDocument()
    expect(screen.getByText(/does not edit or commit files in the browser/i)).toBeInTheDocument()
    expect(api.listBranches).not.toHaveBeenCalled()
    expect(api.getTree).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open Local Git' }))
    await openGitAccess()
    fireEvent.click(await screen.findByRole('button', { name: 'Generate credentials' }))
    expect(await screen.findByText('synthetic-write-secret')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'How to use Git' }))
    fireEvent.click(screen.getByText('First commit in an empty repository'))
    expect(screen.getByText(/git checkout -b main/)).toBeInTheDocument()
    await waitFor(() => expect(api.issueCredential).toHaveBeenCalledWith('repo-1', ['READ', 'WRITE']))
  })

  it('identifies a Class Project owner as the team lead responsible for initial main', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    const classRepository = { ...repository, repositoryType: 'CLASS_PROJECT', projectTaskId: 'task-1' }
    render(<RepositoryGitPanel repository={classRepository} project={{ status: 'PUBLISHED', dueState: 'OPEN' }} owner api={api} />)
    expect(await screen.findByRole('heading', { name: 'Initialize main as the team lead' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Local Git' })).toBeInTheDocument()
  })

  it('tells an ordinary Class Project member to wait for the team lead before feature work', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    const classRepository = { ...repository, repositoryType: 'CLASS_PROJECT', projectTaskId: 'task-1' }
    render(<RepositoryGitPanel repository={classRepository} project={{ status: 'PUBLISHED', dueState: 'OPEN' }} api={api} />)
    expect(await screen.findByRole('heading', { name: 'Waiting for the team lead' })).toBeInTheDocument()
    expect(screen.getByText(/Do not create an unrelated first branch/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Local Git' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    expect(await screen.findByText(/team lead must establish main first/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
  })

  it('explains an empty repository without offering Local Git when Smart HTTP is disabled', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    renderWithCapabilities(<RepositoryGitPanel repository={repository} owner api={api} />, { provisioning: true, inspection: true, smartHttp: false })
    expect(await screen.findByText(/Native Git access is unavailable in this environment/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Local Git' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Local Git' })).not.toBeInTheDocument()
    expect(api.listCredentials).not.toHaveBeenCalled()
  })

  it('does not offer initial authoring when the current repository lifecycle is read-only', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, repositoryStatus: 'ARCHIVED', empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    render(<RepositoryGitPanel repository={{ ...repository, status: 'ARCHIVED' }} owner api={api} />)
    expect(await screen.findByRole('heading', { name: 'Repository authoring is currently unavailable' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Local Git' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    expect(await screen.findByText(/lifecycle rules do not allow the initial push/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
  })

  it('refreshes an empty repository into current Files, History, Branches, and summary state', async () => {
    const emptySummary = { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null }
    const api = apiMock({ getSummary: vi.fn()
      .mockResolvedValueOnce({ data: emptySummary })
      .mockResolvedValueOnce({ data: summary }) })
    render(<RepositoryGitPanel repository={repository} owner api={api} />)
    expect(await screen.findByText('Empty Git repository')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Git status' }))
    expect(await screen.findByRole('button', { name: /README.md/i })).toBeInTheDocument()
    expect(api.getSummary).toHaveBeenCalledTimes(2)
    expect(api.getTree).toHaveBeenCalledWith('repo-1', { branchName: 'main', path: '' }, expect.any(Object))

    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    expect(await screen.findByRole('button', { name: /Latest/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Branches' }))
    expect(await screen.findByText('main')).toBeInTheDocument()
    expect(screen.queryByText('Empty Git repository')).not.toBeInTheDocument()
  })

  it('finishes a branch request that remains pending through the loading render', async () => {
    let resolveBranches
    const api = apiMock({ listBranches: vi.fn().mockImplementation(() => new Promise((resolve) => { resolveBranches = resolve })) })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Branches' }))
    expect(await screen.findByText('Loading branches.')).toBeInTheDocument()
    await waitFor(() => expect(api.listBranches).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Branches' }))

    resolveBranches({ data: [{ ...summary.latestCommit, branchName: 'main', isDefault: true }] })
    expect(await screen.findByText('main')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.queryByText('Loading branches.')).not.toBeInTheDocument()
  })

  it('shows a branch request failure and recovers after refreshing Git status', async () => {
    let rejectBranches
    const pending = new Promise((_, reject) => { rejectBranches = reject })
    const api = apiMock({ listBranches: vi.fn()
      .mockReturnValueOnce(pending)
      .mockResolvedValue({ data: [{ ...summary.latestCommit, branchName: 'main', isDefault: true }] }) })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Branches' }))
    expect(await screen.findByText('Loading branches.')).toBeInTheDocument()
    rejectBranches(new Error('request failed'))
    expect(await screen.findByText('Branches unavailable')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Git status' }))
    expect(await screen.findByText('main')).toBeInTheDocument()
    expect(api.listBranches).toHaveBeenCalledTimes(2)
  })

  it('loads commit detail and an explicit parent diff while explaining Git author identity', async () => {
    const api = apiMock()
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: /Latest/i }))
    expect(await screen.findByText('+Projex')).toBeInTheDocument()
    expect(screen.getAllByText(/self-asserted Git author/i).length).toBeGreaterThan(0)
    expect(api.getDiff).toHaveBeenCalledWith('repo-1', { baseCommitId: commitA, targetCommitId: commitB }, expect.any(Object))
  })

  it('uses backend branches for inspection and advances bounded history pagination', async () => {
    const api = apiMock({
      listBranches: vi.fn().mockResolvedValue({ data: [
        { ...summary.latestCommit, branchName: 'main', isDefault: true },
        { ...summary.latestCommit, branchName: 'feature/safe', isDefault: false },
      ] }),
      listCommits: vi.fn()
        .mockResolvedValueOnce({ data: [summary.latestCommit], pagination: { page: 1, totalPages: 2, hasPreviousPage: false, hasNextPage: true } })
        .mockResolvedValueOnce({ data: [{ ...summary.latestCommit, commitId: commitA, subject: 'Earlier' }], pagination: { page: 2, totalPages: 2, hasPreviousPage: true, hasNextPage: false } }),
    })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    const branchSelect = await screen.findByLabelText('Branch')
    await screen.findByRole('option', { name: 'feature/safe' })
    fireEvent.change(branchSelect, { target: { value: 'feature/safe' } })
    await waitFor(() => expect(api.getTree).toHaveBeenCalledWith('repo-1', { branchName: 'feature/safe', path: '' }, expect.any(Object)))
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Earlier')).toBeInTheDocument()
    expect(api.listCommits).toHaveBeenLastCalledWith('repo-1', { branchName: 'feature/safe', page: 2, limit: 20 }, expect.any(Object))
  })

  it('does not fabricate a parent diff for a root commit', async () => {
    const api = apiMock({ getCommit: vi.fn().mockResolvedValue({ data: { ...summary.latestCommit, parentCommitIds: [], files: [{ status: 'A', path: 'README.md' }] } }) })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: /Latest/i }))
    expect(await screen.findByText(/root commit/i)).toBeInTheDocument()
    expect(api.getDiff).not.toHaveBeenCalled()
  })

  it('renders bounded backend preview failures without prototype content', async () => {
    const api = apiMock({ getFile: vi.fn().mockRejectedValue(new ApiError({ status: 415, code: 'GIT_BINARY_FILE_UNSUPPORTED', message: 'Internal detail' })) })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: /README.md/i }))
    expect(await screen.findByText(/binary and cannot be previewed/i)).toBeInTheDocument()
    expect(screen.queryByText('# Projex')).not.toBeInTheDocument()
  })

  it('renders safe size-limit failures without attempting client-side reconstruction', async () => {
    const api = apiMock({ getFile: vi.fn().mockRejectedValue(new ApiError({ status: 413, code: 'GIT_FILE_LIMIT_EXCEEDED', message: 'Internal' })) })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: /README.md/i }))
    expect(await screen.findByText(/exceeds the safe preview limit/i)).toBeInTheDocument()
  })

  it('issues a one-time secret without embedding it in the URL and clears it on close', async () => {
    const api = apiMock()
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    await openGitAccess()
    expect(api.listCredentials).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Generate credentials' }))
    expect(await screen.findByText('synthetic-one-time-secret')).toBeInTheDocument()
    expect(api.getTransportUrl.mock.results[0].value).not.toContain('synthetic-one-time-secret')
    expect(api.issueCredential).toHaveBeenCalledWith('repo-1', ['READ'])
    fireEvent.click(screen.getByRole('button', { name: 'Close Git access' }))
    expect(screen.queryByText('synthetic-one-time-secret')).not.toBeInTheDocument()
  })

  it('offers instructors read-only credentials and reports disabled Smart HTTP safely', async () => {
    const api = apiMock({ issueCredential: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'GIT_SMART_HTTP_UNAVAILABLE', message: 'Internal' })) })
    render(<RepositoryGitPanel repository={repository} role="instructor" api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    await openGitAccess()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Generate credentials' }))
    expect(await screen.findByText(/Git access is unavailable/i)).toBeInTheDocument()
  })

  it('requests combined read/write scope for eligible students and revokes real metadata', async () => {
    const activeCredential = { credentialId: 'credential-2', repositoryId: 'repo-1', operations: ['READ', 'WRITE'], createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2099-08-01T00:15:00.000Z', lastUsedAt: null, revokedAt: null }
    const api = apiMock({
      listCredentials: vi.fn().mockResolvedValue({ data: [activeCredential] }),
      getAccess: vi.fn().mockResolvedValue({ data: { id: 'repo-1', gitPermissions: { read: true, write: true, canUpdateMain: true } } }),
      issueCredential: vi.fn().mockResolvedValue({ data: { ...activeCredential, credentialId: 'credential-3', username: 'credential-3', secret: 'fixture-value' } }),
      revokeCredential: vi.fn().mockResolvedValue({ data: { ...activeCredential, revokedAt: '2026-08-01T00:05:00.000Z' } }),
    })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    await openGitAccess()
    fireEvent.click(screen.getByRole('button', { name: 'Manage access' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Revoke access', exact: true }))
    await waitFor(() => expect(api.revokeCredential).toHaveBeenCalledWith('credential-2'))
    expect(await screen.findByText('Access revoked.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Git access' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate credentials' }))
    await waitFor(() => expect(api.issueCredential).toHaveBeenCalledWith('repo-1', ['READ', 'WRITE']))
  })

  it('offers Activity Workspace read/write only while its validated linked Activity is open', async () => {
    const activityRepository = { ...repository, repositoryType: 'ACTIVITY_WORKSPACE', activityId: 'activity-1' }
    const api = apiMock()
    const { rerender } = render(<RepositoryGitPanel repository={activityRepository} activity={{ id: 'activity-1', status: 'PUBLISHED', dueState: 'OPEN' }} initialTab="local" api={api} />)

    await openGitAccess()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    expect(screen.getByText('Git push saves your work. It does not submit the Activity.')).toBeInTheDocument()
    rerender(<RepositoryGitPanel repository={activityRepository} activity={{ id: 'activity-1', status: 'CLOSED', dueState: 'CLOSED' }} initialTab="local" api={api} />)
    expect(await screen.findByText('Activity closed — repository is read-only.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
  })

  it('keeps existing Personal and Class Workspace Local Git write behavior', async () => {
    const personalApi = apiMock()
    const { unmount } = render(<RepositoryGitPanel repository={repository} initialTab="local" api={personalApi} />)
    await openGitAccess()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    unmount()

    const workspaceApi = apiMock()
    render(<RepositoryGitPanel repository={{ ...repository, repositoryType: 'CLASS_WORKSPACE', classId: 'class-1' }} initialTab="local" api={workspaceApi} />)
    await openGitAccess()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
  })

  it('keeps an archived READY repository read-only while allowing authorized inspection', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, repositoryStatus: 'ARCHIVED' } }) })
    render(<RepositoryGitPanel repository={{ ...repository, status: 'ARCHIVED' }} api={api} />)
    expect(await screen.findByRole('button', { name: /README.md/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    await openGitAccess()
    expect(screen.getByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate write access' })).not.toBeInTheDocument()
  })

  it('does not inspect repositories before storage is ready', () => {
    const api = apiMock()
    const { rerender } = render(<RepositoryGitPanel repository={{ ...repository, storageStatus: 'PROVISIONING' }} api={api} />)
    expect(screen.getByText(/only after the backend marks storage Ready/i)).toBeInTheDocument()
    expect(api.getSummary).not.toHaveBeenCalled()
    rerender(<RepositoryGitPanel repository={{ ...repository, storageStatus: 'QUARANTINED' }} api={api} />)
    expect(screen.getByText(/cannot be inspected or used/i)).toBeInTheDocument()
    expect(api.getSummary).not.toHaveBeenCalled()
  })

  it('drops an aborted repository response instead of applying stale Git identity', async () => {
    let resolveFirst
    const first = new Promise((resolve) => { resolveFirst = resolve })
    const firstApi = apiMock({ getSummary: vi.fn().mockReturnValue(first) })
    const secondApi = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, repositoryId: 'repo-2', empty: true, branchCount: 0, commitCount: 0, latestCommit: null } }) })
    const { rerender } = render(<RepositoryGitPanel key="repo-1" repository={repository} api={firstApi} />)
    rerender(<RepositoryGitPanel key="repo-2" repository={{ ...repository, id: 'repo-2' }} api={secondApi} />)
    expect(await screen.findByText('Empty Git repository')).toBeInTheDocument()
    resolveFirst({ data: summary })
    await waitFor(() => expect(screen.getByText('Empty Git repository')).toBeInTheDocument())
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })
})
