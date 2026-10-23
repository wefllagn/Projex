import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGroupFreshness } from './use-group-freshness.js'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
describe('Event-driven Group freshness', () => {
  it('throttles fresh events and deduplicates stale focus plus visibility', async () => {
    vi.useFakeTimers()
    let finish
    const refresh = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { rerender, unmount } = renderHook(({ activeKey }) => useGroupFreshness({ identity: 'repo', refresh, activeKey }), { initialProps: { activeKey: 'code' } })
    fireEvent.focus(window); await flush(); expect(refresh).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(16_000))
    fireEvent.focus(window); fireEvent(document, new Event('visibilitychange')); await flush()
    expect(refresh).toHaveBeenCalledTimes(1)
    const signal = refresh.mock.calls[0][0].signal
    await act(async () => finish())
    rerender({ activeKey: 'members' }); await flush(); expect(refresh).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(16_000))
    rerender({ activeKey: 'code' }); await flush(); expect(refresh).toHaveBeenCalledTimes(2)
    expect(signal.aborted).toBe(false)
    const active = refresh.mock.calls[1][0].signal
    unmount(); expect(active.aborted).toBe(true)
  })
  it('defers revalidation while editing and does not poll or auto-retry failures', async () => {
    vi.useFakeTimers()
    const refresh = vi.fn().mockRejectedValue(new Error('offline'))
    const { rerender } = renderHook(({ blocked }) => useGroupFreshness({ identity: 'project', refresh, blocked }), { initialProps: { blocked: true } })
    act(() => vi.advanceTimersByTime(60_000)); fireEvent.focus(window); await flush()
    expect(refresh).not.toHaveBeenCalled()
    rerender({ blocked: false }); await flush(); expect(refresh).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(300_000)); await flush(); expect(refresh).toHaveBeenCalledTimes(1)
    fireEvent.focus(window); await flush(); expect(refresh).toHaveBeenCalledTimes(2)
  })
  it('aborts an old identity request and removes listeners on unmount', async () => {
    vi.useFakeTimers()
    const refresh = vi.fn().mockReturnValue(new Promise(() => {}))
    const { rerender, unmount } = renderHook(({ identity }) => useGroupFreshness({ identity, refresh }), { initialProps: { identity: 'one' } })
    act(() => vi.advanceTimersByTime(16_000)); fireEvent.focus(window); await flush()
    const signal = refresh.mock.calls[0][0].signal
    rerender({ identity: 'two' }); expect(signal.aborted).toBe(true)
    unmount(); act(() => vi.advanceTimersByTime(16_000)); fireEvent.focus(window); await flush()
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
