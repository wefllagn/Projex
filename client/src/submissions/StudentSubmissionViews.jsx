import { useCallback, useEffect, useRef, useState } from 'react'
import {
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { activityApi } from '../activities/activity-api.js'
import {
  activityClassMatches,
  formatActivityDate,
  formatActivityStatus,
} from '../activities/activity-utils.js'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { submissionApi } from './submission-api.js'
import { formatOutputWhitespace } from './output-diagnostics.js'
import {
  isPracticePending,
  isSubmissionPending,
  projectPracticeRun,
  projectStudentAttemptState,
  projectStudentSubmission,
} from './submission-projections.js'
import useBoundedPolling from './use-bounded-polling.js'

const FIRST_PAGE = { page: 1, pageSize: 20, status: '' }
const DESKTOP_WORKSPACE_QUERY = '(min-width: 1181px)'
const WORKSPACE_PANE_DEFAULTS = { instructions: 320, output: 360 }
const WORKSPACE_PANE_LIMITS = {
  instructions: { min: 240, max: 520 },
  output: { min: 260, max: 560 },
  editorMin: 400,
  separatorSpace: 16,
  keyboardStep: 24,
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function constrainWorkspacePanes(contentWidth, requested, priority) {
  const minimumTotal = WORKSPACE_PANE_LIMITS.instructions.min
    + WORKSPACE_PANE_LIMITS.output.min
    + WORKSPACE_PANE_LIMITS.editorMin
    + WORKSPACE_PANE_LIMITS.separatorSpace
  const width = Math.max(contentWidth || 0, minimumTotal)
  const sideBudget = width - WORKSPACE_PANE_LIMITS.separatorSpace - WORKSPACE_PANE_LIMITS.editorMin
  let instructions = clamp(
    requested.instructions,
    WORKSPACE_PANE_LIMITS.instructions.min,
    WORKSPACE_PANE_LIMITS.instructions.max,
  )
  let output = clamp(
    requested.output,
    WORKSPACE_PANE_LIMITS.output.min,
    WORKSPACE_PANE_LIMITS.output.max,
  )

  if (instructions + output > sideBudget) {
    if (priority === 'instructions') {
      instructions = Math.max(WORKSPACE_PANE_LIMITS.instructions.min, sideBudget - output)
    } else {
      output = Math.max(WORKSPACE_PANE_LIMITS.output.min, sideBudget - instructions)
      if (instructions + output > sideBudget) {
        instructions = Math.max(WORKSPACE_PANE_LIMITS.instructions.min, sideBudget - output)
      }
    }
  }

  return {
    instructions: Math.round(instructions),
    output: Math.round(output),
  }
}

function useDesktopWorkspace() {
  const readMatch = () => typeof window.matchMedia !== 'function'
    || window.matchMedia(DESKTOP_WORKSPACE_QUERY).matches
  const [matches, setMatches] = useState(readMatch)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(DESKTOP_WORKSPACE_QUERY)
    const update = (event) => setMatches(event.matches)
    if (query.addEventListener) {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }
    query.addListener(update)
    return () => query.removeListener(update)
  }, [])

  return matches
}

