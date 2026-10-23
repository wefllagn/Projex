import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { ClassContext } from '../classes/class-context.js'
import { RepositoryFoundationDetail, StudentRepositoryCatalog } from './RepositoryFoundationViews.jsx'
import { ApiError } from '../api/api-client.js'

const selectedClass = { id: 'class-1', className: 'Synthetic Class', status: 'ACTIVE' }
const project = { id: 'task-1', classId: 'class-1', title: 'Project', instructions: 'Build it', dueDate: '2026-12-01T00:00:00.000Z', dueState: 'OPEN', maxTeamSize: 4, status: 'PUBLISHED', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor' } }
const repository = { id: 'repo-1', projectTaskId: 'task-1', teamId: 'team-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'team-repo', slug: 'team-repo', description: 'Repository description', defaultBranch: 'main', visibility: 'CLASS_ONLY', status: 'ACTIVE', storageStatus: 'PENDING', reviewStatus: 'WORKING', owner: { userId: 'student-1', fullName: 'Synthetic Student' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' }
const activity = { id: 'activity-1', classId: selectedClass.id, title: 'Loops Activity', instructions: 'Practice loops.', dueDate: '2099-12-01T00:00:00.000Z', dueState: 'OPEN', status: 'PUBLISHED' }

function wrapper(ui, path = '/') {
  return render(
    <AuthContext.Provider value={{ user: { id: 'student-1', role: 'STUDENT', status: 'ACTIVE' } }}>
      <ClassContext.Provider value={{ selectedClass, classes: [selectedClass], selectionStatus: 'ready', api: { listMembers: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, hasNextPage: false } }) } }}>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </ClassContext.Provider>
    </AuthContext.Provider>,
  )
}

function repositoryApiMock(overrides = {}) {
  return {
    listReceivedInvitations: vi.fn().mockResolvedValue({ data: [] }),
    listMembers: vi.fn().mockResolvedValue({ data: [] }),
    listFeedback: vi.fn().mockResolvedValue({ data: [] }),
    listRepositoryInvitations: vi.fn().mockResolvedValue({ data: [] }),
    getGroupContext: vi.fn().mockResolvedValue({ data: {
      repositoryId: repository.id, project: { id: project.id, title: project.title, dueDate: project.dueDate, status: project.status },
      class: selectedClass, team: { id: repository.teamId, name: 'Synthetic Group', status: 'ACTIVE', activeMemberCount: 1 },
      currentRole: 'MAINTAINER', teachingStaff: [],
      permissions: Object.fromEntries(['canRead', 'canWrite', 'canUpdateMain', 'canManageMembers', 'canInviteMembers', 'canReview', 'canRequestChanges', 'canSubmitForReview', 'canViewActivity', 'canEditFeedback', 'canArchive', 'canRestore'].map((key) => [key, false])),
    } }),
    ...overrides,
  }
}

afterEach(() => vi.useRealTimers())

