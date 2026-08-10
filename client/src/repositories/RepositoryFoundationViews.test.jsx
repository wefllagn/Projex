import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { ClassContext } from '../classes/class-context.js'
import { RepositoryFoundationDetail, StudentRepositoryCatalog } from './RepositoryFoundationViews.jsx'

const selectedClass = { id: 'class-1', className: 'Synthetic Class', status: 'ACTIVE' }
const project = { id: 'task-1', classId: 'class-1', title: 'Project', instructions: 'Build it', dueDate: '2026-12-01T00:00:00.000Z', dueState: 'OPEN', maxTeamSize: 4, status: 'PUBLISHED', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor' } }
const repository = { id: 'repo-1', projectTaskId: 'task-1', teamId: 'team-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'team-repo', slug: 'team-repo', description: 'Repository description', defaultBranch: 'main', visibility: 'CLASS_ONLY', status: 'ACTIVE', storageStatus: 'PENDING', reviewStatus: 'WORKING', owner: { userId: 'student-1', fullName: 'Synthetic Student' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' }

function wrapper(ui, path = '/') {
  return render(
    <AuthContext.Provider value={{ user: { id: 'student-1', role: 'STUDENT', status: 'ACTIVE' } }}>
      <ClassContext.Provider value={{ selectedClass, selectionStatus: 'ready', api: { listMembers: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, hasNextPage: false } }) } }}>
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
    ...overrides,
  }
}

afterEach(() => vi.useRealTimers())

describe('Phase 10C.1 repository views', () => {
  it('creates a real personal repository without browser Git behavior', async () => {
    const api = repositoryApiMock({
      listRepositories: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }),
      createPersonal: vi.fn().mockResolvedValue({ data: { ...repository, id: 'personal-1', projectTaskId: null, teamId: null, repositoryType: 'PERSONAL', repositoryName: 'private-repo', visibility: 'PRIVATE' } }),
    })
    wrapper(<StudentRepositoryCatalog api={api} />)
    await waitFor(() => expect(api.listRepositories).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }), expect.any(Object)))
    fireEvent.click(await screen.findByRole('button', { name: 'New Personal Repository' }))
    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'private-repo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }))
    expect(await screen.findByText('private-repo')).toBeInTheDocument()
    expect(api.createPersonal).toHaveBeenCalledWith({ repositoryName: 'private-repo', description: null })
    expect(screen.queryByText(/Git initialized/i)).not.toBeInTheDocument()
  })

  it('rejects a repository whose project identity disagrees with the route', async () => {
    const api = repositoryApiMock({ getRepository: vi.fn().mockResolvedValue({ data: { ...repository, projectTaskId: 'other-task' } }) })
    const projects = { getProjectTask: vi.fn() }
    wrapper(<Routes><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<RepositoryFoundationDetail api={api} projects={projects} />} /></Routes>, '/student/projects/task-1/repositories/repo-1?classId=class-1')
    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
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
    expect(await screen.findByText('Pending')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument(), { timeout: 3500 })
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
    expect(screen.getByText(/archived project-task detail is not exposed/i)).toBeInTheDocument()
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
})
