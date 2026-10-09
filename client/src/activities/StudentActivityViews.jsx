import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { repositoryApi } from '../repositories/repository-api.js'
import { isProvisioning, repositoryProjection } from '../repositories/repository-projections.js'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import { activityApi } from './activity-api.js'
import { submissionApi } from '../submissions/submission-api.js'
import { projectStudentAttemptState } from '../submissions/submission-projections.js'
import {
  activityClassMatches,
  formatActivityDate,
  formatActivityStatus,
} from './activity-utils.js'

const FIRST_PAGE = { page: 1, pageSize: 20 }

function contextMismatchError() {
  return new ApiError({
    status: 404,
    code: 'ACTIVITY_NOT_FOUND',
    message: 'The activity is not available in the selected class.',
  })
}

function activityWorkspaceContextError() {
  return new ApiError({
    status: 502,
    code: 'INVALID_API_RESPONSE',
    message: 'Projex returned a mismatched Activity Workspace record.',
  })
}

function ActivityGitWorkspaceCard({ activity, api, classId }) {
  const capabilities = useCapabilities()
  const createLock = useRef(false)
  const refreshLock = useRef(false)
  const [state, setState] = useState({ identity: null, status: 'loading', repository: null, error: null })
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pollingStopped, setPollingStopped] = useState(false)

  const projectRepository = useCallback((raw) => {
    const repository = repositoryProjection(raw)
    if (!repository.id || repository.repositoryType !== 'ACTIVITY_WORKSPACE' || repository.activityId !== activity.id) {
      throw activityWorkspaceContextError()
    }
    return repository
  }, [activity.id])

  const applyRepository = useCallback((raw) => {
    const repository = projectRepository(raw)
    setState({ identity: activity.id, status: 'ready', repository, error: null })
    return repository
  }, [activity.id, projectRepository])

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.getActivityWorkspace(activity.id, { signal })
      const repository = applyRepository(response.data)
      if (!isProvisioning(repository.storageStatus)) setPollingStopped(false)
    } catch (error) {
      if (error?.name === 'AbortError') return
      if (error?.status === 404) {
        setState({ identity: activity.id, status: 'not-created', repository: null, error: null })
        setPollingStopped(false)
      } else {
        setState((current) => ({
          identity: activity.id,
          status: current.repository ? 'ready' : 'error',
          repository: current.repository,
          error,
        }))
      }
    }
  }, [activity.id, api, applyRepository])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const current = state.identity === activity.id
    ? state
    : { identity: activity.id, status: 'loading', repository: null, error: null }
  const provisioning = Boolean(current.repository && isProvisioning(current.repository.storageStatus))

  useBoundedPolling({
    identity: activity.id,
    active: provisioning && !pollingStopped,
    load: (identity, options) => api.getActivityWorkspace(identity, options),
    onData: (response) => isProvisioning(applyRepository(response.data).storageStatus),
    onError: (error) => {
      setState((value) => ({ ...value, error }))
      setPollingStopped(true)
    },
    onBoundedStop: () => setPollingStopped(true),
    maximumDurationMs: 60_000,
  })

  const refreshStatus = async () => {
    if (refreshLock.current) return
    refreshLock.current = true
    setRefreshing(true)
    setState((currentState) => ({ ...currentState, error: null }))
    try {
      const response = await api.getActivityWorkspace(activity.id)
      const repository = applyRepository(response.data)
      setPollingStopped(!isProvisioning(repository.storageStatus))
    } catch (error) {
      if (error?.status === 404) {
        setState({ identity: activity.id, status: 'not-created', repository: null, error: null })
      } else {
        setState((currentState) => ({ ...currentState, error }))
      }
      setPollingStopped(true)
    } finally {
      refreshLock.current = false
      setRefreshing(false)
    }
  }

  const createRepository = async () => {
    if (createLock.current) return
    createLock.current = true
    setCreating(true)
    setState((currentState) => ({ ...currentState, error: null }))
    try {
      const response = await api.createActivityWorkspace(activity.id)
      applyRepository(response.data)
      setPollingStopped(false)
    } catch (error) {
      setState((currentState) => ({ ...currentState, error }))
    } finally {
      createLock.current = false
      setCreating(false)
    }
  }

  const activityOpen = activity.status === 'PUBLISHED' && activity.dueState === 'OPEN'
  const canCreate = activityOpen && capabilities.git.provisioning
  const repository = current.repository
  const repositoryPath = repository ? classHref(`/student/repositories/${repository.id}`, classId) : ''
  const localGitPath = repository ? classHref(`/student/repositories/${repository.id}?git=local`, classId) : ''
  const unavailable = repository && ['FAILED', 'QUARANTINED'].includes(repository.storageStatus)

  return (
    <section className="student-work-card activity-git-workspace-card" aria-live="polite">
      <div className="student-work-card__header"><h2>Git Workspace</h2>{repository && <span className="student-work-status">{repository.storageStatus === 'READY' ? 'Ready' : unavailable ? 'Unavailable' : 'Provisioning'}</span>}</div>
      <p>Save and continue unfinished work using Git.</p>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Checking your Git Workspace." />}
      {current.status === 'error' && <RequestState kind="unavailable" compact title="Git Workspace unavailable" error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {current.status === 'not-created' && (
        <>
          <dl className="activity-git-workspace-facts"><div><dt>Repository</dt><dd>Not created</dd></div></dl>
          {canCreate
            ? <button type="button" className="student-primary-action" disabled={creating} onClick={createRepository}>{creating ? 'Creating…' : 'Create repository'}</button>
            : <p className="activity-lifecycle-note">A repository can be created only while this Activity is published, open, and Git provisioning is available.</p>}
        </>
      )}
      {repository && provisioning && (
        <>
          <dl className="activity-git-workspace-facts"><div><dt>Repository</dt><dd>Provisioning</dd></div></dl>
          <p>Projex is preparing your private Git workspace.</p>
          {!pollingStopped && <small>Checking status without overlapping requests…</small>}
          {pollingStopped && <button type="button" className="student-outline-action" disabled={refreshing} onClick={refreshStatus}>{refreshing ? 'Refreshing…' : 'Refresh status'}</button>}
        </>
      )}
      {repository?.storageStatus === 'READY' && (
        <>
          <dl className="activity-git-workspace-facts">
            <div><dt>Repository</dt><dd>Ready</dd></div>
            <div><dt>Branch</dt><dd>{repository.defaultBranch}</dd></div>
            <div><dt>Visibility</dt><dd>Private</dd></div>
          </dl>
          {!activityOpen && <p className="activity-git-read-only">Activity closed — repository is read-only.</p>}
          <div className="activity-git-workspace-actions">
            <NavLink to={localGitPath} className="student-primary-action">Get Git credentials</NavLink>
            <NavLink to={repositoryPath} className="student-outline-action">Browse repository</NavLink>
          </div>
        </>
      )}
      {unavailable && (
        <>
          <RequestState kind="unavailable" compact title="Git Workspace unavailable" message="Repository storage is unavailable. Internal worker and storage details are not shown." />
          <button type="button" className="student-outline-action" onClick={() => load()}>Refresh status</button>
        </>
      )}
      {current.error && current.status !== 'error' && <p className="activity-action-error">The latest Git Workspace status could not be loaded. Refresh to try again.</p>}
      <p className="activity-git-submission-warning">Git push saves your work. It does not submit the Activity.</p>
    </section>
  )
}

