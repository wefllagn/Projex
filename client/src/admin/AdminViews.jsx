import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../auth/auth-context.js'
import { adminApi } from './admin-api.js'
import {
  AdminProjectionError,
  assertMatchingAdminAccount,
  projectAdminAccount,
  projectAdminManualSetup,
  projectAdminOverview,
  projectAdminUser,
} from './admin-projections.js'
import { copySensitiveText } from './copy-sensitive-text.js'
import { formatDate, humanize, pageNumber } from './admin-view-utils.js'
import { useAdminFreshness } from './use-admin-freshness.js'
import { AdminPagination, AdminSearch } from './AdminListControls.jsx'

const PAGE_SIZE = 20
const USER_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN']
const USER_STATUSES = ['SETUP_PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED']

function sumCounts(value) {
  return Object.values(value ?? {}).reduce((total, count) => total + count, 0)
}

function allowedNextStatuses(currentStatus) {
  if (currentStatus === 'ACTIVE') return ['INACTIVE', 'SUSPENDED']
  if (currentStatus === 'INACTIVE' || currentStatus === 'SUSPENDED') return ['ACTIVE']
  return []
}

export function AdminPageHeader({ eyebrow, title, summary, actions }) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {summary && <p>{summary}</p>}
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </header>
  )
}

export function AdminPanel({ title, eyebrow, children, actions, className = '' }) {
  return (
    <section className={`admin-panel ${className}`}>
      {title || actions ? <header className="admin-panel__header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {actions && <div className="admin-panel__actions">{actions}</div>}
      </header> : null}
      <div className="admin-panel__body">{children}</div>
    </section>
  )
}

