import { GroupedClasswork } from './TopicViews.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { repositoryApi } from '../repositories/repository-api.js'
import { repositoryContentApi } from '../repositories/repository-content-api.js'
import { issuedCredentialProjection } from '../repositories/repository-content-projections.js'
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

function useActivityGitWorkspace(activity, api, contentApi) {
  const capabilities = useCapabilities()
  const createLock = useRef(false)
  const refreshLock = useRef(false)
  const [state, setState] = useState({ identity: null, status: 'loading', repository: null, summary: null, summaryError: null, error: null })
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
    setState((current) => ({
      identity: activity.id,
      status: 'ready',
      repository,
      summary: current.repository?.id === repository.id ? current.summary : null,
      summaryError: null,
      error: null,
    }))
    return repository
  }, [activity.id, projectRepository])

  const loadSummary = useCallback(async (repository, { signal } = {}) => {
    if (repository.storageStatus !== 'READY') return null
    try {
      const response = await contentApi.getSummary(repository.id, { signal })
      if (response.data.repositoryId !== repository.id) throw activityWorkspaceContextError()
      setState((current) => current.repository?.id === repository.id
        ? { ...current, summary: response.data, summaryError: null }
        : current)
      return response.data
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setState((current) => current.repository?.id === repository.id
          ? { ...current, summaryError: error }
          : current)
      }
      return null
    }
  }, [contentApi])

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.getActivityWorkspace(activity.id, { signal })
      const repository = applyRepository(response.data)
      if (!isProvisioning(repository.storageStatus)) setPollingStopped(false)
      await loadSummary(repository, { signal })
    } catch (error) {
      if (error?.name === 'AbortError') return
      if (error?.status === 404) {
        setState({ identity: activity.id, status: 'not-created', repository: null, summary: null, summaryError: null, error: null })
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
  }, [activity.id, api, applyRepository, loadSummary])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const current = state.identity === activity.id
    ? state
    : { identity: activity.id, status: 'loading', repository: null, summary: null, summaryError: null, error: null }
  const provisioning = Boolean(current.repository && isProvisioning(current.repository.storageStatus))

  useBoundedPolling({
    identity: activity.id,
    active: provisioning && !pollingStopped,
    load: (identity, options) => api.getActivityWorkspace(identity, options),
    onData: (response) => {
      const repository = applyRepository(response.data)
      const stillProvisioning = isProvisioning(repository.storageStatus)
      if (!stillProvisioning) void loadSummary(repository)
      return stillProvisioning
    },
    onError: (error) => {
      setState((value) => ({ ...value, error }))
      setPollingStopped(true)
    },
    onBoundedStop: () => setPollingStopped(true),
    maximumDurationMs: 60_000,
  })

  const refreshStatus = useCallback(async () => {
    if (refreshLock.current) return
    refreshLock.current = true
    setRefreshing(true)
    setState((currentState) => ({ ...currentState, error: null }))
    try {
      const response = await api.getActivityWorkspace(activity.id)
      const repository = applyRepository(response.data)
      setPollingStopped(!isProvisioning(repository.storageStatus))
      await loadSummary(repository)
    } catch (error) {
      if (error?.status === 404) {
        setState({ identity: activity.id, status: 'not-created', repository: null, summary: null, summaryError: null, error: null })
      } else {
        setState((currentState) => ({ ...currentState, error }))
      }
      setPollingStopped(true)
    } finally {
      refreshLock.current = false
      setRefreshing(false)
    }
  }, [activity.id, api, applyRepository, loadSummary])

  const createRepository = async () => {
    if (createLock.current) return
    createLock.current = true
    setCreating(true)
    setState((currentState) => ({ ...currentState, error: null }))
    try {
      const response = await api.createActivityWorkspace(activity.id)
      const repository = applyRepository(response.data)
      if (!isProvisioning(repository.storageStatus)) await loadSummary(repository)
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
  const unavailable = repository && ['FAILED', 'QUARANTINED'].includes(repository.storageStatus)

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshStatus()
    }
    window.addEventListener('focus', refreshStatus)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshStatus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refreshStatus])

  return {
    activityOpen,
    canCreate,
    createRepository,
    creating,
    current,
    load,
    pollingStopped,
    provisioning,
    refreshStatus,
    refreshing,
    repository,
    unavailable,
  }
}

