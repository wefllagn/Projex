import { useCallback, useEffect, useRef } from 'react'

// Reads only. No polling, automatic mutation retries, or credential issuance.
export function useAdminFreshness(load, paused = false) {
  const current = useRef(null)
  const lastAttempt = useRef(0)
  const refresh = useCallback(() => {
    current.current?.controller.abort()
    const controller = new AbortController()
    const request = { controller }
    current.current = request
    lastAttempt.current = Date.now()
    request.promise = Promise.resolve(load({ signal: controller.signal })).finally(() => {
      if (current.current === request) current.current = null
    })
    return request.promise
  }, [load])

  useEffect(() => {
    refresh()
    return () => { current.current?.controller.abort(); current.current = null }
  }, [refresh])

  useEffect(() => {
    const onReturn = () => {
      if (paused || document.visibilityState === 'hidden' || current.current || Date.now() - lastAttempt.current < 15_000) return
      // Do not disturb active forms, confirmations or one-time secret displays.
      if (document.querySelector('[role="dialog"]') || document.activeElement?.closest('form')) return
      refresh()
    }
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [paused, refresh])
  return refresh
}