function useWorkspacePaneSizing() {
  const shellRef = useRef(null)
  const [paneSizes, setPaneSizes] = useState(WORKSPACE_PANE_DEFAULTS)
  const [drag, setDrag] = useState(null)
  const isDesktop = useDesktopWorkspace()

  const getContentWidth = useCallback(() => {
    const shell = shellRef.current
    if (!shell) return 0
    const styles = window.getComputedStyle(shell)
    const horizontalPadding = Number.parseFloat(styles.paddingLeft || '0')
      + Number.parseFloat(styles.paddingRight || '0')
    return (shell.getBoundingClientRect().width || shell.clientWidth) - horizontalPadding
  }, [])

  const updatePane = useCallback((pane, requestedSize) => {
    setPaneSizes((current) => constrainWorkspacePanes(
      getContentWidth(),
      { ...current, [pane]: requestedSize },
      pane,
    ))
  }, [getContentWidth])

  useEffect(() => {
    if (!isDesktop) return undefined
    const fitPanes = () => {
      const contentWidth = getContentWidth()
      if (contentWidth <= 0) return
      setPaneSizes((current) => constrainWorkspacePanes(contentWidth, current))
    }
    fitPanes()
    window.addEventListener('resize', fitPanes)
    return () => window.removeEventListener('resize', fitPanes)
  }, [getContentWidth, isDesktop])

  const beginResize = useCallback((pane, event) => {
    if (!isDesktop || (event.button !== undefined && event.button !== 0)) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrag({
      pane,
      pointerId: event.pointerId,
      startX: event.clientX,
      startSize: paneSizes[pane],
    })
  }, [isDesktop, paneSizes])

  const moveResize = useCallback((event) => {
    if (!drag || (drag.pointerId !== undefined && event.pointerId !== drag.pointerId)) return
    event.preventDefault()
    const delta = event.clientX - drag.startX
    updatePane(
      drag.pane,
      drag.startSize + (drag.pane === 'instructions' ? delta : -delta),
    )
  }, [drag, updatePane])

  const endResize = useCallback((event) => {
    if (!drag || (drag.pointerId !== undefined && event.pointerId !== drag.pointerId)) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDrag(null)
  }, [drag])

  const resizeWithKeyboard = useCallback((pane, event) => {
    if (!isDesktop || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const paneDirection = pane === 'instructions' ? direction : -direction
    const step = event.shiftKey
      ? WORKSPACE_PANE_LIMITS.keyboardStep * 2
      : WORKSPACE_PANE_LIMITS.keyboardStep
    updatePane(pane, paneSizes[pane] + paneDirection * step)
  }, [isDesktop, paneSizes, updatePane])

  const separatorProps = (pane, label, controls) => ({
    role: 'separator',
    'aria-label': label,
    'aria-controls': controls,
    'aria-orientation': 'vertical',
    'aria-valuemin': WORKSPACE_PANE_LIMITS[pane].min,
    'aria-valuemax': WORKSPACE_PANE_LIMITS[pane].max,
    'aria-valuenow': paneSizes[pane],
    'aria-valuetext': `${paneSizes[pane]} pixels`,
    tabIndex: 0,
    onKeyDown: (event) => resizeWithKeyboard(pane, event),
    onPointerDown: (event) => beginResize(pane, event),
    onPointerMove: moveResize,
    onPointerUp: endResize,
    onPointerCancel: endResize,
    onLostPointerCapture: () => setDrag(null),
  })

  return {
    isResizing: Boolean(drag),
    isDesktop,
    shellRef,
    paneStyle: isDesktop ? {
      '--instruction-pane-width': `${paneSizes.instructions}px`,
      '--output-pane-width': `${paneSizes.output}px`,
    } : undefined,
    instructionSeparatorProps: separatorProps(
      'instructions',
      'Resize instructions and code panes',
      'student-workspace-instructions student-workspace-editor',
    ),
    outputSeparatorProps: separatorProps(
      'output',
      'Resize code and diagnostics panes',
      'student-workspace-editor student-workspace-diagnostics',
    ),
  }
}

function contextMismatchError(message = 'The requested record is not available in the selected class.') {
  return new ApiError({ status: 404, code: 'RESOURCE_NOT_FOUND', message })
}

function formatDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatStatus(value) {
  return String(value || 'pending')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function executionErrorMessage(error) {
  const messages = {
    EXECUTION_UNAVAILABLE: 'Java execution is disabled in this environment. No result was simulated.',
    EXECUTION_CAPACITY_UNAVAILABLE: 'Another visible-test run is still processing. Try again after it finishes.',
    RATE_LIMIT_EXCEEDED: 'Visible tests were requested too frequently. Wait briefly before trying again.',
    PRACTICE_RUN_NOT_FOUND: 'This visible-test result expired or is no longer available.',
    ACTIVITY_NOT_ACCEPTING_EXECUTION: 'This activity is not accepting visible-test runs.',
  }
  return messages[error?.code] || describeApiError(error)
}

function submissionErrorMessage(error) {
  const messages = {
    ATTEMPT_LIMIT_REACHED: 'The usable attempt limit has been reached for this activity.',
    ACTIVITY_NOT_ACCEPTING_SUBMISSIONS: 'This activity is not accepting an ordinary submission or valid replacement.',
    DUPLICATE_SUBMISSION_REQUEST: 'This submission key was already used with different source code. Refresh attempt history before continuing.',
    EXECUTION_UNAVAILABLE: 'Official Java assessment is disabled in this environment.',
  }
  return messages[error?.code] || describeApiError(error)
}

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `submission:${globalThis.crypto.randomUUID()}`
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return `submission:${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`
}

function VisibleOutcomeList({ outcomes, emptyMessage = 'No visible-test outcomes are available yet.' }) {
  if (!outcomes.length) return <p className="submission-muted-copy">{emptyMessage}</p>
  return (
    <div className="submission-outcome-list">
      {outcomes.map((outcome) => {
        const showComparison = outcome.outcome === 'failed' && outcome.expectedOutput !== null && outcome.actualOutput !== null
        return (
          <article className="submission-outcome" key={`${outcome.order}:${outcome.name}`}>
            <div>
              <strong>{outcome.name}</strong>
              <span className={`submission-status submission-status--${outcome.outcome}`}>
                {formatStatus(outcome.outcome)}
              </span>
            </div>
            {showComparison ? (
              <section className="submission-output-comparison" aria-label={`${outcome.name} output comparison`}>
                <small>Whitespace markers: · space, → tab, ↵ line ending.</small>
                <div><span>Expected output</span><pre>{formatOutputWhitespace(outcome.expectedOutput)}</pre></div>
                <div><span>Actual output</span><pre>{formatOutputWhitespace(outcome.actualOutput)}</pre></div>
              </section>
            ) : outcome.actualOutput !== null ? <><span>Actual output</span><pre>{outcome.actualOutput || '(no output)'}</pre></> : null}
            {outcome.errorMessage && <p>{outcome.errorMessage}</p>}
            {outcome.executionTimeMs !== null && <small>{outcome.executionTimeMs} ms</small>}
          </article>
        )
      })}
    </div>
  )
}

function SubmitConfirmation({ mode, pending, onCancel, onConfirm }) {
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="submit-activity-title">
      <section className="student-submit-modal">
        <span className="student-submit-icon" aria-hidden="true" />
        <h2 id="submit-activity-title">{mode === 'retry' ? 'Retry the same submission request?' : 'Create an official submission?'}</h2>
        <p>
          {mode === 'retry'
            ? 'Projex will resend the exact source snapshot with the same request key. This cannot intentionally create a second request.'
            : 'This records an immutable official attempt. Running visible tests does not consume an attempt.'}
        </p>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" disabled={pending} onClick={onCancel}>Cancel</button>
          <button type="button" className="student-primary-action" disabled={pending} onClick={onConfirm}>
            {pending ? 'Submitting...' : mode === 'retry' ? 'Retry same request' : 'Submit source'}
          </button>
        </div>
      </section>
    </div>
  )
}

