import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { adminApi } from './admin-api.js'
import {
  projectAuditEvent,
  projectExecutionJob,
  projectGitCredential,
  projectOperationalHealth,
  projectProvisioningJob,
  projectStorageSummary,
} from './admin-operational-projections.js'
import { AdminDialog, AdminMetric, AdminPageHeader, AdminPanel } from './AdminViews.jsx'
import { formatByteCount, formatDate, humanize, pageNumber } from './admin-view-utils.js'

const PAGE_SIZE = 20
const REASON_MIN = 10
const REASON_MAX = 500

const EXECUTION_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']
const PROVISIONING_STATUSES = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']
const CREDENTIAL_LIFECYCLES = ['ACTIVE', 'EXPIRED', 'REVOKED']
const AUDIT_ACTIONS = [
  'USER_STUDENT_PROVISIONED', 'USER_INSTRUCTOR_PROVISIONED', 'USER_SETUP_REISSUED',
  'USER_STATUS_CHANGED', 'USER_SESSIONS_REVOKED', 'CLASS_CREATED', 'CLASS_UPDATED',
  'CLASS_ARCHIVED', 'CLASS_RESTORED', 'CLASS_JOIN_CODE_ROTATED',
  'CLASS_JOIN_CODE_REVOKED', 'CLASS_MEMBER_REMOVED', 'CLASS_MEMBER_REACTIVATED',
  'GIT_CREDENTIAL_REVOKED', 'REPOSITORY_PROVISIONING_RETRY_QUEUED',
]
const AUDIT_TARGETS = ['USER', 'CLASS', 'CLASS_MEMBER', 'GIT_CREDENTIAL', 'REPOSITORY_PROVISIONING_JOB']

function updateQuery(setSearchParams, current, changes) {
  const next = new URLSearchParams(current)
  Object.entries(changes).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) next.delete(key)
    else next.set(key, String(value))
  })
  setSearchParams(next)
}

function Paginator({ pagination, page, onPage }) {
  if (!pagination || pagination.totalItems === 0) return null
  return <div className="admin-pagination"><span>Page {page} of {Math.max(pagination.totalPages, 1)} &middot; {pagination.totalItems} records</span><div><button type="button" className="student-outline-action" disabled={!pagination.hasPreviousPage} onClick={() => onPage(page - 1)}>Previous</button><button type="button" className="student-outline-action" disabled={!pagination.hasNextPage} onClick={() => onPage(page + 1)}>Next</button></div></div>
}

function IdValue({ children }) {
  return <code className="admin-id-value">{children || 'Not applicable'}</code>
}

function QueueCounts({ title, observation }) {
  if (!observation) return <div className="admin-observation"><strong>{title}</strong><span>Observation unavailable</span></div>
  return <div className="admin-observation"><strong>{title}</strong><div>{Object.entries(observation.byStatus).map(([status, total]) => <span key={status}><StatusBadge label={humanize(status)} /> {total}</span>)}</div><small>{observation.stuck} lease-derived stuck record{observation.stuck === 1 ? '' : 's'}</small></div>
}

