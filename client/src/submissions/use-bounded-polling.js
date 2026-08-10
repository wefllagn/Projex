import { useEffect, useRef } from 'react'

export default function useBoundedPolling({
  identity,
  active,
  load,
  onData,
  onError,
  onBoundedStop,
  initialDelayMs = 750,
  maximumDelayMs = 3000,
  maximumDurationMs = 60_000,
}) {
  const callbacks = useRef({ load, onData, onError, onBoundedStop })

  useEffect(() => {
    callbacks.current = { load, onData, onError, onBoundedStop }
  }, [load, onBoundedStop, onData, onError])

  useEffect(() => {
    if (!identity || !active) return undefined

    let cancelled = false
    let timer = null
    let controller = null
    let delay = initialDelayMs
    const startedAt = Date.now()

    const schedule = () => {
      const elapsed = Date.now() - startedAt
      if (elapsed >= maximumDurationMs) {
        callbacks.current.onBoundedStop?.()
        return
      }
      timer = window.setTimeout(poll, Math.min(delay, maximumDurationMs - elapsed))
      delay = Math.min(Math.round(delay * 1.5), maximumDelayMs)
    }

    const poll = async () => {
      controller = new AbortController()
      try {
        const response = await callbacks.current.load(identity, { signal: controller.signal })
        if (cancelled) return
        const shouldContinue = callbacks.current.onData(response) !== false
        if (shouldContinue) schedule()
      } catch (error) {
        if (!cancelled && error?.name !== 'AbortError') callbacks.current.onError?.(error)
      }
    }

    schedule()
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      controller?.abort()
    }
  }, [active, identity, initialDelayMs, maximumDelayMs, maximumDurationMs])
}