function useWorkspaceActivity(api, activityId, selectedClass, selectionStatus) {
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, testCases: [], error: null })
  const key = `${selectedClass?.id}:${activityId}`

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId) return
    try {
      const [activityResponse, testCaseResponse] = await Promise.all([
        api.getActivity(activityId, { signal }),
        api.listTestCases(activityId, { page: 1, pageSize: 50 }, { signal }),
      ])
      if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
      setState({
        key,
        status: 'ready',
        activity: activityResponse.data,
        testCases: testCaseResponse.data.filter((testCase) => testCase.isHidden !== true),
        error: null,
      })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, testCases: [], error })
    }
  }, [activityId, api, key, selectedClass])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  return [state.key === key ? state : { ...state, status: 'loading', activity: null, testCases: [] }, load]
}

export function StudentProgrammingWorkspace({
  api = activityApi,
  submissions = submissionApi,
  pollingOptions,
}) {
  const capabilities = useCapabilities()
  const { activityId } = useParams()
  const navigate = useNavigate()
  const { selectedClass, selectionStatus } = useClasses()
  const [workspace, reloadWorkspace] = useWorkspaceActivity(api, activityId, selectedClass, selectionStatus)
  const [source, setSource] = useState({ key: null, initial: '', value: '' })
  const [practice, setPractice] = useState({ record: null, error: null, requesting: false, bounded: false })
  const [attemptState, setAttemptState] = useState({ key: null, status: 'idle', record: null, error: null })
  const [history, setHistory] = useState({ key: null, status: 'idle', items: [], error: null, reviewedAfterAmbiguity: false })
  const [submission, setSubmission] = useState({ status: 'idle', intent: null, error: null })
  const [confirmMode, setConfirmMode] = useState(null)
  const mounted = useRef(true)
  const paneSizing = useWorkspacePaneSizing()

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!workspace.activity) return
    const key = `${selectedClass.id}:${workspace.activity.id}`
    setSource((current) => current.key === key
      ? current
      : { key, initial: workspace.activity.starterCode ?? '', value: workspace.activity.starterCode ?? '' })
    setPractice({ record: null, error: null, requesting: false, bounded: false })
    setSubmission({ status: 'idle', intent: null, error: null })
    setAttemptState({ key: workspace.activity.id, status: 'loading', record: null, error: null })
    setHistory({ key: workspace.activity.id, status: 'idle', items: [], error: null, reviewedAfterAmbiguity: false })
  }, [selectedClass?.id, workspace.activity])

  const refreshAttemptState = useCallback(async ({ signal } = {}) => {
    if (!activityId) return null
    setAttemptState((current) => ({ ...current, key: activityId, status: 'loading', error: null }))
    try {
      const response = await submissions.getAttemptState(activityId, { signal })
      const record = projectStudentAttemptState(response.data)
      if (record.activityId !== activityId) throw contextMismatchError('Attempt state does not match this activity.')
      setAttemptState({ key: activityId, status: 'ready', record, error: null })
      return record
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setAttemptState({ key: activityId, status: 'error', record: null, error })
      }
      return null
    }
  }, [activityId, submissions])

  const refreshHistory = useCallback(async ({ signal, ambiguityReview = false } = {}) => {
    if (!activityId) return
    setHistory((current) => ({ ...current, key: activityId, status: 'loading', error: null }))
    try {
      const response = await submissions.listSubmissions(activityId, FIRST_PAGE, { signal })
      const items = response.data.map(projectStudentSubmission)
      if (items.some((item) => item.activityId !== activityId)) throw contextMismatchError('Submission history does not match this activity.')
      setHistory({ key: activityId, status: 'ready', items, error: null, reviewedAfterAmbiguity: ambiguityReview })
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setHistory((current) => ({ ...current, key: activityId, status: 'error', error, reviewedAfterAmbiguity: false }))
      }
    }
  }, [activityId, submissions])

  useEffect(() => {
    if (workspace.status !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => refreshAttemptState({ signal: controller.signal }))
    return () => controller.abort()
  }, [refreshAttemptState, workspace.status])

  const practiceLoad = useCallback(
    (runId, options) => submissions.getVisibleTestRun(runId, options),
    [submissions],
  )
  const updatePractice = useCallback((response) => {
    const record = projectPracticeRun(response.data)
    setPractice({ record, error: null, requesting: false, bounded: false })
    return isPracticePending(record)
  }, [])
  const failPracticePolling = useCallback((error) => {
    setPractice((current) => ({ ...current, error, requesting: false, bounded: false }))
  }, [])
  const stopPracticePolling = useCallback(() => {
    setPractice((current) => ({ ...current, bounded: true }))
  }, [])

  useBoundedPolling({
    identity: practice.record?.id,
    active: isPracticePending(practice.record) && !practice.error && !practice.bounded,
    load: practiceLoad,
    onData: updatePractice,
    onError: failPracticePolling,
    onBoundedStop: stopPracticePolling,
    ...pollingOptions,
  })

  useEffect(() => {
    const dirty = source.key && source.value !== source.initial
    if (!dirty) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [source])

  const runVisibleTests = async () => {
    setPractice({ record: null, error: null, requesting: true, bounded: false })
    try {
      const response = await submissions.createVisibleTestRun(activityId, source.value)
      if (!mounted.current) return
      const record = projectPracticeRun(response.data)
      if (record.activityId !== activityId) throw contextMismatchError('The visible-test run does not match this activity.')
      setPractice({ record, error: null, requesting: false, bounded: false })
    } catch (error) {
      if (mounted.current) setPractice({ record: null, error, requesting: false, bounded: false })
    }
  }

  const refreshPractice = async () => {
    if (!practice.record?.id) return
    setPractice((current) => ({ ...current, requesting: true, error: null }))
    try {
      updatePractice(await submissions.getVisibleTestRun(practice.record.id))
    } catch (error) {
      setPractice((current) => ({ ...current, requesting: false, error }))
    }
  }

  const sendIntent = async (intent) => {
    setSubmission({ status: 'submitting', intent, error: null })
    try {
      const response = await submissions.createSubmission(
        activityId,
        intent.sourceSnapshot,
        intent.idempotencyKey,
      )
      if (!mounted.current) return
      const record = projectStudentSubmission(response.data)
      if (!record.id || record.activityId !== activityId) throw contextMismatchError('The accepted submission does not match this activity.')
      setConfirmMode(null)
      setSubmission({ status: 'accepted', intent: null, error: null })
      await refreshAttemptState()
      navigate(
        classHref(`/student/activity/${activityId}/submissions/${record.id}`, selectedClass.id),
        { state: { idempotentReplay: response.meta?.idempotentReplay === true } },
      )
    } catch (error) {
      if (!mounted.current) return
      setConfirmMode(null)
      setSubmission({
        status: error?.code === 'NETWORK_ERROR' ? 'ambiguous' : 'error',
        intent: error?.code === 'NETWORK_ERROR' ? intent : null,
        error,
      })
      if (['ATTEMPT_LIMIT_REACHED', 'ACTIVITY_NOT_ACCEPTING_SUBMISSIONS', 'EXECUTION_UNAVAILABLE', 'FORBIDDEN', 'ACTIVITY_NOT_FOUND'].includes(error?.code)) {
        await refreshAttemptState()
      }
    }
  }

  const confirmSubmission = () => {
    if (confirmMode === 'retry' && submission.intent) {
      sendIntent(submission.intent)
      return
    }
    sendIntent({
      idempotencyKey: createIdempotencyKey(),
      sourceSnapshot: source.value,
      createdAt: new Date().toISOString(),
    })
  }

  if (workspace.status === 'loading') return <RequestState kind="loading" message="Loading the programming workspace." />
  if (workspace.status === 'error') return <RequestState kind={workspace.error?.status === 404 ? 'notFound' : workspace.error?.status === 403 ? 'forbidden' : 'unavailable'} error={workspace.error} action={<button type="button" className="student-outline-action" onClick={() => reloadWorkspace()}>Try again</button>} />
  if (!workspace.activity) return null

  const activity = workspace.activity
  if (source.key !== `${selectedClass.id}:${activity.id}`) {
    return <RequestState kind="loading" message="Preparing the activity starter source." />
  }
  const currentHistory = history.key === activityId
    ? history
    : { status: 'loading', items: [], error: null, reviewedAfterAmbiguity: false }
  const currentAttemptState = attemptState.key === activityId
    ? attemptState
    : { status: 'loading', record: null, error: null }
  const attempt = currentAttemptState.record
  const replacement = attempt?.replacementAvailable ? attempt.replacement : null
  const archived = selectedClass.status === 'ARCHIVED' || activity.status === 'ARCHIVED'
  const ordinaryOpen = attempt?.dueState === 'OPEN'
  const canRun = ordinaryOpen && !archived
  const canSubmit = Boolean(
    !archived &&
      attempt &&
      attempt.nextAllowedSubmissionKind !== 'NONE',
  )
  const sourceChangedAfterAmbiguity = submission.status === 'ambiguous'
    && submission.intent?.sourceSnapshot !== source.value
  const practiceStatus = practice.requesting
    ? 'Requesting visible-test run...'
    : practice.record
      ? `Visible-test run: ${formatStatus(practice.record.status)}`
      : 'Run visible tests to check the current source without using an attempt.'

  return (
    <div className="student-coding-page">
      <header className="student-coding-topbar">
        <nav className="student-coding-breadcrumb" aria-label="Coding workspace breadcrumb">
          <NavLink to={classHref(`/student/activity/${activity.id}`, selectedClass.id)}>{selectedClass.className}</NavLink>
          <span>{activity.title}</span>
          <strong>{activity.entryClassName}.java</strong>
        </nav>
        <NavLink className="student-outline-action" to={classHref(`/student/activity/${activity.id}/submissions`, selectedClass.id)}>Attempt history</NavLink>
      </header>

      <main
        className={`student-coding-shell${paneSizing.isResizing ? ' is-pane-resizing' : ''}`}
        ref={paneSizing.shellRef}
        style={paneSizing.paneStyle}
      >
        <aside className="student-coding-instructions" id="student-workspace-instructions">
          <div className="student-coding-activity-title">
            <span>Programming activity</span>
            <h1>{activity.title}</h1>
            <p>{formatActivityStatus(activity.status)}</p>
            <small>Due {formatActivityDate(activity.dueDate)}</small>
            <strong>{activity.totalPoints} total points</strong>
          </div>
          <div className="student-coding-tabs"><button type="button" className="is-active">Instructions</button></div>
          <section className="student-coding-scroll">
            <h2>Instructions</h2>
            <p>{activity.instructions}</p>
            <h2>Visible examples</h2>
            {workspace.testCases.length === 0 && <p>No visible examples are available.</p>}
            {workspace.testCases.map((testCase) => (
              <article className="workspace-visible-example" key={testCase.id}>
                <strong>{testCase.name}</strong>
                <span>Input</span><pre>{testCase.inputData ?? '(no input)'}</pre>
                <span>Expected output</span><pre>{testCase.expectedOutput}</pre>
              </article>
            ))}
            <div className="student-coding-tip">
              <strong>Practice is not a submission</strong>
              <p>Run Visible Tests never consumes an official attempt or creates a score.</p>
            </div>
          </section>
          <div className="student-source-memory-note">
            <strong>Not automatically saved</strong>
            <span>Your edited source stays only in this browser tab.</span>
          </div>
        </aside>

        {paneSizing.isDesktop && (
          <div
            className="student-pane-resizer student-pane-resizer--instructions"
            {...paneSizing.instructionSeparatorProps}
          />
        )}

        <section className="student-editor-area" id="student-workspace-editor">
          <div className="student-editor-tabs"><button type="button" className="is-active">{activity.entryClassName}.java</button></div>
          <div className="student-editor-workbench student-editor-workbench--single-file">
            <aside className="student-editor-explorer" aria-label="Source file">
              <strong>SOURCE</strong>
              <em className="is-file is-active">{activity.entryClassName}.java</em>
            </aside>
            <textarea
              aria-label="Java source code"
              className="student-code-editor student-code-editor-input"
              spellCheck="false"
              value={source.value}
              onChange={(event) => setSource((current) => ({ ...current, value: event.target.value }))}
            />
          </div>
          <footer className="student-editor-status"><span>Unsaved browser source</span><span>Java</span></footer>
        </section>

        {paneSizing.isDesktop && (
          <div
            className="student-pane-resizer student-pane-resizer--output"
            {...paneSizing.outputSeparatorProps}
          />
        )}

        <section className="student-output-area" id="student-workspace-diagnostics">
          <div className="student-output-header"><strong>Visible-test diagnostics</strong><button type="button" onClick={() => setPractice({ record: null, error: null, requesting: false, bounded: false })}>Clear</button></div>
          <div className="student-output-panel student-output-panel--live" role="status">
            <p>{practiceStatus}</p>
            {practice.record?.compilerOutput && <><strong>Compiler output</strong><pre>{practice.record.compilerOutput}</pre></>}
            {practice.error && <p className="student-coding-failure">{executionErrorMessage(practice.error)}</p>}
            {practice.bounded && <p>Automatic refresh stopped. The server-side run may still be processing.</p>}
            {(practice.bounded || practice.error) && practice.record?.id && (
              <button type="button" className="student-outline-action" disabled={practice.requesting} onClick={refreshPractice}>Refresh status</button>
            )}
          </div>
        </section>

        <section className="student-tests-area">
          <div className="student-tests-tabs">
            <button type="button" className="is-active">Visible test outcomes</button>
            <span className="student-test-summary">{practice.record ? formatStatus(practice.record.status) : 'Not run'}</span>
          </div>
          <div className="student-tests-table student-tests-table--outcomes">
            <VisibleOutcomeList outcomes={practice.record?.visibleTestOutcomes ?? []} />
          </div>
        </section>
      </main>

      <footer className="student-coding-actions">
        <div className="workspace-action-message">
          {replacement && <strong>Replacement available until {formatDate(replacement.expiresAt)}.</strong>}
          {currentAttemptState.status === 'loading' && <span>Checking attempt availability...</span>}
          {currentAttemptState.status === 'error' && <span className="student-coding-failure">Attempt availability could not be loaded. Submission remains disabled.</span>}
          {currentAttemptState.status === 'ready' && !canSubmit && <span>Another submission is not currently available.</span>}
          {submission.status === 'error' && <span className="student-coding-failure">{submissionErrorMessage(submission.error)}</span>}
        </div>
        <button type="button" className="student-run-tests" disabled={!capabilities.java.execution || !canRun || practice.requesting || isPracticePending(practice.record)} onClick={runVisibleTests}>
          {practice.requesting || isPracticePending(practice.record) ? 'Running visible tests...' : 'Run Visible Tests'}
        </button>
        <button type="button" className="student-submit-code" disabled={!capabilities.java.execution || !canSubmit || !source.value.trim() || submission.status === 'submitting' || submission.status === 'ambiguous'} onClick={() => setConfirmMode('new')}>
          {submission.status === 'submitting' ? 'Submitting...' : attempt?.nextAllowedSubmissionKind === 'REPLACEMENT' ? 'Submit replacement' : 'Submit'}
        </button>
      </footer>
      {!capabilities.java.execution && <RequestState kind="unavailable" compact title="Java execution unavailable" message="This environment preserves activity and submission records but cannot run or assess Java code." />}

      {submission.status === 'ambiguous' && (
        <section className="submission-ambiguity-panel" role="alert">
          <h2>Submission status is uncertain</h2>
          <p>The server may already have accepted the exact source snapshot. Do not create another request until you review attempt history.</p>
          {sourceChangedAfterAmbiguity && <p><strong>The editor now contains changed source.</strong> Submitting it could consume another attempt.</p>}
          <div>
            <button type="button" className="student-primary-action" onClick={() => setConfirmMode('retry')}>Retry exact original request</button>
            <button type="button" className="student-outline-action" onClick={() => Promise.all([refreshHistory({ ambiguityReview: true }), refreshAttemptState()])}>Refresh attempt history</button>
            {sourceChangedAfterAmbiguity && currentHistory.reviewedAfterAmbiguity && (
              <button type="button" className="student-outline-action" onClick={() => setSubmission({ status: 'idle', intent: null, error: null })}>I reviewed history; start a new intent</button>
            )}
          </div>
          {currentHistory.status === 'loading' && <small>Refreshing attempt history...</small>}
          {currentHistory.status === 'error' && <small>{describeApiError(currentHistory.error)}</small>}
        </section>
      )}

      {confirmMode && (
        <SubmitConfirmation
          mode={confirmMode}
          pending={submission.status === 'submitting'}
          onCancel={() => setConfirmMode(null)}
          onConfirm={confirmSubmission}
        />
      )}
    </div>
  )
}

