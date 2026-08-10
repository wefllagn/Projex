import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { activityApi } from './activity-api.js'
import {
  ACTIVITY_STATUSES,
  activityClassMatches,
  activityPayload,
  activityUpdatePayload,
  formatActivityDate,
  formatActivityStatus,
  publicationRequirements,
  testCasePayload,
  toDateTimeLocal,
  validateActivityForm,
  validateTestCases,
} from './activity-utils.js'

const FIRST_PAGE = { page: 1, pageSize: 20 }
const EMPTY_FORM = {
  title: '',
  instructions: '',
  dueDate: '',
  entryClassName: 'Main',
  starterCode: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  maxAttempts: '1',
  totalPoints: '100',
}

function contextMismatchError() {
  return new ApiError({ status: 404, code: 'ACTIVITY_NOT_FOUND', message: 'The activity is not available in the selected class.' })
}

function formFromActivity(activity) {
  return {
    title: activity.title,
    instructions: activity.instructions,
    dueDate: toDateTimeLocal(activity.dueDate),
    entryClassName: activity.entryClassName,
    starterCode: activity.starterCode,
    maxAttempts: String(activity.maxAttempts),
    totalPoints: String(activity.totalPoints),
  }
}

function rowsFromResponse(testCases) {
  return testCases.map((testCase) => ({
    id: testCase.id,
    name: testCase.name,
    inputData: testCase.inputData ?? '',
    expectedOutput: testCase.expectedOutput,
    isHidden: Boolean(testCase.isHidden),
    points: String(testCase.points),
  }))
}

function emptyTestCase() {
  return { id: crypto.randomUUID(), name: '', inputData: '', expectedOutput: '', isHidden: false, points: '0' }
}

function ActivityFormFields({ form, errors, onChange, readOnly, status }) {
  const published = status === 'PUBLISHED'
  return (
    <>
      <div className="instructor-form-grid">
        <label>
          Activity title
          <input aria-invalid={Boolean(errors.title)} value={form.title} onChange={(event) => onChange('title', event.target.value)} disabled={readOnly} />
          {errors.title && <small className="activity-field-error">{errors.title}</small>}
        </label>
        <label>
          Programming language
          <span className="instructor-fixed-value">Java</span>
        </label>
        <label>
          Deadline
          <input type="datetime-local" aria-invalid={Boolean(errors.dueDate)} value={form.dueDate} onChange={(event) => onChange('dueDate', event.target.value)} disabled={readOnly} />
          {errors.dueDate && <small className="activity-field-error">{errors.dueDate}</small>}
        </label>
        <label>
          Maximum attempts
          <select aria-invalid={Boolean(errors.maxAttempts)} value={form.maxAttempts} onChange={(event) => onChange('maxAttempts', event.target.value)} disabled={readOnly}>
            <option value="1">1 attempt</option><option value="2">2 attempts</option><option value="3">3 attempts</option>
          </select>
          {errors.maxAttempts && <small className="activity-field-error">{errors.maxAttempts}</small>}
        </label>
        <label>
          Java entry class
          <input aria-invalid={Boolean(errors.entryClassName)} value={form.entryClassName} onChange={(event) => onChange('entryClassName', event.target.value)} disabled={readOnly || published} />
          {errors.entryClassName && <small className="activity-field-error">{errors.entryClassName}</small>}
        </label>
        <label>
          Total points
          <input type="number" min="0.01" max="1000" step="0.01" aria-invalid={Boolean(errors.totalPoints)} value={form.totalPoints} onChange={(event) => onChange('totalPoints', event.target.value)} disabled={readOnly || published} />
          {errors.totalPoints && <small className="activity-field-error">{errors.totalPoints}</small>}
        </label>
      </div>
      <label className="instructor-wide-field">
        Instructions
        <textarea aria-invalid={Boolean(errors.instructions)} value={form.instructions} onChange={(event) => onChange('instructions', event.target.value)} disabled={readOnly} />
        {errors.instructions && <small className="activity-field-error">{errors.instructions}</small>}
      </label>
      <label className="instructor-wide-field">
        Starter source
        <textarea className="activity-source-input" aria-invalid={Boolean(errors.starterCode)} value={form.starterCode} onChange={(event) => onChange('starterCode', event.target.value)} disabled={readOnly || published} />
        {errors.starterCode && <small className="activity-field-error">{errors.starterCode}</small>}
      </label>
      {published && <p className="activity-lifecycle-note">Published scoring, starter source, language, entry class, and test cases are immutable. The deadline may only be extended and the attempt limit may only increase.</p>}
    </>
  )
}

