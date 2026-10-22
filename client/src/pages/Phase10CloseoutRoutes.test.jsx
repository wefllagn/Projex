import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import ClassProvider from '../classes/ClassProvider.jsx'
import { ClassContext } from '../classes/class-context.js'
import { InstructorRoutePage } from './InstructorPages.jsx'
import { StudentRoutePage } from './StudentPages.jsx'
import { apiClient } from '../api/api-client.js'

const pagination = {
  page: 1,
  pageSize: 100,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
}

function auth(role) {
  return {
    status: 'authenticated',
    user: {
      id: `${role.toLowerCase()}-1`,
      fullName: `Synthetic ${role}`,
      email: `${role.toLowerCase()}@example.edu`,
      role,
      status: 'ACTIVE',
    },
    bootstrap: vi.fn(),
    logout: vi.fn(),
  }
}

describe('Phase 10 closeout routes', () => {
  it('renders authoritative cross-class Student to-do rows without prototype academic records', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'activity-1', kind: 'activity', title: 'Actual programming work', dueDate: '2030-01-01T00:00:00.000Z', dueState: 'upcoming', hasSubmission: false, class: { id: 'class-1', className: 'Actual class', officialClassCode: null, section: null, semester: null, schoolYear: null } }], pagination: { ...pagination, totalItems: 1 } })
    const { container } = render(
      <AuthContext.Provider value={auth('STUDENT')}>
        <MemoryRouter initialEntries={['/student/todo']}>
          <ClassContext.Provider value={{ classes: [], pagination: { hasNextPage: false } }}><StudentRoutePage pagePath="todo" /></ClassContext.Provider>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'To-do' })).toBeInTheDocument()
    expect(await screen.findByText('Actual programming work')).toBeInTheDocument()
    expect(screen.getByText('Actual programming work').closest('a')).toHaveAttribute('href', '/student/activity/activity-1?classId=class-1')
    expect(get).toHaveBeenCalledWith('/work-hub/student/todo?page=1&pageSize=20&state=assigned', expect.any(Object))
    expect(screen.queryByText('Prelim Programming Exercise 1 LAB')).not.toBeInTheDocument()
    expect(screen.queryByText('Prelim Group Project 1 Specifications')).not.toBeInTheDocument()
    expect(screen.queryByText(/IT 112 - BSIT 2A/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Jul 3, 2026/i)).not.toBeInTheDocument()
    expect(container.querySelector('[href*="prelim-group-project-1"]')).not.toBeInTheDocument()
    get.mockRestore()
  })

  it('redirects the retired global submissions page to To-do Done', async () => {
    render(<MemoryRouter initialEntries={['/student/submissions']}><Routes>
      <Route path="/student/submissions" element={<StudentRoutePage pagePath="submissions" />} />
      <Route path="/student/todo" element={<span>Completed work</span>} />
    </Routes></MemoryRouter>)
    expect(await screen.findByText('Completed work')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My Submissions' })).not.toBeInTheDocument()
  })

  it('keeps the student to-do route protected from an instructor account', () => {
    render(
      <AuthContext.Provider value={auth('INSTRUCTOR')}>
        <MemoryRouter initialEntries={['/student/todo']}>
          <Routes>
            <Route path="/instructor" element={<span>instructor home</span>} />
            <Route
              path="/student/todo"
              element={<ProtectedRoute role="STUDENT"><StudentRoutePage pagePath="todo" /></ProtectedRoute>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('instructor home')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'To-do' })).not.toBeInTheDocument()
  })

  it('keeps the empty Instructor dashboard focused on classes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: [], pagination }),
      post: vi.fn(),
      patch: vi.fn(),
    }
    render(
      <AuthContext.Provider value={auth('INSTRUCTOR')}>
        <MemoryRouter initialEntries={['/instructor']}>
          <ClassProvider client={client}>
            <InstructorRoutePage pagePath="dashboard" />
          </ClassProvider>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Create a class from the sidebar to begin.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Classes', exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument()
    expect(screen.queryByText('To Review')).not.toBeInTheDocument()
    expect(screen.queryByText(/will be connected in Phase 10B and 10C/i)).not.toBeInTheDocument()
  })
})


it.each([['STUDENT', StudentRoutePage], ['INSTRUCTOR', InstructorRoutePage]])('preserves authorized %s repository deep links without a Class query', async (role, Page) => {
  const get = vi.spyOn(apiClient, 'get').mockImplementation(() => new Promise(() => {}))
  const prefix = role.toLowerCase()
  try {
    render(<AuthContext.Provider value={auth(role)}><MemoryRouter initialEntries={[`/${prefix}/projects/project-1/repositories/repo-1`]}><ClassContext.Provider value={{ requestedClassId: null, selectedClass: null, selectionStatus: 'ready' }}><Routes><Route path={`/${prefix}/projects/:projectTaskId/repositories/:repositoryId`} element={<Page pagePath="projects/:projectTaskId/repositories/:repositoryId" />} /></Routes></ClassContext.Provider></MemoryRouter></AuthContext.Provider>)
    await waitFor(() => expect(get).toHaveBeenCalledWith('/repositories/repo-1', expect.any(Object)))
    expect(screen.queryByText('Choose a class')).not.toBeInTheDocument()
  } finally { get.mockRestore() }
})