export function AdminMetric({ label, value, detail, tone = 'default', to }) {
  const Tag = to ? Link : 'article'
  return (
    <Tag to={to} className={`admin-metric admin-metric--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </Tag>
  )
}

export function AdminDialog({ title, summary, children, onClose, onSubmit, submitLabel, busy, submitDisabled = false, danger = false }) {
  const formRef = useRef(null)
  useEffect(() => {
    const active = document.activeElement
    const previous = active?.closest('details:not([open])')?.querySelector('summary') ?? active
    const form = formRef.current
    form.querySelector('input, textarea, select, button')?.focus()
    const containFocus = (event) => {
      if (event.key !== 'Tab') return
      const controls = [...form.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    form.addEventListener('keydown', containFocus)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { form.removeEventListener('keydown', containFocus); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return (
    <div className="student-submit-backdrop" role="presentation">
      <form ref={formRef} className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onSubmit={onSubmit} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose() } }}>
        <button type="button" className="student-modal-close" disabled={busy} onClick={onClose} aria-label="Close dialog" />
        <h2 id="admin-dialog-title">{title}</h2>
        {summary && <p>{summary}</p>}
        {children}
        <div className="admin-dialog__actions">
          <button type="button" className="student-outline-action" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={danger ? 'admin-danger-action' : 'student-primary-action'} disabled={busy || submitDisabled}>
            {busy ? 'Working…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AdminOverviewPage({ api = adminApi }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  const load = useCallback(({ signal } = {}) => {
    return api.getOverview({ signal })
      .then((response) => { if (!signal?.aborted) setState({ status: 'ready', data: projectAdminOverview(response.data), error: null }) })
      .catch((error) => {
        if (!signal?.aborted && error?.name !== 'AbortError') setState({ status: 'error', data: null, error })
      })
  }, [api])

  const refresh = useAdminFreshness(load)

  if (state.status === 'loading' && !state.data) return <RequestState kind="loading" />
  if (state.status === 'error') {
    return <RequestState error={state.error} action={<button type="button" onClick={refresh}>Try again</button>} />
  }

  const overview = state.data
  const activeUsers = overview.users.byStatus.ACTIVE ?? 0
  const classCount = sumCounts(overview.academics.classesByStatus)
  const repositoryCount = sumCounts(overview.repositories.byLifecycle)
  const pendingSetup = overview.users.accountSetup.pending + overview.users.accountSetup.actionRequired

  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Overview" />
      <div className="admin-metric-grid">
        <AdminMetric label="Users" value={overview.users.total} detail={`${activeUsers} active`} to="/admin/users" />
        <AdminMetric label="Classes" value={classCount} detail={`${overview.academics.classesByStatus.ARCHIVED ?? 0} archived`} to="/admin/academic/classes" />
        <AdminMetric label="Repositories" value={repositoryCount} to="/admin/academic/repositories" />
        <AdminMetric label="Setup attention" value={pendingSetup} detail={overview.users.accountSetup.actionRequired ? `${overview.users.accountSetup.actionRequired} need a new setup link` : pendingSetup ? 'Awaiting account setup' : 'No accounts awaiting setup'} tone={pendingSetup ? 'attention' : 'default'} to="/admin/users?status=SETUP_PENDING" />
      </div>
      <div className="admin-overview-grid">
        <AdminPanel title="Accounts by role">
          <div className="admin-breakdown-list">
            {USER_ROLES.map((role) => (
              <div key={role}><span>{humanize(role)}</span><strong>{overview.users.byRole[role] ?? 0}</strong></div>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel title="Academic activity">
          <div className="admin-breakdown-list">
            <div><span>Activities</span><strong>{sumCounts(overview.academics.activitiesByStatus)}</strong></div>
            <div><span>Submissions</span><strong>{sumCounts(overview.academics.submissionsByStatus)}</strong></div>
            <div><span>Project tasks</span><strong>{sumCounts(overview.academics.projectTasksByStatus)}</strong></div>
            <div><span>Teams</span><strong>{sumCounts(overview.academics.teamsByStatus)}</strong></div>
          </div>
        </AdminPanel>
      </div>
    </div>
  )
}

function ProvisionUserDialog({ role, api, onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', universityEmail: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [issuance, setIssuance] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = role === 'STUDENT'
        ? await api.provisionStudent(form)
        : await api.provisionInstructor(form)
      const user = projectAdminUser(response.data)
      const manualSetup = projectAdminManualSetup(response.data)
      setIssuance({ user, ...manualSetup, kind: 'created' })
      onCreated(user)
    } catch (requestError) {
      setError(requestError)
      setBusy(false)
    }
  }
  if (issuance) return <SetupLinkDialog issuance={issuance} onClose={onClose} />
  return (
    <AdminDialog
      title={`Provision ${role === 'STUDENT' ? 'student' : 'instructor'}`}
      summary="Origin will create a temporary one-time setup link and also use the configured delivery channel."
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Provision account"
      busy={busy}
    >
      <div className="admin-form-grid">
        <label>Full name<input required maxLength="200" autoComplete="off" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>University email<input required type="email" autoComplete="off" value={form.universityEmail} onChange={(event) => setForm({ ...form, universityEmail: event.target.value })} /></label>
      </div>
      {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
    </AdminDialog>
  )
}

function SetupLinkDialog({ issuance, onClose }) {
  const [copyState, setCopyState] = useState('idle')
  const linkField = useRef(null)

  const copy = async () => {
    try {
      await copySensitiveText(issuance.setupLink)
      setCopyState('copied')
    } catch {
      linkField.current?.focus()
      linkField.current?.select()
      setCopyState('manual')
    }
  }

  return (
    <div className="student-submit-backdrop" role="presentation">
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-link-dialog-title">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close dialog" />
        <p className="eyebrow">Setup required</p>
        <h2 id="setup-link-dialog-title">{issuance.kind === 'created' ? 'Account created' : 'New setup link generated'}</h2>
        <p>Send this link only to the intended user. It is a temporary one-time credential and will not be shown again after you close this dialog.</p>
        <div className="admin-detail-values admin-setup-identity">
          <DetailValue label="Name">{issuance.user.fullName}</DetailValue>
          <DetailValue label="University email">{issuance.user.universityEmail}</DetailValue>
          <DetailValue label="Expires">{formatDate(issuance.expiresAt)}</DetailValue>
        </div>
        <label className="admin-dialog-field">
          Setup link
          <input ref={linkField} readOnly autoComplete="off" value={issuance.setupLink} onFocus={(event) => event.currentTarget.select()} />
        </label>
        <p className="admin-setup-warning">Anyone with this link can choose the initial Origin password until the link expires, is replaced, or is used.</p>
        {copyState === 'copied' && <p className="admin-notice" role="status">Setup link copied.</p>}
        {copyState === 'manual' && <p className="class-form-error" role="status">Automatic copy is unavailable. The setup link is selected; copy it manually.</p>}
        <div className="admin-dialog__actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Close</button>
          <button type="button" className="student-primary-action" onClick={copy}>Copy Setup Link</button>
        </div>
      </section>
    </div>
  )
}

export function AdminUsersPage({ api = adminApi }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', users: [], pagination: null, error: null })
  const [provisionRole, setProvisionRole] = useState(null)
  const provisionMenu = useRef(null)
  const [searchReset, setSearchReset] = useState(0)
  const [notice, setNotice] = useState('')
  const page = pageNumber(searchParams)
  const role = searchParams.get('role') ?? ''
  const status = searchParams.get('status') ?? ''
  const querySearch = searchParams.get('search') ?? ''

  const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: querySearch, role, status }), [page, querySearch, role, status])

  const load = useCallback(({ signal } = {}) => {
    return api.listUsers(query, { signal })
      .then((response) => { if (!signal?.aborted) setState({
        status: 'ready',
        users: response.data.map((user) => projectAdminUser(user)),
        pagination: response.pagination,
        error: null,
      }) })
      .catch((error) => {
        if (!signal?.aborted && error?.name !== 'AbortError') setState({ status: 'error', users: [], pagination: null, error })
      })
  }, [api, query])

  const refresh = useAdminFreshness(load, !!provisionRole)

  const updateQuery = (updates) => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        title="Users"
        actions={(
          <details ref={provisionMenu} className="admin-action-menu" onKeyDown={(event) => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus() } }}>
            <summary className="student-primary-action">Add User <span aria-hidden="true">⌄</span></summary>
            <div>{['STUDENT', 'INSTRUCTOR'].map((role) => <button type="button" key={role} onClick={(event) => { event.currentTarget.closest('details').open = false; setProvisionRole(role) }}>Add {role.toLowerCase()}</button>)}</div>
          </details>
        )}
      />
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <AdminPanel>
        <div className="admin-filter-bar">
          <AdminSearch key={searchReset} initialValue={querySearch} onSearch={(search) => updateQuery({ search })} placeholder="Name or university email" />
          <label>Role<select name="role" value={role} onChange={(event) => updateQuery({ role: event.target.value })}><option value="">All roles</option>{USER_ROLES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          <label>Status<select name="status" value={status} onChange={(event) => updateQuery({ status: event.target.value })}><option value="">All statuses</option>{USER_STATUSES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          {(querySearch || role || status) && <button type="button" className="student-outline-action" onClick={() => { setState((current) => ({ ...current, status: 'loading', error: null })); setSearchReset((value) => value + 1); setSearchParams({}) }}>Clear</button>}
        </div>
        {state.status === 'loading' && !state.users.length && <RequestState kind="loading" compact />}
        {state.status === 'error' && <RequestState compact error={state.error} action={<button type="button" onClick={refresh}>Try again</button>} />}
        {state.status === 'ready' && !state.users.length && <RequestState kind="empty" compact message="No users match these filters." />}
        {!!state.users.length && (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Updated</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{state.users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><span>{user.universityEmail}</span></td>
                  <td>{humanize(user.role)}</td>
                  <td><StatusBadge label={humanize(user.status)} /></td>
                  <td>{formatDate(user.updatedAt)}</td>
                  <td><Link className="admin-row-link" to={`/admin/users/${user.id}`}>View account</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <AdminPagination pagination={state.pagination} page={page} noun="users" onPage={(page) => updateQuery({ page: String(page) })} />
      </AdminPanel>
      {provisionRole && (
        <ProvisionUserDialog
          role={provisionRole}
          api={api}
          onClose={() => { setProvisionRole(null); provisionMenu.current?.querySelector('summary')?.focus() }}
          onCreated={(user) => {
            setNotice(`${user.fullName} was provisioned and requires account setup.`)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function DetailValue({ label, children }) {
  return <div className="admin-detail-value"><span>{label}</span><strong>{children}</strong></div>
}

function StatusDialog({ account, api, onClose, onUpdated, onConflict }) {
  const options = allowedNextStatuses(account.status)
  const [nextStatus, setNextStatus] = useState(options[0] ?? 'ACTIVE')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await api.updateUserStatus(account.userId, {
        status: nextStatus,
        reason,
        expectedUpdatedAt: account.updatedAt,
      })
      onUpdated(projectAdminUser(response.data, account.userId))
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.code === 'STALE_USER_VERSION' || requestError.status === 409)) {
        await onConflict()
      }
      setError(requestError)
      setBusy(false)
    }
  }
  return (
    <AdminDialog title="Change account status" summary={`Change ${account.fullName}'s account from ${humanize(account.status)}. This can revoke access across Origin.`} onClose={onClose} onSubmit={submit} submitLabel="Confirm status change" busy={busy} danger>
      <div className="admin-form-grid">
        <label>New status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{options.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="admin-form-span">Reason<textarea required minLength="10" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </div>
      {error && <p className="class-form-error" role="alert">{describeApiError(error)}{error.status === 409 ? ' The latest account version has been loaded; review the retained reason and retry deliberately.' : ''}</p>}
    </AdminDialog>
  )
}

function SessionDialog({ account, api, onClose, onCompleted }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await api.revokeUserSessions(account.userId, { reason })
      onCompleted(response.data.revokedSessionCount ?? 0)
    } catch (requestError) {
      setError(requestError)
      setBusy(false)
    }
  }
  return (
    <AdminDialog title="Revoke active sessions" summary={`This can sign ${account.fullName} out of every active device. Session secrets and device details are never displayed.`} onClose={onClose} onSubmit={submit} submitLabel="Revoke sessions" busy={busy} danger>
      <label className="admin-dialog-field">Reason<textarea required minLength="10" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
    </AdminDialog>
  )
}

