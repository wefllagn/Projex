import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'

function renderLayout(logout = vi.fn().mockResolvedValue(undefined), entry = '/admin') {
  render(
    <AuthContext.Provider value={{ user: { id: 'admin-1', fullName: 'Synthetic Admin', role: 'ADMIN', status: 'ACTIVE' }, logout }}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<span>landing</span>} />
          <Route path="/admin" element={<DashboardLayout role={{ id: 'admin' }} />}>
            <Route index element={<span>admin content</span>} />
            <Route path="*" element={<span>admin child content</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return logout
}

describe('admin dashboard layout', () => {
  it.each([
    ['/admin', 'Overview'], ['/admin/users/user-1', 'Users'],
    ['/admin/academic/classes/class-1', 'Classes'], ['/admin/academic/courses', 'Course Catalog'],
    ['/admin/academic', 'Academic Records'], ['/admin/academic/activities', 'Academic Records'],
    ['/admin/operations/execution-jobs', 'Operations'], ['/admin/audit-events', 'Audit Events'],
  ])('selects only the relevant destination for %s', (entry, label) => {
    renderLayout(undefined, entry)
    const selected = document.querySelectorAll('nav[aria-label="Administrator navigation"] [aria-current="page"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveTextContent(label)
  })
  it('uses the Origin student/instructor shell language without prototype controls', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: 'Administrator navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Course Catalog' })).toHaveAttribute('href', '/admin/academic/courses')
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.queryByText('NEXT MILESTONE')).not.toBeInTheDocument()
    expect(screen.getAllByText('Synthetic Admin').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Role switcher')).not.toBeInTheDocument()
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Course')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Section')).not.toBeInTheDocument()
  })

  it('uses the real logout operation', async () => {
    const logout = renderLayout()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalledOnce()
    expect(await screen.findByText('landing')).toBeInTheDocument()
  })
})