function TestCaseEditor({ activity, testCases, setTestCases, dirty, setDirty, busy, onSave }) {
  const editable = activity.status === 'DRAFT'
  const errors = validateTestCases(testCases, activity.totalPoints)
  const points = testCases.reduce((sum, testCase) => sum + (Number(testCase.points) || 0), 0)
  const update = (index, field, value) => {
    setDirty(true)
    setTestCases((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  }
  const move = (index, offset) => {
    const target = index + offset
    if (target < 0 || target >= testCases.length) return
    setDirty(true)
    setTestCases((rows) => {
      const next = [...rows]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <section className="instructor-testcase-panel activity-testcase-editor">
      <div className="instructor-section-title">
        <div><h3>Test cases</h3><p>{testCases.length} of 50 · {points} of {activity.totalPoints} activity points</p></div>
        {editable && <button type="button" onClick={() => { setDirty(true); setTestCases((rows) => [...rows, emptyTestCase()]) }} disabled={testCases.length >= 50 || busy}>Add test case</button>}
      </div>
      {!editable && <p className="activity-lifecycle-note">Test cases are read-only after publication.</p>}
      {testCases.length === 0 && <RequestState kind="empty" compact message="Add at least one test case and keep at least one visible before publishing." />}
      <div className="activity-testcase-list">
        {testCases.map((testCase, index) => (
          <fieldset key={testCase.id} disabled={!editable || busy}>
            <legend>Test case {index + 1}</legend>
            <div className="instructor-form-grid">
              <label>Name<input value={testCase.name} onChange={(event) => update(index, 'name', event.target.value)} /></label>
              <label>Points<input type="number" min="0" max="1000" step="0.01" value={testCase.points} onChange={(event) => update(index, 'points', event.target.value)} /></label>
              <label className="activity-testcase-wide">Input<textarea value={testCase.inputData} onChange={(event) => update(index, 'inputData', event.target.value)} /></label>
              <label className="activity-testcase-wide">Expected output<textarea value={testCase.expectedOutput} onChange={(event) => update(index, 'expectedOutput', event.target.value)} /></label>
            </div>
            <div className="activity-testcase-actions">
              <label><input type="checkbox" checked={testCase.isHidden} onChange={(event) => update(index, 'isHidden', event.target.checked)} /> Hidden from students</label>
              {editable && <div><button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Move up</button><button type="button" onClick={() => move(index, 1)} disabled={index === testCases.length - 1}>Move down</button><button type="button" onClick={() => { setDirty(true); setTestCases((rows) => rows.filter((_, rowIndex) => rowIndex !== index)) }}>Remove</button></div>}
            </div>
          </fieldset>
        ))}
      </div>
      {errors.length > 0 && <ul className="activity-validation-summary">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
      {editable && <div className="instructor-form-actions"><button type="button" className="student-primary-action" onClick={onSave} disabled={!dirty || busy || errors.length > 0}>{busy ? 'Saving…' : 'Save test cases'}</button><p>{dirty ? 'Unsaved test-case changes.' : 'Test cases match the server.'}</p></div>}
    </section>
  )
}

export function InstructorActivityList({ api = activityApi }) {
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
      if (error?.name !== 'AbortError') setState({ classId: selectedClass.id, status: 'error', items: [], pagination: null, error })
    }
  }, [api, query, selectedClass])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const current = state.classId === selectedClass?.id ? state : { ...state, status: 'loading', items: [] }
  return (
    <div className="student-assignment-panel instructor-assignment-panel">
      <div className="instructor-assignment-toolbar instructor-assignment-toolbar--board">
        <div><strong>Programming Activities</strong><p>Repository-backed authoring for {selectedClass?.className}.</p></div>
        <div className="instructor-assignment-toolbar-actions">
          <label className="instructor-status-filter"><span>Status</span><select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}><option value="">All statuses</option>{ACTIVITY_STATUSES.map((status) => <option value={status} key={status}>{formatActivityStatus(status)}</option>)}</select></label>
          {selectedClass?.status === 'ARCHIVED'
            ? <button type="button" className="student-primary-action instructor-create-action" disabled title="Archived classes are read-only.">Create Activity</button>
            : <NavLink to={classHref('/instructor/activity/new', selectedClass?.id)} className="student-primary-action instructor-create-action">Create Activity</NavLink>}
        </div>
      </div>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading programming activities." />}
      {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {current.status === 'ready' && current.items.length === 0 && <RequestState kind="empty" compact message="Create a draft activity for this class to begin." />}
      {current.status === 'ready' && current.items.length > 0 && (
        <div className="instructor-data-table instructor-assignment-board-table" role="table" aria-label="Programming activities">
          <div className="instructor-table-row instructor-table-row--head instructor-activity-row" role="row"><span>Activity</span><span>Language</span><span>Due date</span><span>Attempts</span><span>Status</span><span>Actions</span></div>
          {current.items.map((activity) => (
            <div className="instructor-table-row instructor-activity-row" role="row" key={activity.id}>
              <div className="instructor-assignment-name"><span className="instructor-assignment-file instructor-assignment-file--blue" aria-hidden="true" /><div><strong>{activity.title}</strong><span>{activity.instructions}</span><em>{activity.totalPoints} points</em></div></div>
              <span>Java</span><span>{formatActivityDate(activity.dueDate)}</span><span>{activity.maxAttempts}</span>
              <em className={`instructor-assignment-status instructor-assignment-status--${activity.status.toLowerCase()}`}>{formatActivityStatus(activity.status)}</em>
              <div><NavLink to={classHref(`/instructor/activity/${activity.id}/settings`, selectedClass.id)}>Configure</NavLink></div>
            </div>
          ))}
        </div>
      )}
      {current.pagination && current.pagination.totalPages > 1 && <nav className="activity-pagination" aria-label="Activity pages"><button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => setQuery((value) => ({ ...value, page: current.pagination.page - 1 }))}>Previous</button><span>Page {current.pagination.page} of {current.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => setQuery((value) => ({ ...value, page: current.pagination.page + 1 }))}>Next</button></nav>}
    </div>
  )
}

export function InstructorActivityEditor({ api = activityApi, mode = 'edit' }) {
  const navigate = useNavigate()
  const { activityId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const creating = mode === 'create'
  const [state, setState] = useState({ key: null, status: creating ? 'ready' : 'idle', activity: null, testCases: [], error: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formDirty, setFormDirty] = useState(false)
  const [testCases, setTestCases] = useState([])
  const [testsDirty, setTestsDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async ({ signal, preserveEdits = false } = {}) => {
    if (creating || !selectedClass || !activityId) return
    const key = `${selectedClass.id}:${activityId}`
    try {
      const [activityResponse, testCaseResponse] = await Promise.all([
        api.getActivity(activityId, { signal }),
        api.listTestCases(activityId, { page: 1, pageSize: 50 }, { signal }),
      ])
      if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
      const activity = activityResponse.data
      const rows = rowsFromResponse(testCaseResponse.data)
      setState({ key, status: 'ready', activity, testCases: rows, error: null })
      if (!preserveEdits) {
        setForm(formFromActivity(activity)); setFormDirty(false); setTestCases(rows); setTestsDirty(false); setErrors({}); setNotice('')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, testCases: [], error })
    }
  }, [activityId, api, creating, selectedClass])

  useEffect(() => {
    if (creating || selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [creating, load, selectionStatus])

  const handleConflict = async (error) => {
    setNotice(describeApiError(error))
    await load({ preserveEdits: true })
  }
  const handleError = async (error) => {
    if (error?.status === 409) await handleConflict(error)
    else setNotice(describeApiError(error))
  }
  const changeForm = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setFormDirty(true); setErrors((current) => ({ ...current, [field]: undefined })); setNotice('') }

  const create = async (event) => {
    event.preventDefault()
    const nextErrors = validateActivityForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !selectedClass) return
    setBusy('create'); setNotice('')
    try {
      const response = await api.createActivity(selectedClass.id, activityPayload(form, 'DRAFT'))
      navigate(classHref(`/instructor/activity/${response.data.id}/settings`, selectedClass.id), { replace: true })
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const saveActivity = async () => {
    const nextErrors = validateActivityForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !state.activity) return
    setBusy('activity'); setNotice('')
    try {
      const changes = activityUpdatePayload(form, state.activity)
      if (Object.keys(changes).length === 0) {
        setFormDirty(false); setNotice('Activity fields already match the server.'); return
      }
      const response = await api.updateActivity(state.activity.id, { expectedUpdatedAt: state.activity.updatedAt, ...changes })
      setState((current) => ({ ...current, activity: response.data }))
      setForm(formFromActivity(response.data)); setFormDirty(false); setNotice('Activity saved.')
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const saveTestCases = async () => {
    const testErrors = validateTestCases(testCases, state.activity.totalPoints)
    if (testErrors.length > 0) { setNotice(testErrors[0]); return }
    setBusy('tests'); setNotice('')
    try {
      const response = await api.replaceTestCases(state.activity.id, { expectedUpdatedAt: state.activity.updatedAt, testCases: testCasePayload(testCases) })
      const activity = { ...state.activity, updatedAt: response.data.activityUpdatedAt }
      const rows = rowsFromResponse(response.data.testCases)
      setState((current) => ({ ...current, activity, testCases: rows }))
      setTestCases(rows); setTestsDirty(false); setNotice('Test cases saved. The latest activity version is now active.')
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const transition = async (action) => {
    if (!state.activity || formDirty || testsDirty) return
    if (!window.confirm(`Confirm ${action} for this activity?`)) return
    setBusy(action); setNotice('')
    try {
      const response = await api.transition(state.activity.id, action, { expectedUpdatedAt: state.activity.updatedAt })
      setState((current) => ({ ...current, activity: response.data }))
      setForm(formFromActivity(response.data)); setFormDirty(false); setNotice(`Activity ${action} succeeded.`)
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const currentKey = `${selectedClass?.id}:${activityId}`
  const current = creating || state.key === currentKey ? state : { ...state, status: 'loading', activity: null }
  const readOnly = Boolean(current.activity && (current.activity.status === 'CLOSED' || current.activity.status === 'ARCHIVED' || selectedClass?.status === 'ARCHIVED'))
  const publishReasons = useMemo(() => current.activity ? publicationRequirements(current.activity, testCases) : [], [current.activity, testCases])

  if (!creating && current.status === 'loading') return <RequestState kind="loading" message="Loading activity settings." />
  if (!creating && current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />

  return (
    <div className="student-assignment-panel instructor-assignment-panel instructor-form-panel">
      <div className="instructor-assignment-toolbar"><NavLink to={classHref('/instructor/activity', selectedClass?.id)} className="student-outline-action">Back to activities</NavLink>{current.activity && <span className="class-status-chip">{formatActivityStatus(current.activity.status)}</span>}</div>
      <section className="instructor-page-heading"><p>{creating ? 'Create Activity' : 'Activity Settings'}</p><h2>{creating ? 'Programming activity setup' : current.activity?.title}</h2><span>{creating ? 'Create a server-backed draft before configuring its test cases.' : 'Manage only the fields and lifecycle transitions supported by Projex.'}</span></section>
      {notice && <RequestState kind={notice.includes('changed while') ? 'conflict' : 'unavailable'} compact title={notice.includes('changed while') ? 'Latest server version loaded' : 'Action not completed'} message={notice} />}
      <form onSubmit={create}>
        <ActivityFormFields form={form} errors={errors} onChange={changeForm} readOnly={readOnly || Boolean(busy)} status={current.activity?.status || 'DRAFT'} />
        <div className="instructor-form-actions">
          {creating ? <button type="submit" className="student-primary-action" disabled={busy === 'create' || selectedClass?.status === 'ARCHIVED'}>{busy === 'create' ? 'Creating…' : 'Create draft'}</button> : <button type="button" className="student-primary-action" onClick={saveActivity} disabled={!formDirty || readOnly || Boolean(busy)}>{busy === 'activity' ? 'Saving…' : 'Save activity'}</button>}
          <p>{creating ? 'Test cases become available after the draft is created.' : formDirty ? 'Unsaved activity changes.' : 'Activity fields match the server.'}</p>
        </div>
      </form>
      {current.activity && <TestCaseEditor activity={current.activity} testCases={testCases} setTestCases={setTestCases} dirty={testsDirty} setDirty={setTestsDirty} busy={Boolean(busy)} onSave={saveTestCases} />}
      {current.activity && (
        <section className="activity-lifecycle-panel">
          <div><h3>Lifecycle</h3><p>Lifecycle actions use the latest server version. Save all edits first.</p></div>
          {current.activity.status === 'DRAFT' && publishReasons.length > 0 && <ul>{publishReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
          <div className="instructor-form-actions">
            {current.activity.status === 'DRAFT' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || formDirty || testsDirty || publishReasons.length > 0 || selectedClass?.status === 'ARCHIVED'} onClick={() => transition('publish')}>Publish</button>}
            {current.activity.status === 'PUBLISHED' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || formDirty || selectedClass?.status === 'ARCHIVED'} onClick={() => transition('close')}>Close</button>}
            {current.activity.status !== 'ARCHIVED' && <button type="button" className="student-outline-action" disabled={Boolean(busy) || formDirty || testsDirty || selectedClass?.status === 'ARCHIVED'} onClick={() => transition('archive')}>Archive</button>}
            {current.activity.status === 'ARCHIVED' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || selectedClass?.status === 'ARCHIVED'} onClick={() => transition('restore')}>Restore</button>}
          </div>
        </section>
      )}
    </div>
  )
}
