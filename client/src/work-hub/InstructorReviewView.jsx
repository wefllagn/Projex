import { useEffect, useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import WorkHubState from './WorkHubState.jsx'
import OutlinedSelect from '../components/OutlinedSelect.jsx'
import useAutomaticRefresh from '../components/useAutomaticRefresh.js'
import { deadlineGroup } from './todo-grouping.js'

function ProjectReviewLinks({ classId }) {
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ status: 'loading', rows: [], pagination: null })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    apiClient.get(`/work-hub/instructor/review-queue?kind=repository&page=${page}&pageSize=20${classId ? `&classId=${encodeURIComponent(classId)}` : ''}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ status: 'ready', rows: result.data, pagination: result.pagination }) })
      .catch(error => { if (!controller.signal.aborted) setState({ status: 'error', rows: [], error }) })
    return () => controller.abort()
  }, [page, revision, classId])
  return <section className="academic-project-reviews"><h2><ProjexIcon name="project" size={20} />Project repositories</h2>
    {state.status === 'loading' && <WorkHubState kind="loading" message="Loading Project reviews…" />}
    {state.status === 'error' && <WorkHubState kind="error" error={state.error} onRetry={() => setRevision(value => value + 1)} />}
    {state.status === 'ready' && !state.rows.length && <p>No Project repositories are waiting for review.</p>}
    <ul>{state.rows.map(item => <li key={item.id}><NavLink to={classHref(`/instructor/projects/${item.projectTaskId}/repositories/${item.id}`, item.class.id)}><ProjexIcon name="project" /><span><strong>{item.title}</strong><small>{item.class.className} · Ready for review</small></span><ProjexIcon name="chevronRight" size={16} /></NavLink></li>)}</ul>
    {state.pagination?.totalPages > 1 && <nav aria-label="Project review pages"><button type="button" className="student-outline-action" disabled={!state.pagination.hasPreviousPage} onClick={() => setPage(value => value - 1)}>Previous Projects</button><span>Page {state.pagination.page} of {state.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!state.pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Next Projects</button></nav>}
  </section>
}

export default function InstructorReviewView({ classes = [], moreClasses = false, onMoreClasses }) {
  const [params, setParams] = useSearchParams()
  const selected = params.get('tab') === 'reviewed' ? 'reviewed' : 'to-review'
  const classId = params.get('classId') || ''
  const page = Math.max(1, Math.min(50, Math.trunc(Number(params.get('page'))) || 1))
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ endpoint: '', key: '', status: 'loading', rows: [], pagination: null })
  const query = new URLSearchParams({ page: String(page), pageSize: '20', state: selected })
  if (classId) query.set('classId', classId)
  const endpoint = `/work-hub/instructor/review-activities?${query}`
  const key = endpoint + '#' + revision
  const current = state.endpoint === endpoint ? state : { status: 'loading', rows: [], pagination: null }
  useEffect(() => {
    const controller = new AbortController()
    apiClient.get(endpoint, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ endpoint, key, status: 'ready', rows: result.data, pagination: result.pagination }) })
      .catch(error => { if (!controller.signal.aborted) setState({ endpoint, key, status: 'error', rows: [], error, pagination: null }) })
    return () => controller.abort()
  }, [endpoint, key])
  useAutomaticRefresh(() => setRevision(value => value + 1), { enabled: current.status !== 'loading' && state.key === key })
  const update = values => {
    const next = new URLSearchParams(params)
    for (const [name,value] of Object.entries(values)) { if (value) next.set(name,String(value)); else next.delete(name) }
    setParams(next)
  }
  const grouped = new Map()
  for (const item of current.rows) {
    const group = deadlineGroup(item.dueDate)
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group).push(item)
  }
  return <section className="academic-review academic-work-panel" aria-busy={state.key !== key}>
    <nav className="academic-todo-tabs" aria-label="Review views">{[['to-review','To review'],['reviewed','Reviewed']].map(([value,label]) => {
      const next = new URLSearchParams(params); next.set('tab',value); next.delete('page')
      return <Link key={value} className={selected === value ? 'is-active' : ''} aria-current={selected === value ? 'page' : undefined} to={`?${next}`}><ProjexIcon name={value === 'reviewed' ? 'published' : 'review'} size={18} />{label}</Link>
    })}</nav>
    <div className="academic-review-toolbar"><OutlinedSelect label="Filter by class" value={classId} onChange={value => update({ classId: value, page: null })} options={[{ value: '', label: 'All classes' }, ...(classId && !classes.some(item => item.id === classId && item.status === 'ACTIVE') ? [{ value: classId, label: 'Selected class' }] : []), ...classes.filter(item => item.status === 'ACTIVE').map(item => ({ value: item.id, label: `${item.className}${item.section ? ` · ${item.section}` : ''}` }))]} />{moreClasses && <button type="button" className="student-outline-action" onClick={onMoreClasses}>More classes</button>}<span className="academic-list-count">{current.status === 'ready' ? `${current.pagination?.totalItems ?? current.rows.length} Activities` : ''}</span></div>
    {current.status === 'loading' && <WorkHubState kind="loading" message="Loading Activities for review." />}
    {current.status === 'error' && <WorkHubState kind="error" error={current.error} onRetry={() => setRevision(value => value + 1)} />}
    {current.status === 'ready' && !current.rows.length && <WorkHubState kind="empty" message={selected === 'reviewed' ? 'No fully reviewed Activities.' : 'No Activities to review.'} />}
    {current.status === 'ready' && [...grouped].map(([group,items]) => <details className="academic-review-group" key={group} open><summary>{group}<span>{items.length}</span><ProjexIcon name="expand" size={16} /></summary><ul>{items.map(item => <li key={item.id}>
      <NavLink className="academic-review-row" to={classHref(`/instructor/activity/${item.id}/submissions`, item.class.id)}>
        <ProjexIcon name="activity" size={22} />
        <span className="academic-review-identity"><strong>{item.title}</strong><small>{item.class.className}{item.class.section ? ` · ${item.class.section}` : ''} · {item.gradingMode === 'COMPLETION' ? 'Ungraded' : 'Graded'}</small><small>Due {new Date(item.dueDate).toLocaleString(undefined,{ dateStyle:'medium',timeStyle:'short' })} · {item.releasedAttempts} released {item.releasedAttempts === 1 ? 'attempt' : 'attempts'}</small></span>
        <span className="academic-review-counts"><span><strong>{item.submittedAttempts}</strong><small>Submitted attempts</small></span><span><strong>{item.assignedStudents}</strong><small>Assigned students</small></span><span><strong>{item.reviewedAttempts}</strong><small>Reviewed attempts</small></span></span>
        <ProjexIcon name="chevronRight" size={18} />
      </NavLink>
    </li>)}</ul></details>)}
    {current.pagination?.totalPages > 1 && <nav className="academic-todo-pagination" aria-label="Activity review pages"><button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => update({ page:page-1 })}>Previous</button><span>Page {current.pagination.page} of {current.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => update({ page:page+1 })}>Next</button></nav>}
    {selected === 'to-review' && <ProjectReviewLinks key={classId} classId={classId} />}
  </section>
}
