import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'

function renderLayout(logout = vi.fn().mockResolvedValue(undefined)) {
  render(
    <AuthContext.Provider value={{ user: { id: 'admin-1', fullName: 'Synthetic Admin', role: 'ADMIN', status: 'ACTIVE' }, logout }}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<span>landing</span>} />
          <Route path="/admin" element={<DashboardLayout role={{ id: 'admin' }} />}>
            <Route index element={<span>admin content</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return logout
}

describe('admin dashboard layout', () => {
  it('uses the Projex student/instructor shell language without prototype controls', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: 'Administrator navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByText('Synthetic Admin')).toBeInTheDocument()
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