function StudentActivityRow({ activity, classId }) {
  const dueTone = activity.dueState === 'OPEN' ? 'not-submitted' : 'submitted'
  return (
    <article className="student-assignment-row student-assignment-row--activity">
      <div className="student-assignment-type">
        <span className="student-todo-icon student-todo-icon--activity" aria-hidden="true" />
        <strong>Activity</strong>
      </div>
      <div>
        <h2>{activity.title}</h2>
        <p>{activity.instructions}</p>
        <small>Posted {formatActivityDate(activity.publishedAt || activity.createdAt)}</small>
      </div>
      <div className="student-assignment-due">
        <span>Due {formatActivityDate(activity.dueDate)}</span>
        <em className={`student-assignment-status student-assignment-status--${dueTone}`}>
          {formatActivityStatus(activity.dueState)}
        </em>
      </div>
      <NavLink to={classHref(`/student/activity/${activity.id}`, classId)} className="student-assignment-action">
        View details
      </NavLink>
    </article>
  )
}

export function StudentActivityList({ api = activityApi }) {
  const { selectedClass, selectionStatus } = useClasses()
  const [query, setQuery] = useState({ ...FIRST_PAGE, status: '' })
  const [state, setState] = useState({ classId: null, status: 'idle', items: [], pagination: null, error: null })

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass) return
    try {
      const response = await api.listActivities(selectedClass.id, query, { signal })
      if (response.data.some((activity) => !activityClassMatches(activity, selectedClass))) throw contextMismatchError()
      setState({ classId: selectedClass.id, status: 'ready', items: response.data, pagination: response.pagination, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setState({ classId: selectedClass.id, status: 'error', items: [], pagination: null, error })
      }
    }
  }, [api, query, selectedClass])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const current = state.classId === selectedClass?.id ? state : { ...state, status: 'loading', items: [] }
  const setPage = (page) => setQuery((value) => ({ ...value, page }))

  return (
    <div className="student-assignment-board">
      <section className="student-assignment-stats" aria-label="Activity overview">
        <article className="student-dashboard-stat student-assignment-stat">
          <span className="student-dashboard-stat-icon student-dashboard-stat-icon--blue" aria-hidden="true" />
          <div><span>Activities</span><strong>{current.pagination?.totalItems ?? current.items.length}</strong><small>authorized records</small></div>
        </article>
        <article className="student-dashboard-stat student-assignment-stat">
          <span className="student-dashboard-stat-icon student-dashboard-stat-icon--orange" aria-hidden="true" />
          <div><span>Open</span><strong>{current.items.filter((item) => item.dueState === 'OPEN').length}</strong><small>on this page</small></div>
        </article>
        <article className="student-dashboard-stat student-assignment-stat">
          <span className="student-dashboard-stat-icon student-dashboard-stat-icon--purple" aria-hidden="true" />
          <div><span>Closed</span><strong>{current.items.filter((item) => item.status === 'CLOSED').length}</strong><small>on this page</small></div>
        </article>
      </section>

      <section className="student-assignment-panel student-assignment-panel--board">
        <div className="student-assignment-toolbar student-assignment-toolbar--board">
          <div>
            <strong>Programming Activities</strong>
            <p>Repository-backed activities for {selectedClass?.className}.</p>
          </div>
          <label className="student-sort-control">
            Status
            <select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}>
              <option value="">Published and closed</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </div>

        {current.status === 'loading' && <RequestState kind="loading" compact message="Loading programming activities." />}
        {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
        {current.status === 'ready' && current.items.length === 0 && <RequestState kind="empty" compact message="No programming activities match this view." />}
        {current.status === 'ready' && current.items.length > 0 && (
          <div className="student-assignment-list">
            {current.items.map((activity) => <StudentActivityRow activity={activity} classId={selectedClass.id} key={activity.id} />)}
          </div>
        )}
        {current.pagination && current.pagination.totalPages > 1 && (
          <nav className="activity-pagination" aria-label="Activity pages">
            <button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => setPage(current.pagination.page - 1)}>Previous</button>
            <span>Page {current.pagination.page} of {current.pagination.totalPages}</span>
            <button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => setPage(current.pagination.page + 1)}>Next</button>
          </nav>
        )}
      </section>
    </div>
  )
}

