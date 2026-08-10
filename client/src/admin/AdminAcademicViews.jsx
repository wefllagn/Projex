import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { adminApi } from './admin-api.js'
import {
  AdminProjectionError,
  projectAdminUser,
} from './admin-projections.js'
import {
  projectAcademicActivity,
  projectAcademicClass,
  projectAcademicProjectTask,
  projectAcademicRepository,
  projectAcademicSubmission,
  projectDetailedRosterMember,
  projectGovernedClass,
  projectJoinCode,
} from './admin-academic-projections.js'
import {
  AdminDialog,
  AdminPageHeader,
  AdminPanel,
} from './AdminViews.jsx'
import { formatDate, humanize, pageNumber } from './admin-view-utils.js'

const PAGE_SIZE = 20
const REASON_MIN = 10
const REASON_MAX = 500

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
  return (
    <div className="admin-pagination">
      <span>Page {page} of {Math.max(pagination.totalPages, 1)} · {pagination.totalItems} records</span>
      <div>
        <button type="button" className="student-outline-action" disabled={!pagination.hasPreviousPage} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="student-outline-action" disabled={!pagination.hasNextPage} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  )
}

function ErrorNotice({ error }) {
  return error ? <p className="class-form-error" role="alert">{describeApiError(error)}</p> : null
}

