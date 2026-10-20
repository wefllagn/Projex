import useConfirmation from '../components/useConfirmation.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export function GroupDialog({ title, onClose, busy = false, dirty = false, children }) {
  const [confirm, confirmation] = useConfirmation()
  const confirming = useRef(false)
  const titleId = useId()
  const dialog = useRef(null)
  const latest = useRef({ onClose, busy, dirty })
  useEffect(() => { latest.current = { onClose, busy, dirty } }, [onClose, busy, dirty])
  const close = async () => {
    if (latest.current.busy || confirming.current) return
    confirming.current = true
    const discard = !latest.current.dirty || await confirm('Your unsaved changes will be lost.', 'Discard changes?')
    confirming.current = false
    if (discard && !latest.current.busy) latest.current.onClose()
  }
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const keyboard = (event) => {
      if (confirming.current) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return }
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
  return <>{createPortal(<div className="group-dialog-backdrop"><section className="group-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={close}><ProjexIcon name="close" /></button></header>{children}
  </section></div>, document.body)}{confirmation}</>
}