export function StudentActivityDetail({ api = activityApi, submissions = submissionApi, repositories = repositoryApi }) {
  const { activityId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, testCases: [], attemptState: null, error: null })

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId) return
    const key = `${selectedClass.id}:${activityId}`
    try {
      const [activityResponse, testCaseResponse, attemptStateResponse] = await Promise.all([
        api.getActivity(activityId, { signal }),
        api.listTestCases(activityId, { page: 1, pageSize: 50 }, { signal }),
        submissions.getAttemptState(activityId, { signal }),
      ])
      if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
      const attemptState = projectStudentAttemptState(attemptStateResponse.data)
      if (attemptState.activityId !== activityId) throw contextMismatchError()
      setState({
        key,
        status: 'ready',
        activity: activityResponse.data,
        testCases: testCaseResponse.data.filter((testCase) => testCase.isHidden !== true),
        attemptState,
        error: null,
      })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, testCases: [], attemptState: null, error })
    }
  }, [activityId, api, selectedClass, submissions])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const key = `${selectedClass?.id}:${activityId}`
  const current = state.key === key ? state : { ...state, status: 'loading', activity: null, testCases: [], attemptState: null }

  if (current.status === 'loading') return <RequestState kind="loading" message="Loading the selected activity." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : current.error?.status === 403 ? 'forbidden' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.activity) return null

  const activity = current.activity
  const attemptState = current.attemptState
  return (
    <div className="student-detail-layout student-project-detail-layout">
      <main className="student-activity-detail-card">
        <NavLink to={classHref('/student/activity', selectedClass.id)} className="student-back-link">Back to Activities</NavLink>
        <article className="student-detail-card">
          <div className="student-detail-heading">
            <span className="student-detail-icon" aria-hidden="true" />
            <div>
              <h2>{activity.title}</h2>
              <p><span>{activity.createdBy.fullName}</span><span>{formatActivityStatus(activity.status)}</span></p>
              <p className="student-detail-due">Due {formatActivityDate(activity.dueDate)} · {formatActivityStatus(activity.dueState)}</p>
            </div>
          </div>
          <div className="student-detail-divider" />
          <section className="activity-instructions">
            <h3>Instructions</h3>
            <p>{activity.instructions}</p>
          </section>
          <div className="student-detail-divider" />
          <section className="activity-visible-tests">
            <h3>Visible test cases</h3>
            <p>Only instructor-approved visible examples are shown here. Hidden tests and their count remain private.</p>
            {current.testCases.length === 0 ? <p>No visible examples are available.</p> : current.testCases.map((testCase) => (
              <article key={testCase.id}>
                <strong>{testCase.name}</strong>
                <span>Input</span><pre>{testCase.inputData ?? '(no input)'}</pre>
                <span>Expected output</span><pre>{testCase.expectedOutput}</pre>
                <small>{testCase.points} points</small>
              </article>
            ))}
          </section>
        </article>
      </main>
      <aside className="student-work-rail">
        <section className="student-work-card">
          <div className="student-work-card__header"><h2>Your work</h2><span className="student-work-status">{formatActivityStatus(activity.dueState)}</span></div>
          <dl className="activity-facts">
            <div><dt>Language</dt><dd>Java</dd></div>
            <div><dt>Entry class</dt><dd>{activity.entryClassName}</dd></div>
            <div><dt>Maximum attempts</dt><dd>{activity.maxAttempts}</dd></div>
            <div><dt>Attempts</dt><dd>{attemptState.countingAttemptsUsed} of {attemptState.maxAttempts} used</dd></div>
            <div><dt>Ordinary attempts remaining</dt><dd>{attemptState.remainingOrdinaryAttempts}</dd></div>
            <div><dt>Credited result policy</dt><dd>{attemptState.creditPolicy === 'HIGHEST' ? 'Highest attempt' : 'Latest attempt'}</dd></div>
            <div><dt>Total points</dt><dd>{activity.totalPoints}</dd></div>
          </dl>
          <div className="submission-released-result">
            <strong>Credited result</strong>
            {attemptState.creditedResult
              ? <><p>{attemptState.creditedResult.attemptLabel}</p><h3>{attemptState.creditedResult.score} / {attemptState.creditedResult.totalPoints}</h3></>
              : <p>No result has been released yet.</p>}
          </div>
          {attemptState.replacementAvailable && <p className="submission-notice">A replacement attempt is available until {formatActivityDate(attemptState.replacement?.expiresAt)}.</p>}
          <small>{attemptState.nextAllowedSubmissionKind === 'REPLACEMENT' ? 'A replacement attempt is the next allowed submission.' : attemptState.nextAllowedSubmissionKind === 'ORDINARY' ? 'Another ordinary submission is currently allowed.' : 'Another submission is not currently available.'}</small>
          <NavLink to={classHref(`/student/activity/${activity.id}/workspace`, selectedClass.id)} className="student-primary-action">
            Open workspace
          </NavLink>
          <NavLink to={classHref(`/student/activity/${activity.id}/submissions`, selectedClass.id)} className="student-outline-action">
            Attempt history
          </NavLink>
          <small>Run visible tests before creating an immutable official submission.</small>
        </section>
        <ActivityGitWorkspaceCard activity={activity} api={repositories} classId={selectedClass.id} />
      </aside>
    </div>
  )
}
