import { useEffect, useRef } from 'react'

// Refresh read-only views while visible; returning to the app revalidates at once.
export default function useAutomaticRefresh(refresh, { enabled = true, interval = 30000 } = {}) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return undefined
    const revalidate = () => { if (document.visibilityState !== 'hidden') latest.current() }
    const timer = window.setInterval(revalidate, interval)
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', revalidate)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', revalidate); document.removeEventListener('visibilitychange', revalidate) }
  }, [enabled, interval])
}
