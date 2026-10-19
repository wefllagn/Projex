import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Feedback contains no copied content, including when copying Git credentials.
export function useGroupCopyFeedback() {
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)
  const generation = useRef(0)
  const dismiss = useCallback(() => {
    generation.current += 1
    clearTimeout(timer.current)
    setNotice(null)
  }, [])
  useEffect(() => () => { generation.current += 1; clearTimeout(timer.current) }, [])
  const copy = async (value, event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const keyboard = event.detail === 0
    const x = keyboard ? rect.left + rect.width / 2 : event.clientX
    const y = keyboard ? rect.bottom : event.clientY
    const request = ++generation.current
    let copied = false
    try { await navigator.clipboard.writeText(value); copied = true } catch { /* Report failure, never claim success. */ }
    if (request !== generation.current) return
    clearTimeout(timer.current)
    setNotice({ x: Math.min(Math.max(x, 80), window.innerWidth - 80), y: Math.min(Math.max(y + 12, 12), window.innerHeight - 62), copied })
    timer.current = setTimeout(() => setNotice(null), copied ? 1400 : 3500)
  }
  const feedback = notice && createPortal(<div className="group-copy-feedback" role="status" aria-live="polite" style={{ left: notice.x, top: notice.y }}>{notice.copied ? 'Copied!' : 'Couldn’t copy. Try again.'}</div>, document.body)
  return { copy, feedback, dismiss }
}
