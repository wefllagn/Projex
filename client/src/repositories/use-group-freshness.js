import { useCallback, useEffect, useRef } from 'react'

// Event-driven revalidation, not realtime or polling. Callers own error UI.
export function useGroupFreshness({ identity, refresh, activeKey = '', blocked = false, staleMs = 15_000 }) {
  const live = useRef({ refresh, blocked })
  const request = useRef(null)
  const last = useRef(0)
  useEffect(() => { live.current = { refresh, blocked } }, [refresh, blocked])
  const revalidate = useCallback((force = false) => {
    if (document.visibilityState === 'hidden' || live.current.blocked) return Promise.resolve()
    if (request.current) return request.current.promise
    if (!force && Date.now() - last.current < staleMs) return Promise.resolve()
    last.current = Date.now()
    const controller = new AbortController()
    const pending = { controller, promise: null }
    request.current = pending
    pending.promise = Promise.resolve().then(() => {
      if (!controller.signal.aborted) return live.current.refresh({ signal: controller.signal })
    }).catch(() => { /* The loader renders its safe error and Retry control. No auto-retry loop. */ })
      .finally(() => { if (request.current === pending) request.current = null })
    return pending.promise
  }, [staleMs])
  useEffect(() => {
    last.current = Date.now()
    const focus = () => { revalidate() }
    const visible = () => { if (document.visibilityState === 'visible') revalidate() }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visible)
    return () => {
      request.current?.controller.abort(); request.current = null
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [identity, revalidate])
  useEffect(() => { revalidate() }, [activeKey, blocked, revalidate])
  return revalidate
}
