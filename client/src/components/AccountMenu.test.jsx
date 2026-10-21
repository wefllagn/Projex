import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import AccountMenu from './AccountMenu.jsx'

describe('shared academic account menu', () => {
  it.each(['STUDENT', 'INSTRUCTOR'])('keeps %s account actions truthful and keyboard accessible', async role => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue()
    render(<MemoryRouter><AuthContext.Provider value={{ user: { fullName: 'Alex Rivera', email: 'alex@preview.invalid', role }, logout }}><AccountMenu /></AuthContext.Provider></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('alex@preview.invalid')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alex Rivera' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage your Projex account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Profile|Settings/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Privacy Policy|Terms of Service/)).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(screen.queryByText('alex@preview.invalid')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
