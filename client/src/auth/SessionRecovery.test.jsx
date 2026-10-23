import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { ApiError } from '../api/api-client.js'

const profile = role => ({ id: role, fullName: `${role} Private name`, role, status: 'ACTIVE' })
function setup(role = 'STUDENT') {
  let account = profile(role)
  const client = { get: vi.fn(async () => { if (!account) throw new ApiError({ status: 401 }); return { data: account } }), invalidateRequests: vi.fn() }
  const container = document.createElement('div'); container.id = 'root'; document.body.append(container)
  render(<AuthProvider client={client}><MemoryRouter initialEntries={['/'+role.toLowerCase()]}><Routes>
    {['STUDENT','INSTRUCTOR','ADMIN'].map(r => <Route key={r} path={'/'+r.toLowerCase()} element={<ProtectedRoute role={r}><p>{r} private content</p><textarea aria-label="Unsaved source" defaultValue="keep this code" /></ProtectedRoute>} />)}
    <Route path="/student-login" element={<p>Student sign in form</p>} />
    <Route path="/instructor-login" element={<p>Instructor sign in form</p>} />
  </Routes></MemoryRouter></AuthProvider>, { container })
  return { client, setAccount: next => { account = next }, container }
}

describe('cross-tab session recovery', () => {
  it.each([['STUDENT','INSTRUCTOR'],['INSTRUCTOR','STUDENT'],['ADMIN','INSTRUCTOR']])('removes stale %s content before continuing as %s', async (from,to) => {
    const { setAccount, client } = setup(from)
    expect(await screen.findByText(from+' private content')).toBeInTheDocument()
    setAccount(profile(to))
    act(() => window.dispatchEvent(new StorageEvent('storage',{key:'origin-session-change',newValue:'notification-only'})))
    expect(screen.queryByText(from+' private content')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Unsaved source')).not.toBeInTheDocument()
    expect(await screen.findByRole('dialog',{name:'Your account has changed'})).toBeInTheDocument()
    expect(client.invalidateRequests).toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:/Close/})).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button',{name:'Continue with current account'}))
    expect(await screen.findByText(to+' private content')).toBeInTheDocument()
  })
  it('locks an expired or externally logged-out tab and offers real sign-in navigation', async () => {
    const { setAccount } = setup()
    await screen.findByText('STUDENT private content')
    setAccount(null)
    act(() => window.dispatchEvent(new Event('focus')))
    expect(await screen.findByRole('dialog',{name:'Your session has ended'})).toBeInTheDocument()
    expect(screen.queryByText('STUDENT private content')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button',{name:'Go to sign in'}))
    expect(await screen.findByText('Student sign in form')).toBeInTheDocument()
  })
  it('preserves unsaved code when focus confirms the same account', async () => {
    setup()
    await screen.findByText('STUDENT private content')
    await userEvent.type(screen.getByLabelText('Unsaved source'),' plus edits')
    act(() => window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(screen.getByLabelText('Unsaved source')).toHaveValue('keep this code plus edits'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