export function AdminOperationsOverviewPage({ api = adminApi }) {
  const [health, setHealth] = useState({ status: 'loading', value: null, error: null })
  const [storage, setStorage] = useState({ status: 'loading', value: null, error: null })

  const load = useCallback(({ signal } = {}) => Promise.allSettled([
      api.getOperationalHealth({ signal }),
      api.getStorageSummary({ signal }),
    ]).then(([healthResult, storageResult]) => {
      if (signal?.aborted) return
      if (healthResult.status === 'fulfilled') {
        try { setHealth({ status: 'ready', value: projectOperationalHealth(healthResult.value.data), error: null }) }
        catch (error) { setHealth({ status: 'error', value: null, error }) }
      } else setHealth({ status: 'error', value: null, error: healthResult.reason })
      if (storageResult.status === 'fulfilled') {
        try { setStorage({ status: 'ready', value: projectStorageSummary(storageResult.value.data), error: null }) }
        catch (error) { setStorage({ status: 'error', value: null, error }) }
      } else setStorage({ status: 'error', value: null, error: storageResult.reason })
    }), [api])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const refresh = () => {
    setHealth((current) => ({ ...current, status: current.value ? 'ready' : 'loading', error: null }))
    setStorage((current) => ({ ...current, status: current.value ? 'ready' : 'loading', error: null }))
    load()
  }

  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Measured operational observations" title="Operations" summary="Inspect persisted service, queue, storage, job, and credential metadata. Projex does not infer worker health or infrastructure capacity." actions={<button type="button" className="student-outline-action" onClick={refresh}>Refresh observations</button>} />
    <div className="admin-operations-links">
      <Link to="/admin/operations/execution-jobs">Execution jobs<span>Read-only Java queue records</span></Link>
      <Link to="/admin/operations/repository-provisioning-jobs">Provisioning jobs<span>Inspect and retry eligible failures</span></Link>
      <Link to="/admin/operations/git-credentials">Git credentials<span>Lifecycle metadata and revocation</span></Link>
      <Link to="/admin/audit-events">Audit events<span>Allowlisted administrative history</span></Link>
    </div>
    <div className="admin-detail-grid">
      <AdminPanel title="Service observation" eyebrow="API, database, and persisted queues">
        {health.status === 'loading' ? <RequestState kind="loading" compact /> : null}
        {health.status === 'error' ? <RequestState error={health.error} compact action={<button type="button" onClick={refresh}>Try again</button>} /> : null}
        {health.value ? <>
          <div className="admin-metric-grid admin-metric-grid--compact">
            <AdminMetric label="API" value={humanize(health.value.apiStatus)} detail="This request reached the API process" tone="good" />
            <AdminMetric label="PostgreSQL" value={humanize(health.value.databaseStatus)} detail="Direct connectivity observation" tone={health.value.databaseStatus === 'connected' ? 'good' : 'attention'} />
            <AdminMetric label="Worker health" value="Not observed" detail="Jobs and leases do not prove worker availability" />
          </div>
          <div className="admin-observation-grid"><QueueCounts title="Java execution queue" observation={health.value.execution} /><QueueCounts title="Repository provisioning queue" observation={health.value.repositoryProvisioning} /></div>
          <p className="admin-panel-note">Queue source: {humanize(health.value.queueSource)}. Observed {formatDate(health.value.timestamp)}.</p>
        </> : null}
      </AdminPanel>
      <AdminPanel title="Repository storage" eyebrow="Measured records only">
        {storage.status === 'loading' ? <RequestState kind="loading" compact /> : null}
        {storage.status === 'error' ? <RequestState error={storage.error} compact action={<button type="button" onClick={refresh}>Try again</button>} /> : null}
        {storage.value ? <>
          <div className="admin-metric-grid admin-metric-grid--compact">
            <AdminMetric label="Measured bytes" value={formatByteCount(storage.value.knownMeasuredBytes)} detail="Sum of known repository measurements" />
            <AdminMetric label="Measured records" value={storage.value.measuredRecords} detail="Repositories with a measurement" tone="good" />
            <AdminMetric label="Unmeasured records" value={storage.value.unmeasuredRecords} detail="No capacity inference is made" tone={storage.value.unmeasuredRecords ? 'attention' : 'default'} />
          </div>
          <div className="admin-status-counts">{Object.entries(storage.value.byStorageStatus).map(([status, total]) => <span key={status}><StatusBadge label={humanize(status)} /><strong>{total}</strong></span>)}</div>
          <p className="admin-panel-note">Projex does not report host capacity, utilization percentages, integrity, snapshots, or retention readiness.</p>
        </> : null}
      </AdminPanel>
    </div>
  </div>
}

