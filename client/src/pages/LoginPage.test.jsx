import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AuthProvider } from '../auth/AuthContext.jsx'
import { AuthContext } from '../auth/auth-context.js'
import LoginPage, { InstructorLoginPage } from './LoginPage.jsx'

afterEach(() => localStorage.removeItem('origin-public-theme'))

function renderLogin({ component = <LoginPage />, login = vi.fn(), initialEntry = '/student-login' } = {}) {
  const auth = {
    status: 'anonymous',
    user: null,
    login,
  }
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/student-login" element={component} />
          <Route path="/instructor-login" element={component} />
          <Route path="/student" element={<span>student home</span>} />
          <Route path="/instructor" element={<span>instructor home</span>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('real login forms', () => {
  it('uses the backend-returned role rather than the visual login entry role', async () => {
    const login = vi.fn().mockResolvedValue({ role: 'INSTRUCTOR', status: 'ACTIVE' })
    renderLogin({ login })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email'), 'synthetic@example.edu')
    await user.type(screen.getByLabelText('Password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(login).toHaveBeenCalledWith('synthetic@example.edu', 'Synthetic1!')
    expect(await screen.findByText('instructor home')).toBeInTheDocument()
  })

  it('renders a safe authentication failure and clears the password', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError({
      status: 401,
      code: 'AUTHENTICATION_FAILED',
      message: 'Email or password is invalid.',
    }))
    renderLogin({ component: <InstructorLoginPage />, login, initialEntry: '/instructor-login' })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email'), 'synthetic@example.edu')
    await user.type(screen.getByLabelText('Password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is invalid.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('synthetic@example.edu')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('contains no hardcoded email or password defaults', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('keeps typed credentials while changing public appearance and toggling visibility', async () => {
    const login = vi.fn()
    const { container } = renderLogin({ login })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'synthetic@example.edu')
    await user.type(screen.getByLabelText('Password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Light appearance' }))
    expect(container.querySelector('.origin-auth')).toHaveAttribute('data-theme', 'light')
    expect(screen.getByLabelText('Email')).toHaveValue('synthetic@example.edu')
    expect(screen.getByLabelText('Password')).toHaveValue('Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(login).not.toHaveBeenCalled()
  })
})

function renderSession(role, entry = '/instructor-login', logoutError) {
  const client = {
    get: vi.fn().mockResolvedValue({ data: { role, status: 'ACTIVE' } }),
    post: vi.fn().mockImplementation((path) => path === '/auth/logout' && logoutError
      ? Promise.reject(logoutError) : Promise.resolve({ data: {} })),
  }
  render(<AuthProvider client={client}><MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/student-login" element={<LoginPage />} />
    <Route path="/instructor-login" element={<InstructorLoginPage />} />
    <Route path="/student" element={<span>student home</span>} />
    <Route path="/instructor" element={<span>instructor home</span>} />
    <Route path="/admin" element={<span>admin home</span>} />
  </Routes></MemoryRouter></AuthProvider>)
  return client
}

describe('intentional account switching', () => {
  it.each([
    ['STUDENT', '/instructor-login', 'Student', 'Instructor'],
    ['INSTRUCTOR', '/student-login', 'Instructor', 'Student'],
    ['ADMIN', '/student-login', 'Admin', 'Student'],
  ])('keeps %s authenticated until confirmed logout', async (role, entry, current, target) => {
    const client = renderSession(role, entry)
    expect(await screen.findByText(new RegExp(`already signed in as .* ${current}`))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`To use .* ${target} account`))).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out and switch account' }))
    expect(client.post).toHaveBeenCalledWith('/auth/logout', {})
    expect(await screen.findByLabelText('Password')).toHaveValue('')
    expect(screen.getByRole('region', { name: `${target} login` })).toBeInTheDocument()
  })

  it('continues the current role without logging out', async () => {
    const client = renderSession('STUDENT')
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as Student' }))
    expect(await screen.findByText('student home')).toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('keeps the switch screen retryable when server logout fails', async () => {
    const client = renderSession('STUDENT', '/instructor-login', new ApiError({ code: 'NETWORK_ERROR' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and switch account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach the server')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    client.post.mockResolvedValue({ data: {} })
    await userEvent.click(screen.getByRole('button', { name: 'Sign out and switch account' }))
    expect(await screen.findByLabelText('Password')).toBeInTheDocument()
  })

  it.each([['STUDENT', '/student-login', 'student home'], ['INSTRUCTOR', '/instructor-login', 'instructor home'], ['ADMIN', '/instructor-login', 'admin home']])('preserves same-role/shared Admin entry for %s', async (role, entry, home) => {
    const client = renderSession(role, entry)
    expect(await screen.findByText(home)).toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()
  })
})
