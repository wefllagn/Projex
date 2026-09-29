import { useCallback, useEffect, useRef, useState } from 'react'
import RequestState from '../components/RequestState.jsx'
import { formatProjectDate } from '../projects/project-projections.js'
import { repositoryActivityProjection, repositoryContributionProjection } from './repository-projections.js'

export function RepositoryActivityPanel({ repositoryId, api }) {
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ status: 'loading', events: [], contributions: [], pagination: null, error: null })
  const latestRequest = useRef(0)

  const load = useCallback(async ({ signal } = {}) => {
    const request = ++latestRequest.current
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const response = await api.listRecordedActivity(repositoryId, { page, pageSize: 20 }, { signal })
      if (signal?.aborted || request !== latestRequest.current) return
      const data = response.data
      if (data?.repositoryId !== repositoryId || !Array.isArray(data.events) || !Array.isArray(data.contributions) || data.pagination?.page !== page) {
        throw new Error('The repository activity response did not match this record.')
      }
      const events = data.events.map(repositoryActivityProjection)
      const contributions = data.contributions.map(repositoryContributionProjection)
      if (events.some((item) => !item) || contributions.some((item) => !item)) throw new Error('The repository activity response was incomplete.')
      setState({ status: 'ready', events, contributions, pagination: data.pagination, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError' && !signal?.aborted && request === latestRequest.current) setState({ status: 'error', events: [], contributions: [], pagination: null, error })
    }
  }, [api, page, repositoryId])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  return (
    <section className="student-repo-card repository-activity-panel">
      <div className="student-side-card-heading"><h2>Recorded Repository Activity</h2><button type="button" className="student-outline-action" onClick={() => load()}>Refresh</button></div>
      <p>These are server-recorded provisioning and accepted push operations. Push counts identify authenticated Projex users, not Git commit authors or code contributions.</p>
      {state.status === 'loading' && <RequestState kind="loading" compact message="Loading recorded activity." />}
      {state.status === 'error' && <RequestState kind="unavailable" compact error={state.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {state.status === 'ready' && <>
        {state.events.length === 0 ? <RequestState kind="empty" compact message="No supported repository operations have been recorded yet." /> : <ul className="repository-activity-list">{state.events.map((event) => <li key={event.id}><strong>{event.activityType === 'PUSH' ? 'Accepted push' : 'Repository provisioned'}</strong><span>{event.actor?.fullName || 'Projex system'}</span><time dateTime={event.activityAt}>{formatProjectDate(event.activityAt)}</time></li>)}</ul>}
        {state.pagination?.totalPages > 1 && <nav className="activity-pagination" aria-label="Repository activity pages"><button type="button" className="student-outline-action" disabled={!state.pagination.hasPreviousPage} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {state.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!state.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
        <h3>Accepted pushes by user</h3>
        {state.contributions.length === 0 ? <p>No authenticated pushes have been recorded.</p> : <ul className="repository-activity-list">{state.contributions.map((item) => <li key={item.userId}><strong>{item.fullName}</strong><span>{item.acceptedPushes} accepted {item.acceptedPushes === 1 ? 'push' : 'pushes'}</span></li>)}</ul>}
      </>}
    </section>
  )
}
