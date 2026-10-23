import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdminFreshness } from './use-admin-freshness.js'

afterEach(() => vi.restoreAllMocks())

describe('Admin read freshness', () => {
  it('throttles and deduplicates focus/visibility reads without polling', async () => {
    let now = 20_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    let resolve
    const load = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderHook(() => useAdminFreshness(load))
    await act(async () => {})
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(1)
    now += 16_000
    load.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    fireEvent.focus(window)
    fireEvent(document, new Event('visibilitychange'))
    expect(load).toHaveBeenCalledTimes(2)
    await act(async () => resolve())
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(2)
    unmount()
    now += 20_000
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('pauses background reads for drafts/dialogs but permits explicit recovery', async () => {
    let now = 20_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const load = vi.fn().mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ paused }) => useAdminFreshness(load, paused), { initialProps: { paused: true } })
    await act(async () => {})
    now += 20_000
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => result.current())
    expect(load).toHaveBeenCalledTimes(2)
    rerender({ paused: false })
    const dialog = document.createElement('section')
    dialog.setAttribute('role', 'dialog'); document.body.append(dialog)
    now += 20_000
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(2)
    dialog.remove()
    fireEvent.focus(window)
    expect(load).toHaveBeenCalledTimes(3)
    await act(async () => {})
  })

  it('cancels superseded identities and explicit retries, including unmount', async () => {
    const load = vi.fn(() => new Promise(() => {})), next = vi.fn(() => new Promise(() => {}))
    const { result, rerender, unmount } = renderHook(({ read }) => useAdminFreshness(read), { initialProps: { read: load } })
    const firstSignal = load.mock.calls[0][0].signal
    rerender({ read: next })
    expect(firstSignal.aborted).toBe(true)
    const secondSignal = next.mock.calls[0][0].signal
    act(() => { result.current() })
    expect(secondSignal.aborted).toBe(true)
    const lastSignal = next.mock.calls.at(-1)[0].signal
    unmount()
    expect(lastSignal.aborted).toBe(true)
  })
})