function SubmissionCard({ record, classId }) {
  return (
    <article className="student-assignment-row submission-history-card">
      <div>
        <span className={`submission-status submission-status--${record.status}`}>{formatStatus(record.status)}</span>
        <h2>{record.attemptLabel}</h2>
        <p>Submitted {formatDate(record.submittedAt)}</p>
        {record.isLate && <small>Accepted after the ordinary deadline</small>}
      </div>
      <div>
        <strong>{record.gradeStatus === 'released' ? 'Result released' : 'Result not released'}</strong>
        {record.gradeStatus === 'released' && <small>{record.finalScore ?? 'Not available'} / {record.totalPoints ?? 'Not available'} points</small>}
        {record.isCreditedResult && <span className="submission-status submission-status--released">Credited result</span>}
        {record.failureResolution?.replacementGranted && (
          <small>
            Replacement {record.failureResolution.replacementAvailable ? 'available' : 'no longer available'}; expiration {formatDate(record.failureResolution.replacementExpiresAt)}
          </small>
        )}
      </div>
      <NavLink className="student-assignment-action" to={classHref(`/student/activity/${record.activityId}/submissions/${record.id}`, classId)}>View record</NavLink>
    </article>
  )
}

export function StudentSubmissionHistory({ api = activityApi, submissions = submissionApi }) {
  const { activityId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const [query, setQuery] = useState(FIRST_PAGE)
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, items: [], pagination: null, error: null })
  const key = `${selectedClass?.id}:${activityId}:${query.page}:${query.status}`

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId) return
    try {
      const [activityResponse, submissionResponse] = await Promise.all([
        api.getActivity(activityId, { signal }),
        submissions.listSubmissions(activityId, query, { signal }),
      ])
      if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
      const items = submissionResponse.data.map(projectStudentSubmission)
      if (items.some((item) => item.activityId !== activityId)) throw contextMismatchError('Submission history does not match this activity.')
      setState({ key, status: 'ready', activity: activityResponse.data, items, pagination: submissionResponse.pagination, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, items: [], pagination: null, error })
    }
  }, [activityId, api, key, query, selectedClass, submissions])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const current = state.key === key ? state : { ...state, status: 'loading', activity: null, items: [] }
  if (current.status === 'loading') return <RequestState kind="loading" message="Loading submission history." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : current.error?.status === 403 ? 'forbidden' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.activity) return null

  return (
    <div className="student-assignment-board submission-history-page">
      <header className="submission-page-heading">
        <div>
          <NavLink className="student-back-link" to={classHref(`/student/activity/${activityId}`, selectedClass.id)}>Back to activity</NavLink>
          <p className="student-feedback-eyebrow">Official submissions</p>
          <h1>{current.activity.title}</h1>
          <p>Attempts are immutable records. Practice runs do not appear here.</p>
          <small>Credited result policy: {current.activity.creditPolicy === 'HIGHEST' ? 'Highest released attempt' : 'Latest released attempt'}.</small>
        </div>
        <NavLink className="student-primary-action" to={classHref(`/student/activity/${activityId}/workspace`, selectedClass.id)}>Open workspace</NavLink>
      </header>
      <section className="student-assignment-panel student-assignment-panel--board">
        <div className="student-assignment-toolbar student-assignment-toolbar--board">
          <div><strong>Attempt history</strong><p>Backend-provided attempt and replacement labels.</p></div>
          <label className="student-sort-control">Status
            <select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}>
              <option value="">All statuses</option>
              {['QUEUED', 'ASSESSING', 'ASSESSED', 'ASSESSMENT_FAILED', 'REVIEWED', 'RELEASED', 'FAILED_RESOLVED'].map((status) => <option value={status} key={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
        </div>
        {current.items.length === 0
          ? <RequestState kind="empty" compact message="No official submission attempts match this view." />
          : <div className="student-assignment-list">{current.items.map((record) => <SubmissionCard record={record} classId={selectedClass.id} key={record.id} />)}</div>}
        {current.pagination && current.pagination.totalPages > 1 && (
          <nav className="activity-pagination" aria-label="Submission pages">
            <button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => setQuery((value) => ({ ...value, page: value.page - 1 }))}>Previous</button>
            <span>Page {current.pagination.page} of {current.pagination.totalPages}</span>
            <button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => setQuery((value) => ({ ...value, page: value.page + 1 }))}>Next</button>
          </nav>
        )}
      </section>
    </div>
  )
}

