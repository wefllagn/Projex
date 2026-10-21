import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/api-client.js'
import { AuthContext } from '../auth/auth-context.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { useGroupCopyFeedback } from './GroupCopyFeedback.jsx'
import { GitAccessDialog } from './GitAccessDialog.jsx'

export function RepositoryCodeMenu({ repository, gitApi, available, canWrite = false, validateAccess, label = 'Native Git access', onOpenChange, initialOpen = false }) {
  const auth = useContext(AuthContext)
  const sessionAvailable = !auth || auth.user?.status === 'ACTIVE'
  const identity = `${repository.id}:${auth?.user?.id || ''}:${auth?.user?.status || ''}`
  const [open, setOpen] = useState(initialOpen && available)
  const [dialog, setDialog] = useState(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const root = useRef(null), button = useRef(null)
  const { copy, feedback, dismiss } = useGroupCopyFeedback()
  const permitted = available && sessionAvailable
  const dialogOpen = permitted && dialog?.identity === identity
  const closeMenu = useCallback(() => { setOpen(false); dismiss(); button.current?.focus() }, [dismiss])
  const closeDialog = useCallback(() => {
    setDialog(null)
    Promise.resolve().then(() => button.current?.focus())
  }, [])
  const positionMenu = useCallback(() => {
    if (!button.current) return
    const rect = button.current.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth - 32)
    const top = window.innerWidth <= 600 ? 72 : Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 300))
    setMenuStyle({ position: 'fixed', left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top, right: 'auto' })
  }, [])
  useEffect(() => { onOpenChange?.(permitted && (open || dialogOpen)); return () => onOpenChange?.(false) }, [dialogOpen, onOpenChange, open, permitted])
  useEffect(() => {
    if (!open || !permitted) return undefined
    positionMenu()
    const outside = (event) => { if (!root.current?.contains(event.target)) closeMenu() }
    const escape = (event) => { if (event.key === 'Escape') { event.preventDefault(); closeMenu() } }
    window.addEventListener('resize', positionMenu)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { window.removeEventListener('resize', positionMenu); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [closeMenu, open, permitted, positionMenu])
  let url = ''
  try { url = gitApi.getTransportUrl(repository.id) } catch { /* Configuration is unavailable; do not invent a URL. */ }
  const checkAccess = validateAccess || (async () => {
    const data = (await gitApi.getAccess(repository.id)).data
    const permissions = data?.gitPermissions
    if (data?.id !== repository.id || !permissions || ['read', 'write', 'canUpdateMain'].some((key) => typeof permissions[key] !== 'boolean')) throw new ApiError({ code: 'INVALID_API_RESPONSE' })
    if (!permissions.read) throw new ApiError({ status: 403, code: 'FORBIDDEN' })
    return { canRead: permissions.read, canWrite: permissions.write, canUpdateMain: permissions.canUpdateMain }
  })
  const showDialog = (view) => { dismiss(); setOpen(false); setDialog({ identity, view }) }
  return <div className="group-code-menu activity-code-menu" ref={root}>
    <button ref={button} type="button" className="activity-code-button" aria-haspopup="dialog" aria-expanded={permitted && open} disabled={!permitted || !url} onClick={() => open ? closeMenu() : setOpen(true)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); Promise.resolve().then(() => root.current?.querySelector('[aria-label="Copy URL"]')?.focus()) }
    }}><span>Code</span><span className="group-dropdown-chevron" aria-hidden="true" /></button>
    {feedback}{permitted && open && <section className="activity-code-popover repository-quick-code" style={menuStyle} role="dialog" aria-label={label} onKeyDown={(event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll('button')], index = buttons.indexOf(event.target)
      if (index < 0) return
      event.preventDefault()
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }}>
      <div className="activity-code-popover__heading"><strong>Code</strong><button type="button" aria-label="Close Code menu" onClick={closeMenu}>×</button></div>
      <div className="group-clone-section"><strong>Clone with HTTPS</strong><div className="activity-code-copy-row"><code title={url}>{url}</code><button type="button" onClick={(event) => copy(url, event)} aria-label="Copy URL">Copy</button></div></div>
      <div className="repository-quick-actions"><button type="button" aria-label="Get Git access" onClick={() => showDialog('choose')}><ProjexIcon name="repository" size={18} /><span><strong>Get Git access</strong><small>Credentials for your Git client</small></span><span aria-hidden="true">›</span></button><button type="button" onClick={() => showDialog('help')}><ProjexIcon name="code" size={18} /><span><strong>How to use Git</strong></span><span aria-hidden="true">›</span></button></div>
    </section>}
    {dialogOpen && <GitAccessDialog key={`${identity}:${canWrite}`} cloneUrl={url} repository={repository} gitApi={gitApi} canWrite={canWrite} validateAccess={checkAccess} initialView={dialog.view} onClose={closeDialog} />}
  </div>
}
