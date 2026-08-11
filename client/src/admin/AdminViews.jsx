import { useCallback, useEffect, useMemo, useState } from 'react'
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
  projectAdminOverview,
  projectAdminUser,
} from './admin-projections.js'
import { formatDate, humanize, pageNumber } from './admin-view-utils.js'

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
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </header>
  )
}

export function AdminPanel({ title, eyebrow, children, actions, className = '' }) {
  return (
    <section className={`admin-panel ${className}`}>
      <header className="admin-panel__header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {actions && <div className="admin-panel__actions">{actions}</div>}
      </header>
      <div className="admin-panel__body">{children}</div>
    </section>
  )
}

export function AdminMetric({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`admin-metric admin-metric--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

export function AdminDialog({ title, summary, children, onClose, onSubmit, submitLabel, busy, submitDisabled = false, danger = false }) {
  return (
    <div className="student-submit-backdrop" role="presentation">
      <form className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onSubmit={onSubmit}>
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close dialog" />
        <p className="eyebrow">Administrator action</p>
        <h2 id="admin-dialog-title">{title}</h2>
        <p>{summary}</p>
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
      .then((response) => setState({ status: 'ready', data: projectAdminOverview(response.data), error: null }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setState({ status: 'error', data: null, error })
      })
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  if (state.status === 'loading' && !state.data) return <RequestState kind="loading" />
  if (state.status === 'error') {
    return <RequestState error={state.error} action={<button type="button" onClick={() => { setState({ status: 'loading', data: null, error: null }); load() }}>Try again</button>} />
  }

  const overview = state.data
  const activeUsers = overview.users.byStatus.ACTIVE ?? 0
  const classCount = sumCounts(overview.academics.classesByStatus)
  const repositoryCount = sumCounts(overview.repositories.byLifecycle)
  const pendingSetup = overview.users.accountSetup.pending + overview.users.accountSetup.actionRequired

  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        eyebrow="Platform administration"
        title="Overview"
        summary="Authoritative account and academic record totals from Projex. Operational health and recovery remain in a later milestone."
        actions={<button type="button" className="student-outline-action" onClick={() => load()}>Refresh</button>}
      />
      <div className="admin-metric-grid">
        <AdminMetric label="Users" value={overview.users.total} detail={`${activeUsers} active accounts`} />
        <AdminMetric label="Setup attention" value={pendingSetup} detail={`${overview.users.accountSetup.actionRequired} require a new setup link`} tone={pendingSetup ? 'attention' : 'good'} />
        <AdminMetric label="Classes" value={classCount} detail={`${overview.academics.classesByStatus.ARCHIVED ?? 0} archived`} />
        <AdminMetric label="Repositories" value={repositoryCount} detail={`${overview.repositories.unmeasuredRecords} without a storage measurement`} />
      </div>
      <div className="admin-overview-grid">
        <AdminPanel title="Account composition" eyebrow="Current records">
          <div className="admin-breakdown-list">
            {USER_ROLES.map((role) => (
              <div key={role}><span>{humanize(role)}</span><strong>{overview.users.byRole[role] ?? 0}</strong></div>
            ))}
          </div>
          <Link className="admin-text-link" to="/admin/users">Open user directory</Link>
        </AdminPanel>
        <AdminPanel title="Academic lifecycle" eyebrow="Bounded summaries">
          <div className="admin-breakdown-list">
            <div><span>Activities</span><strong>{sumCounts(overview.academics.activitiesByStatus)}</strong></div>
            <div><span>Submissions</span><strong>{sumCounts(overview.academics.submissionsByStatus)}</strong></div>
            <div><span>Project tasks</span><strong>{sumCounts(overview.academics.projectTasksByStatus)}</strong></div>
            <div><span>Teams</span><strong>{sumCounts(overview.academics.teamsByStatus)}</strong></div>
          </div>
          <p className="admin-panel-note"><Link to="/admin/academic">Open detailed academic administration.</Link></p>
        </AdminPanel>
      </div>
      <p className="admin-generated-at">Summary generated {formatDate(overview.generatedAt)}.</p>
    </div>
  )
}

function ProvisionUserDialog({ role, api, onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', universityEmail: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = role === 'STUDENT'
        ? await api.provisionStudent(form)
        : await api.provisionInstructor(form)
      onCreated(projectAdminUser(response.data))
    } catch (requestError) {
      setError(requestError)
      setBusy(false)
    }
  }
  return (
    <AdminDialog
      title={`Provision ${role === 'STUDENT' ? 'student' : 'instructor'}`}
      summary="Projex will deliver the normal account-setup instructions. No password or setup token is created in the browser."
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

export function AdminUsersPage({ api = adminApi }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', users: [], pagination: null, error: null })
  const [provisionRole, setProvisionRole] = useState(null)
  const [notice, setNotice] = useState('')
  const page = pageNumber(searchParams)
  const role = searchParams.get('role') ?? ''
  const status = searchParams.get('status') ?? ''
  const querySearch = searchParams.get('search') ?? ''

  const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: querySearch, role, status }), [page, querySearch, role, status])

  const load = useCallback(({ signal } = {}) => {
    return api.listUsers(query, { signal })
      .then((response) => setState({
        status: 'ready',
        users: response.data.map((user) => projectAdminUser(user)),
        pagination: response.pagination,
        error: null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setState((current) => ({ ...current, status: 'error', error }))
      })
  }, [api, query])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

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
        eyebrow="Account administration"
        title="Users"
        summary="Search and manage safe account records. Roles are assigned only through the approved student and instructor provisioning workflows."
        actions={(
          <>
            <button type="button" className="student-outline-action" onClick={() => setProvisionRole('STUDENT')}>Add student</button>
            <button type="button" className="student-primary-action" onClick={() => setProvisionRole('INSTRUCTOR')}>Add instructor</button>
          </>
        )}
      />
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <AdminPanel title="User directory" eyebrow="Server-filtered records">
        <form className="admin-filter-bar" onSubmit={(event) => { event.preventDefault(); updateQuery({ search: new FormData(event.currentTarget).get('search')?.toString().trim() }) }}>
          <label className="admin-filter-search">Search<input key={querySearch} name="search" defaultValue={querySearch} maxLength="200" placeholder="Name or university email" /></label>
          <label>Role<select value={role} onChange={(event) => updateQuery({ role: event.target.value })}><option value="">All roles</option>{USER_ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Status<select value={status} onChange={(event) => updateQuery({ status: event.target.value })}><option value="">All statuses</option>{USER_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="submit" className="student-primary-action">Search</button>
          {(querySearch || role || status) && <button type="button" className="student-outline-action" onClick={() => { setState((current) => ({ ...current, status: 'loading', error: null })); setSearchParams({}) }}>Clear</button>}
        </form>
        {state.status === 'loading' && !state.users.length && <RequestState kind="loading" compact />}
        {state.status === 'error' && <RequestState compact error={state.error} action={<button type="button" onClick={() => { setState((current) => ({ ...current, status: 'loading', error: null })); load() }}>Try again</button>} />}
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
        {state.pagination && (
          <div className="admin-pagination">
            <span>Page {state.pagination.page} of {Math.max(1, state.pagination.totalPages)} · {state.pagination.totalItems} users</span>
            <div>
              <button type="button" className="student-outline-action" disabled={!state.pagination.hasPreviousPage} onClick={() => updateQuery({ page: String(page - 1) })}>Previous</button>
              <button type="button" className="student-outline-action" disabled={!state.pagination.hasNextPage} onClick={() => updateQuery({ page: String(page + 1) })}>Next</button>
            </div>
          </div>
        )}
      </AdminPanel>
      {provisionRole && (
        <ProvisionUserDialog
          role={provisionRole}
          api={api}
          onClose={() => setProvisionRole(null)}
          onCreated={(user) => {
            setProvisionRole(null)
            setNotice(`${user.fullName} was provisioned. Account-setup instructions were sent through the configured delivery channel.`)
            load()
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
    <AdminDialog title="Change account status" summary={`Change ${account.fullName}'s account from ${humanize(account.status)}. This can revoke access across Projex.`} onClose={onClose} onSubmit={submit} submitLabel="Confirm status change" busy={busy} danger>
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
      await load({ silent: true })
      setNotice('Account-setup instructions were sent through the configured delivery channel.')
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
          {account.status === 'SETUP_PENDING' && <button type="button" className="student-outline-action" disabled={resending} onClick={resend}>{resending ? 'Sending…' : 'Resend setup instructions'}</button>}
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
