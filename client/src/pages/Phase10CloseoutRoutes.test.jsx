import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import ClassProvider from '../classes/ClassProvider.jsx'
import { InstructorRoutePage } from './InstructorPages.jsx'
import { StudentRoutePage } from './StudentPages.jsx'

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
  it('renders an honest student to-do backend gap without prototype academic records', () => {
    const { container } = render(
      <AuthContext.Provider value={auth('STUDENT')}>
        <MemoryRouter initialEntries={['/student/todo']}>
          <StudentRoutePage pagePath="todo" />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'To-do' })).toBeInTheDocument()
    expect(screen.getByText('Consolidated to-do is not available')).toBeInTheDocument()
    expect(screen.getByText(/does not currently provide an authoritative cross-class task list/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my classes' })).toHaveAttribute('href', '/student/classes')
    expect(screen.getByRole('link', { name: 'View my repositories' })).toHaveAttribute('href', '/student/repositories')
    expect(screen.queryByText('Prelim Programming Exercise 1 LAB')).not.toBeInTheDocument()
    expect(screen.queryByText('Prelim Group Project 1 Specifications')).not.toBeInTheDocument()
    expect(screen.queryByText(/IT 112 - BSIT 2A/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Jul 3, 2026/i)).not.toBeInTheDocument()
    expect(container.querySelector('[href*="prelim-group-project-1"]')).not.toBeInTheDocument()
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

  it('describes the instructor review queue as a current backend gap', async () => {
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

    expect(await screen.findByText('Cross-class review queue unavailable')).toBeInTheDocument()
    expect(screen.getByText(/bounded backend contract/i)).toBeInTheDocument()
    expect(screen.queryByText(/will be connected in Phase 10B and 10C/i)).not.toBeInTheDocument()
  })
})