const LIST_CONFIG = {
  execution: {
    title: 'Execution jobs', summary: 'Read-only persisted Java assessment and visible-test queue metadata.',
    list: 'listExecutionJobs', project: projectExecutionJob, statuses: EXECUTION_STATUSES,
    sort: [['createdAt', 'Created'], ['updatedAt', 'Updated'], ['availableAt', 'Available']],
  },
  provisioning: {
    title: 'Repository provisioning jobs', summary: 'Persisted provisioning lifecycle metadata and narrowly eligible recovery.',
    list: 'listProvisioningJobs', project: projectProvisioningJob, statuses: PROVISIONING_STATUSES,
    sort: [['createdAt', 'Created'], ['updatedAt', 'Updated'], ['availableAt', 'Available']],
  },
  credentials: {
    title: 'Git credentials', summary: 'Repository-scoped lifecycle metadata only. Credential issuance and secret values are unavailable.',
    list: 'listGitCredentials', project: projectGitCredential, statuses: CREDENTIAL_LIFECYCLES,
    sort: [['createdAt', 'Created'], ['expiresAt', 'Expiry']],
  },
}

function safeOperationalMessage(error) {
  const messages = {
    PROVISIONING_QUARANTINED: 'Quarantined storage requires a separately approved recovery process.',
    PROVISIONING_STORAGE_STATE_UNSAFE: 'The repository storage state is not safe for this retry.',
    PROVISIONING_RETRY_LIMIT_REACHED: 'The provisioning retry ceiling has been reached.',
    REPOSITORY_NOT_PROVISIONABLE: 'The repository lifecycle no longer permits provisioning.',
    GIT_EXECUTION_DISABLED: 'Controlled local Git provisioning is unavailable.',
    PROVISIONING_JOB_NOT_FAILED: 'Only an eligible failed provisioning job can be retried.',
    PROVISIONING_VERSION_REFRESH_FAILED: 'The latest job version could not be loaded. Close this dialog, refresh the list, and review the current record before retrying.',
  }
  return messages[error?.code] ?? describeApiError(error)
}

function ProvisioningRetryDialog({ job, api, onClose, onRefetch, onCompleted }) {
  const [currentJob, setCurrentJob] = useState(job)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [versionReady, setVersionReady] = useState(true)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      await api.retryProvisioningJob(currentJob.jobId, { reason, expectedUpdatedAt: currentJob.updatedAt })
      await onCompleted(); onClose()
    } catch (requestError) {
      let displayedError = requestError
      if (requestError instanceof ApiError && requestError.code === 'STALE_PROVISIONING_JOB_VERSION') {
        setVersionReady(false)
        const refreshed = await onRefetch()
        const latest = refreshed.find((item) => item.jobId === currentJob.jobId)
        if (latest) {
          setCurrentJob(latest)
          setVersionReady(true)
        } else {
          displayedError = new ApiError({ status: 503, code: 'PROVISIONING_VERSION_REFRESH_FAILED' })
        }
      }
      setError(displayedError); setBusy(false)
    }
  }
  return <AdminDialog title="Retry repository provisioning" summary="This queues one additional attempt for the same eligible failed job. The browser does not execute Git or access repository storage." submitLabel="Queue retry" onClose={onClose} onSubmit={submit} busy={busy} submitDisabled={!versionReady}>
    <label className="admin-dialog-field">Reason<textarea required minLength={REASON_MIN} maxLength={REASON_MAX} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    {error ? <p className="class-form-error" role="alert">{safeOperationalMessage(error)}{error.code === 'STALE_PROVISIONING_JOB_VERSION' ? ' The latest job version was loaded; review the retained reason and retry deliberately.' : ''}</p> : null}
  </AdminDialog>
}

