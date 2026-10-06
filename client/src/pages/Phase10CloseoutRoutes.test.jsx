import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import ClassProvider from '../classes/ClassProvider.jsx'
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
          <StudentRoutePage pagePath="todo" />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'To-do' })).toBeInTheDocument()
    expect(await screen.findByText('Actual programming work')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open record' })).toHaveAttribute('href', '/student/activity/activity-1?classId=class-1')
    expect(get).toHaveBeenCalledWith('/work-hub/student/todo?page=1&pageSize=20', expect.any(Object))
    expect(screen.queryByText('Prelim Programming Exercise 1 LAB')).not.toBeInTheDocument()
    expect(screen.queryByText('Prelim Group Project 1 Specifications')).not.toBeInTheDocument()
    expect(screen.queryByText(/IT 112 - BSIT 2A/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Jul 3, 2026/i)).not.toBeInTheDocument()
    expect(container.querySelector('[href*="prelim-group-project-1"]')).not.toBeInTheDocument()
    get.mockRestore()
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

  it('links the Instructor dashboard to the current review queue', async () => {
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

    expect(await screen.findByRole('link', { name: 'Open review queue' })).toHaveAttribute('href', '/instructor/review-queues')
    expect(screen.queryByText(/will be connected in Phase 10B and 10C/i)).not.toBeInTheDocument()
  })
})
