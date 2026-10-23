import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ClassContext } from '../classes/class-context.js'
import { InstructorProjectDetail, InstructorProjectEditor, InstructorProjectList, StudentProjectDetail, StudentProjectList } from './ProjectViews.jsx'

const selectedClass = { id: 'class-1', className: 'Synthetic Class', status: 'ACTIVE' }
const project = {
  id: 'task-1', classId: 'class-1', title: 'Repository Project', instructions: 'Build a Java project.', dueDate: '2026-12-01T00:00:00.000Z', dueState: 'OPEN',
  maxTeamSize: 4, status: 'PUBLISHED', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z', publishedAt: '2026-08-02T00:00:00.000Z', closedAt: null, archivedAt: null,
  createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}

function classValue() {
  return { selectedClass, selectionStatus: 'ready' }
}

function renderWithClass(ui, path = '/') {
  return render(<ClassContext.Provider value={classValue()}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></ClassContext.Provider>)
}

afterEach(() => vi.restoreAllMocks())

describe('Group Project Collaboration pane', () => {
  const invitation = { invitationId: 'invite-1', repositoryId: 'repo-1', projectTaskId: 'task-1', status: 'PENDING', expiresAt: '2099-10-30T00:00:00Z', invitedBy: { fullName: 'Class Maintainer' }, invitee: { userId: 'me', fullName: 'Student' } }
  function show(overrides = {}, record = project) {
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: record }) }
    const repositories = { listRepositories: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1 } }), listReceivedInvitations: vi.fn().mockResolvedValue({ data: [] }), getRepository: vi.fn().mockResolvedValue({ data: { id: 'repo-1', repositoryName: 'Inviting repository', projectTaskId: 'task-1' } }), ...overrides }
    const view = renderWithClass(<Routes><Route path="/student/projects/:projectTaskId" element={<StudentProjectDetail api={api} repositories={repositories} />} /></Routes>, '/student/projects/task-1?classId=class-1')
    return { api, repositories, ...view }
  }
  it('puts a pending invitation in Collaboration and creates only after it is declined', async () => {
    const listReceivedInvitations = vi.fn().mockResolvedValue({ data: [invitation] })
    const declineInvitation = vi.fn().mockImplementation(() => { listReceivedInvitations.mockResolvedValue({ data: [] }); return Promise.resolve({ data: { ...invitation, status: 'DECLINED' } }) })
    show({ listReceivedInvitations, declineInvitation })
    const rail = await screen.findByRole('complementary', { name: 'Project collaboration' })
    expect(await within(rail).findByText('Inviting repository')).toBeInTheDocument()
    expect(within(rail).getByText('Invited by Class Maintainer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Group' })).not.toBeInTheDocument()
    fireEvent.click(within(rail).getByRole('button', { name: 'Decline' }))
    expect(await within(rail).findByRole('button', { name: 'Create Group' })).toBeInTheDocument()
    expect(declineInvitation).toHaveBeenCalledWith('invite-1')
    expect(screen.queryByText(/Other class repositories/)).not.toBeInTheDocument()
  })
  it('shows a closed state without unauthorized creation or invitation actions', async () => {
    show({ listReceivedInvitations: vi.fn().mockResolvedValue({ data: [invitation] }) }, { ...project, status: 'CLOSED', dueState: 'CLOSED' })
    expect(await screen.findByText('Invitation actions are closed for this project.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Group' })).not.toBeInTheDocument()
  })
  it('keeps dirty group-creation input during focus return instead of replacing it', async () => {
    const { api } = show()
    const field = await screen.findByLabelText('Group name')
    fireEvent.change(field, { target: { value: 'Unsent group name' } })
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 30_000)
    fireEvent.focus(window)
    await Promise.resolve()
    expect(field).toHaveValue('Unsent group name')
    expect(api.getProjectTask).toHaveBeenCalledTimes(1)
  })
  it('rejects mismatched academic context before exposing the repository action', async () => {
    const mine = { id: 'mine', projectTaskId: 'task-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'Actual repository', groupRelationship: 'MY_GROUP' }
    show({ listRepositories: vi.fn((query) => Promise.resolve({ data: query.groupScope === 'MINE' ? [mine] : [], pagination: {} })), getGroupContext: vi.fn().mockResolvedValue({ data: { repositoryId: 'mine', project: { id: 'task-1' }, class: { id: 'other-class' }, team: { name: 'Group', activeMemberCount: 2 } } }) })
    expect(await screen.findByText('The requested Origin record was not found.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Repository' })).not.toBeInTheDocument()
  })
})

