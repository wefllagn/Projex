import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationErrorBoundary, RouteErrorRecovery, UnavailablePage } from './ApplicationErrorBoundary.jsx'

function Broken() { throw new TypeError('PRIVATE_DATABASE_DETAIL.toLowerCase stack should never appear') }
describe('QA-STD-001 recovery', () => {
  it('contains component failures, removes private content and retries the component', async () => {
    vi.spyOn(console,'error').mockImplementation(()=>{})
    let fail = true
    function Page() { return fail ? <Broken /> : <p>Recovered page</p> }
    render(<ApplicationErrorBoundary><Page /></ApplicationErrorBoundary>)
    expect(screen.getByRole('dialog',{name:'This page couldn’t continue'})).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('PRIVATE_DATABASE_DETAIL')
    expect(document.body).not.toHaveTextContent('TypeError')
    fail = false
    await userEvent.click(screen.getByRole('button',{name:'Try again'}))
    expect(screen.getByText('Recovered page')).toBeInTheDocument()
  })
  it('replaces the framework route error screen with friendly recovery', async () => {
    vi.spyOn(console,'error').mockImplementation(()=>{})
    const router = createMemoryRouter([{path:'/',element:<Broken />,errorElement:<RouteErrorRecovery />}])
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('This page couldn’t continue')
    expect(document.body).not.toHaveTextContent('Unexpected Application Error')
    expect(document.body).not.toHaveTextContent('PRIVATE_DATABASE_DETAIL')
  })
  it('explains an unavailable link and supplies a real safe destination', () => {
    render(<UnavailablePage />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('This page isn’t available')
    expect(screen.getByRole('link',{name:'Back to Origin'})).toHaveAttribute('href','/')
  })
})
