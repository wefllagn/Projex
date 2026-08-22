import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { activityApi } from '../activities/activity-api.js'
import { activityClassMatches, formatActivityDate } from '../activities/activity-utils.js'
import { ApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import { useClasses } from '../classes/class-context.js'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import {
  canCorrectOrReview,
  canRelease,
  canResolveAssessmentFailure,
  isInstructorSubmissionPending,
  projectInstructorSubmission,
  projectInstructorSubmissionSummary,
} from './instructor-submission-projections.js'
import { submissionApi } from './submission-api.js'
import useBoundedPolling from './use-bounded-polling.js'

const FIRST_PAGE = { page: 1, pageSize: 20, status: '' }
const SUBMISSION_STATUSES = [
  'QUEUED',
  'ASSESSING',
  'ASSESSED',
  'ASSESSMENT_FAILED',
  'REVIEWED',
  'RELEASED',
  'FAILED_RESOLVED',
]

function contextMismatchError(message = 'This record does not belong to the selected class.') {
  return new ApiError({ status: 404, code: 'CONTEXT_MISMATCH', message })
}

function formatStatus(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function score(value) {
  return value === null || value === undefined ? 'Not available' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function reviewForm(record) {
  return {
    instructorPoints: String(record?.scores.instructorPoints ?? 0),
    feedbackText: record?.feedback?.text ?? '',
  }
}

function errorKind(error) {
  if (error?.status === 404) return 'notFound'
  if (error?.status === 403) return 'forbidden'
  return 'unavailable'
}

function SubmissionQueueRow({ record, classId }) {
  return (
    <div className="instructor-table-row instructor-queue-row instructor-submission-queue-row" role="row">
      <div><strong>{record.student.fullName}</strong>{record.student.email && <small>{record.student.email}</small>}</div>
      <span>{record.attemptLabel}{record.isCreditedResult && <small>Credited result</small>}</span>
      <em className={`submission-status submission-status--${record.status}`}>{formatStatus(record.status)}</em>
      <span>{formatDate(record.submittedAt)}{record.isLate && <small>Accepted late</small>}</span>
      <NavLink to={classHref(`/instructor/activity/${record.activityId}/submissions/${record.id}`, classId)}>Review</NavLink>
    </div>
  )
}

export function InstructorSubmissionQueue({ api = activityApi, submissions = submissionApi }) {
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
      const items = submissionResponse.data.map(projectInstructorSubmissionSummary)
      if (items.some((item) => !item.id || item.activityId !== activityId)) throw contextMismatchError('A returned submission does not match this activity.')
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
  if (current.status === 'loading' || current.status === 'idle') return <RequestState kind="loading" message="Loading the activity submission queue." />
  if (current.status === 'error') return <RequestState kind={errorKind(current.error)} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.activity) return null

  return (
    <div className="student-assignment-panel instructor-assignment-panel instructor-submission-queue">
      <div className="instructor-assignment-toolbar instructor-assignment-toolbar--board">
        <div><strong>Submission Queue</strong><p>Accepted submissions for this activity only. Missing-student and cross-class monitoring are not inferred.</p></div>
        <div className="instructor-assignment-toolbar-actions">
          <label className="instructor-status-filter"><span>Status</span><select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}><option value="">All statuses</option>{SUBMISSION_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
          <button type="button" className="student-outline-action" onClick={() => load()}>Refresh</button>
        </div>
      </div>
      <section className="instructor-page-heading">
        <p>Activity assessment</p>
        <h2>{current.activity.title}</h2>
        <span>Due {formatActivityDate(current.activity.dueDate)} · {formatStatus(current.activity.status)} · {current.activity.creditPolicy === 'HIGHEST' ? 'Highest released attempt credited' : 'Latest released attempt credited'}</span>
      </section>
      {current.items.length === 0
        ? <RequestState kind="empty" compact message="No accepted submissions match this status." />
        : (
          <div className="instructor-data-table" role="table" aria-label="Activity submission queue">
            <div className="instructor-table-row instructor-table-row--head instructor-queue-row instructor-submission-queue-row" role="row"><span>Student</span><span>Attempt</span><span>Status</span><span>Submitted</span><span>Action</span></div>
            {current.items.map((record) => <SubmissionQueueRow key={record.id} record={record} classId={selectedClass.id} />)}
          </div>
        )}
      {current.pagination && current.pagination.totalPages > 1 && <nav className="activity-pagination" aria-label="Submission queue pages"><button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => setQuery((value) => ({ ...value, page: value.page - 1 }))}>Previous</button><span>Page {current.pagination.page} of {current.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => setQuery((value) => ({ ...value, page: value.page + 1 }))}>Next</button></nav>}
    </div>
  )
}

function AssessmentEvidence({ record }) {
  if (!record.assessment) return <RequestState kind="empty" compact title="Assessment not started" message="No automated assessment evidence is available yet." />
  const passed = record.assessment.testResults.filter((result) => result.outcome === 'passed').length
  return (
    <>
      <section className="instructor-output-card">
        <div className="instructor-section-title"><h3>Compiler and runtime evidence</h3><span>{formatStatus(record.assessment.compileStatus)} · {formatStatus(record.assessment.runtimeStatus)}</span></div>
        <pre>{record.assessment.compilerOutput || 'No compiler output was recorded.'}</pre>
        {record.assessment.infrastructureFailureCode && <p className="submission-notice">Infrastructure failure code: {record.assessment.infrastructureFailureCode}</p>}
      </section>
      <section className="instructor-testcase-panel">
        <div className="instructor-section-title"><h3>Automated assessment evidence</h3><span>{passed} / {record.assessment.testResults.length} passed</span></div>
        <p className="instructor-evidence-note">Assessment evidence is immutable. Hidden cases are shown only in this authorized instructor view.</p>
        {record.assessment.testResults.length === 0
          ? <RequestState kind="empty" compact message="No test-case results were recorded." />
          : record.assessment.testResults.map((result) => (
            <details className="instructor-assessment-case" key={result.testCaseId || `${result.order}:${result.name}`}>
              <summary><strong>{result.name}</strong><span>{result.isHidden ? 'Hidden' : 'Visible'}</span><em className={result.outcome === 'passed' ? 'is-passed' : 'is-failed'}>{formatStatus(result.outcome)}</em><span>{score(result.automatedPoints)} / {score(result.maximumPoints)} points</span></summary>
              <dl><div><dt>Input</dt><dd><pre>{result.input ?? 'No input'}</pre></dd></div><div><dt>Expected output</dt><dd><pre>{result.expectedOutput}</pre></dd></div><div><dt>Actual output</dt><dd><pre>{result.actualOutput ?? 'No output'}</pre></dd></div>{result.errorMessage && <div><dt>Error</dt><dd><pre>{result.errorMessage}</pre></dd></div>}</dl>
            </details>
          ))}
      </section>
    </>
  )
}

function CorrectionHistory({ corrections }) {
  return (
    <section className="instructor-correction-history">
      <h3>Automated-score correction history</h3>
      {corrections.length === 0
        ? <p>No automated-score corrections have been recorded.</p>
        : corrections.map((item) => <article key={item.correctionNumber}><div><strong>Correction {item.correctionNumber}</strong><span>{formatDate(item.correctedAt)}{item.correctedById ? ` · Instructor ${item.correctedById}` : ''}</span></div><p>{score(item.previousEffectiveScore)} → {score(item.newEffectiveScore)} points</p><p>{item.reason}</p></article>)}
    </section>
  )
}

export function InstructorSubmissionReview({ api = activityApi, submissions = submissionApi, pollingOptions }) {
  const capabilities = useCapabilities()
  const { activityId, submissionId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, record: null, error: null, notice: '', bounded: false })
  const [correction, setCorrection] = useState({ newEffectiveScore: '', reason: '' })
  const [review, setReview] = useState({ instructorPoints: '0', feedbackText: '' })
  const [resolution, setResolution] = useState({ resolutionType: 'CLOSED_WITHOUT_REPLACEMENT', reason: '', replacementExpiresAt: '' })
  const [busy, setBusy] = useState('')
  const key = `${selectedClass?.id}:${activityId}:${submissionId}`

  const fetchRecord = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId || !submissionId) return null
    const [activityResponse, submissionResponse] = await Promise.all([
      api.getActivity(activityId, { signal }),
      submissions.getSubmission(submissionId, { signal }),
    ])
    if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
    const record = projectInstructorSubmission(submissionResponse.data)
    if (record.id !== submissionId || record.activityId !== activityId) throw contextMismatchError('The submission does not match this activity.')
    return { activity: activityResponse.data, record }
  }, [activityId, api, selectedClass, submissionId, submissions])

  const load = useCallback(async ({ signal, preserveDraft = false, notice = '' } = {}) => {
    try {
      const result = await fetchRecord({ signal })
      if (!result) return null
      setState({ key, status: 'ready', ...result, error: null, notice, bounded: false })
      if (!preserveDraft) setReview(reviewForm(result.record))
      return result
    } catch (error) {
      if (error?.name !== 'AbortError') setState((current) => ({ ...current, key, status: current.record ? 'ready' : 'error', error, notice: '', bounded: false }))
      return null
    }
  }, [fetchRecord, key])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const pollLoad = useCallback(async (_identity, options) => {
    const result = await fetchRecord(options)
    return { data: result }
  }, [fetchRecord])
  const pollData = useCallback((response) => {
    if (!response.data) return false
    setState((current) => current.key === key ? { ...current, ...response.data, error: null, bounded: false } : current)
    return isInstructorSubmissionPending(response.data.record)
  }, [key])
  const pollError = useCallback((error) => setState((current) => current.key === key ? { ...current, error, bounded: false } : current), [key])
  const pollBounded = useCallback(() => setState((current) => current.key === key ? { ...current, bounded: true } : current), [key])

  const current = state.key === key ? state : { ...state, status: 'loading', activity: null, record: null }
  useBoundedPolling({
    identity: current.record?.id,
    active: Boolean(current.record && isInstructorSubmissionPending(current.record) && !current.error && !current.bounded),
    load: pollLoad,
    onData: pollData,
    onError: pollError,
    onBoundedStop: pollBounded,
    ...pollingOptions,
  })

  const adopt = useCallback((response, notice, syncReview = false) => {
    const record = projectInstructorSubmission(response.data)
    if (record.id !== submissionId || record.activityId !== activityId) {
      throw contextMismatchError('The updated submission does not match this review route.')
    }
    setState((value) => ({ ...value, status: 'ready', record, error: null, notice, bounded: false }))
    if (syncReview) setReview(reviewForm(record))
    return record
  }, [activityId, submissionId])

  const handleMutationError = useCallback(async (error) => {
    if (error?.code === 'STALE_SUBMISSION_VERSION') {
      await load({ preserveDraft: true, notice: 'Another change was recorded. The latest server version is loaded; review your preserved draft before submitting again.' })
    } else {
      setState((value) => ({ ...value, error, notice: '' }))
    }
  }, [load])

  const correctScore = async (event) => {
    event.preventDefault()
    const value = Number(correction.newEffectiveScore)
    if (!Number.isFinite(value) || value < 0 || value > current.record.scores.automatedMaximum || correction.reason.trim().length < 10 || correction.reason.trim().length > 2000) return
    setBusy('correction')
    try {
      const response = await submissions.correctAutomatedScore(submissionId, { newEffectiveScore: value, reason: correction.reason.trim(), expectedUpdatedAt: current.record.updatedAt })
      adopt(response, 'Automated-score correction recorded. Original assessment evidence remains unchanged.')
      setCorrection({ newEffectiveScore: '', reason: '' })
    } catch (error) { await handleMutationError(error) } finally { setBusy('') }
  }

  const saveReview = async (event) => {
    event.preventDefault()
    const points = Number(review.instructorPoints)
    if (!Number.isFinite(points) || points < 0 || points > current.record.scores.instructorMaximum || review.feedbackText.trim().length > 20_000) return
    setBusy('review')
    try {
      const response = await submissions.saveReview(submissionId, { instructorPoints: points, feedbackText: review.feedbackText.trim(), expectedUpdatedAt: current.record.updatedAt })
      adopt(response, review.feedbackText.trim() ? 'Review and private feedback draft saved.' : 'Review saved and the unreleased feedback draft was cleared.', true)
    } catch (error) { await handleMutationError(error) } finally { setBusy('') }
  }

  const release = async () => {
    if (!window.confirm('Release the authoritative final score and feedback to this student? This submission cannot be reopened in the current workflow.')) return
    setBusy('release')
    try {
      const response = await submissions.releaseSubmission(submissionId, { expectedUpdatedAt: current.record.updatedAt })
      adopt(response, 'Final score and feedback released.', true)
    } catch (error) { await handleMutationError(error) } finally { setBusy('') }
  }

  const retry = async () => {
    if (!capabilities.java.execution) return
    if (!window.confirm('Retry assessment for this same immutable submission?')) return
    setBusy('retry')
    try {
      const response = await submissions.retryAssessment(submissionId, { expectedUpdatedAt: current.record.updatedAt })
      adopt(response, 'Assessment retry queued for the same immutable submission.')
    } catch (error) { await handleMutationError(error) } finally { setBusy('') }
  }

  const resolveFailure = async (event) => {
    event.preventDefault()
    const reason = resolution.reason.trim()
    const expiresAt = resolution.replacementExpiresAt ? new Date(resolution.replacementExpiresAt) : null
    if (reason.length < 10 || reason.length > 2000) return
    if (resolution.resolutionType === 'REPLACEMENT_GRANTED' && (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) return
    setBusy('resolution')
    const payload = { resolutionType: resolution.resolutionType, reason, expectedUpdatedAt: current.record.updatedAt }
    if (expiresAt) payload.replacementExpiresAt = expiresAt.toISOString()
    try {
      const response = await submissions.resolveAssessmentFailure(submissionId, payload)
      adopt(response, resolution.resolutionType === 'REPLACEMENT_GRANTED' ? 'Time-limited replacement attempt granted.' : 'Infrastructure failure closed without a replacement.')
      setResolution({ resolutionType: 'CLOSED_WITHOUT_REPLACEMENT', reason: '', replacementExpiresAt: '' })
    } catch (error) { await handleMutationError(error) } finally { setBusy('') }
  }

  if (current.status === 'loading' || current.status === 'idle') return <RequestState kind="loading" message="Loading the instructor submission review." />
  if (current.status === 'error' && !current.record) return <RequestState kind={errorKind(current.error)} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.record || !current.activity) return null

  const record = current.record
  const archived = current.activity.status === 'ARCHIVED' || selectedClass.status === 'ARCHIVED'
  const editable = !archived && canCorrectOrReview(record)
  const projectedFinalScore = record.scores.effectiveAutomatedScore === null ? null : record.scores.effectiveAutomatedScore + Number(review.instructorPoints || 0)
  const correctionValid = Number.isFinite(Number(correction.newEffectiveScore)) && correction.newEffectiveScore !== '' && Number(correction.newEffectiveScore) >= 0 && Number(correction.newEffectiveScore) <= record.scores.automatedMaximum && correction.reason.trim().length >= 10 && correction.reason.trim().length <= 2000
  const reviewValid = Number.isFinite(Number(review.instructorPoints)) && review.instructorPoints !== '' && Number(review.instructorPoints) >= 0 && Number(review.instructorPoints) <= record.scores.instructorMaximum && review.feedbackText.trim().length <= 20_000
  const resolutionValid = resolution.reason.trim().length >= 10 && resolution.reason.trim().length <= 2000 && (resolution.resolutionType !== 'REPLACEMENT_GRANTED' || (resolution.replacementExpiresAt && new Date(resolution.replacementExpiresAt).getTime() > Date.now()))

  return (
    <div className="instructor-review-page instructor-live-review">
      <div className="instructor-assignment-toolbar"><NavLink to={classHref(`/instructor/activity/${activityId}/submissions`, selectedClass.id)} className="student-outline-action">Back to queue</NavLink><em className={`submission-status submission-status--${record.status}`}>{formatStatus(record.status)}</em></div>
      <section className="instructor-page-heading"><p>Selected submission review</p><h2>{record.student.fullName} · {record.activityTitle}</h2><span>{record.attemptLabel} · Submitted {formatDate(record.submittedAt)}{record.isLate ? ' · Accepted late' : ''}</span></section>
      {state.notice && <RequestState kind={state.notice.startsWith('Another') ? 'conflict' : 'empty'} compact title={state.notice.startsWith('Another') ? 'Latest version loaded' : 'Submission updated'} message={state.notice} />}
      {current.error && <RequestState kind="unavailable" compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load({ preserveDraft: true })}>Refresh record</button>} />}
      {archived && <RequestState kind="unavailable" compact title="Archived record" message="Archived classes and activities are read-only." />}
      {isInstructorSubmissionPending(record) && <p className="submission-notice">Assessment is processing. This page refreshes the authoritative status without changing the submission.</p>}
      {current.bounded && <p className="submission-notice">Automatic refresh stopped after the bounded polling window. Assessment may still be processing.</p>}
      {(current.bounded || current.error) && isInstructorSubmissionPending(record) && <button type="button" className="student-outline-action" onClick={() => load({ preserveDraft: true })}>Refresh assessment status</button>}

      <dl className="activity-facts instructor-submission-facts"><div><dt>Student</dt><dd>{record.student.fullName}{record.student.email && <small>{record.student.email}</small>}</dd></div><div><dt>Attempt record</dt><dd>{record.attemptLabel}<small>{record.countsTowardAttemptLimit ? 'Counts toward normal allowance' : 'Does not count toward normal allowance'}</small></dd></div><div><dt>Credited-result policy</dt><dd>{current.activity.creditPolicy === 'HIGHEST' ? 'Highest released attempt' : 'Latest released attempt'}{record.isCreditedResult && <small>Current credited result</small>}</dd></div><div><dt>Activity state</dt><dd>{formatStatus(current.activity.status)}</dd></div></dl>
      <div className="instructor-review-grid">
        <section className="instructor-code-card"><div className="instructor-section-title"><h3>Immutable submitted source</h3><span>Read-only</span></div><pre>{record.sourceCode || 'No source snapshot was returned.'}</pre></section>
        <aside className="instructor-review-side"><AssessmentEvidence record={record} /></aside>
      </div>

      <section className="instructor-score-panel">
        <div className="instructor-section-title"><h3>Score components</h3><span>Server-authorized values</span></div>
        <dl className="activity-facts"><div><dt>Original automated</dt><dd>{score(record.scores.originalAutomatedScore)} / {score(record.scores.automatedMaximum)}</dd></div><div><dt>Effective automated</dt><dd>{score(record.scores.effectiveAutomatedScore)} / {score(record.scores.automatedMaximum)}</dd></div><div><dt>Instructor points</dt><dd>{score(record.scores.instructorPoints)} / {score(record.scores.instructorMaximum)}</dd></div><div><dt>{record.status === 'released' ? 'Released final score' : 'Projected final score'}</dt><dd>{record.status === 'released' ? score(record.scores.finalScore) : score(projectedFinalScore)} / {score(record.scores.totalPoints)}</dd></div></dl>
        <CorrectionHistory corrections={record.corrections} />
        {editable && <form className="instructor-correction-form" onSubmit={correctScore}><h3>Edit Automated Score</h3><p>This appends a correction; it never rewrites the original evidence.</p><label>New effective automated score<input type="number" min="0" max={record.scores.automatedMaximum} step="0.01" value={correction.newEffectiveScore} onChange={(event) => setCorrection((value) => ({ ...value, newEffectiveScore: event.target.value }))} /></label><label>Correction reason<textarea value={correction.reason} maxLength={2000} onChange={(event) => setCorrection((value) => ({ ...value, reason: event.target.value }))} /></label><button type="submit" className="student-outline-action" disabled={!correctionValid || Boolean(busy)}>{busy === 'correction' ? 'Recording…' : 'Record correction'}</button></form>}
      </section>

      {editable && <form className="instructor-feedback-panel instructor-live-feedback" onSubmit={saveReview}><label>Private feedback draft<textarea value={review.feedbackText} maxLength={20000} onChange={(event) => setReview((value) => ({ ...value, feedbackText: event.target.value }))} /><small>Saving an empty field clears the unreleased draft.</small></label><label>Instructor points<input type="number" min="0" max={record.scores.instructorMaximum} step="0.01" value={review.instructorPoints} onChange={(event) => setReview((value) => ({ ...value, instructorPoints: event.target.value }))} /></label><div className="instructor-form-actions"><button type="submit" className="student-primary-action" disabled={!reviewValid || Boolean(busy)}>{busy === 'review' ? 'Saving…' : 'Save review draft'}</button></div></form>}

      {canRelease(record) && !archived && <section className="instructor-release-panel"><div><h3>Release result</h3><p>Release snapshots the server-calculated final score and makes this submission immutable.</p></div><button type="button" className="student-primary-action" disabled={Boolean(busy)} onClick={release}>{busy === 'release' ? 'Releasing…' : 'Release final result'}</button></section>}
      {record.status === 'released' && <section className="submission-released-result"><p className="student-feedback-eyebrow">{record.isCreditedResult ? 'Credited result' : 'Released result'}</p><h2>{score(record.scores.finalScore)} / {score(record.scores.totalPoints)} points</h2><p>{record.feedback?.text || 'No textual feedback was released.'}</p>{record.feedback?.releasedAt && <small>Feedback released {formatDate(record.feedback.releasedAt)}</small>}</section>}

      {canResolveAssessmentFailure(record) && !archived && <section className="instructor-failure-panel"><div className="instructor-section-title"><h3>Infrastructure assessment failure</h3><span>The original submission remains immutable</span></div><p>Retry the same assessment first when appropriate, or explicitly resolve the infrastructure failure.</p><button type="button" className="student-outline-action" onClick={retry} disabled={Boolean(busy) || !capabilities.java.execution}>{busy === 'retry' ? 'Queueing retry…' : 'Retry same assessment'}</button>{!capabilities.java.execution && <p className="activity-lifecycle-note">Java assessment retry is unavailable in this environment.</p>}<form onSubmit={resolveFailure}><label>Resolution<select value={resolution.resolutionType} onChange={(event) => setResolution((value) => ({ ...value, resolutionType: event.target.value, replacementExpiresAt: '' }))}><option value="CLOSED_WITHOUT_REPLACEMENT">Close without replacement</option><option value="REPLACEMENT_GRANTED">Grant replacement attempt</option></select></label>{resolution.resolutionType === 'REPLACEMENT_GRANTED' && <label>Replacement expires (local time)<input type="datetime-local" value={resolution.replacementExpiresAt} onChange={(event) => setResolution((value) => ({ ...value, replacementExpiresAt: event.target.value }))} /><small>The browser converts this local time to an unambiguous ISO timestamp. The server decides whether the grant remains valid.</small></label>}<label>Mandatory reason<textarea value={resolution.reason} maxLength={2000} onChange={(event) => setResolution((value) => ({ ...value, reason: event.target.value }))} /></label><button type="submit" className="student-primary-action" disabled={!resolutionValid || Boolean(busy)}>{busy === 'resolution' ? 'Resolving…' : 'Resolve failure'}</button></form></section>}

      {record.failureResolution && <section className="submission-resolution instructor-resolution-record"><h2>Infrastructure resolution</h2><p>{formatStatus(record.failureResolution.resolutionType)}</p><p>{record.failureResolution.reason}</p><dl><div><dt>Resolved</dt><dd>{formatDate(record.failureResolution.resolvedAt)}</dd></div>{record.failureResolution.replacementExpiresAt && <div><dt>Replacement expiration</dt><dd>{formatDate(record.failureResolution.replacementExpiresAt)}</dd></div>}<div><dt>Replacement status</dt><dd>{record.failureResolution.replacementConsumedAt ? `Consumed ${formatDate(record.failureResolution.replacementConsumedAt)}` : record.failureResolution.replacementExpiresAt ? 'Unconsumed; the server enforces expiration when the student submits' : 'No replacement granted'}</dd></div></dl></section>}
    </div>
  )
}

export function InstructorActivityMonitorRedirect() {
  const { activityId } = useParams()
  const { selectedClass, requestedClassId, selectionStatus } = useClasses()
  if (selectionStatus !== 'ready') return <RequestState kind="loading" message="Resolving the selected class." />
  if (!selectedClass || !activityId) return <RequestState kind="notFound" />
  return <Navigate replace to={classHref(`/instructor/activity/${activityId}/submissions`, selectedClass.id || requestedClassId)} />
}
