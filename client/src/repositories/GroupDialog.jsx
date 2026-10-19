import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export function GroupDialog({ title, onClose, busy = false, dirty = false, children }) {
  const titleId = useId()
  const dialog = useRef(null)
  const latest = useRef({ onClose, busy })
  useEffect(() => { latest.current = { onClose, busy, dirty } }, [onClose, busy, dirty])
  const close = () => { if (!busy && (!dirty || window.confirm('Discard unsaved changes?'))) onClose() }
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const keyboard = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!latest.current.busy && (!latest.current.dirty || window.confirm('Discard unsaved changes?'))) latest.current.onClose(); return }
      if (event.key !== 'Tab') return
      const items = [...dialog.current.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((item) => !item.disabled && !item.closest('[hidden]'))
      const first = items[0]; const last = items.at(-1)
      if (!items.length) { event.preventDefault(); dialog.current.focus() }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<div className="group-dialog-backdrop"><section className="group-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></header>{children}
  </section></div>, document.body)
}