describe('Phase 10C.1 repository views', () => {
  it('retains a loaded Group on transient metadata failure but hides it on confirmed denial', async () => {
    const api = repositoryApiMock({ getRepository: vi.fn().mockResolvedValue({ data: { ...repository, storageStatus: 'READY' } }) })
    const projects = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    wrapper(<Routes><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={projects} />} /></Routes>, '/student/projects/task-1/repositories/repo-1?classId=class-1')
    await screen.findByRole('heading', { name: 'team-repo' })
    api.getRepository.mockRejectedValueOnce(new ApiError({ status: 503 }))
    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByRole('button', { name: 'Reload repository' }))
    await screen.findByRole('button', { name: 'Retry refresh' })
    expect(screen.getByRole('heading', { name: 'team-repo' })).toBeInTheDocument()
    api.getRepository.mockRejectedValueOnce(new ApiError({ status: 404 }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'team-repo' })).not.toBeInTheDocument())
    expect(screen.getByText('The requested Origin record was not found.')).toBeInTheDocument()
  })
  it('retires class workspace creation while preserving authorized legacy access', async () => {
    const workspace = { ...repository, id: 'workspace-1', classId: selectedClass.id, projectTaskId: null, teamId: null, repositoryType: 'CLASS_WORKSPACE', visibility: 'PRIVATE' }
    const api = repositoryApiMock({ listRepositories: vi.fn().mockResolvedValue({ data: [workspace], pagination: { page: 1, totalItems: 1, totalPages: 1 } }), createClassWorkspace: vi.fn() })
    wrapper(<StudentRepositoryCatalog api={api} />)
    expect(await screen.findByRole('link', { name: 'team-repo' })).toHaveAttribute('href', '/student/repositories/workspace-1')
    expect(screen.queryByRole('button', { name: /Class Workspace/i })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Class workspace \(legacy\)/i })).toBeInTheDocument()
    expect(api.createClassWorkspace).not.toHaveBeenCalled()
  })
  it('groups repository identity separately from ordered type, storage, and lifecycle metadata', async () => {
    const workspace = { ...repository, id: 'workspace-1', classId: selectedClass.id, projectTaskId: null, teamId: null, repositoryType: 'CLASS_WORKSPACE', repositoryName: 'Class work', visibility: 'PRIVATE', storageStatus: 'READY' }
    const personal = { ...repository, id: 'personal-1', projectTaskId: null, teamId: null, repositoryType: 'PERSONAL', repositoryName: 'Personal work', visibility: 'PRIVATE', storageStatus: 'PENDING' }
    const api = repositoryApiMock({ listRepositories: vi.fn().mockResolvedValue({ data: [workspace, personal], pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 } }) })
    wrapper(<StudentRepositoryCatalog api={api} />)
    for (const [name, metadata] of [['Class work', 'Class workspace'], ['Personal work', 'Personal']]) {
      const link = await screen.findByRole('link', { name, exact: true })
      const row = link.closest('article')
      expect(row).toHaveTextContent(metadata)
      expect(row).toHaveTextContent(name === 'Class work' ? 'Ready' : 'Pending')
    }
  })
  it('labels and groups Activity Workspaces without offering a general creation action', async () => {
    const activityRepository = { ...repository, id: 'activity-repo-1', activityId: activity.id, classId: null, contextClassId: selectedClass.id, projectTaskId: null, teamId: null, repositoryType: 'ACTIVITY_WORKSPACE', repositoryName: 'Loops workspace', visibility: 'PRIVATE', storageStatus: 'READY' }
    const api = repositoryApiMock({ listRepositories: vi.fn().mockResolvedValue({ data: [activityRepository], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }) })
    wrapper(<StudentRepositoryCatalog api={api} />)

    expect(await screen.findByRole('heading', { name: 'Activity repositories' })).toBeInTheDocument()
    expect(screen.getByText('Loops workspace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Activity' })).toHaveAttribute('href', `/student/activity/${activity.id}?classId=${selectedClass.id}`)
    expect(screen.getByRole('link', { name: 'Loops workspace' })).toHaveAttribute('href', '/student/repositories/activity-repo-1')
    expect(screen.getByRole('option', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /New Activity Workspace/i })).not.toBeInTheDocument()
  })
  it('creates a real personal repository without browser Git behavior', async () => {
    const api = repositoryApiMock({
      listRepositories: vi.fn().mockResolvedValueOnce({ data: [], pagination: { page: 1, totalItems: 0, totalPages: 0 } }).mockResolvedValue({ data: [{ ...repository, id: 'personal-1', projectTaskId: null, teamId: null, repositoryType: 'PERSONAL', repositoryName: 'private-repo', visibility: 'PRIVATE' }], pagination: { page: 1, totalItems: 1, totalPages: 1 } }),
      createPersonal: vi.fn().mockResolvedValue({ data: { ...repository, id: 'personal-1', projectTaskId: null, teamId: null, repositoryType: 'PERSONAL', repositoryName: 'private-repo', visibility: 'PRIVATE' } }),
    })
    wrapper(<StudentRepositoryCatalog api={api} />)
    await waitFor(() => expect(api.listRepositories).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }), expect.any(Object)))
    fireEvent.click(await screen.findByRole('button', { name: 'New repository' }))
    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'private-repo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create repository' }))
    expect(await screen.findByText('private-repo')).toBeInTheDocument()
    expect(api.createPersonal).toHaveBeenCalledWith({ repositoryName: 'private-repo', description: null })
    expect(screen.queryByText(/Git initialized/i)).not.toBeInTheDocument()
  })

  it('keeps a failed repository draft available and restores focus on Escape', async () => {
    const api = repositoryApiMock({ listRepositories: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, totalItems: 0, totalPages: 0 } }), createPersonal: vi.fn().mockRejectedValue(new ApiError({ status: 409, message: 'A repository with this name already exists.' })) })
    const user = userEvent.setup()
    wrapper(<StudentRepositoryCatalog api={api} />)
    const trigger = await screen.findByRole('button', { name: 'New repository' })
    await user.click(trigger)
    await user.type(screen.getByLabelText('Repository name'), 'existing')
    await user.click(screen.getByRole('button', { name: 'Create repository' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Repository name')).toHaveValue('existing')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(api.createPersonal).toHaveBeenCalledTimes(1)
  })

  it('rejects a repository whose project identity disagrees with the route', async () => {
    const api = repositoryApiMock({ getRepository: vi.fn().mockResolvedValue({ data: { ...repository, projectTaskId: 'other-task' } }) })
    const projects = { getProjectTask: vi.fn() }
    wrapper(<Routes><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={projects} />} /></Routes>, '/student/projects/task-1/repositories/repo-1?classId=class-1')
    expect(await screen.findByText('The requested Origin record was not found.')).toBeInTheDocument()
    expect(screen.queryByText('Repository description')).not.toBeInTheDocument()
  })

  it('polls non-overlapping provisioning state until READY and shows no Git controls', async () => {
    const api = repositoryApiMock({
      getRepository: vi.fn()
        .mockResolvedValueOnce({ data: repository })
        .mockResolvedValueOnce({ data: { ...repository, storageStatus: 'PROVISIONING' } })
        .mockResolvedValueOnce({ data: { ...repository, storageStatus: 'READY', updatedAt: '2026-08-02T00:00:00.000Z' } }),
      updateRepository: vi.fn(),
    })
    const projects = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    wrapper(<Routes><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={projects} />} /></Routes>, '/student/projects/task-1/repositories/repo-1?classId=class-1')
    expect(await screen.findByText(/^(Pending|Provisioning)$/)).toBeInTheDocument()
    expect(screen.getByText('Git read-only')).toBeInTheDocument()
    await waitFor(() => expect(api.getRepository).toHaveBeenCalledTimes(3), { timeout: 3500 })
    await waitFor(() => expect(screen.queryByText(/^(Pending|Provisioning)$/)).not.toBeInTheDocument())
    expect(screen.getByText('Git read-only')).toBeInTheDocument()
    expect(api.getRepository).toHaveBeenCalledTimes(3)
    expect(screen.queryByText('Copy clone URL')).not.toBeInTheDocument()
    expect(screen.queryByText('New branch')).not.toBeInTheDocument()
  })

  it('shows FAILED and archived repository truth without fabricating project detail', async () => {
    const archived = { ...repository, status: 'ARCHIVED', storageStatus: 'FAILED', archivedAt: '2026-08-03T00:00:00.000Z' }
    const api = repositoryApiMock({ getRepository: vi.fn().mockResolvedValue({ data: archived }) })
    const projects = { getProjectTask: vi.fn().mockRejectedValue({ status: 404 }) }
    wrapper(<Routes><Route path="/student/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={projects} />} /></Routes>, '/student/repositories/repo-1')
    expect(await screen.findByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Git read-only')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: repository.repositoryName })).toBeInTheDocument()
    expect(screen.queryByText(/Prelim Group Project/i)).not.toBeInTheDocument()
  })

  it('uses the latest repository version for metadata updates', async () => {
    const personal = { ...repository, projectTaskId: null, teamId: null, repositoryType: 'PERSONAL', visibility: 'PRIVATE', updatedAt: '2026-08-01T00:00:00.000Z' }
    const updated = { ...personal, repositoryName: 'renamed', updatedAt: '2026-08-02T00:00:00.000Z' }
    const api = repositoryApiMock({ getRepository: vi.fn().mockResolvedValue({ data: personal }), updateRepository: vi.fn().mockResolvedValue({ data: updated }) })
    wrapper(<Routes><Route path="/student/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={{}} />} /></Routes>, '/student/repositories/repo-1')
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Metadata' }))
    await waitFor(() => expect(api.updateRepository).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: personal.updatedAt, repositoryName: 'renamed', description: 'Repository description' }))
    expect(await screen.findByText('Repository metadata updated from the server.')).toBeInTheDocument()
  })

  it('renders Activity Workspace detail as read-only, reuses Local Git, and links back to the validated Activity', async () => {
    const activityRepository = { ...repository, activityId: activity.id, classId: null, projectTaskId: null, teamId: null, repositoryType: 'ACTIVITY_WORKSPACE', repositoryName: 'Loops workspace', visibility: 'PRIVATE', storageStatus: 'READY' }
    const api = repositoryApiMock({
      getRepository: vi.fn().mockResolvedValue({ data: activityRepository }),
      listRecordedActivity: vi.fn().mockResolvedValue({ data: { repositoryId: repository.id, events: [], contributions: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false } } }),
    })
    const activities = { getActivity: vi.fn().mockResolvedValue({ data: activity }) }
    const gitApi = {
      getAccess: vi.fn().mockResolvedValue({ data: { id: repository.id, gitPermissions: { read: true, write: true, canUpdateMain: true } } }),
      getSummary: vi.fn().mockResolvedValue({ data: { repositoryId: repository.id, repositoryStatus: 'ACTIVE', storageStatus: 'READY', empty: true, defaultBranch: 'main', branchCount: 0, commitCount: 0, latestCommit: null } }),
      getTransportUrl: vi.fn().mockReturnValue(`http://localhost:3000/api/v1/git/repositories/${repository.id}`),
      listCredentials: vi.fn().mockResolvedValue({ data: [] }),
    }
    wrapper(<Routes><Route path="/student/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} activities={activities} projects={{}} gitApi={gitApi} />} /></Routes>, `/student/repositories/${repository.id}?git=local&classId=${selectedClass.id}`)

    expect(await screen.findByRole('heading', { name: 'Loops workspace' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Commits' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Branches' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Members' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Get Git access' }))
    expect(await screen.findByRole('button', { name: 'Generate credentials' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Loops Activity' })[0]).toHaveAttribute('href', `/student/activity/${activity.id}?classId=${selectedClass.id}`)
    expect(screen.getAllByRole('link', { name: 'Open IDE' })[0]).toHaveAttribute('href', `/student/activity/${activity.id}/workspace?classId=${selectedClass.id}`)
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Archive/i })).not.toBeInTheDocument()
    expect(gitApi.listCredentials).not.toHaveBeenCalled()

  })
})
