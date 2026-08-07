import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './auth-context.js'

const activeStudent = {
  id: 'user-1',
  fullName: 'Synthetic Student',
  email: 'synthetic.student@example.edu',
  role: 'STUDENT',
  status: 'ACTIVE',
}

function Probe({ onAuth }) {
  const auth = useAuth()
  useEffect(() => onAuth?.(auth), [auth, onAuth])
  return (
    <div>
      <span>{auth.status}</span>
      <span>{auth.user?.fullName}</span>
      <button type="button" onClick={() => auth.login('synthetic@example.edu', 'Synthetic1!')}>Login</button>
      <button type="button" onClick={() => auth.logout()}>Logout</button>
    </div>
  )
}

function client(overrides = {}) {
  return {
    get: vi.fn().mockResolvedValue({ data: activeStudent }),
    post: vi.fn().mockResolvedValue({ data: activeStudent }),
    refreshSession: vi.fn().mockResolvedValue({ data: { refreshed: true } }),
    subscribeAuthenticationFailure: vi.fn(() => () => {}),
    ...overrides,
  }
}

describe('AuthProvider', () => {
  it('bootstraps the current authenticated user', async () => {
    const api = client()
    render(<AuthProvider client={api}><Probe /></AuthProvider>)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('Synthetic Student')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('settles as anonymous when session restoration fails authentication', async () => {
    const api = client({ get: vi.fn().mockRejectedValue(new ApiError({ status: 401 })) })
    render(<AuthProvider client={api}><Probe /></AuthProvider>)
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('distinguishes network/server bootstrap failure from anonymous state', async () => {
    const api = client({ get: vi.fn().mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR' })) })
    render(<AuthProvider client={api}><Probe /></AuthProvider>)
    expect(await screen.findByText('error')).toBeInTheDocument()
  })

  it('uses the returned backend role and clears local auth state on logout', async () => {
    const api = client()
    render(<AuthProvider client={api} autoBootstrap={false}><Probe /></AuthProvider>)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Synthetic Student')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(Object), expect.objectContaining({ csrf: false }))

    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('clears protected content even when backend logout fails', async () => {
    const api = client({
      post: vi.fn()
        .mockResolvedValueOnce({ data: activeStudent })
        .mockRejectedValueOnce(new ApiError({ status: 401 })),
    })
    render(<AuthProvider client={api} autoBootstrap={false}><Probe /></AuthProvider>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Login' }))
    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('does not persist authentication or credential material in browser storage', async () => {
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    let auth
    render(<AuthProvider client={client()} autoBootstrap={false}><Probe onAuth={(value) => { auth = value }} /></AuthProvider>)

    await act(() => auth.login('synthetic@example.edu', 'Synthetic1!'))
    await act(() => auth.logout())

    expect(localSpy).not.toHaveBeenCalled()
  })

  it('clears authenticated state when the API client reports exhausted session recovery', async () => {
    let reportAuthenticationFailure
    const api = client({
      subscribeAuthenticationFailure: vi.fn((listener) => {
        reportAuthenticationFailure = listener
        return () => {}
      }),
    })
    render(<AuthProvider client={api} autoBootstrap={false}><Probe /></AuthProvider>)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Synthetic Student')).toBeInTheDocument()
    act(() => reportAuthenticationFailure(new ApiError({ status: 401 })))
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })
})
