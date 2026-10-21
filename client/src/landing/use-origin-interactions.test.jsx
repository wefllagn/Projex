import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOriginInteractions } from './use-origin-interactions.js'

afterEach(() => vi.unstubAllGlobals())

function setup({ reduced = false } = {}) {
  const preferences = []
  vi.stubGlobal('matchMedia', (query) => {
    const media = {
      matches: query.includes('reduced-motion') ? reduced : true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    preferences.push(media)
    return media
  })
  const callbacks = []
  const requestFrame = vi.fn((callback) => {
    callbacks.push(callback)
    return callbacks.length
  })
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const root = document.createElement('div')
  root.innerHTML =
    '<div class="origin-touch-surface"><span class="origin-surface-light"></span></div>'
  const surface = root.firstElementChild
  const measure = vi
    .spyOn(surface, 'getBoundingClientRect')
    .mockReturnValue({ left: 10, top: 20 })
  const ref = { current: root }
  const hook = renderHook(() => useOriginInteractions(ref))
  return {
    ...hook,
    root,
    surface,
    requestFrame,
    callbacks,
    preferences,
    measure,
  }
}

describe('Origin interaction preferences and lifecycle', () => {
  it('disables pointer motion and pauses atmosphere when reduced motion is requested', () => {
    const { root, surface, requestFrame } = setup({ reduced: true })
    surface.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    )
    expect(root.dataset.motionPaused).toBe('true')
    expect(surface.dataset.highlighted).toBeUndefined()
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('coalesces pointer movement and releases listeners on unmount', () => {
    const {
      root,
      surface,
      requestFrame,
      callbacks,
      preferences,
      measure,
      unmount,
    } = setup()
    surface.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 180,
        clientY: 120,
      }),
    )
    surface.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 200,
        clientY: 170,
      }),
    )
    expect(requestFrame).toHaveBeenCalledTimes(1)
    expect(measure).toHaveBeenCalledTimes(1)
    callbacks[0]()
    expect(surface.firstElementChild.style.transform).toBe(
      'translate3d(30px, -10px, 0)',
    )
    unmount()
    expect(surface.dataset.highlighted).toBeUndefined()
    expect(root.dataset.motionPaused).toBeUndefined()
    preferences.forEach((media) =>
      expect(media.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      ),
    )
  })
})
