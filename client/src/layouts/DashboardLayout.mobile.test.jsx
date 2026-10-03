import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { ClassContext } from '../classes/class-context.js'
import DashboardLayout from './DashboardLayout.jsx'

function renderRole(role, destination) {
  const base = `/${role.toLowerCase()}`
  const user = { id: `${role}-1`, fullName: `Synthetic ${role}`, email: `${role.toLowerCase()}@integration.test`, role, status: 'ACTIVE' }
  const classContext = { classes: [], requestedClassId: null, status: 'ready', pagination: { hasNextPage: false } }
  const logout = vi.fn()
  render(
    <AuthContext.Provider value={{ user, logout }}>
      <ClassContext.Provider value={classContext}>
        <MemoryRouter initialEntries={[base]}>
          <Routes>
            <Route path={base} element={<DashboardLayout role={{ id: role.toLowerCase() }} />}>
              <Route index element={<span>Dashboard content</span>} />
              <Route path={destination.slice(base.length + 1)} element={<span>Destination content</span>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ClassContext.Provider>
    </AuthContext.Provider>,
  )
  return { logout }
}

describe('authenticated mobile navigation', () => {
  it.each([
    ['STUDENT', '/student/todo', 'To-do', 'Student navigation'],
    ['INSTRUCTOR', '/instructor/review-queues', 'Review Queues', 'Instructor navigation'],
    ['ADMIN', '/admin/users', 'Users', 'Administrator navigation'],
  ])('opens and closes the %s drawer while preserving its authorized route', async (role, destination, linkName, navigationName) => {
    const user = userEvent.setup()
    renderRole(role, destination)

    const shell = screen.getByText('Dashboard content').closest('.student-app-shell')
    const menu = screen.getByRole('button', { name: 'Open navigation' })
    const navigation = screen.getByRole('navigation', { name: navigationName })
    expect(menu).toHaveAttribute('aria-controls', navigation.closest('aside').id)
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(shell).not.toHaveClass('is-mobile-menu-open')

    await user.click(menu)
    expect(screen.getByRole('button', { name: 'Close navigation', expanded: true })).toHaveAttribute('aria-expanded', 'true')
    expect(shell).toHaveClass('is-mobile-menu-open')
    await user.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(shell).not.toHaveClass('is-mobile-menu-open')

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(screen.getByRole('link', { name: linkName }))
    expect(await screen.findByText('Destination content')).toBeInTheDocument()
    expect(shell).not.toHaveClass('is-mobile-menu-open')
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the drawer with Escape and its own close control', async () => {
    const user = userEvent.setup()
    renderRole('STUDENT', '/student/todo')
    const shell = screen.getByText('Dashboard content').closest('.student-app-shell')
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.keyboard('{Escape}')
    expect(shell).not.toHaveClass('is-mobile-menu-open')

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(screen.getAllByRole('button', { name: 'Close navigation' }).find((button) => button.classList.contains('student-mobile-nav-close')))
    expect(shell).not.toHaveClass('is-mobile-menu-open')
  })

  it.each(['STUDENT', 'INSTRUCTOR', 'ADMIN'])('keeps the %s account control in the shared header', async (role) => {
    const user = userEvent.setup()
    const destination = role === 'ADMIN' ? '/admin/users' : role === 'STUDENT' ? '/student/todo' : '/instructor/review-queues'
    const { logout } = renderRole(role, destination)
    const header = screen.getByRole('banner')
    const account = screen.getByRole('button', { name: 'Account menu' })
    expect(header).toContainElement(account)
    expect(account).toHaveAttribute('aria-expanded', 'false')

    await user.click(account)
    expect(account).toHaveAttribute('aria-expanded', 'true')
    expect(header).toHaveTextContent(`${role.toLowerCase()}@integration.test`)
    await user.keyboard('{Escape}')
    expect(account).toHaveAttribute('aria-expanded', 'false')

    await user.click(account)
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(account).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Close navigation', expanded: true })).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })
})
