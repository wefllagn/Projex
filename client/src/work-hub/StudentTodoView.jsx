import useAutomaticRefresh from '../components/useAutomaticRefresh.js'
import { deadlineGroup } from './todo-grouping.js'
import { useEffect, useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { apiClient, describeApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import RequestState from '../components/RequestState.jsx'

const views = [['assigned', 'Assigned'], ['missing', 'Missing'], ['done', 'Done']]
const emptyCopy = { assigned: 'No assigned work.', missing: 'No missing work.', done: 'No completed work yet.' }

export default function StudentTodoView({ classes = [], moreClasses = false, onMoreClasses }) {
  const [params, setParams] = useSearchParams()
  const selected = views.some(([value]) => value === params.get('tab')) ? params.get('tab') : 'assigned'
  const classId = params.get('classId') || ''
  const page = Math.max(1, Math.min(50, Math.trunc(Number(params.get('page'))) || 1))
  const search = params.get('search') || ''
  const [draft, setDraft] = useState({ key: search, value: search })
  const draftSearch = draft.key === search ? draft.value : search
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ key: '', endpoint: '', status: 'loading', rows: [], pagination: null })
  const query = new URLSearchParams({ page: String(page), pageSize: '20', state: selected })
  if (classId) query.set('classId', classId)
  if (search) query.set('search', search)
  const endpoint = `/work-hub/student/todo?${query}`
  const key = `${endpoint}#${revision}`
  const current = state.endpoint === endpoint ? state : { status: 'loading', rows: [], pagination: null }
  useEffect(() => {
    const controller = new AbortController()
    apiClient.get(endpoint, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ key, endpoint, status: 'ready', rows: result.data, pagination: result.pagination }) })
      .catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setState({ key, endpoint, status: 'error', rows: [], pagination: null, error }) })
    return () => controller.abort()
  }, [endpoint, key])
  const update = values => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(values)) { if (value) next.set(name, String(value)); else next.delete(name) }
    setParams(next)
  }
  useEffect(() => {
    if (draftSearch.trim() === search) return undefined
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (draftSearch.trim()) next.set('search', draftSearch.trim()); else next.delete('search')
      next.delete('page')
      setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [draftSearch, search, params, setParams])
  useAutomaticRefresh(() => setRevision(value => value + 1), { enabled: current.status !== 'loading' && state.key === key })
  const grouped = new Map()
  for (const item of [...current.rows].sort((a, b) => (Date.parse(a.dueDate) || 0) - (Date.parse(b.dueDate) || 0) || a.id.localeCompare(b.id))) {
    const group = deadlineGroup(item.dueDate)
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group).push(item)
  }
  return <section className="academic-todo" aria-busy={state.key !== key}>
    <nav className="academic-todo-tabs" aria-label="To-do views">
      {views.map(([value, label]) => {
        const target = new URLSearchParams(params); target.set('tab', value); target.delete('page')
        return <Link key={value} to={`?${target}`} aria-current={selected === value ? 'page' : undefined} className={selected === value ? 'is-active' : ''}>{label}</Link>
      })}
    </nav>
    <div className="academic-todo-content">
      <div className="academic-todo-toolbar">
        <select aria-label="Filter by class" value={classId} onChange={event => update({ classId: event.target.value, page: null })}>
          <option value="">All classes</option>
          {classId && !classes.some(item => item.id === classId && item.status === 'ACTIVE') && <option value={classId}>Selected class</option>}
          {classes.filter(item => item.status === 'ACTIVE').map(item => <option key={item.id} value={item.id}>{item.className}{item.section ? ` · ${item.section}` : ''}</option>)}
        </select>
        {moreClasses && <button type="button" className="student-outline-action" onClick={onMoreClasses}>More classes</button>}
        <form className="academic-todo-search" onSubmit={event => { event.preventDefault(); update({ search: draftSearch.trim(), page: null }) }}>
          <input type="search" aria-label="Search work" value={draftSearch} onChange={event => setDraft({ key: search, value: event.target.value })} placeholder="Search work…" maxLength={100} />
        </form>
      </div>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading work…" />}
      {current.status === 'error' && <div role="alert"><p>{describeApiError(current.error)}</p><button type="button" className="student-outline-action" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
      {current.status === 'ready' && !current.rows.length && <RequestState kind="empty" compact message={emptyCopy[selected]} />}
      {current.status === 'ready' && [...grouped].map(([heading, rows]) => <section className="academic-todo-group" key={heading}>
        <h2>{heading}</h2>
        <ul>{rows.map(item => <li key={`${item.kind}-${item.id}`}>
          <NavLink className="academic-todo-row" to={classHref(item.kind === 'project' ? `/student/projects/${item.id}` : `/student/activity/${item.id}`, item.class.id)}>
            <span className="academic-row-icon"><ProjexIcon name={item.kind === 'project' ? 'project' : 'activity'} size={24} /></span>
            <span className="academic-todo-identity"><strong>{item.title}</strong><small>{item.class.className}{item.class.section ? ` · ${item.class.section}` : ''}</small>{item.gradingMode === 'COMPLETION' && <small>Ungraded{item.completionState === 'COMPLETE' ? ' · Complete' : ''}</small>}</span>
            <time className={selected === 'missing' ? 'is-missing' : ''} dateTime={item.dueDate}>{item.dueDate ? new Date(item.dueDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No due date'}</time>
            <ProjexIcon name="chevronRight" size={18} />
          </NavLink>
        </li>)}</ul>
      </section>)}
      {current.status === 'ready' && current.pagination?.totalPages > 1 && <nav className="academic-todo-pagination" aria-label="To-do pages">
        <button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => update({ page: page - 1 })}>Previous</button>
        <span>Page {current.pagination.page} of {current.pagination.totalPages}</span>
        <button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => update({ page: page + 1 })}>Next</button>
      </nav>}
    </div>
  </section>
}