describe('Phase 10C.1 project views', () => {
  it('defaults only new projects to eight and still permits smaller selected limits', async () => {
    const api = { createProjectTask: vi.fn().mockResolvedValue({ data: { ...project, status: 'DRAFT' } }) }
    renderWithClass(<Routes><Route path="/instructor/projects/new" element={<InstructorProjectEditor mode="create" api={api} />} /><Route path="/instructor/projects/:id/settings" element={<p>Created draft</p>} /></Routes>, '/instructor/projects/new?classId=class-1')
    const limit = screen.getByLabelText('Maximum members (including Maintainer)')
    expect(limit).toHaveValue('8')
    expect(within(limit).getAllByRole('option')).toHaveLength(7)
    fireEvent.change(screen.getByLabelText('Project title'), { target: { value: 'Smaller project' } })
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2099-10-30T12:00' } })
    fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Build the project.' } })
    fireEvent.change(limit, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
    await waitFor(() => expect(api.createProjectTask).toHaveBeenCalledWith('class-1', expect.objectContaining({ maxTeamSize: 3 })))
  })

  it('keeps an existing published four-member project unchanged and locked', async () => {
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes>, '/instructor/projects/task-1/settings?classId=class-1')
    const limit = await screen.findByLabelText('Maximum members (including Maintainer)')
    expect(limit).toHaveValue('4')
    expect(limit).toBeDisabled()
    expect(screen.getByText('Project details, including the member limit, are locked after publishing.')).toBeInTheDocument()
  })

  it('prioritizes the server-authorized My Group and does not offer duplicate creation', async () => {
    const mine = { id: 'mine', projectTaskId: project.id, repositoryType: 'CLASS_PROJECT', repositoryName: 'Shared group repository', groupRelationship: 'MY_GROUP' }
    const other = { ...mine, id: 'other', repositoryName: 'Other group metadata', groupRelationship: 'CLASS_METADATA' }
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    const repositories = { listRepositories: vi.fn((query) => Promise.resolve({ data: [query.groupScope === 'MINE' ? mine : other], pagination: { page: 1, hasNextPage: false } })), listReceivedInvitations: vi.fn().mockResolvedValue({ data: [] }) }
    renderWithClass(<Routes><Route path="/student/projects/:projectTaskId" element={<StudentProjectDetail api={api} repositories={repositories} />} /></Routes>, '/student/projects/task-1?classId=class-1')
    expect(await screen.findByRole('link', { name: 'Open Repository' })).toHaveAttribute('href', '/student/projects/task-1/repositories/mine?classId=class-1')
    expect(within(screen.getByRole('complementary', { name: 'Project collaboration' })).getByRole('heading', { name: 'Shared group repository' })).toBeInTheDocument()
    expect(screen.getByText('Other class repositories · 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Group' })).not.toBeInTheDocument()
  })
  it('fails closed when a project list contains another class and never renders prototype data', async () => {
    const api = { listProjectTasks: vi.fn().mockResolvedValue({ data: [{ ...project, classId: 'other-class', title: 'Should not render' }], pagination: { totalItems: 1, totalPages: 1 } }) }
    renderWithClass(<StudentProjectList api={api} />)
    expect(await screen.findByText('The requested Origin record was not found.')).toBeInTheDocument()
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument()
    expect(screen.queryByText(/Prelim Group Project/i)).not.toBeInTheDocument()
  })

  it('creates a class-project repository using the real project ID and validates the response link', async () => {
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    const repositories = {
      listReceivedInvitations: vi.fn().mockResolvedValue({ data: [] }),
      listRepositories: vi.fn().mockResolvedValue({ data: [], pagination: { totalItems: 0, totalPages: 0 } }),
      createClassProject: vi.fn().mockResolvedValue({ data: { id: 'repo-1', projectTaskId: 'task-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'team-repo', storageStatus: 'PENDING', status: 'ACTIVE', reviewStatus: 'WORKING', owner: { userId: 'student-1', fullName: 'Synthetic Student' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' } }),
    }
    renderWithClass(<Routes><Route path="/student/projects/:projectTaskId" element={<StudentProjectDetail api={api} repositories={repositories} />} /><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<p>Repository route reached</p>} /></Routes>, '/student/projects/task-1?classId=class-1')
    fireEvent.change(await screen.findByLabelText('Group name'), { target: { value: 'Synthetic Team' } })
    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'team-repo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }))
    expect(await screen.findByText('Repository route reached')).toBeInTheDocument()
    expect(repositories.createClassProject).toHaveBeenCalledWith('task-1', { teamName: 'Synthetic Team', repositoryName: 'team-repo', description: null })
  })

  it('chains authoritative updatedAt values and preserves form input across a stale refetch', async () => {
    const draft = { ...project, status: 'DRAFT', dueState: 'DRAFT', publishedAt: null, updatedAt: '2026-08-02T00:00:00.000Z' }
    const newer = { ...draft, title: 'Server title', updatedAt: '2026-08-03T00:00:00.000Z' }
    const api = {
      getProjectTask: vi.fn().mockResolvedValueOnce({ data: draft }).mockResolvedValueOnce({ data: newer }),
      updateProjectTask: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_PROJECT_TASK_VERSION', message: 'Stale.' })),
      transitionProjectTask: vi.fn(),
    }
    renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes>, '/instructor/projects/task-1/settings?classId=class-1')
    const title = await screen.findByLabelText('Project title')
    fireEvent.change(title, { target: { value: 'My preserved title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText(/unsaved values are preserved/i)
    expect(screen.getByLabelText('Project title')).toHaveValue('My preserved title')
    expect(api.updateProjectTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ expectedUpdatedAt: draft.updatedAt, title: 'My preserved title' }))
  })

  it('adopts a mutation version before the next lifecycle action', async () => {
    const draft = { ...project, status: 'DRAFT', dueState: 'DRAFT', publishedAt: null, updatedAt: '2026-08-02T00:00:00.000Z' }
    const saved = { ...draft, title: 'Updated project', updatedAt: '2026-08-03T00:00:00.000Z' }
    const published = { ...saved, status: 'PUBLISHED', dueState: 'OPEN', publishedAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' }
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: draft }), updateProjectTask: vi.fn().mockResolvedValue({ data: saved }), transitionProjectTask: vi.fn().mockResolvedValue({ data: published }) }
    renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes>, '/instructor/projects/task-1/settings?classId=class-1')
    fireEvent.change(await screen.findByLabelText('Project title'), { target: { value: 'Updated project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(api.transitionProjectTask).toHaveBeenCalledWith('task-1', 'publish', { expectedUpdatedAt: saved.updatedAt }))
  })

  it('loads the latest version after a stale lifecycle action and requires a deliberate retry', async () => {
    const newer = { ...project, updatedAt: '2026-08-03T00:00:00.000Z' }
    const closed = { ...newer, status: 'CLOSED', dueState: 'CLOSED', closedAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' }
    const api = {
      getProjectTask: vi.fn().mockResolvedValueOnce({ data: project }).mockResolvedValueOnce({ data: newer }),
      updateProjectTask: vi.fn(),
      transitionProjectTask: vi.fn()
        .mockRejectedValueOnce(new ApiError({ status: 409, code: 'STALE_PROJECT_TASK_VERSION', message: 'Stale.' }))
        .mockResolvedValueOnce({ data: closed }),
    }
    renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes>, '/instructor/projects/task-1/settings?classId=class-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Close project' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Close project?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText(/latest version is loaded/i)).toBeInTheDocument()
    expect(api.transitionProjectTask).toHaveBeenNthCalledWith(1, 'task-1', 'close', { expectedUpdatedAt: project.updatedAt })
    fireEvent.click(screen.getByRole('button', { name: 'Close project' }))
    expect(api.transitionProjectTask).toHaveBeenCalledTimes(1)
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Close project?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(api.transitionProjectTask).toHaveBeenNthCalledWith(2, 'task-1', 'close', { expectedUpdatedAt: newer.updatedAt }))
  })
})