export function AdminUserDetailPage({ api = adminApi }) {
  const { userId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', account: null, error: null })
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)
  const [setupIssuance, setSetupIssuance] = useState(null)

  const load = useCallback(async ({ signal, silent = false } = {}) => {
    if (!silent) setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const options = { signal }
      const [directoryResponse, summaryResponse] = await Promise.all([
        api.getUser(userId, options),
        api.getAccountSummary(userId, options),
      ])
      const directoryUser = projectAdminUser(directoryResponse.data, userId)
      const account = projectAdminAccount(summaryResponse.data, userId)
      assertMatchingAdminAccount(directoryUser, account, userId)
      setState({ status: 'ready', account, error: null })
      return account
    } catch (error) {
      if (error?.name !== 'AbortError') setState((current) => ({ ...current, status: silent ? current.status : 'error', error }))
      return null
    }
  }, [api, userId])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  if (state.status === 'loading' && !state.account) return <RequestState kind="loading" />
  if (state.status === 'error' || !state.account) {
    const kind = state.error instanceof AdminProjectionError ? 'unavailable' : state.error?.status === 404 ? 'notFound' : 'unavailable'
    return <RequestState kind={kind} error={state.error} action={<button type="button" onClick={() => load()}>Try again</button>} />
  }

  const account = state.account
  const self = auth.user?.id === account.userId
  const canChangeStatus = account.status !== 'SETUP_PENDING' && !(self && account.role === 'ADMIN')

  const resend = async () => {
    setResending(true)
    setNotice('')
    try {
      const response = await api.resendSetup(account.userId)
      if (response.data?.setupLinkSent !== true) throw new AdminProjectionError()
      const manualSetup = projectAdminManualSetup(response.data)
      setSetupIssuance({
        user: {
          fullName: account.fullName,
          universityEmail: account.universityEmail,
        },
        ...manualSetup,
        kind: 'reissued',
      })
      await load({ silent: true })
      setNotice('A new setup link was generated and the configured delivery channel was also used.')
    } catch (error) {
      setNotice(describeApiError(error))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        eyebrow="Account record"
        title={account.fullName}
        summary={account.universityEmail}
        actions={<button type="button" className="student-outline-action" onClick={() => navigate('/admin/users')}>Back to users</button>}
      />
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <div className="admin-detail-grid">
        <AdminPanel title="Identity and access" eyebrow="Safe account metadata">
          <div className="admin-detail-values">
            <DetailValue label="Role">{humanize(account.role)}</DetailValue>
            <DetailValue label="Status"><StatusBadge label={humanize(account.status)} /></DetailValue>
            <DetailValue label="Created">{formatDate(account.createdAt)}</DetailValue>
            <DetailValue label="Last updated">{formatDate(account.updatedAt)}</DetailValue>
            <DetailValue label="Last login">{formatDate(account.lastLoginAt, 'Never')}</DetailValue>
            <DetailValue label="Password changed">{formatDate(account.passwordChangedAt, 'Not completed')}</DetailValue>
          </div>
          <div className="admin-action-row">
            {canChangeStatus && <button type="button" className="student-outline-action" onClick={() => setDialog('status')}>Change status</button>}
            {self && account.role === 'ADMIN' && <p className="admin-panel-note">Administrators cannot disable their own account.</p>}
            {account.status === 'SETUP_PENDING' && <p className="admin-panel-note">Complete or resend setup before normal status management is available.</p>}
          </div>
        </AdminPanel>
        <AdminPanel title="Account setup" eyebrow="Nonsecret lifecycle">
          <div className="admin-detail-values">
            <DetailValue label="Setup state"><StatusBadge label={humanize(account.accountSetup.state)} /></DetailValue>
            <DetailValue label="Last issued">{formatDate(account.accountSetup.lastIssuedAt)}</DetailValue>
            <DetailValue label="Expires">{formatDate(account.accountSetup.expiresAt, 'Not applicable')}</DetailValue>
          </div>
          {account.status === 'SETUP_PENDING' && <button type="button" className="student-outline-action" disabled={resending} onClick={resend}>{resending ? 'Generating…' : 'Generate new setup link'}</button>}
        </AdminPanel>
        <AdminPanel title="Sessions" eyebrow="Aggregate counts only">
          <div className="admin-session-grid">
            <AdminMetric label="Active" value={account.sessions.active} detail="Unexpired sessions" />
            <AdminMetric label="Revoked" value={account.sessions.revoked} detail="Previously revoked" />
            <AdminMetric label="Expired" value={account.sessions.expired} detail="Expired naturally" />
          </div>
          <button type="button" className="admin-danger-outline" disabled={account.sessions.active === 0} onClick={() => setDialog('sessions')}>Revoke active sessions</button>
        </AdminPanel>
        <AdminPanel title="Class memberships" eyebrow="Lifecycle summary" className="admin-detail-grid__wide">
          {!account.memberships.length ? <RequestState kind="empty" compact message="This account has no class memberships." /> : (
            <div className="admin-membership-list">{account.memberships.map((membership) => (
              <article key={membership.memberId}>
                <div><strong>{membership.class.className}</strong><span>{membership.class.section}</span></div>
                <StatusBadge label={humanize(membership.membershipStatus)} />
                <span>{humanize(membership.class.status)}</span>
              </article>
            ))}</div>
          )}
          <p className="admin-panel-note">Class membership governance is scheduled for Phase 10D.2.</p>
        </AdminPanel>
      </div>
      {setupIssuance && <SetupLinkDialog issuance={setupIssuance} onClose={() => setSetupIssuance(null)} />}
      {dialog === 'status' && (
        <StatusDialog
          account={account}
          api={api}
          onClose={() => setDialog(null)}
          onConflict={() => load({ silent: true })}
          onUpdated={(user) => {
            setState((current) => ({ ...current, account: { ...current.account, status: user.status, updatedAt: user.updatedAt } }))
            setDialog(null)
            setNotice(`Account status changed to ${humanize(user.status)}.`)
          }}
        />
      )}
      {dialog === 'sessions' && (
        <SessionDialog
          account={account}
          api={api}
          onClose={() => setDialog(null)}
          onCompleted={async (count) => {
            setDialog(null)
            await load({ silent: true })
            setNotice(count ? `${count} active session${count === 1 ? '' : 's'} revoked.` : 'No active sessions required revocation.')
          }}
        />
      )}
    </div>
  )
}

export default function AdminRoutePage({ pagePath, api = adminApi }) {
  const pages = {
    dashboard: <AdminOverviewPage api={api} />,
    users: <AdminUsersPage api={api} />,
    'user-detail': <AdminUserDetailPage api={api} />,
  }
  return pages[pagePath] ?? <Navigate to="/admin" replace />
}
