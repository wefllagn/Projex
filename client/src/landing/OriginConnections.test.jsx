import { useRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import OriginConnections from './OriginConnections.jsx'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('attaches the history paths to their panels and recalculates after resize', () => {
  let resize
  let visible
  let shift = 0
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback) {
        resize = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        visible = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  const names = ['main', 'feature/arrays', 'feature/loops', 'lesson-3']
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function () {
      if (this.dataset.originPort) {
        const index = names.indexOf(this.dataset.originPort)
        return { x: 200 + shift, y: 40 + index * 70, width: 0, height: 0 }
      }
      return { x: 0, y: 0, width: 500, height: 340 }
    },
  )
  function Scene() {
    const ref = useRef(null)
    return (
      <div ref={ref}>
        <OriginConnections sceneRef={ref} kind="progress" />
        {names.map((name) => (
          <div key={name} data-origin-panel>
            <span data-origin-port={name} />
          </div>
        ))}
      </div>
    )
  }
  const { container, unmount } = render(<Scene />)
  const svg = container.querySelector('svg')
  function expectAttached(x) {
    const endpoints = [
      ...container.querySelectorAll('.origin-connection-node'),
    ].slice(1, 5)
    expect(endpoints).toHaveLength(4)
    endpoints.forEach((node, index) => {
      expect(Number(node.getAttribute('cx'))).toBe(x)
      expect(Number(node.getAttribute('cy'))).toBe(40 + index * 70)
    })
  }
  expectAttached(200)
  shift = 30
  act(() => resize())
  expectAttached(230)
  act(() => visible([{ isIntersecting: true }]))
  expect(svg).toHaveAttribute('data-flow-paused', 'false')
  act(() => visible([{ isIntersecting: false }]))
  expect(svg).toHaveAttribute('data-flow-paused', 'true')
  unmount()
  expect(disconnect).toHaveBeenCalledTimes(2)
})
