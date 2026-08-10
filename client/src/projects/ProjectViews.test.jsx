import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ClassContext } from '../classes/class-context.js'
import { InstructorProjectEditor, StudentProjectDetail, StudentProjectList } from './ProjectViews.jsx'

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

describe('Phase 10C.1 project views', () => {
  it('fails closed when a project list contains another class and never renders prototype data', async () => {
    const api = { listProjectTasks: vi.fn().mockResolvedValue({ data: [{ ...project, classId: 'other-class', title: 'Should not render' }], pagination: { totalItems: 1, totalPages: 1 } }) }
    renderWithClass(<StudentProjectList api={api} />)
    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument()
    expect(screen.queryByText(/Prelim Group Project/i)).not.toBeInTheDocument()
  })

  it('creates a class-project repository using the real project ID and validates the response link', async () => {
    const api = { getProjectTask: vi.fn().mockResolvedValue({ data: project }) }
    const repositories = {
      listRepositories: vi.fn().mockResolvedValue({ data: [], pagination: { totalItems: 0, totalPages: 0 } }),
      createClassProject: vi.fn().mockResolvedValue({ data: { id: 'repo-1', projectTaskId: 'task-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'team-repo', storageStatus: 'PENDING', status: 'ACTIVE', reviewStatus: 'WORKING', owner: { userId: 'student-1', fullName: 'Synthetic Student' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' } }),
    }
    renderWithClass(<Routes><Route path="/student/projects/:projectTaskId" element={<StudentProjectDetail api={api} repositories={repositories} />} /><Route path="/student/projects/:projectTaskId/repositories/:repositoryId" element={<p>Repository route reached</p>} /></Routes>, '/student/projects/task-1?classId=class-1')
    fireEvent.change(await screen.findByLabelText('Team name'), { target: { value: 'Synthetic Team' } })
    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'team-repo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }))
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
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))
    expect(await screen.findByText(/latest version is loaded/i)).toBeInTheDocument()
    expect(api.transitionProjectTask).toHaveBeenNthCalledWith(1, 'task-1', 'close', { expectedUpdatedAt: project.updatedAt })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(api.transitionProjectTask).toHaveBeenNthCalledWith(2, 'task-1', 'close', { expectedUpdatedAt: newer.updatedAt }))
  })
})