it('uses the outlined Instructor project Status filter and resets pagination on a new status', async () => {
  const api = { listProjectTasks: vi.fn((_classId, query) => Promise.resolve({ data: [project], pagination: { ...query, totalPages: 2, hasPreviousPage: query.page > 1, hasNextPage: query.page < 2 } })) }
  renderWithClass(<InstructorProjectList api={api} />)
  await screen.findByText('Repository Project')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(api.listProjectTasks).toHaveBeenLastCalledWith('class-1', { page: 2, pageSize: 20, status: '' }, expect.any(Object)))
  fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))
  fireEvent.click(screen.getByRole('option', { name: 'Closed' }))
  await waitFor(() => expect(api.listProjectTasks).toHaveBeenLastCalledWith('class-1', { page: 1, pageSize: 20, status: 'CLOSED' }, expect.any(Object)))
  expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Closed')
})

it('uses clear Student project filter labels while preserving server lifecycle queries', async () => {
  const api = { listProjectTasks: vi.fn().mockResolvedValue({ data: [], pagination: { totalPages: 0 } }) }
  renderWithClass(<StudentProjectList api={api} />)
  await screen.findByText('No projects to show')
  expect(screen.getByRole('combobox', { name: 'Project filter' })).toHaveTextContent('All projects')
  fireEvent.click(screen.getByRole('combobox', { name: 'Project filter' }))
  fireEvent.click(screen.getByRole('option', { name: 'Active projects' }))
  await waitFor(() => expect(api.listProjectTasks).toHaveBeenLastCalledWith('class-1', { page: 1, pageSize: 20, status: 'PUBLISHED' }, expect.any(Object)))
  fireEvent.click(screen.getByRole('combobox', { name: 'Project filter' }))
  fireEvent.click(screen.getByRole('option', { name: 'Closed projects' }))
  await waitFor(() => expect(api.listProjectTasks).toHaveBeenLastCalledWith('class-1', { page: 1, pageSize: 20, status: 'CLOSED' }, expect.any(Object)))
  fireEvent.click(screen.getByRole('combobox', { name: 'Project filter' }))
  fireEvent.click(screen.getByRole('option', { name: 'All projects' }))
  await waitFor(() => expect(api.listProjectTasks).toHaveBeenLastCalledWith('class-1', { page: 1, pageSize: 20, status: '' }, expect.any(Object)))
})