export function StudentSubmissionDetail({ api = activityApi, submissions = submissionApi, pollingOptions }) {
  const { activityId, submissionId } = useParams()
  const location = useLocation()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, record: null, error: null, bounded: false })
  const key = `${selectedClass?.id}:${activityId}:${submissionId}`

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId || !submissionId) return null
    const [activityResponse, submissionResponse] = await Promise.all([
      api.getActivity(activityId, { signal }),
      submissions.getSubmission(submissionId, { signal }),
    ])
    if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
    const record = projectStudentSubmission(submissionResponse.data)
    if (record.id !== submissionId || record.activityId !== activityId) throw contextMismatchError('The submission does not match this activity.')
    return { activity: activityResponse.data, record }
  }, [activityId, api, selectedClass, submissionId, submissions])

  const initialLoad = useCallback(async ({ signal } = {}) => {
    try {
      const result = await load({ signal })
      if (result) setState({ key, status: 'ready', ...result, error: null, bounded: false })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, record: null, error, bounded: false })
    }
  }, [key, load])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => initialLoad({ signal: controller.signal }))
    return () => controller.abort()
  }, [initialLoad, selectionStatus])

  const pollLoad = useCallback(
    async (_identity, options) => {
      const result = await load(options)
      return { data: result }
    },
    [load],
  )
  const update = useCallback((response) => {
    setState((current) => ({ ...current, status: 'ready', ...response.data, error: null, bounded: false }))
    return isSubmissionPending(response.data.record)
  }, [])
  const fail = useCallback((error) => setState((current) => ({ ...current, error, bounded: false })), [])
  const bound = useCallback(() => setState((current) => ({ ...current, bounded: true })), [])

  useBoundedPolling({
    identity: state.key === key ? state.record?.id : null,
    active: state.key === key && isSubmissionPending(state.record) && !state.error && !state.bounded,
    load: pollLoad,
    onData: update,
    onError: fail,
    onBoundedStop: bound,
    ...pollingOptions,
  })

  const current = state.key === key ? state : { ...state, status: 'loading', activity: null, record: null }
  if (current.status === 'loading' || current.status === 'idle') return <RequestState kind="loading" message="Loading the submission record." />
  if (current.status === 'error' && !current.record) return <RequestState kind={current.error?.status === 404 ? 'notFound' : current.error?.status === 403 ? 'forbidden' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => initialLoad()}>Try again</button>} />
  if (!current.record) return null

  const record = current.record
  return (
    <div className="student-detail-layout submission-detail-page">
      <main className="student-activity-detail-card">
        <NavLink className="student-back-link" to={classHref(`/student/activity/${activityId}/submissions`, selectedClass.id)}>Back to attempt history</NavLink>
        {location.state?.idempotentReplay && <p className="submission-notice">The original accepted submission was recovered safely.</p>}
        <article className="student-detail-card">
          <div className="submission-record-heading">
            <div><p className="student-feedback-eyebrow">Submission record</p><h1>{record.attemptLabel}</h1><p>{record.activityTitle}</p></div>
            <span className={`submission-status submission-status--${record.status}`}>{formatStatus(record.status)}</span>
          </div>
          <dl className="activity-facts submission-facts">
            <div><dt>Submitted</dt><dd>{formatDate(record.submittedAt)}</dd></div>
            <div><dt>Grade</dt><dd>{record.gradeStatus === 'released' ? 'Released' : 'Not released'}</dd></div>
            <div><dt>Deadline</dt><dd>{record.isLate ? 'Accepted late' : 'On time'}</dd></div>
          </dl>
          {isSubmissionPending(record) && <p className="submission-notice">Assessment is processing. This page refreshes status without changing the accepted submission.</p>}
          {current.bounded && <p className="submission-notice">Automatic refresh stopped. Assessment may still be processing.</p>}
          {current.error && <p className="student-coding-failure">{describeApiError(current.error)}</p>}
          {(current.bounded || current.error) && isSubmissionPending(record) && <button type="button" className="student-outline-action" onClick={() => initialLoad()}>Refresh status</button>}
          {record.status === 'assessment_failed' && <p className="student-coding-failure">Projex could not complete assessment because of an infrastructure failure. The original submission remains preserved for instructor resolution.</p>}
          {record.failureResolution && (
            <section className="submission-resolution">
              <h2>Infrastructure resolution</h2>
              <p>{record.failureResolution.replacementGranted ? 'A replacement attempt was granted.' : 'The failure was resolved without a replacement.'}</p>
              {record.failureResolution.replacementGranted && (
                <p>
                  Replacement {record.failureResolution.replacementAvailable ? 'available' : 'no longer available'}; expiration {formatDate(record.failureResolution.replacementExpiresAt)}.
                </p>
              )}
            </section>
          )}
          <section className="submission-source">
            <h2>Submitted source</h2>
            <pre>{record.sourceCode}</pre>
          </section>
          <section className="submission-visible-results">
            <h2>Visible-test outcomes</h2>
            <p>Hidden-test definitions, count, and breakdown remain private.</p>
            <VisibleOutcomeList outcomes={record.visibleTestOutcomes} />
          </section>
          {record.gradeStatus === 'released' ? (
            <section className="submission-released-result">
              <p className="student-feedback-eyebrow">{record.isCreditedResult ? 'Credited result' : 'Released result'}</p>
              <h2>{record.finalScore ?? 'Not available'} / {record.totalPoints ?? 'Not available'} points</h2>
              <p>{record.feedback || 'No textual feedback was released.'}</p>
            </section>
          ) : (
            <section className="submission-pending-grade">
              <h2>Result not released</h2>
              <p>Numeric scores, score corrections, instructor points, and feedback remain private until release.</p>
            </section>
          )}
        </article>
      </main>
      <aside className="student-work-rail">
        <section className="student-work-card">
          <h2>Activity</h2>
          <p>{current.activity?.title}</p>
          <NavLink className="student-primary-action" to={classHref(`/student/activity/${activityId}/workspace`, selectedClass.id)}>Open workspace</NavLink>
        </section>
      </aside>
    </div>
  )
}

export function LegacySubmissionRoute() {
  const { activityId } = useParams()
  const { selectedClass, requestedClassId, selectionStatus } = useClasses()
  if (selectionStatus !== 'ready') return <RequestState kind="loading" message="Resolving the selected class." />
  if (!selectedClass) return <RequestState kind="notFound" />
  return <Navigate replace to={classHref(`/student/activity/${activityId}/submissions`, selectedClass.id || requestedClassId)} />
}