export function AdminAcademicHomePage() {
  const areas = [
    ['Classes', 'Create and govern real class records, join codes, and memberships.', '/admin/academic/classes'],
    ['Programming activities', 'Inspect lifecycle and aggregate assessment configuration without source or test definitions.', '/admin/academic/activities'],
    ['Submissions', 'Inspect operational submission state and released scores only.', '/admin/academic/submissions'],
    ['Project tasks', 'Inspect project lifecycle and bounded collaboration counts.', '/admin/academic/project-tasks'],
    ['Repositories', 'Inspect lifecycle, review, provisioning, ownership, and measured-storage metadata.', '/admin/academic/repositories'],
  ]
  return (
    <div className="admin-page-stack">
      <AdminPageHeader eyebrow="Institutional academic records" title="Academic administration" summary="Govern classes and inspect minimized academic metadata. Administrators cannot author, grade, release, or inspect source through this area." />
      <div className="admin-academic-cards">
        {areas.map(([title, summary, to]) => (
          <Link key={to} to={to} className="admin-academic-card">
            <h2>{title}</h2><p>{summary}</p><span>Open area</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AdminClassListPage({ api = adminApi }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageNumber(searchParams)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: null })

  const load = useCallback(({ signal } = {}) => {
    return api.listAcademicClasses({ page, pageSize: PAGE_SIZE, search, status, sortBy, sortOrder }, { signal })
      .then((response) => setState({ status: 'ready', items: response.data.map(projectAcademicClass), pagination: response.pagination, error: null }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setState({ status: 'error', items: [], pagination: null, error })
      })
  }, [api, page, search, sortBy, sortOrder, status])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    updateQuery(setSearchParams, searchParams, { page: 1, search: form.get('search'), status: form.get('status'), sortBy: form.get('sortBy'), sortOrder: form.get('sortOrder') })
  }

  return (
    <div className="admin-page-stack">
      <AdminPageHeader eyebrow="Class governance" title="Classes" summary="Real class records, ownership, membership totals, and lifecycle state." actions={<Link className="student-primary-action" to="/admin/academic/classes/new">Create class</Link>} />
      <AdminPanel title="Class catalog" eyebrow="Server-filtered records">
        <form className="admin-filter-bar admin-filter-bar--wide" onSubmit={submit} key={searchParams.toString()}>
          <label className="admin-filter-search">Search<input name="search" maxLength="200" defaultValue={search} placeholder="Name, section, semester, or year" /></label>
          <label>Status<select name="status" defaultValue={status}><option value="">All statuses</option><option>ACTIVE</option><option>ARCHIVED</option></select></label>
          <label>Sort<select name="sortBy" defaultValue={sortBy}><option value="createdAt">Created</option><option value="updatedAt">Updated</option><option value="className">Name</option></select></label>
          <label>Order<select name="sortOrder" defaultValue={sortOrder}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
          <button className="student-primary-action" type="submit">Apply</button>
        </form>
        {state.status === 'loading' && !state.items.length ? <RequestState kind="loading" compact /> : null}
        {state.status === 'error' ? <RequestState error={state.error} compact action={<button type="button" onClick={() => load()}>Try again</button>} /> : null}
        {state.status === 'ready' && !state.items.length ? <RequestState kind="empty" compact message="No classes match these filters." /> : null}
        {state.items.length ? (
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Class</th><th>Instructor</th><th>Term</th><th>Memberships</th><th>Status</th><th /></tr></thead><tbody>
            {state.items.map((item) => <tr key={item.classId}>
              <td><strong>{item.className}</strong><span>{item.section}</span></td>
              <td><strong>{item.instructor.fullName}</strong><span>{item.instructor.universityEmail}</span></td>
              <td>{item.semester}<span>{item.schoolYear}</span></td>
              <td>{Object.entries(item.membershipCounts).map(([key, value]) => `${humanize(key)} ${value}`).join(' · ') || 'None'}</td>
              <td><StatusBadge label={humanize(item.status)} /></td>
              <td><Link to={`/admin/academic/classes/${item.classId}`}>Manage</Link></td>
            </tr>)}
          </tbody></table></div>
        ) : null}
        <Paginator pagination={state.pagination} page={page} onPage={(next) => updateQuery(setSearchParams, searchParams, { page: next })} />
      </AdminPanel>
    </div>
  )
}

export function AdminClassCreatePage({ api = adminApi }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [instructors, setInstructors] = useState([])
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const findInstructors = async (event) => {
    event?.preventDefault()
    setSearching(true)
    setError(null)
    try {
      const response = await api.listUsers({ page: 1, pageSize: 20, role: 'INSTRUCTOR', status: 'ACTIVE', search })
      setInstructors(response.data.map((item) => projectAdminUser(item)))
    } catch (requestError) {
      setError(requestError)
    } finally {
      setSearching(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const response = await api.createClass({
        className: form.get('className'), section: form.get('section'), semester: form.get('semester'), schoolYear: form.get('schoolYear'), instructorId: selectedInstructorId,
      })
      const created = projectGovernedClass(response.data)
      navigate(`/admin/academic/classes/${created.classId}`, { replace: true })
    } catch (requestError) {
      setError(requestError)
      setBusy(false)
    }
  }

  return (
    <div className="admin-page-stack">
      <AdminPageHeader eyebrow="Class governance" title="Create class" summary="Create an ACTIVE class owned by an existing ACTIVE instructor. Projex generates the join code on the server." actions={<Link className="student-outline-action" to="/admin/academic/classes">Cancel</Link>} />
      <AdminPanel title="Class details" eyebrow="Supported fields only">
        <form className="admin-form-grid" onSubmit={submit}>
          <label>Class name<input name="className" required maxLength="200" /></label>
          <label>Section<input name="section" required maxLength="100" /></label>
          <label>Semester<input name="semester" required maxLength="100" /></label>
          <label>School year<input name="schoolYear" required maxLength="20" /></label>
          <div className="admin-form-span admin-instructor-picker">
            <label>Find an active instructor<input value={search} maxLength="200" onChange={(event) => setSearch(event.target.value)} placeholder="Name or university email" /></label>
            <button type="button" className="student-outline-action" onClick={findInstructors} disabled={searching}>{searching ? 'Searching…' : 'Search instructors'}</button>
            {instructors.length ? <div className="admin-choice-list">{instructors.map((item) => <label key={item.id}><input type="radio" name="instructorId" value={item.id} checked={selectedInstructorId === item.id} onChange={() => setSelectedInstructorId(item.id)} /><span><strong>{item.fullName}</strong><small>{item.universityEmail}</small></span></label>)}</div> : <p className="admin-panel-note">Search to select the instructor who will own this class.</p>}
          </div>
          <ErrorNotice error={error} />
          <div className="admin-form-span admin-dialog__actions"><button type="submit" className="student-primary-action" disabled={busy || !selectedInstructorId}>{busy ? 'Creating…' : 'Create class'}</button></div>
        </form>
      </AdminPanel>
    </div>
  )
}

function ReasonDialog({ title, summary, submitLabel, onClose, onConfirm, danger = false, retainedReason = '' }) {
  const [reason, setReason] = useState(retainedReason)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(null)
    try { await onConfirm(reason, setError); if (!error) onClose() } catch (requestError) { setError(requestError); setBusy(false) }
  }
  return <AdminDialog title={title} summary={summary} submitLabel={submitLabel} onClose={onClose} onSubmit={submit} busy={busy} danger={danger}>
    <label className="admin-dialog-field">Reason<textarea required minLength={REASON_MIN} maxLength={REASON_MAX} value={reason} onChange={(event) => setReason(event.target.value)} /></label><ErrorNotice error={error} />
  </AdminDialog>
}

function MetadataDialog({ classRecord, api, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(null)
    const form = new FormData(event.currentTarget)
    try {
      await api.updateClass(classRecord.classId, { className: form.get('className'), section: form.get('section'), semester: form.get('semester'), schoolYear: form.get('schoolYear'), reason: form.get('reason') })
      await onSaved()
      onClose()
    } catch (requestError) { setError(requestError); setBusy(false) }
  }
  return <AdminDialog title="Edit class metadata" summary="Instructor ownership cannot be changed after class creation." submitLabel="Save changes" onClose={onClose} onSubmit={submit} busy={busy}>
    <div className="admin-form-grid">
      <label>Class name<input name="className" required maxLength="200" defaultValue={classRecord.className} /></label>
      <label>Section<input name="section" required maxLength="100" defaultValue={classRecord.section} /></label>
      <label>Semester<input name="semester" required maxLength="100" defaultValue={classRecord.semester} /></label>
      <label>School year<input name="schoolYear" required maxLength="20" defaultValue={classRecord.schoolYear} /></label>
      <label className="admin-form-span">Reason<textarea name="reason" required minLength={REASON_MIN} maxLength={REASON_MAX} /></label>
    </div><ErrorNotice error={error} />
  </AdminDialog>
}

function MemberDialog({ classId, member, api, onClose, onRefetch, onUpdated }) {
  const [currentMember, setCurrentMember] = useState(member)
  const targetStatus = currentMember.membershipStatus === 'ACTIVE' ? 'REMOVED' : 'ACTIVE'
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const response = await api.updateClassMember(classId, currentMember.memberId, { status: targetStatus, reason, expectedUpdatedAt: currentMember.updatedAt })
      onUpdated(projectDetailedRosterMember(response.data, currentMember.memberId)); onClose()
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.code === 'STALE_CLASS_MEMBER_VERSION' || requestError.status === 409)) {
        const refreshed = await onRefetch()
        const latest = refreshed.find((item) => item.memberId === currentMember.memberId)
        if (latest) setCurrentMember(latest)
      }
      setError(requestError); setBusy(false)
    }
  }
  return <AdminDialog title={targetStatus === 'REMOVED' ? 'Remove class member' : 'Reactivate class member'} summary={`${currentMember.fullName}'s membership history will be preserved. This does not create or replace a membership row.`} submitLabel={targetStatus === 'REMOVED' ? 'Remove member' : 'Reactivate member'} onClose={onClose} onSubmit={submit} busy={busy} danger={targetStatus === 'REMOVED'}>
    <label className="admin-dialog-field">Reason<textarea required minLength={REASON_MIN} maxLength={REASON_MAX} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <ErrorNotice error={error} />{error?.status === 409 ? <p className="admin-panel-note">The roster was refreshed. Review the retained reason and retry deliberately.</p> : null}
  </AdminDialog>
}