function copyToClipboard(value, onResult) {
  if (!navigator.clipboard?.writeText) {
    onResult('Clipboard access is unavailable; select and copy the value manually.')
    return
  }
  navigator.clipboard.writeText(value)
    .then(() => onResult('Copied.'))
    .catch(() => onResult('Clipboard access was denied; select and copy the value manually.'))
}

function ActivityCodeMenu({ activity, repository, api = repositoryContentApi }) {
  const capabilities = useCapabilities()
  const [open, setOpen] = useState(false)
  const [issued, setIssued] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const issueLock = useRef(false)
  const issueGeneration = useRef(0)
  const menuRef = useRef(null)
  const ready = repository?.storageStatus === 'READY' && capabilities.git.smartHttp
  const readWrite = activity.status === 'PUBLISHED' && activity.dueState === 'OPEN'
  let cloneUrl = ''
  try { if (repository?.id) cloneUrl = api.getTransportUrl(repository.id) } catch { cloneUrl = '' }

  const close = useCallback(() => {
    issueGeneration.current += 1
    issueLock.current = false
    setOpen(false)
    setIssued(null)
    setError(null)
    setCopyStatus('')
  }, [])

  useEffect(() => () => {
    issueGeneration.current += 1
    issueLock.current = false
  }, [])

  useEffect(() => {
    if (!issued?.expiresAt) return undefined
    const remaining = Math.max(0, Date.parse(issued.expiresAt) - Date.now())
    const timer = setTimeout(() => setIssued(null), Math.min(remaining, 2_147_000_000))
    return () => clearTimeout(timer)
  }, [issued])

  useEffect(() => {
    if (!open) return undefined
    const dismiss = (event) => {
      if (event.key === 'Escape' || (event.type === 'pointerdown' && !menuRef.current?.contains(event.target))) close()
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [close, open])

  const openMenu = async () => {
    if (!ready || issueLock.current) return
    setOpen(true)
    setBusy(true)
    setIssued(null)
    setError(null)
    setCopyStatus('')
    issueLock.current = true
    const generation = ++issueGeneration.current
    try {
      const response = await api.issueCredential(repository.id, readWrite ? ['READ', 'WRITE'] : ['READ'])
      if (generation === issueGeneration.current) setIssued(issuedCredentialProjection(response.data, repository.id))
    } catch (issueError) {
      if (generation === issueGeneration.current) setError(issueError)
    } finally {
      if (generation === issueGeneration.current) {
        issueLock.current = false
        setBusy(false)
      }
    }
  }

  return (
    <div className="activity-code-menu" ref={menuRef}>
      <button type="button" className="activity-code-button" aria-haspopup="dialog" aria-expanded={open} disabled={!ready} onClick={() => open ? close() : openMenu()}>
        Code <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <section className="activity-code-popover" role="dialog" aria-label="Native Git access">
          <div className="activity-code-popover__heading"><strong>Code</strong><button type="button" aria-label="Close Code menu" onClick={close}>×</button></div>
          <div className="activity-code-local-tab" role="tablist" aria-label="Code access"><button type="button" role="tab" aria-selected="true">Local</button></div>
          <div className="activity-code-section">
            <div className="activity-code-label-row"><strong>Clone</strong><span>HTTPS</span></div>
            <div className="activity-code-copy-row"><code>{cloneUrl || 'Clone URL unavailable'}</code><button type="button" aria-label="Copy clone URL" disabled={!cloneUrl} onClick={() => copyToClipboard(cloneUrl, setCopyStatus)}>Copy</button></div>
          </div>
          <div className="activity-code-section">
            <strong>Authentication</strong><small>Temporary credentials</small>
            {busy && <p>Preparing secure Git access…</p>}
            {error && <p className="activity-action-error">{describeApiError(error)}</p>}
            {issued && <>
              <label>Username<div className="activity-code-copy-row"><code>{issued.username}</code><button type="button" aria-label="Copy Git username" onClick={() => copyToClipboard(issued.username, setCopyStatus)}>Copy</button></div></label>
              <label>Temporary access token<div className="activity-code-copy-row"><code>{issued.secret}</code><button type="button" aria-label="Copy temporary access token" onClick={() => copyToClipboard(issued.secret, setCopyStatus)}>Copy</button></div></label>
              <p className="activity-code-expiry">Expires {formatActivityDate(issued.expiresAt)}. Use these credentials when Git prompts.</p>
            </>}
          </div>
          {copyStatus && <p className="activity-action-success" aria-live="polite">{copyStatus}</p>}
          <p className="activity-code-footnote">The token is shown only in this open menu and is never added to the clone URL.</p>
        </section>
      )}
    </div>
  )
}

