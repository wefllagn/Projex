import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { CapabilityContext } from '../capabilities/capability-context.js'
import { RepositoryGitPanel } from './RepositoryGitViews.jsx'

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

describe('repository Git panel', () => {
  it('loads real tree and text content without mock fallback', async () => {
    const api = apiMock()
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: /README.md/i }))
    expect(await screen.findByText('# Projex')).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledWith('repo-1', { branchName: 'main', path: '' }, expect.any(Object))
    expect(api.getFile).toHaveBeenCalledWith('repo-1', { branchName: 'main', path: 'README.md' }, expect.any(Object))
    expect(screen.queryByText(/campus navigation/i)).not.toBeInTheDocument()
  })

  it('guides a Personal repository owner into the native Git initial-main workflow', async () => {
    const emptySummary = { ...summary, empty: true, branchCount: 0, commitCount: 0, latestCommit: null }
    const api = apiMock({
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
    fireEvent.click(await screen.findByRole('button', { name: 'Issue Read + Write Credential' }))
    expect(await screen.findByRole('heading', { name: 'Initialize main from your computer' })).toBeInTheDocument()
    expect(screen.getByText(/git checkout -b main/)).toBeInTheDocument()
    expect(screen.getByText(/Projex never creates this commit for you/i)).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Issue Read + Write Credential' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Issue Read + Write Credential' })).not.toBeInTheDocument()
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
    expect(await screen.findByText('No credentials have been issued for this repository.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Issue Read Credential' }))
    expect(await screen.findByText('synthetic-one-time-secret')).toBeInTheDocument()
    expect(screen.getByText(/git clone/).textContent).not.toContain('synthetic-one-time-secret')
    expect(api.issueCredential).toHaveBeenCalledWith('repo-1', ['READ'])
    fireEvent.click(screen.getByRole('button', { name: 'Close credential result' }))
    expect(screen.queryByText('synthetic-one-time-secret')).not.toBeInTheDocument()
  })

  it('offers instructors read-only credentials and reports disabled Smart HTTP safely', async () => {
    const api = apiMock({ issueCredential: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'GIT_SMART_HTTP_UNAVAILABLE', message: 'Internal' })) })
    render(<RepositoryGitPanel repository={repository} role="instructor" api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    expect(await screen.findByRole('button', { name: 'Issue Read Credential' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Issue Read + Write Credential' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Issue Read Credential' }))
    expect(await screen.findByText(/credential issuance is disabled/i)).toBeInTheDocument()
  })

  it('requests combined read/write scope for eligible students and revokes real metadata', async () => {
    const activeCredential = { credentialId: 'credential-2', repositoryId: 'repo-1', operations: ['READ', 'WRITE'], createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2099-08-01T00:15:00.000Z', lastUsedAt: null, revokedAt: null }
    const api = apiMock({
      listCredentials: vi.fn().mockResolvedValue({ data: [activeCredential] }),
      issueCredential: vi.fn().mockResolvedValue({ data: { ...activeCredential, credentialId: 'credential-3', username: 'credential-3', secret: 'fixture-value' } }),
      revokeCredential: vi.fn().mockResolvedValue({ data: { ...activeCredential, revokedAt: '2026-08-01T00:05:00.000Z' } }),
    })
    render(<RepositoryGitPanel repository={repository} api={api} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(api.revokeCredential).toHaveBeenCalledWith('credential-2'))
    expect(await screen.findByText('Revoked')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Issue Read + Write Credential' }))
    expect(api.issueCredential).toHaveBeenCalledWith('repo-1', ['READ', 'WRITE'])
  })

  it('keeps an archived READY repository read-only while allowing authorized inspection', async () => {
    const api = apiMock({ getSummary: vi.fn().mockResolvedValue({ data: { ...summary, repositoryStatus: 'ARCHIVED' } }) })
    render(<RepositoryGitPanel repository={{ ...repository, status: 'ARCHIVED' }} api={api} />)
    expect(await screen.findByRole('button', { name: /README.md/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Local Git' }))
    expect(await screen.findByRole('button', { name: 'Issue Read Credential' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Issue Read + Write Credential' })).not.toBeInTheDocument()
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
