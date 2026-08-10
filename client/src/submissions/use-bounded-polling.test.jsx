import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useBoundedPolling from './use-bounded-polling.js'

afterEach(() => vi.useRealTimers())

describe('bounded polling', () => {
  it('never overlaps requests and schedules the next poll only after completion', async () => {
    vi.useFakeTimers()
    let completeFirst
    const load = vi.fn()
      .mockImplementationOnce((_identity, { signal }) => new Promise((resolve) => {
        completeFirst = () => resolve({ data: { signal } })
      }))
      .mockResolvedValue({ data: {} })
    const onData = vi.fn().mockReturnValue(true)

    const { unmount } = renderHook(() => useBoundedPolling({
      identity: 'run-1',
      active: true,
      load,
      onData,
      initialDelayMs: 10,
      maximumDelayMs: 10,
      maximumDurationMs: 1000,
    }))

    await act(async () => vi.advanceTimersByTime(10))
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTime(100))
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => completeFirst())
    await act(async () => vi.advanceTimersByTime(10))
    expect(load).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('aborts the active browser request on unmount without invoking an error handler', async () => {
    vi.useFakeTimers()
    let observedSignal
    const load = vi.fn((_identity, { signal }) => {
      observedSignal = signal
      return new Promise(() => {})
    })
    const onError = vi.fn()

    const { unmount } = renderHook(() => useBoundedPolling({
      identity: 'run-1',
      active: true,
      load,
      onData: () => true,
      onError,
      initialDelayMs: 1,
    }))

    await act(async () => vi.advanceTimersByTime(1))
    expect(observedSignal.aborted).toBe(false)
    unmount()
    expect(observedSignal.aborted).toBe(true)
    expect(onError).not.toHaveBeenCalled()
  })

  it('stops automatic polling at the configured duration', async () => {
    vi.useFakeTimers()
    const onBoundedStop = vi.fn()
    const load = vi.fn().mockResolvedValue({ data: {} })

    renderHook(() => useBoundedPolling({
      identity: 'run-1',
      active: true,
      load,
      onData: () => true,
      onBoundedStop,
      initialDelayMs: 10,
      maximumDelayMs: 10,
      maximumDurationMs: 25,
    }))

    await act(async () => vi.advanceTimersByTimeAsync(30))
    expect(onBoundedStop).toHaveBeenCalledTimes(1)
  })
})