export function AdminClassDetailPage({ api = adminApi }) {
  const { classId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const memberPage = Number(searchParams.get('memberPage') || 1)
  const safeMemberPage = Number.isSafeInteger(memberPage) && memberPage > 0 ? memberPage : 1
  const [state, setState] = useState({ status: 'loading', classRecord: null, error: null })
  const [roster, setRoster] = useState({ status: 'loading', members: [], pagination: null, error: null })
  const [joinCode, setJoinCode] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [notice, setNotice] = useState('')

  const loadClass = useCallback(({ signal } = {}) => {
    return api.getClass(classId, { signal }).then((response) => {
      const classRecord = projectGovernedClass(response.data, classId)
      setJoinCode(null)
      setState({ status: 'ready', classRecord, error: null })
      return classRecord
    }).catch((error) => {
      if (error?.name !== 'AbortError') setState({ status: 'error', classRecord: null, error })
      return null
    })
  }, [api, classId])

  const loadRoster = useCallback(({ signal } = {}) => {
    return api.listClassMembers(classId, { page: safeMemberPage, pageSize: PAGE_SIZE }, { signal }).then((response) => {
      const members = response.data.map((member) => projectDetailedRosterMember(member))
      setRoster({ status: 'ready', members, pagination: response.pagination, error: null })
      return members
    }).catch((error) => {
      if (error?.name !== 'AbortError') setRoster({ status: 'error', members: [], pagination: null, error })
      return []
    })
  }, [api, classId, safeMemberPage])

  useEffect(() => {
    const controller = new AbortController()
    loadClass({ signal: controller.signal }); loadRoster({ signal: controller.signal })
    return () => controller.abort()
  }, [loadClass, loadRoster])

  if (state.status === 'loading') return <RequestState kind="loading" />
  if (state.status === 'error' || !state.classRecord) return <RequestState kind={state.error instanceof AdminProjectionError ? 'unavailable' : state.error?.status === 404 ? 'notFound' : 'unavailable'} error={state.error} action={<button type="button" onClick={() => loadClass()}>Try again</button>} />
  const classRecord = state.classRecord
  const archived = classRecord.status === 'ARCHIVED'

  const revealCode = async () => {
    setNotice('')
    try { const response = await api.getJoinCode(classId); setJoinCode(projectJoinCode(response.data, classId)) } catch (error) { setNotice(describeApiError(error)) }
  }

  const lifecycle = async (action, reason) => {
    let nextJoinCode = null
    if (action === 'archive') await api.archiveClass(classId, reason)
    else if (action === 'restore') await api.restoreClass(classId, reason)
    else if (action === 'rotate') nextJoinCode = projectJoinCode((await api.rotateJoinCode(classId, reason)).data, classId)
    else if (action === 'revoke') nextJoinCode = projectJoinCode((await api.revokeJoinCode(classId, reason)).data, classId)
    await loadClass()
    if (nextJoinCode) setJoinCode(nextJoinCode)
    setNotice(`Class ${action === 'rotate' ? 'join code rotated' : action === 'revoke' ? 'join code revoked' : action === 'archive' ? 'archived' : 'restored'}.`)
  }

  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Class governance" title={classRecord.className} summary={`${classRecord.section} · ${classRecord.semester} · ${classRecord.schoolYear}`} actions={<Link className="student-outline-action" to="/admin/academic/classes">Back to classes</Link>} />
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    <div className="admin-detail-grid">
      <AdminPanel title="Class record" eyebrow="Authoritative metadata">
        <div className="admin-detail-values"><div className="admin-detail-value"><span>Status</span><strong><StatusBadge label={humanize(classRecord.status)} /></strong></div><div className="admin-detail-value"><span>Instructor</span><strong>{classRecord.instructor.fullName}</strong></div><div className="admin-detail-value"><span>Created</span><strong>{formatDate(classRecord.createdAt)}</strong></div><div className="admin-detail-value"><span>Updated</span><strong>{formatDate(classRecord.updatedAt)}</strong></div></div>
        <div className="admin-action-row">{!archived ? <button type="button" className="student-outline-action" onClick={() => setDialog('metadata')}>Edit metadata</button> : null}<button type="button" className={archived ? 'student-primary-action' : 'admin-danger-outline'} onClick={() => setDialog(archived ? 'restore' : 'archive')}>{archived ? 'Restore class' : 'Archive class'}</button></div>
        <div className="admin-record-links"><Link to={`/admin/academic/activities?classId=${classId}`}>View activities</Link><Link to={`/admin/academic/submissions?classId=${classId}`}>View submissions</Link><Link to={`/admin/academic/project-tasks?classId=${classId}`}>View project tasks</Link></div>
      </AdminPanel>
      <AdminPanel title="Join code" eyebrow="Server-owned secret">
        {!joinCode ? <button type="button" className="student-outline-action" onClick={revealCode}>Reveal join code</button> : joinCode.active ? <div className="admin-join-code"><strong>{joinCode.classCode}</strong><StatusBadge label="Active" /><button type="button" className="student-outline-action" onClick={() => navigator.clipboard?.writeText(joinCode.classCode)}>Copy active code</button></div> : <div className="admin-join-code"><StatusBadge label="Inactive" /><p>The previous code is not usable and is intentionally hidden.</p></div>}
        {!archived ? <div className="admin-action-row"><button type="button" className="student-outline-action" onClick={() => setDialog('rotate')}>Rotate code</button><button type="button" className="admin-danger-outline" onClick={() => setDialog('revoke')}>Revoke code</button></div> : <p className="admin-panel-note">Archived classes are read-only.</p>}
      </AdminPanel>
      <AdminPanel title="Class roster" eyebrow="Detailed administrative projection" className="admin-detail-grid__wide">
        {roster.status === 'loading' && !roster.members.length ? <RequestState kind="loading" compact /> : null}
        {roster.status === 'error' ? <RequestState error={roster.error} compact action={<button type="button" onClick={() => loadRoster()}>Try again</button>} /> : null}
        {roster.status === 'ready' && !roster.members.length ? <RequestState kind="empty" compact message="This class has no membership records." /> : null}
        {roster.members.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Student</th><th>User</th><th>Membership</th><th>History</th><th /></tr></thead><tbody>{roster.members.map((member) => <tr key={member.memberId}><td><strong>{member.fullName}</strong><span>{member.universityEmail}</span></td><td><StatusBadge label={humanize(member.userStatus)} /></td><td><StatusBadge label={humanize(member.membershipStatus)} /></td><td>Joined {formatDate(member.joinedAt)}<span>Last active {formatDate(member.lastActivatedAt)}</span></td><td>{!archived && (member.membershipStatus === 'ACTIVE' || member.membershipStatus === 'REMOVED') ? <button type="button" className="student-outline-action" onClick={() => { setSelectedMember(member); setDialog('member') }}>{member.membershipStatus === 'ACTIVE' ? 'Remove' : 'Reactivate'}</button> : null}</td></tr>)}</tbody></table></div> : null}
        <Paginator pagination={roster.pagination} page={safeMemberPage} onPage={(next) => updateQuery(setSearchParams, searchParams, { memberPage: next })} />
      </AdminPanel>
    </div>
    {dialog === 'metadata' ? <MetadataDialog classRecord={classRecord} api={api} onClose={() => setDialog(null)} onSaved={loadClass} /> : null}
    {['archive', 'restore', 'rotate', 'revoke'].includes(dialog) ? <ReasonDialog title={`${humanize(dialog)} ${dialog === 'rotate' || dialog === 'revoke' ? 'join code' : 'class'}`} summary="This administrative action is recorded with the supplied reason." submitLabel={humanize(dialog)} danger={dialog === 'archive' || dialog === 'revoke'} onClose={() => setDialog(null)} onConfirm={(reason) => lifecycle(dialog, reason)} /> : null}
    {dialog === 'member' && selectedMember ? <MemberDialog classId={classId} member={selectedMember} api={api} onClose={() => { setDialog(null); setSelectedMember(null) }} onRefetch={loadRoster} onUpdated={(updated) => setRoster((current) => ({ ...current, members: current.members.map((member) => member.memberId === updated.memberId ? updated : member) }))} /> : null}
  </div>
}

const ACADEMIC_CONFIG = {
  activities: { title: 'Programming activities', summary: 'Lifecycle, language, deadlines, totals, and aggregate test/submission counts only.', list: 'listAcademicActivities', project: projectAcademicActivity, statuses: ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'], sort: [['createdAt', 'Created'], ['updatedAt', 'Updated'], ['dueDate', 'Deadline'], ['title', 'Title']] },
  submissions: { title: 'Submissions', summary: 'Operational attempt state and released scores only. Source, tests, corrections, and feedback are omitted.', list: 'listAcademicSubmissions', project: projectAcademicSubmission, statuses: ['QUEUED', 'ASSESSING', 'ASSESSED', 'ASSESSMENT_FAILED', 'REVIEWED', 'RELEASED', 'FAILED_RESOLVED'], sort: [['submittedAt', 'Submitted'], ['updatedAt', 'Updated']], noSearch: true },
  'project-tasks': { title: 'Project tasks', summary: 'Lifecycle, deadline, team size, and bounded collaboration counts without instructions.', list: 'listAcademicProjectTasks', project: projectAcademicProjectTask, statuses: ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'], sort: [['createdAt', 'Created'], ['updatedAt', 'Updated'], ['dueDate', 'Deadline'], ['title', 'Title']] },
  repositories: { title: 'Repositories', summary: 'Ownership, lifecycle, review, provisioning, and measured storage metadata without source, Git history, credentials, or feedback.', list: 'listAcademicRepositories', project: projectAcademicRepository, statuses: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], sort: [['createdAt', 'Created'], ['updatedAt', 'Updated'], ['repositoryName', 'Name'], ['storageSizeBytes', 'Measured size']], repositoryTypes: ['CLASS_PROJECT', 'PERSONAL'] },
}

function AcademicRow({ kind, item }) {
  if (kind === 'activities') return <><td><strong>{item.title}</strong><span>{item.class.className} · {item.class.section}</span></td><td><StatusBadge label={humanize(item.status)} /></td><td>{humanize(item.language)}<span>{item.testCaseCount} tests · {item.testCasePointTotal} points</span></td><td>{item.submissionCount} submissions<span>Due {formatDate(item.dueDate)}</span></td></>
  if (kind === 'submissions') return <><td><strong>{item.student.fullName}</strong><span>{item.student.universityEmail}</span></td><td>{item.activity.title}<span>{item.activity.class.className}</span></td><td><StatusBadge label={humanize(item.submissionStatus)} /><span>Attempt {item.attemptNumber}{item.isLate ? ' · Late' : ''}</span></td><td>{item.releasedScore === null ? 'Not released' : `${item.releasedScore} points`}<span>{formatDate(item.submittedAt)}</span></td></>
  if (kind === 'project-tasks') return <><td><strong>{item.title}</strong><span>{item.class.className} · {item.class.section}</span></td><td><StatusBadge label={humanize(item.status)} /></td><td>Max team {item.maxTeamSize}<span>Due {formatDate(item.dueDate)}</span></td><td>{item.counts.repositories ?? 0} repositories<span>{item.counts.teams ?? 0} teams · {item.counts.invitations ?? 0} invitations</span></td></>
  return <><td><strong>{item.repositoryName}</strong><span>{item.repositoryType === 'PERSONAL' ? 'Personal' : item.projectTask?.class.className || 'Class project'}</span></td><td>{item.owner.fullName}<span>{item.owner.universityEmail}</span></td><td><StatusBadge label={humanize(item.status)} /><span>{humanize(item.reviewStatus)}</span></td><td>{humanize(item.storageStatus)}<span>{item.storageSizeBytes === null ? 'Unmeasured' : `${item.storageSizeBytes} bytes measured`}</span></td></>
}

export function AdminAcademicListPage({ kind, api = adminApi }) {
  const config = ACADEMIC_CONFIG[kind]
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageNumber(searchParams)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const sortBy = searchParams.get('sortBy') || config.sort[0][0]
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const repositoryType = searchParams.get('repositoryType') || ''
  const classId = searchParams.get('classId') || ''
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: null })
  const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: config.noSearch ? '' : search, status, sortBy, sortOrder, repositoryType, classId }), [classId, config.noSearch, page, repositoryType, search, sortBy, sortOrder, status])
  const load = useCallback(({ signal } = {}) => {
    return api[config.list](query, { signal }).then((response) => setState({ status: 'ready', items: response.data.map(config.project), pagination: response.pagination, error: null })).catch((error) => { if (error?.name !== 'AbortError') setState({ status: 'error', items: [], pagination: null, error }) })
  }, [api, config, query])
  useEffect(() => { const controller = new AbortController(); load({ signal: controller.signal }); return () => controller.abort() }, [load])
  const submit = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateQuery(setSearchParams, searchParams, { page: 1, search: form.get('search'), status: form.get('status'), sortBy: form.get('sortBy'), sortOrder: form.get('sortOrder'), repositoryType: form.get('repositoryType'), classId: form.get('classId') }) }
  return <div className="admin-page-stack"><AdminPageHeader eyebrow="Read-only academic oversight" title={config.title} summary={config.summary} actions={<Link className="student-outline-action" to="/admin/academic">All academic areas</Link>} /><AdminPanel title={config.title} eyebrow="Safe administrator projection">
    {classId ? <p className="admin-filter-context">Filtered to the selected class record. <Link to={`/admin/academic/${kind}`}>Clear class filter</Link></p> : null}
    <form className="admin-filter-bar admin-filter-bar--wide" onSubmit={submit} key={searchParams.toString()}>{!config.noSearch ? <label className="admin-filter-search">Search<input name="search" defaultValue={search} maxLength="200" /></label> : <input type="hidden" name="search" value="" />}<label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{config.statuses.map((item) => <option key={item}>{item}</option>)}</select></label>{config.repositoryTypes ? <label>Type<select name="repositoryType" defaultValue={repositoryType}><option value="">All types</option>{config.repositoryTypes.map((item) => <option key={item}>{item}</option>)}</select></label> : null}<input type="hidden" name="classId" value={kind === 'repositories' ? '' : classId} /><label>Sort<select name="sortBy" defaultValue={sortBy}>{config.sort.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Order<select name="sortOrder" defaultValue={sortOrder}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label><button className="student-primary-action" type="submit">Apply</button></form>
    {state.status === 'loading' && !state.items.length ? <RequestState kind="loading" compact /> : null}{state.status === 'error' ? <RequestState error={state.error} compact action={<button type="button" onClick={() => load()}>Try again</button>} /> : null}{state.status === 'ready' && !state.items.length ? <RequestState kind="empty" compact message="No records match these filters." /> : null}{state.items.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Record</th><th>{kind === 'repositories' ? 'Owner' : kind === 'submissions' ? 'Activity' : 'Status'}</th><th>State</th><th>Summary</th></tr></thead><tbody>{state.items.map((item) => <tr key={item.activityId ?? item.submissionId ?? item.projectTaskId ?? item.repositoryId}><AcademicRow kind={kind} item={item} /></tr>)}</tbody></table></div> : null}<Paginator pagination={state.pagination} page={page} onPage={(next) => updateQuery(setSearchParams, searchParams, { page: next })} />
  </AdminPanel></div>
}
