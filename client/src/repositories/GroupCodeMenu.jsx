import { useCallback, useEffect, useRef, useState } from 'react'
import { formatProjectDate } from '../projects/project-projections.js'
import { groupContextProjection } from './repository-projections.js'
import { issuedCredentialProjection } from './repository-content-projections.js'
import { useGroupCopyFeedback } from './GroupCopyFeedback.jsx'
import GroupRequestState from './GroupRequestState.jsx'

export function GroupCodeMenu({ repository, context, api, gitApi, available }) {
  const [open, setOpen] = useState(false)
  const [issued, setIssued] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const { copy, feedback, dismiss } = useGroupCopyFeedback()
  const generation = useRef(0)
  const lock = useRef(false)
  const root = useRef(null)
  const button = useRef(null)
  const positionMenu = useCallback(() => {
    if (!button.current) return
    const rect = button.current.getBoundingClientRect()
    const width = Math.min(390, window.innerWidth - 40)
    const below = rect.bottom + 8
    const top = window.innerWidth <= 600 ? 72 : window.innerHeight - below < 240 ? 16 : below
    setMenuStyle({ position: 'fixed', left: Math.max(20, Math.min(rect.right - width, window.innerWidth - width - 20)), right: 'auto', top, maxHeight: Math.max(120, window.innerHeight - top - 16) })
  }, [])
  const close = useCallback(() => {
    generation.current += 1; lock.current = false; dismiss()
    setOpen(false); setIssued(null); setBusy(false); setError(null); setNotice('')
  }, [dismiss])
  useEffect(() => () => { generation.current += 1; lock.current = false }, [])
  useEffect(() => {
    if (!open) return undefined
    window.addEventListener('resize', positionMenu)
    const dismiss = (event) => {
      if (event.key === 'Escape') { close(); button.current?.focus() }
      else if (event.type === 'pointerdown' && !root.current?.contains(event.target)) close()
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', positionMenu) }
  }, [close, open, positionMenu])
  useEffect(() => {
    if (!issued) return undefined
    const timer = setTimeout(() => { setIssued(null); setNotice('This token expired. Close and reopen Code to generate new access.') }, Math.min(2_147_000_000, Math.max(0, Date.parse(issued.expiresAt) - Date.now())))
    return () => clearTimeout(timer)
  }, [issued])
  let url = ''
  try { url = gitApi.getTransportUrl(repository.id) } catch { /* unavailable configuration */ }
  const show = async () => {
    if (lock.current) return
    lock.current = true
    const request = ++generation.current
    positionMenu()
    setOpen(true); setBusy(true); setIssued(null); setError(null); setNotice('')
    try {
      // Re-read server authority at issuance; group members are not Activity owners.
      const response = await api.getGroupContext(repository.id)
      const live = groupContextProjection(response.data, repository)
      if (request !== generation.current) return
      if (!live.permissions.canRead) throw new Error('Repository source access is no longer available.')
      const credential = await gitApi.issueCredential(repository.id, live.permissions.canWrite ? ['READ', 'WRITE'] : ['READ'])
      if (request === generation.current) setIssued(issuedCredentialProjection(credential.data, repository.id))
    } catch (failure) { if (request === generation.current) setError(failure) }
    finally { if (request === generation.current) { setBusy(false); lock.current = false } }
  }
  return <div className="group-code-menu activity-code-menu" ref={root}>
    <button ref={button} type="button" className="activity-code-button" aria-haspopup="dialog" aria-expanded={open} disabled={!available || !context.permissions.canRead || !url} onClick={() => open ? close() : show()}><span>Code</span><span className="group-dropdown-chevron" aria-hidden="true" /></button>
    {feedback}{open && <section className="activity-code-popover" style={menuStyle} role="dialog" aria-label="Group native Git access">
      <div className="activity-code-popover__heading"><strong>Code · Local</strong><button type="button" aria-label="Close Code menu" onClick={close}>×</button></div>
      <div className="group-clone-section"><strong>Clone with HTTPS</strong><div className="activity-code-copy-row"><code>{url}</code><button type="button" onClick={(event) => copy(url, event)} aria-label="Copy URL" title="Copy clone URL">Copy</button></div></div>
      <div className="activity-code-section"><strong>Authentication</strong><small>Use these credentials when Git prompts.</small>
        {busy && <p>Preparing secure Git access…</p>}{error && <GroupRequestState compact error={error} />}
        {issued && <><label>Username<div className="activity-code-copy-row"><code>{issued.username}</code><button type="button" onClick={(event) => copy(issued.username, event)} aria-label="Copy username" title="Copy username">Copy</button></div></label>
          <label>Temporary access token<div className="activity-code-copy-row"><code>{issued.secret}</code><button type="button" onClick={(event) => copy(issued.secret, event)} aria-label="Copy token" title="Copy token">Copy</button></div></label><p>Expires {formatProjectDate(issued.expiresAt)}.</p></>}
      </div><p className="activity-code-footnote">Keep your token private. Never add it to the clone URL. Copied tokens remain on your clipboard.</p>
      {notice && <p aria-live="polite">{notice}</p>}
    </section>}
  </div>
}
