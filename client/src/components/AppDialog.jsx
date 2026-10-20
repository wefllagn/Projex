import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import ProjexIcon from './icons/ProjexIcon.jsx'
export default function AppDialog({ title, children, onClose, busy = false, className = '' }) {
  const ref = useRef(null)
  const heading = useId()
  const callbacks = useRef({ busy, onClose })
  useEffect(() => { callbacks.current = { busy, onClose } }, [busy, onClose])
  useEffect(() => {
    const previous = document.activeElement
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(node => !node.hidden)
    ;(focusable()[0] ?? ref.current)?.focus()
    const keys = event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!callbacks.current.busy) callbacks.current.onClose() }
      if (event.key === 'Tab') {
        const nodes = focusable(), first = nodes[0], last = nodes.at(-1)
        if (!first) { event.preventDefault(); ref.current.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    ref.current.addEventListener('keydown', keys)
    const node = ref.current
    return () => { node.removeEventListener('keydown', keys); document.body.style.overflow = oldOverflow; previous?.focus?.() }
  }, [])
  return createPortal(<div className="projex-dialog-backdrop"><section ref={ref} tabIndex={-1} className={`projex-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={heading} aria-busy={busy}><header><h2 id={heading}>{title}</h2><button type="button" className="projex-dialog-close" aria-label={`Close ${title}`} onClick={onClose} disabled={busy}><ProjexIcon name="close" size={20} /></button></header>{children}</section></div>, document.body)
}
