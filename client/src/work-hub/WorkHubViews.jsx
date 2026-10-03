import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { apiClient, describeApiError } from '../api/api-client.js'
import { classHref, classOfferingLabel } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'

const pageSize = 20

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function recordLink(view, item) {
  if (view === 'todo') return item.kind === 'activity'
    ? classHref(`/student/activity/${item.id}`, item.class.id)
    : classHref(`/student/projects/${item.id}`, item.class.id)
  if (view === 'submissions') return classHref(`/student/activity/${item.activityId}/submissions/${item.id}`, item.class.id)
  if (item.kind === 'submission') return classHref(`/instructor/activity/${item.activityId}/submissions/${item.id}`, item.class.id)
  return classHref(`/instructor/projects/${item.projectTaskId}/repositories/${item.id}`, item.class.id)
}

function rowSummary(view, item) {
  if (view === 'todo') return `${item.kind === 'activity' ? 'Programming activity' : 'Project task'} · ${item.dueState} · Due ${formatDate(item.dueDate)}${item.kind === 'activity' && item.hasSubmission ? ' · Attempt submitted' : ''}${item.kind === 'project' && item.hasTeam ? ' · On a team' : ''}`
  if (view === 'submissions') return `Attempt ${item.attemptNumber} · ${item.status.replaceAll('_', ' ')} · Submitted ${formatDate(item.submittedAt)}${item.status === 'released' ? ` · Released score ${item.finalScore}/${item.totalPoints}` : ' · Result pending release'}`
  return `${item.kind === 'submission' ? `Student: ${item.student.fullName}` : 'Project repository'} · ${item.action}`
}

export function WorkHubList({ view }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [state, setState] = useState({ key: null, status: 'loading', rows: [], pagination: null, error: null })
  const [refresh, setRefresh] = useState(0)
  const endpoint = view === 'todo' ? '/work-hub/student/todo' : view === 'submissions' ? '/work-hub/student/submissions' : '/work-hub/instructor/review-queue'
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (submittedSearch) params.set('search', submittedSearch)
  if (filter !== 'all') params.set(view === 'todo' ? 'due' : view === 'submissions' ? 'status' : 'kind', filter)
  const requestKey = `${endpoint}?${params}#${refresh}`
  const current = state.key === requestKey ? state : { status: 'loading', rows: [], pagination: null, error: null }

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get(requestKey.split('#')[0], { signal: controller.signal })
      .then((result) => setState({ key: requestKey, status: 'ready', rows: result.data, pagination: result.pagination, error: null }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setState({ key: requestKey, status: 'error', rows: [], pagination: null, error })
      })
    return () => controller.abort()
  }, [requestKey])

  const options = view === 'todo'
    ? [['all', 'All deadlines'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue']]
    : view === 'submissions'
      ? [['all', 'All statuses'], ['QUEUED', 'Queued'], ['ASSESSING', 'Assessing'], ['ASSESSED', 'Assessed'], ['ASSESSMENT_FAILED', 'Assessment failed'], ['REVIEWED', 'Reviewed'], ['RELEASED', 'Released'], ['FAILED_RESOLVED', 'Failure resolved']]
      : [['all', 'All reviews'], ['submission', 'Submissions'], ['repository', 'Repositories']]

  return (
    <section className="student-global-panel work-hub-panel">
      <form className="work-hub-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()) }}>
        <label>Search titles<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} /></label>
        <label>Filter<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit" className="student-outline-action">Search</button>
        <button type="button" className="student-outline-action" onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
      </form>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading current academic work." />}
      {current.status === 'error' && <div role="alert"><p>{describeApiError(current.error)}</p><button type="button" className="student-outline-action" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
      {current.status === 'ready' && current.rows.length === 0 && <RequestState kind="empty" compact message="No records match these filters." />}
      {current.status === 'ready' && <ul className="work-hub-list">{current.rows.map((item) => (
        <li key={`${item.kind || 'submission'}-${item.id}`}>
          <div><strong>{item.title || item.activityTitle}</strong><span>{item.class.className} · {classOfferingLabel(item.class)}</span><small>{rowSummary(view, item)}</small></div>
          <NavLink to={recordLink(view, item)}>Open record</NavLink>
        </li>
      ))}</ul>}
      {current.status === 'ready' && current.pagination && <nav className="work-hub-pages" aria-label="Work list pages"><button type="button" disabled={!current.pagination.hasPreviousPage} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {current.pagination.page} of {Math.max(1, current.pagination.totalPages)} · {current.pagination.totalItems} records</span><button type="button" disabled={!current.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    </section>
  )
}