function CredentialRevokeDialog({ credential, api, onClose, onCompleted }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const response = await api.revokeGitCredential(credential.credentialId, { reason })
      await onCompleted(response.data.changed); onClose()
    } catch (requestError) { setError(requestError); setBusy(false) }
  }
  return <AdminDialog title="Revoke Git credential" summary="Revoke this repository-scoped credential. No secret or verifier is available to this interface." submitLabel="Revoke credential" onClose={onClose} onSubmit={submit} busy={busy} danger>
    <label className="admin-dialog-field">Reason<textarea required minLength={REASON_MIN} maxLength={REASON_MAX} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    {error ? <p className="class-form-error" role="alert">{describeApiError(error)}</p> : null}
  </AdminDialog>
}

function OperationalRow({ kind, item, onAction }) {
  if (kind === 'execution') return <><td><IdValue>{item.jobId}</IdValue><span>{humanize(item.jobType)}</span></td><td><StatusBadge label={humanize(item.status)} />{item.stuck ? <span className="admin-stuck-label">Lease-derived stuck</span> : null}</td><td>{item.claimAttempt} of {item.maxClaimAttempts}<span>{item.failureCode ? humanize(item.failureCode) : 'No failure code'}</span></td><td>{item.submissionId ? <><span>Submission</span><IdValue>{item.submissionId}</IdValue></> : <><span>Practice execution</span><IdValue>{item.practiceExecutionId}</IdValue></>}</td><td>{formatDate(item.availableAt)}<span>Updated {formatDate(item.updatedAt)}</span></td></>
  if (kind === 'provisioning') return <><td><IdValue>{item.jobId}</IdValue><span>Repository <IdValue>{item.repositoryId}</IdValue></span></td><td><StatusBadge label={humanize(item.status)} />{item.stuck ? <span className="admin-stuck-label">Lease-derived stuck</span> : null}</td><td>{item.claimAttempt} of {item.maxClaimAttempts}<span>{item.failureCode ? humanize(item.failureCode) : 'No failure code'}</span></td><td>{formatDate(item.availableAt)}<span>Updated {formatDate(item.updatedAt)}</span></td><td>{item.status === 'FAILED' ? <button type="button" className="student-outline-action" onClick={() => onAction(item)}>Review retry</button> : null}</td></>
  return <><td><IdValue>{item.credentialId}</IdValue><span>User <IdValue>{item.userId}</IdValue></span></td><td>Repository <IdValue>{item.repositoryId}</IdValue></td><td><StatusBadge label={humanize(item.lifecycle)} /><span>{item.allowedOperations.map(humanize).join(', ') || 'No operations'}</span></td><td>Expires {formatDate(item.expiresAt)}<span>Last used {formatDate(item.lastUsedAt)}</span></td><td>{item.lifecycle !== 'REVOKED' ? <button type="button" className="admin-danger-outline" onClick={() => onAction(item)}>Revoke</button> : null}</td></>
}

