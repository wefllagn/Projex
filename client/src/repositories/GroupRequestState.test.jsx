import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import GroupRequestState from './GroupRequestState.jsx'

describe('Group recovery states', () => {
  it.each([404, 500, 503, 505])('presents a safe custom %s state without diagnostics or an invented exit', (status) => {
    const retry = vi.fn()
    render(<GroupRequestState error={new ApiError({ status, message: 'private internal source path', requestId: 'safe-ref' })} action={<button onClick={retry}>Try again</button>} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: status === 404 ? 'We couldn’t find that item.' : 'We couldn’t load this right now.' })).toBeInTheDocument()
    expect(screen.queryByText('private internal source path')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/safe-ref|Reference:|404|500|503|505/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })
  it('does not turn permission denial into a work-in-progress state', () => {
    render(<GroupRequestState error={new ApiError({ status: 403 })} />)
    expect(screen.getByRole('heading', { name: 'Access unavailable' })).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })
  it('keeps loading and empty states separate from failures', () => {
    const view = render(<GroupRequestState kind="loading" message="Loading files…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading files…')
    expect(screen.queryByText(/Oops/)).not.toBeInTheDocument()
    view.rerender(<GroupRequestState kind="empty" message="No commits yet." />)
    expect(screen.getByText('No commits yet.')).toBeInTheDocument()
    expect(screen.queryByText(/Oops/)).not.toBeInTheDocument()
  })
})
