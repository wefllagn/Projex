import { useEffect } from 'react'

export function useOriginInteractions(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window.matchMedia !== 'function') return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const precisePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    )
    let surface = null
    let light = null
    let bounds = null
    let frame = 0
    let pointerX = 0
    let pointerY = 0
    let heroVisible = true

    function clearHighlight() {
      cancelAnimationFrame(frame)
      frame = 0
      if (surface) delete surface.dataset.highlighted
      surface = null
      light = null
      bounds = null
    }

    function syncMotion() {
      root.dataset.motionPaused = String(
        reducedMotion.matches || document.hidden || !heroVisible,
      )
      if (reducedMotion.matches || !precisePointer.matches || document.hidden)
        clearHighlight()
    }

    function renderHighlight() {
      frame = 0
      if (!light) return
      light.style.transform = `translate3d(${pointerX - 160}px, ${pointerY - 160}px, 0)`
    }

    function trackPointer(event) {
      if (
        reducedMotion.matches ||
        !precisePointer.matches ||
        document.hidden ||
        event.pointerType === 'touch'
      )
        return
      const nextSurface = event.target.closest('.origin-touch-surface')
      if (!nextSurface || !root.contains(nextSurface)) {
        clearHighlight()
        return
      }
      if (surface !== nextSurface) {
        clearHighlight()
        surface = nextSurface
        light = surface.querySelector(':scope > .origin-surface-light')
        if (!light) {
          clearHighlight()
          return
        }
        bounds = surface.getBoundingClientRect()
        surface.dataset.highlighted = 'true'
      }
      pointerX = event.clientX - bounds.left
      pointerY = event.clientY - bounds.top
      if (!frame) frame = requestAnimationFrame(renderHighlight)
    }

    const hero = root.querySelector('.origin-hero')
    const observer =
      hero && typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              heroVisible =
                entry.isIntersecting && entry.intersectionRatio >= 0.1
              syncMotion()
            },
            { threshold: 0.1 },
          )
        : null
    if (observer) observer.observe(hero)
    syncMotion()
    root.addEventListener('pointermove', trackPointer, { passive: true })
    root.addEventListener('pointerleave', clearHighlight)
    window.addEventListener('scroll', clearHighlight, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', clearHighlight, { passive: true })
    window.addEventListener('blur', clearHighlight)
    document.addEventListener('visibilitychange', syncMotion)
    reducedMotion.addEventListener('change', syncMotion)
    precisePointer.addEventListener('change', syncMotion)

    return () => {
      clearHighlight()
      observer?.disconnect()
      root.removeEventListener('pointermove', trackPointer)
      root.removeEventListener('pointerleave', clearHighlight)
      window.removeEventListener('scroll', clearHighlight, true)
      window.removeEventListener('resize', clearHighlight)
      window.removeEventListener('blur', clearHighlight)
      document.removeEventListener('visibilitychange', syncMotion)
      reducedMotion.removeEventListener('change', syncMotion)
      precisePointer.removeEventListener('change', syncMotion)
      delete root.dataset.motionPaused
    }
  }, [rootRef])
}