export function AdminOperationalListPage({ kind, api = adminApi }) {
  const config = LIST_CONFIG[kind]
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageNumber(searchParams)
  const status = searchParams.get(kind === 'credentials' ? 'lifecycle' : 'status') || ''
  const jobType = searchParams.get('jobType') || ''
  const operation = searchParams.get('operation') || ''
  const stuck = searchParams.get('stuck') || ''
  const sortBy = searchParams.get('sortBy') || config.sort[0][0]
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: null })
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, status: kind === 'credentials' ? '' : status, lifecycle: kind === 'credentials' ? status : '', jobType, operation, stuck, sortBy, sortOrder }), [jobType, kind, operation, page, sortBy, sortOrder, status, stuck])

  const load = useCallback(({ signal } = {}) => api[config.list](query, { signal }).then((response) => {
    const items = response.data.map(config.project)
    setState({ status: 'ready', items, pagination: response.pagination, error: null })
    return items
  }).catch((error) => {
    if (error?.name !== 'AbortError') setState({ status: 'error', items: [], pagination: null, error })
    return []
  }), [api, config, query])

  useEffect(() => {
    const controller = new AbortController(); load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const submit = (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    updateQuery(setSearchParams, searchParams, { page: 1, status: form.get('status'), lifecycle: form.get('lifecycle'), jobType: form.get('jobType'), operation: form.get('operation'), stuck: form.get('stuck'), sortBy: form.get('sortBy'), sortOrder: form.get('sortOrder') })
  }

  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Operational administration" title={config.title} summary={config.summary} actions={<Link className="student-outline-action" to="/admin/operations">Back to operations</Link>} />
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    <AdminPanel title={config.title} eyebrow="Server-filtered records">
      <form className="admin-filter-bar admin-filter-bar--operations" onSubmit={submit} key={searchParams.toString()}>
        <label>{kind === 'credentials' ? 'Lifecycle' : 'Status'}<select name={kind === 'credentials' ? 'lifecycle' : 'status'} defaultValue={status}><option value="">All states</option>{config.statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        {kind === 'execution' ? <label>Job type<select name="jobType" defaultValue={jobType}><option value="">All job types</option><option>OFFICIAL_ASSESSMENT</option><option>VISIBLE_TEST_RUN</option></select></label> : null}
        {kind === 'credentials' ? <label>Operation<select name="operation" defaultValue={operation}><option value="">All operations</option><option>READ</option><option>WRITE</option></select></label> : <label>Stuck observation<select name="stuck" defaultValue={stuck}><option value="">All records</option><option value="true">Stuck</option><option value="false">Not stuck</option></select></label>}
        <label>Sort<select name="sortBy" defaultValue={sortBy}>{config.sort.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Order<select name="sortOrder" defaultValue={sortOrder}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
        <button className="student-primary-action" type="submit">Apply</button>
      </form>
      {state.status === 'loading' && !state.items.length ? <RequestState kind="loading" compact /> : null}
      {state.status === 'error' ? <RequestState error={state.error} compact action={<button type="button" onClick={() => load()}>Try again</button>} /> : null}
      {state.status === 'ready' && !state.items.length ? <RequestState kind="empty" compact message="No operational records match these filters." /> : null}
      {state.items.length ? <div className="admin-table-scroll"><table className="admin-table admin-operations-table"><thead><tr>{kind === 'execution' ? <><th>Job</th><th>State</th><th>Claims</th><th>Related record</th><th>Timing</th></> : kind === 'provisioning' ? <><th>Job</th><th>State</th><th>Claims</th><th>Timing</th><th /></> : <><th>Credential</th><th>Repository</th><th>Lifecycle</th><th>Timing</th><th /></>}</tr></thead><tbody>{state.items.map((item) => <tr key={kind === 'credentials' ? item.credentialId : item.jobId}><OperationalRow kind={kind} item={item} onAction={setSelected} /></tr>)}</tbody></table></div> : null}
      <Paginator pagination={state.pagination} page={page} onPage={(next) => updateQuery(setSearchParams, searchParams, { page: next })} />
    </AdminPanel>
    {selected && kind === 'provisioning' ? <ProvisioningRetryDialog job={selected} api={api} onClose={() => setSelected(null)} onRefetch={load} onCompleted={async () => { setNotice('Provisioning retry queued for the same repository job.'); await load() }} /> : null}
    {selected && kind === 'credentials' ? <CredentialRevokeDialog credential={selected} api={api} onClose={() => setSelected(null)} onCompleted={async (changed) => { setNotice(changed ? 'Git credential revoked.' : 'The Git credential was already revoked.'); await load() }} /> : null}
  </div>
}

function AuditDetailDialog({ event, onClose }) {
  const submit = (submitEvent) => { submitEvent.preventDefault(); onClose() }
  const displayMetadataValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value) ? humanize(value) : String(value)
  }
  return <AdminDialog title={humanize(event.action)} summary="Read-only, action-specific administrative audit evidence." submitLabel="Close" onClose={onClose} onSubmit={submit}>
    <div className="admin-audit-detail">
      <div><span>Actor</span><strong>{event.actor.fullName}</strong><small>{event.actor.universityEmail}</small></div>
      <div><span>Target</span><strong>{humanize(event.targetType)}</strong><IdValue>{event.targetId}</IdValue></div>
      <div><span>Request ID</span><IdValue>{event.requestId}</IdValue></div>
      <div><span>Recorded</span><strong>{formatDate(event.createdAt)}</strong></div>
      <div className="admin-audit-detail__wide"><span>Reason</span><p>{event.reason || 'No reason recorded for this action type.'}</p></div>
      {event.metadata ? <div className="admin-audit-detail__wide"><span>Allowlisted metadata</span><dl>{Object.entries(event.metadata).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{displayMetadataValue(value)}</dd></div>)}</dl></div> : null}
    </div>
  </AdminDialog>
}

