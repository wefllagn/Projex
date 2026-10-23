import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '../api/api-client.js'
import { AuthContext } from '../auth/auth-context.js'
import AccountSetupPage from './AccountSetupPage.jsx'
import { consumeSetupToken } from './account-setup-token.js'

const syntheticToken = 'synthetic-setup-token-value-1234567890'

function renderPage(completeAccountSetup = vi.fn().mockResolvedValue({ data: { setupCompleted: true } })) {
  return {
    completeAccountSetup,
    ...render(
      <AuthContext.Provider value={{ completeAccountSetup }}>
        <MemoryRouter><AccountSetupPage /></MemoryRouter>
      </AuthContext.Provider>,
    ),
  }
}

describe('account setup', () => {
  it('retries a temporary recovery failure with the in-memory token and clears it after success', async () => {
    window.history.replaceState(null, '', `/password-recovery#token=${syntheticToken}`)
    const post = vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new ApiError({ status: 503, code: 'TEMPORARILY_UNAVAILABLE', message: 'Try again.' })).mockResolvedValueOnce({ data: { recoveryCompleted: true } })
    render(<AuthContext.Provider value={{}}><MemoryRouter><AccountSetupPage recovery /></MemoryRouter></AuthContext.Provider>)
    const user = userEvent.setup()
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.type(screen.getByLabelText('New password'), 'Synthetic1!')
      await user.type(screen.getByLabelText('Confirm password'), 'Synthetic1!')
      await user.click(screen.getByRole('button', { name: 'Reset password' }))
    }
    expect(await screen.findByText(/existing sessions have ended/)).toBeInTheDocument()
    expect(post).toHaveBeenLastCalledWith('/password-recovery/complete', { setupToken: syntheticToken, password: 'Synthetic1!', confirmPassword: 'Synthetic1!' }, { csrf: false, allowRefresh: false })
    expect(window.location.hash).toBe('')
    post.mockRestore()
  })

  it('reads a setup token from the fragment and immediately removes the fragment URL', () => {
    const replaceState = vi.fn()
    const token = consumeSetupToken({
      location: { hash: `#token=${syntheticToken}`, pathname: '/account-setup', search: '' },
      history: { state: null, replaceState },
    })

    expect(token).toBe(syntheticToken)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/account-setup')
  })

  it('submits the in-memory token and clears password controls after success', async () => {
    window.history.replaceState(null, '', `/account-setup#token=${syntheticToken}`)
    const { completeAccountSetup } = renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('New password'), 'Synthetic1!')
    await user.type(screen.getByLabelText('Confirm password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Set password' }))

    expect(completeAccountSetup).toHaveBeenCalledWith(syntheticToken, 'Synthetic1!', 'Synthetic1!')
    expect(await screen.findByText(/password is ready/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('shows one safe state for an invalid, expired, or used token and clears password fields', async () => {
    window.history.replaceState(null, '', `/account-setup#token=${syntheticToken}`)
    const complete = vi.fn().mockRejectedValue(new ApiError({
      status: 400,
      code: 'SETUP_TOKEN_INVALID',
      message: 'Setup link is invalid.',
    }))
    renderPage(complete)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('New password'), 'Synthetic1!')
    await user.type(screen.getByLabelText('Confirm password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByText(/invalid, expired, or already used/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('rejects a missing fragment without making a backend request', async () => {
    window.history.replaceState(null, '', '/account-setup')
    const complete = vi.fn()
    renderPage(complete)
    expect(await screen.findByText(/missing its secure token/i)).toBeInTheDocument()
    expect(complete).not.toHaveBeenCalled()
  })

  it('retains the in-memory token across the StrictMode effect replay', async () => {
    window.history.replaceState(null, '', `/account-setup#token=${syntheticToken}`)
    const complete = vi.fn().mockResolvedValue({ data: { setupCompleted: true } })
    render(
      <StrictMode>
        <AuthContext.Provider value={{ completeAccountSetup: complete }}>
          <MemoryRouter><AccountSetupPage /></MemoryRouter>
        </AuthContext.Provider>
      </StrictMode>,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'Synthetic1!')
    await user.type(screen.getByLabelText('Confirm password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Set password' }))
    expect(complete).toHaveBeenCalledWith(syntheticToken, 'Synthetic1!', 'Synthetic1!')
  })
})
