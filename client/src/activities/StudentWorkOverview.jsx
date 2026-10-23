import UserAvatar from '../components/UserAvatar.jsx'
import { useEffect, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { ApiError, apiClient, describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import AcademicEmptyState from '../components/AcademicEmptyState.jsx'
import useAutomaticRefresh from '../components/useAutomaticRefresh.js'

const filters = [['all', 'All'], ['assigned', 'Assigned'], ['missing', 'Missing'], ['done', 'Submitted']]
export default function StudentWorkOverview({ client = apiClient }) {
  const { user } = useAuth()
  const { selectedClass } = useClasses()
  const [params, setParams] = useSearchParams()
  const filter = filters.some(([value]) => value === params.get('task')) ? params.get('task') : 'all'
  const page = Math.max(1, Math.min(50, Math.trunc(Number(params.get('workPage'))) || 1))
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ endpoint: '', rows: [], status: 'loading' })
  const classId = selectedClass?.id
  const query = new URLSearchParams({ classId: classId || '', kind: 'activity', state: filter, page: String(page), pageSize: '20' })
  const endpoint = `/work-hub/student/todo?${query}`
  const current = state.endpoint === endpoint ? state : { status: 'loading', rows: [] }
  useEffect(() => {
    if (!classId) return undefined
    const controller = new AbortController()
    client.get(endpoint, { signal: controller.signal }).then(result => {
      if (result.data.some(item => item.kind !== 'activity' || item.class?.id !== classId)) throw new ApiError({ status: 502, code: 'INVALID_API_RESPONSE', message: 'The work list does not match this class.' })
      if (!controller.signal.aborted) setState({ endpoint, rows: result.data, pagination: result.pagination, status: 'ready' })
    }).catch(error => { if (!controller.signal.aborted) setState({ endpoint, rows: [], status: 'error', error }) })
    return () => controller.abort()
  }, [classId, client, endpoint, revision])
  useAutomaticRefresh(() => setRevision(value => value + 1), { enabled: current.status === 'ready' })
  const update = values => { const next = new URLSearchParams(params); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, String(value)); else next.delete(key) } setParams(next) }
  return <section className="academic-your-work">
    <NavLink className="student-back-link" to={classHref('/student/activity', classId)}>Back to Classwork</NavLink>
    <header><UserAvatar /><div><h2>{user.fullName}</h2><p>Your work · {selectedClass?.className}</p></div></header>
    <div className="academic-your-work-toolbar"><label>Task filter<select value={filter} onChange={event => update({ task: event.target.value, workPage: null })}>{filters.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{current.status === 'ready' && <span>{current.pagination?.totalItems ?? current.rows.length} Activities</span>}</div>
    {current.status === 'loading' && <p role="status">Loading your work…</p>}
    {current.status === 'error' && <div role="alert"><p>{current.error?.code === 'INVALID_API_RESPONSE' ? 'The work list does not match this class.' : describeApiError(current.error)}</p><button className="student-outline-action" type="button" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
    {current.status === 'ready' && !current.rows.length && <AcademicEmptyState icon="submission" title="No work to show" description="Activities matching this filter will appear here." />}
    <ul>{current.rows.map(item => <li key={item.id}><NavLink to={classHref(`/student/activity/${item.id}`, classId)}><span className="academic-row-icon"><ProjexIcon name="activity" size={24} /></span><span><strong>{item.title}</strong><small>{item.dueDate ? `Due ${new Date(item.dueDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'No due date'}</small></span><span className={`academic-work-state is-${item.workState}`}>{item.workState === 'done' ? 'Submitted' : item.workState === 'missing' ? 'Missing' : 'Assigned'}</span><ProjexIcon name="chevronRight" size={18} /></NavLink></li>)}</ul>
    {current.pagination?.totalPages > 1 && <nav className="academic-todo-pagination" aria-label="Your work pages"><button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => update({ workPage: page - 1 })}>Previous</button><span>Page {page} of {current.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => update({ workPage: page + 1 })}>Next</button></nav>}
  </section>
}
