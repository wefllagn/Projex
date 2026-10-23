import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, describeApiError } from '../api/api-client.js'
import AppDialog from '../components/AppDialog.jsx'
import { formatProjectDate } from '../projects/project-projections.js'
import { credentialProjection, issuedCredentialProjection } from './repository-content-projections.js'
import { useGroupCopyFeedback } from './GroupCopyFeedback.jsx'
import './git-access.css'

const PAGE_SIZE = 6
function lifecycle(item, now) { return item.revokedAt ? 'Revoked' : !item.expiresAt || Date.parse(item.expiresAt) <= now ? 'Expired' : 'Active' }
function accessLabel(item) { return item.operations.includes('WRITE') ? 'Read/write access' : 'Read access' }
function invalidResponse() { return new ApiError({ code: 'INVALID_API_RESPONSE' }) }
function Pages({ count, page, onChange, label }) {
  const total = Math.ceil(count / PAGE_SIZE)
  return total > 1 && <nav className="git-access-pages" aria-label={label}><button type="button" className="student-outline-action" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>{page} of {total}</span><button type="button" className="student-outline-action" disabled={page >= total} onClick={() => onChange(page + 1)}>Next</button></nav>
}

export function GitAccessDialog({ repository, gitApi, validateAccess, initialView = 'choose', cloneUrl, onClose }) {
  const [view, setView] = useState(initialView)
  const [issued, setIssued] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const [target, setTarget] = useState(null)
  const [activePage, setActivePage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [clock, setClock] = useState(() => Date.now())
  const [authority, setAuthority] = useState({ ready: false, write: false })
  const generation = useRef(0), lock = useRef(false), heading = useRef(null)
  const initialAuthority = useRef({ validateAccess })
  const { copy, feedback, dismiss } = useGroupCopyFeedback()
  useEffect(() => () => { generation.current += 1; lock.current = false }, [])
  useEffect(() => { Promise.resolve().then(() => heading.current?.focus()) }, [view])
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  // Read current server authority on open; issuance remains an explicit action.
  useEffect(() => {
    const { validateAccess: check } = initialAuthority.current
    if (!check) return undefined
    let alive = true
    Promise.resolve().then(() => check(false)).then((permissions) => {
      if (permissions?.canRead !== true) throw new ApiError({ status: 403, code: 'FORBIDDEN' })
      if (alive) setAuthority({ ready: true, write: permissions.canWrite === true })
    }).catch((failure) => { if (alive) { setError(failure); if ([401, 403, 404].includes(failure?.status)) setDenied(true) } })
    return () => { alive = false }
    // The parent remounts on repository/session/write permission changes.
  }, [])
  useEffect(() => {
    if (!issued) return undefined
    const timer = setTimeout(() => { setIssued(null); dismiss(); setView('expired'); setNotice('') }, Math.min(2_147_000_000, Math.max(0, Date.parse(issued.expiresAt) - Date.now())))
    return () => clearTimeout(timer)
  }, [dismiss, issued])
  const perform = useCallback(async (work) => {
    if (lock.current) return
    lock.current = true; const request = ++generation.current
    setBusy(true); setError(null); setNotice('')
    try { await work(() => generation.current === request) }
    catch (failure) {
      if (generation.current === request) {
        if ([401, 403, 404].includes(failure?.status)) { setIssued(null); setCredentials(null); setTarget(null); setDenied(true); dismiss() }
        setError(failure)
      }
    } finally { if (generation.current === request) { lock.current = false; setBusy(false) } }
  }, [dismiss])
  const retryAuthority = () => perform(async (current) => {
    const permissions = await validateAccess(false)
    if (permissions?.canRead !== true) throw new ApiError({ status: 403, code: 'FORBIDDEN' })
    if (current()) setAuthority({ ready: true, write: permissions.canWrite === true })
  })
  const changeView = (next) => { if (lock.current) return; setIssued(null); dismiss(); setError(null); setNotice(''); setTarget(null); setView(next) }
  const issue = () => perform(async (current) => {
    const permissions = await validateAccess(false)
    if (permissions?.canRead !== true) throw new ApiError({ status: 403, code: 'FORBIDDEN' })
    const write = permissions.canWrite === true
    if (current()) setAuthority({ ready: true, write })
    if (!current()) return
    const result = issuedCredentialProjection((await gitApi.issueCredential(repository.id, write ? ['READ', 'WRITE'] : ['READ'])).data, repository.id)
    if (!result.expiresAt || result.operations.includes('WRITE') !== write || !result.operations.includes('READ')) throw invalidResponse()
    if (!current()) return
    if (Date.parse(result.expiresAt) <= Date.now()) { setView('expired'); return }
    setIssued(result); setView('issued')
    setCredentials((items) => items ? [credentialProjection(result), ...items.filter((item) => item.credentialId !== result.credentialId)] : items)
  })
  const load = useCallback(() => perform(async (current) => {
    const response = await gitApi.listCredentials(repository.id)
    if (!Array.isArray(response.data)) throw invalidResponse()
    const items = response.data.map(credentialProjection)
    if (items.some((item) => item.repositoryId !== repository.id) || new Set(items.map((item) => item.credentialId)).size !== items.length) throw invalidResponse()
    if (current()) { setCredentials(items); setActivePage(1); setHistoryPage(1) }
  }), [gitApi, perform, repository.id])
  const manage = () => { if (lock.current) return; changeView('manage'); setHistoryOpen(false); setDetails(null); load() }
  const revoke = () => perform(async (current) => {
    const item = credentialProjection((await gitApi.revokeCredential(target.credentialId)).data)
    if (item.repositoryId !== repository.id || item.credentialId !== target.credentialId || !item.revokedAt) throw invalidResponse()
    if (current()) {
      setCredentials((items) => items.map((entry) => entry.credentialId === item.credentialId ? item : entry))
      setIssued(null); setTarget(null); setView('manage'); setActivePage(1); setHistoryPage(1); setHistoryOpen(false); setDetails(null); setNotice('Access revoked.')
    }
  })
  const active = (credentials || []).filter((item) => lifecycle(item, clock) === 'Active')
  const history = (credentials || []).filter((item) => lifecycle(item, clock) !== 'Active')
  const safeActivePage = Math.min(activePage, Math.max(1, Math.ceil(active.length / PAGE_SIZE)))
  const safeHistoryPage = Math.min(historyPage, Math.max(1, Math.ceil(history.length / PAGE_SIZE)))
  const rows = (items, offset, historical = false) => <ul className="git-access-records">{items.slice((offset - 1) * PAGE_SIZE, offset * PAGE_SIZE).map((item) => <li key={item.credentialId}>
    <div><strong>{accessLabel(item)}</strong><small>{historical ? `${lifecycle(item, clock)} · ` : ''}Expires {formatProjectDate(item.expiresAt)}</small></div>
    {!historical && <button type="button" className="student-outline-action" disabled={busy} onClick={() => { setTarget(item); setError(null); setNotice(''); setView('revoke') }}>Revoke</button>}
    <button type="button" className="git-access-text-action" aria-expanded={details === item.credentialId} onClick={() => setDetails(details === item.credentialId ? null : item.credentialId)}>Details</button>
    {details === item.credentialId && <dl className="git-access-record-details"><div><dt>Created</dt><dd>{formatProjectDate(item.createdAt)}</dd></div>{item.lastUsedAt && <div><dt>Last used</dt><dd>{formatProjectDate(item.lastUsedAt)}</dd></div>}{item.revokedAt && <div><dt>Revoked</dt><dd>{formatProjectDate(item.revokedAt)}</dd></div>}<div><dt>Credential ID</dt><dd><code>{item.credentialId}</code></dd></div></dl>}
  </li>)}</ul>
  return <AppDialog title={view === 'help' ? 'How to use Git' : 'Git access'} className="git-access-dialog" onClose={onClose}>
    <div className="git-access-body" aria-busy={busy}>
      <div ref={heading} tabIndex={-1} className="git-access-view-heading">{view === 'choose' ? <p>Get temporary credentials for your local Git client.</p> : view === 'manage' ? <h3>Manage access</h3> : view === 'issued' ? <p>Use these temporary credentials when your Git client asks you to sign in.</p> : view === 'expired' ? <h3>Access token expired</h3> : view === 'revoke' ? <h3>Revoke access?</h3> : null}</div>
      {error && <div className="git-access-error" role="alert"><p>{error.code === 'GIT_SMART_HTTP_UNAVAILABLE' ? 'Git access is unavailable in this environment.' : describeApiError(error)}</p>{((view === 'manage') || (view === 'choose' && !authority.ready)) && !denied && <button type="button" className="student-outline-action" disabled={busy} onClick={view === 'manage' ? load : retryAuthority}>Try again</button>}</div>}
      {busy && <p className="git-access-progress" role="status">{view === 'manage' ? 'Loading access…' : view === 'revoke' ? 'Revoking access…' : !authority.ready ? 'Checking repository access…' : 'Generating access…'}</p>}
      {denied ? <p className="git-access-help">Close this window and reopen Git access after your repository access is restored.</p> : <>
        {view === 'choose' && <><div className="git-access-options"><section><p>{authority.ready ? authority.write ? 'Clone, pull and push to branches you’re allowed to update.' : 'Clone and pull repository files.' : 'Checking your repository permissions.'}</p><button type="button" className="student-primary-action" disabled={busy || !authority.ready} onClick={issue}>Generate credentials</button></section></div>{!authority.ready && !error && !busy && <p role="status">Checking repository access…</p>}</>}
        {view === 'issued' && issued && <div className="git-access-issued"><strong>{issued.operations.includes('WRITE') ? 'Read and write' : 'Read only'}</strong><label>Username<div className="git-access-copy"><code>{issued.username}</code><button type="button" className="student-outline-action" onClick={(event) => copy(issued.username, event)} aria-label="Copy username">Copy</button></div></label><label>Temporary access token<div className="git-access-copy"><code>{issued.secret}</code><button type="button" className="student-outline-action" onClick={(event) => copy(issued.secret, event)} aria-label="Copy token">Copy</button></div></label><p className="git-access-expiry">Expires {formatProjectDate(issued.expiresAt)}</p><small>Write access applies only to authorized branches. Keep your token private. Copied values remain on your clipboard.</small><button type="button" className="student-outline-action" onClick={() => changeView('choose')}>Generate new credentials</button></div>}
        {view === 'expired' && <><p>This token is no longer shown. Generate new access when you need it.</p><button type="button" className="student-primary-action" onClick={() => changeView('choose')}>Get new access</button></>}
        {view === 'manage' && <><div className="git-access-section-heading"><h4>Active access{credentials && ` (${active.length})`}</h4><button type="button" className="git-access-text-action" disabled={busy} onClick={load}>Refresh</button></div>{credentials && !active.length && <p className="git-access-help">No active access.</p>}{rows(active, safeActivePage)}<Pages count={active.length} page={safeActivePage} onChange={setActivePage} label="Active access pages" />{credentials && <section className="git-access-history"><button type="button" className="git-access-history-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}><span aria-hidden="true">{historyOpen ? '▾' : '▸'}</span> History ({history.length})</button>{historyOpen && <>{!history.length && <p className="git-access-help">No expired or revoked access.</p>}{rows(history, safeHistoryPage, true)}<Pages count={history.length} page={safeHistoryPage} onChange={setHistoryPage} label="Credential history pages" /></>}</section>}</>}
        {view === 'revoke' && target && <><p>Your Git client will no longer be able to use this credential.</p><div className="git-access-revoke-summary"><strong>{accessLabel(target)}</strong><small>Expires {formatProjectDate(target.expiresAt)}</small></div><div className="git-access-confirm-actions"><button type="button" className="student-outline-action" disabled={busy} onClick={() => changeView('manage')}>Cancel</button><button type="button" className="student-primary-action" disabled={busy} onClick={revoke}>Revoke access</button></div></>}
        {view === 'help' && <div className="git-access-guide"><p>Git keeps a history of your code and helps you share changes.</p><ol><li><strong>Clone once.</strong> Copy the repository URL from Code and clone it in your Git client.</li><li><strong>Edit.</strong> Open the downloaded folder in your editor. In a Group, work on a branch you’re allowed to update.</li><li><strong>Commit.</strong> Save a named snapshot of your changes on your computer.</li><li><strong>Pull.</strong> Bring in your teammates’ latest changes before you push. If Git reports a conflict, review it before continuing.</li><li><strong>Push.</strong> Send your commits to Origin. A push does not submit an Activity.</li></ol><p>Use Get Git access when Git asks for a username and token. Write access still follows your role, branch protections, and project deadlines or review state.</p><details><summary tabIndex={0}>Command examples</summary><pre>{`git clone "${cloneUrl}"
# open the cloned folder
git pull
# edit your files
git add .
git commit -m "Describe your change"
git push`}</pre><p>For shared work, create a feature branch with <code>git checkout -b your-branch</code> before editing, then use <code>git push -u origin your-branch</code>.</p></details><details><summary tabIndex={0}>First commit in an empty repository</summary><p>The repository owner, or Group Maintainer, establishes {repository.defaultBranch} first.</p><pre>{`git checkout -b ${repository.defaultBranch}\n# add your project files\ngit add .\ngit commit -m "Initial commit"\ngit push -u origin ${repository.defaultBranch}`}</pre></details></div>}
      </>}
      {notice && <p className="git-access-success" role="status">{notice}</p>}
    </div>
    {!denied && <footer className="git-access-footer">{view === 'manage' || view === 'help' ? <button type="button" className="git-access-text-action" disabled={busy} onClick={() => changeView('choose')}>Back to Git access</button> : view !== 'revoke' && <button type="button" className="git-access-footer-link" disabled={busy} onClick={manage}>Manage access <span aria-hidden="true">›</span></button>}{view !== 'help' && view !== 'revoke' && <button type="button" className="git-access-text-action" disabled={busy} onClick={() => changeView('help')}>How to use Git</button>}</footer>}
    {feedback}
  </AppDialog>
}
