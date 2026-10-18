import { useCallback, useEffect, useRef, useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import { formatProjectDate } from '../projects/project-projections.js'
import { groupContextProjection } from './repository-projections.js'
import { issuedCredentialProjection } from './repository-content-projections.js'

export function GroupCodeMenu({ repository, context, api, gitApi, available }) {
  const [open, setOpen] = useState(false)
  const [issued, setIssued] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  const lock = useRef(false)
  const root = useRef(null)
  const button = useRef(null)
  const close = useCallback(() => {
    generation.current += 1; lock.current = false
    setOpen(false); setIssued(null); setBusy(false); setError(null); setNotice('')
  }, [])
  useEffect(() => () => { generation.current += 1; lock.current = false }, [])
  useEffect(() => {
    if (!open) return undefined
    const dismiss = (event) => {
      if (event.key === 'Escape') { close(); button.current?.focus() }
      else if (event.type === 'pointerdown' && !root.current?.contains(event.target)) close()
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss) }
  }, [close, open])
  useEffect(() => {
    if (!issued) return undefined
    const timer = setTimeout(() => { setIssued(null); setNotice('This token expired. Close and reopen Code to generate new access.') }, Math.min(2_147_000_000, Math.max(0, Date.parse(issued.expiresAt) - Date.now())))
    return () => clearTimeout(timer)
  }, [issued])
  const copy = async (value, label) => {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`) }
    catch { setNotice('Clipboard unavailable. Select and copy the value manually.') }
  }
  let url = ''
  try { url = gitApi.getTransportUrl(repository.id) } catch { /* unavailable configuration */ }
  const show = async () => {
    if (lock.current) return
    lock.current = true
    const request = ++generation.current
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
    <button ref={button} type="button" className="activity-code-button" aria-haspopup="dialog" aria-expanded={open} disabled={!available || !context.permissions.canRead || !url} onClick={() => open ? close() : show()}>Code <span aria-hidden="true">⌄</span></button>
    {open && <section className="activity-code-popover" role="dialog" aria-label="Group native Git access">
      <div className="activity-code-popover__heading"><strong>Code · Local</strong><button type="button" aria-label="Close Code menu" onClick={close}>×</button></div>
      <strong>Clone with HTTPS</strong><div className="activity-code-copy-row"><code>{url}</code><button type="button" onClick={() => copy(url, 'Clone URL')}>Copy URL</button></div>
      <div className="activity-code-section"><strong>Authentication</strong><small>Temporary credentials · Use these when Git prompts.</small>
        {busy && <p>Preparing secure Git access…</p>}{error && <p role="alert">{describeApiError(error)}</p>}
        {issued && <><label>Username<div className="activity-code-copy-row"><code>{issued.username}</code><button type="button" onClick={() => copy(issued.username, 'Username')}>Copy username</button></div></label>
          <label>Temporary access token<div className="activity-code-copy-row"><code>{issued.secret}</code><button type="button" onClick={() => copy(issued.secret, 'Token')}>Copy token</button></div></label><p>Expires {formatProjectDate(issued.expiresAt)}.</p></>}
      </div><p className="activity-code-footnote">Keep the token private. It stays only in this open menu, never in the clone URL. Copied values remain on your system clipboard.</p>
      {notice && <p aria-live="polite">{notice}</p>}
    </section>}
  </div>
}