export function AdminAuditEventsPage({ api = adminApi }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageNumber(searchParams)
  const action = searchParams.get('action') || ''
  const targetType = searchParams.get('targetType') || ''
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: null })
  const [selected, setSelected] = useState(null)
  const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, action, targetType, sortOrder }), [action, page, sortOrder, targetType])
  const load = useCallback(({ signal } = {}) => api.listAuditEvents(query, { signal }).then((response) => setState({ status: 'ready', items: response.data.map(projectAuditEvent), pagination: response.pagination, error: null })).catch((error) => { if (error?.name !== 'AbortError') setState({ status: 'error', items: [], pagination: null, error }) }), [api, query])
  useEffect(() => { const controller = new AbortController(); load({ signal: controller.signal }); return () => controller.abort() }, [load])
  const submit = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateQuery(setSearchParams, searchParams, { page: 1, action: form.get('action'), targetType: form.get('targetType'), sortOrder: form.get('sortOrder') }) }
  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Administrative accountability" title="Audit events" summary="Read-only allowlisted administrative actions, reasons, request identifiers, and typed metadata." />
    <AdminPanel title="Audit event ledger" eyebrow="Server-filtered records">
      <form className="admin-filter-bar admin-filter-bar--audit" onSubmit={submit} key={searchParams.toString()}><label>Action<select name="action" defaultValue={action}><option value="">All actions</option>{AUDIT_ACTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Target type<select name="targetType" defaultValue={targetType}><option value="">All target types</option>{AUDIT_TARGETS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Order<select name="sortOrder" defaultValue={sortOrder}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label><button className="student-primary-action" type="submit">Apply</button></form>
      {state.status === 'loading' && !state.items.length ? <RequestState kind="loading" compact /> : null}
      {state.status === 'error' ? <RequestState error={state.error} compact action={<button type="button" onClick={() => load()}>Try again</button>} /> : null}
      {state.status === 'ready' && !state.items.length ? <RequestState kind="empty" compact message="No audit events match these filters." /> : null}
      {state.items.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Recorded</th><th /></tr></thead><tbody>{state.items.map((item) => <tr key={item.eventId}><td><strong>{humanize(item.action)}</strong><span>{item.reason || 'No reason recorded'}</span></td><td>{item.actor.fullName}<span>{item.actor.universityEmail}</span></td><td>{humanize(item.targetType)}<span><IdValue>{item.targetId}</IdValue></span></td><td>{formatDate(item.createdAt)}<span>Request <IdValue>{item.requestId}</IdValue></span></td><td><button type="button" className="student-outline-action" onClick={() => setSelected(item)}>View details</button></td></tr>)}</tbody></table></div> : null}
      <Paginator pagination={state.pagination} page={page} onPage={(next) => updateQuery(setSearchParams, searchParams, { page: next })} />
    </AdminPanel>
    {selected ? <AuditDetailDialog event={selected} onClose={() => setSelected(null)} /> : null}
  </div>
}