it('presents real Group monitoring counts and repository links without implementation explainers', async () => {
  const api = {
    getProjectTask: vi.fn().mockResolvedValue({ data: project }),
    listTeams: vi.fn().mockResolvedValue({ data: [{ teamId: 'team', name: 'Library builders', status: 'ACTIVE', lead: { userId: 'student', fullName: 'Alex Rivera' }, activeMemberCount: 2, repository: { repositoryId: 'repo', repositoryName: 'Campus Library', reviewStatus: 'READY_FOR_REVIEW' } }] }),
    getMonitoring: vi.fn().mockResolvedValue({ data: { projectTaskId: project.id, teamCount: 1, repositoryCount: 1, activeMemberCount: 2 } }),
  }
  renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId" element={<InstructorProjectDetail api={api} />} /></Routes>, '/instructor/projects/task-1?classId=class-1')
  const groups = await screen.findByRole('list', { name: 'Project groups' })
  const row = within(groups).getByRole('link', { name: /Library builders/ })
  expect(row).toHaveTextContent('2 / 4 members')
  expect(row).toHaveTextContent('Maintainer: Alex Rivera')
  expect(row).toHaveTextContent('Campus Library')
  expect(row).toHaveAttribute('href', '/instructor/projects/task-1/repositories/repo?classId=class-1')
  expect(within(groups).queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Action' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Project settings' })).toHaveAttribute('href', '/instructor/projects/task-1/settings?classId=class-1')
  const summary = screen.getByLabelText('Project overview')
  expect(summary).toHaveTextContent('Groups1Repositories1Active members2')
  expect(screen.queryByText(/authoritative records|backend-supported|not part of the project-task contract|Repository evidence and academic review/)).not.toBeInTheDocument()
})


it.each([
  ['PUBLISHED', 'close', 'Close project', 'CLOSED'],
  ['CLOSED', 'archive', 'Archive project', 'ARCHIVED'],
])('confirms %s lifecycle changes and lets Cancel leave the project intact', async (status, action, label, nextStatus) => {
  const record = { ...project, status }
  const api = { getProjectTask: vi.fn().mockResolvedValue({ data: record }), transitionProjectTask: vi.fn().mockResolvedValue({ data: { ...record, status: nextStatus, updatedAt: '2026-08-04T00:00:00.000Z' } }) }
  renderWithClass(<Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes>, '/instructor/projects/task-1/settings?classId=class-1')
  const trigger = await screen.findByRole('button', { name: label })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('dialog', { name: `${label}?` })
  expect(within(dialog).getByText(/Are you sure/)).toBeInTheDocument()
  expect(api.transitionProjectTask).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(trigger).toHaveFocus()
  expect(api.transitionProjectTask).not.toHaveBeenCalled()
  fireEvent.click(trigger)
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(api.transitionProjectTask).toHaveBeenCalledExactlyOnceWith(project.id, action, { expectedUpdatedAt: record.updatedAt }))
})

it.each([
  ['student', StudentProjectList],
  ['instructor', InstructorProjectList],
])('uses a whole project link for the %s list instead of action buttons', async (role, Component) => {
  const api = { listProjectTasks: vi.fn().mockResolvedValue({ data: [project], pagination: {} }) }
  renderWithClass(<Component api={api} />)
  const row = await screen.findByRole('link', { name: /Repository Project/ })
  expect(row).toHaveAttribute('href', `/${role}/projects/task-1?classId=class-1`)
  expect(row).toHaveTextContent('Up to 4 members')
  expect(screen.queryByRole('link', { name: /Monitor|Configure/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument()
})

it.each([
  [null, 'Back to project', '/instructor/projects/task-1?classId=class-1'],
  [{ projectRepositoryId: 'repo-1' }, 'Back to project', '/instructor/projects/task-1?classId=class-1'],
])('returns project settings to its project even with obsolete repository navigation state', async (state, label, href) => {
  const api = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
  render(<ClassContext.Provider value={classValue()}><MemoryRouter initialEntries={[{ pathname: '/instructor/projects/task-1/settings', search: '?classId=class-1', state }]}><Routes><Route path="/instructor/projects/:projectTaskId/settings" element={<InstructorProjectEditor mode="edit" api={api} />} /></Routes></MemoryRouter></ClassContext.Provider>)
  expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', href)
})