function ActivityGitWorkspaceCard({ activity, workspace }) {
  const {
    canCreate,
    createRepository,
    creating,
    current,
    load,
    pollingStopped,
    provisioning,
    refreshStatus,
    refreshing,
    repository,
    unavailable,
  } = workspace
  const { summary, summaryError } = current

  return (
    <section className="student-work-card activity-git-workspace-card" aria-live="polite">
      <div className="student-work-card__header"><div><span className="activity-repository-eyebrow">Repository</span><h2>{repository?.repositoryName || activity.title}</h2></div>{repository && <span className="student-work-status">{repository.storageStatus === 'READY' ? 'Ready' : unavailable ? 'Unavailable' : 'Preparing'}</span>}</div>
      <p>Your private repository for this Activity. Use Code above for native Git, or open the browser workspace.</p>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Checking your Git Workspace." />}
      {current.status === 'error' && <RequestState kind="unavailable" compact title="Git Workspace unavailable" error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {current.status === 'not-created' && (
        <>
          <dl className="activity-git-workspace-facts"><div><dt>Workspace</dt><dd>Not prepared</dd></div></dl>
          {canCreate
            ? <button type="button" className="student-primary-action" disabled={creating} onClick={createRepository}>{creating ? 'Preparing…' : 'Prepare workspace'}</button>
            : <p className="activity-lifecycle-note">The coding workspace can be prepared only while this Activity is published, open, and Git provisioning is available.</p>}
        </>
      )}
      {repository && provisioning && (
        <>
          <dl className="activity-git-workspace-facts"><div><dt>Workspace</dt><dd>Preparing</dd></div></dl>
          <p>Projex is preparing your private Git workspace.</p>
          {!pollingStopped && <small>Checking status without overlapping requests…</small>}
          {pollingStopped && <button type="button" className="student-outline-action" disabled={refreshing} onClick={refreshStatus}>{refreshing ? 'Refreshing…' : 'Refresh status'}</button>}
        </>
      )}
      {repository?.storageStatus === 'READY' && (
        <>
          <dl className="activity-git-workspace-facts">
            <div><dt>Repository history</dt><dd>{summary ? `${summary.defaultBranch} · ${summary.commitCount} ${summary.commitCount === 1 ? 'commit' : 'commits'}` : 'Loading…'}</dd></div>
          </dl>
          {summary?.latestCommit && <div className="activity-repository-latest"><span>Latest commit</span><strong>{summary.latestCommit.subject}</strong><small><code>{summary.latestCommit.commitId.slice(0, 8)}</code> · {formatActivityDate(summary.latestCommit.authoredAt)}</small></div>}
          {summary?.empty && <p className="activity-repository-empty">No commits yet.</p>}
          {summaryError && <p className="activity-action-error">Repository history is temporarily unavailable. It will refresh when you return to this page.</p>}
          {!workspace.activityOpen && <p className="activity-git-read-only">Activity closed — repository is read-only.</p>}
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

export function StudentActivityList({ api = activityApi }) {
  const { selectedClass } = useClasses()
  return selectedClass ? <GroupedClasswork key={selectedClass.id} classId={selectedClass.id} api={api} /> : null
}

function StudentActivityReady({ activity, attemptState, testCases, classId, repositories, repositoryContent }) {
  const workspace = useActivityGitWorkspace(activity, repositories, repositoryContent)
  return (
    <div className="student-detail-layout student-project-detail-layout">
      <main className="student-activity-detail-card">
        <NavLink to={classHref('/student/activity', classId)} className="student-back-link">Back to Activities</NavLink>
        <article className="student-detail-card">
          <div className="student-detail-heading activity-detail-heading">
            <span className="student-detail-icon" aria-hidden="true" />
            <div className="activity-detail-identity">
              <div className="activity-detail-title-row">
                <h2>{activity.title}</h2>
                <span className="activity-open-status">{formatActivityStatus(activity.dueState)}</span>
                <ActivityCodeMenu activity={activity} repository={workspace.repository} api={repositoryContent} />
              </div>
              <p><span>{activity.createdBy.fullName}</span><span>{formatActivityStatus(activity.status)}</span></p>
              <p className="student-detail-due">Due {formatActivityDate(activity.dueDate)}</p>
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
            {testCases.length === 0 ? <p>No visible examples are available.</p> : testCases.map((testCase) => (
              <article key={testCase.id}>
                <strong>{testCase.name}</strong>
                <span>Input</span><pre>{testCase.inputData ?? '(no input)'}</pre>
                <span>Expected output</span><pre>{testCase.expectedOutput}</pre>
                {activity.gradingMode !== 'COMPLETION' && <small>{testCase.points} points</small>}
              </article>
            ))}
          </section>
        </article>
        <ActivityGitWorkspaceCard activity={activity} workspace={workspace} />
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
            {activity.gradingMode !== 'COMPLETION' && <><div><dt>Credited result policy</dt><dd>{attemptState.creditPolicy === 'HIGHEST' ? 'Highest attempt' : 'Latest attempt'}</dd></div><div><dt>Total points</dt><dd>{activity.totalPoints}</dd></div></>}
          </dl>
          <div className="submission-released-result">
            <strong>{activity.gradingMode === 'COMPLETION' ? 'Ungraded · completion' : 'Credited result'}</strong>
            {activity.gradingMode === 'COMPLETION' ? <p>{attemptState.completionState === 'COMPLETE' ? 'Complete · official submission accepted' : 'Not submitted'}</p> : attemptState.creditedResult
              ? <><p>{attemptState.creditedResult.attemptLabel}</p><h3>{attemptState.creditedResult.score} / {attemptState.creditedResult.totalPoints}</h3></>
              : <p>No result has been released yet.</p>}
          </div>
          {attemptState.replacementAvailable && <p className="submission-notice">A replacement attempt is available until {formatActivityDate(attemptState.replacement?.expiresAt)}.</p>}
          <small>{attemptState.nextAllowedSubmissionKind === 'REPLACEMENT' ? 'A replacement attempt is the next allowed submission.' : attemptState.nextAllowedSubmissionKind === 'ORDINARY' ? 'Another ordinary submission is currently allowed.' : 'Another submission is not currently available.'}</small>
          <NavLink to={classHref(`/student/activity/${activity.id}/workspace`, classId)} className="student-primary-action">
            Open workspace
          </NavLink>
          <NavLink to={classHref(`/student/activity/${activity.id}/submissions`, classId)} className="student-outline-action">
            Attempt history
          </NavLink>
          <small>Run visible tests before creating an immutable official submission.</small>
        </section>
      </aside>
    </div>
  )
}

export function StudentActivityDetail({ api = activityApi, submissions = submissionApi, repositories = repositoryApi, repositoryContent = repositoryContentApi }) {
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

  return <StudentActivityReady activity={current.activity} attemptState={current.attemptState} testCases={current.testCases} classId={selectedClass.id} repositories={repositories} repositoryContent={repositoryContent} />
}
