import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from './auth-context.js'
import ProtectedRoute from './ProtectedRoute.jsx'

function renderGuard(auth, initialPath = '/student/activity') {
  return render(
    <AuthContext.Provider value={{ bootstrap: vi.fn(), ...auth }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/student-login" element={<span>student login</span>} />
          <Route path="/instructor" element={<span>instructor home</span>} />
          <Route path="/student/activity" element={(
            <ProtectedRoute role="STUDENT"><span>protected student content</span></ProtectedRoute>
          )} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function renderAdminGuard(auth) {
  return render(
    <AuthContext.Provider value={{ bootstrap: vi.fn(), ...auth }}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/student" element={<span>student home</span>} />
          <Route path="/instructor" element={<span>instructor home</span>} />
          <Route path="/admin" element={(
            <ProtectedRoute role="ADMIN"><span>protected admin content</span></ProtectedRoute>
          )} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('prevents protected content from flashing during bootstrap', () => {
    renderGuard({ status: 'loading', user: null })
    expect(screen.getByText('Loading Projex')).toBeInTheDocument()
    expect(screen.queryByText('protected student content')).not.toBeInTheDocument()
  })

  it('redirects an anonymous user to the role login', () => {
    renderGuard({ status: 'anonymous', user: null })
    expect(screen.getByText('student login')).toBeInTheDocument()
  })

  it('redirects a wrong-role user to the authorized role home', () => {
    renderGuard({ status: 'authenticated', user: { role: 'INSTRUCTOR', status: 'ACTIVE' } })
    expect(screen.getByText('instructor home')).toBeInTheDocument()
  })

  it('shows an honest inactive-account state', () => {
    renderGuard({ status: 'blocked', user: { role: 'STUDENT', status: 'SUSPENDED' } })
    expect(screen.getByText(/account is not active/i)).toBeInTheDocument()
  })

  it('renders protected content only for the matching active role', () => {
    renderGuard({ status: 'authenticated', user: { role: 'STUDENT', status: 'ACTIVE' } })
    expect(screen.getByText('protected student content')).toBeInTheDocument()
  })

  it.each(['STUDENT', 'INSTRUCTOR'])('denies the admin route to an active %s account', (role) => {
    renderAdminGuard({ status: 'authenticated', user: { role, status: 'ACTIVE' } })
    expect(screen.queryByText('protected admin content')).not.toBeInTheDocument()
    expect(screen.getByText(role === 'STUDENT' ? 'student home' : 'instructor home')).toBeInTheDocument()
  })

  it('renders the admin route only for an active administrator', () => {
    renderAdminGuard({ status: 'authenticated', user: { role: 'ADMIN', status: 'ACTIVE' } })
    expect(screen.getByText('protected admin content')).toBeInTheDocument()
  })
})
