import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGroupCopyFeedback } from './GroupCopyFeedback.jsx'

function CopyExample() {
  const { copy, feedback, dismiss } = useGroupCopyFeedback()
  return <><button onClick={(event) => copy('synthetic-private-value', event)}>Copy hash</button><button onClick={dismiss}>Dismiss</button>{feedback}</>
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
describe('Group cursor copy feedback', () => {
  it('shows only a short popup near the pointer and removes it automatically', async () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue() } })
    render(<CopyExample />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy hash' }), { detail: 1, clientX: 300, clientY: 220 }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('synthetic-private-value')
    expect(screen.getByRole('status')).toHaveTextContent('Copied!')
    expect(screen.getByRole('status')).toHaveStyle({ left: '300px', top: '232px' })
    expect(screen.queryByText('synthetic-private-value')).not.toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(1400))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('supports keyboard copy and reports clipboard failure truthfully', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<CopyExample />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy hash' }), { detail: 0 })
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t copy. Try again.')
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('ignores copy completion after dismissal or unmount', async () => {
    let finish
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockReturnValue(new Promise((done) => { finish = done })) } })
    const view = render(<CopyExample />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy hash' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    view.unmount()
    await act(async () => finish())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
