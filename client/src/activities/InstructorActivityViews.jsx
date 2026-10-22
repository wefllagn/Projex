import AppDialog from '../components/AppDialog.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import { TopicSelector, GroupedClasswork } from './TopicViews.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { ProjexStatus } from '../design/ProjexStatus.jsx'
import { activityApi } from './activity-api.js'
import {
  activityClassMatches,
  activityPayload,
  activityUpdatePayload,
  formatActivityStatus,
  publicationRequirements,
  testCasePayload,
  toDateTimeLocal,
  validateActivityForm,
  validateTestCases,
} from './activity-utils.js'
import { createTemporaryTestCaseId } from './temporary-test-case-id.js'

const EMPTY_FORM = {
  gradingMode: 'GRADED',
  topicId: '',
  title: '',
  instructions: '',
  dueDate: '',
  entryClassName: 'Main',
  starterCode: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  maxAttempts: '1',
  creditPolicy: 'LATEST',
  totalPoints: '100',
}

function contextMismatchError() {
  return new ApiError({ status: 404, code: 'ACTIVITY_NOT_FOUND', message: 'The activity is not available in the selected class.' })
}

function formFromActivity(activity) {
  return {
    gradingMode: activity.gradingMode ?? 'GRADED',
    topicId: activity.topicId ?? '',
    title: activity.title,
    instructions: activity.instructions,
    dueDate: toDateTimeLocal(activity.dueDate),
    entryClassName: activity.entryClassName,
    starterCode: activity.starterCode,
    maxAttempts: String(activity.maxAttempts),
    creditPolicy: activity.creditPolicy ?? 'LATEST',
    totalPoints: activity.totalPoints === null ? '' : String(activity.totalPoints),
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
  return { id: createTemporaryTestCaseId(), name: '', inputData: '', expectedOutput: '', isHidden: false, points: '0' }
}

function ActivityFormFields({ form, errors, onChange, readOnly, status, section, topicSelector }) {
  const frozen = readOnly || status === 'PUBLISHED'
  const field = key => ({ 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `activity-${key}-error` : undefined })
  const error = key => errors[key] && <small id={`activity-${key}-error`} className="activity-field-error">{errors[key]}</small>
  return <>
    <div className="activity-settings-details" role="tabpanel" id="activity-settings-details" aria-labelledby="activity-tab-details" hidden={section !== 'details'}>
      <div className="activity-settings-description">{topicSelector}<section className="activity-authoring-section"><h3>Activity details</h3><label>Activity title<input {...field('title')} value={form.title} onChange={event => onChange('title', event.target.value)} disabled={readOnly} />{error('title')}</label><label>Instructions<GrowingTextarea {...field('instructions')} value={form.instructions} onChange={event => onChange('instructions', event.target.value)} disabled={readOnly} />{error('instructions')}</label></section></div>
      <div className="activity-settings-policy"><section className="activity-authoring-section"><h3>Grading</h3><div className="instructor-form-grid"><label>Grading mode<select value={form.gradingMode} onChange={event => onChange('gradingMode', event.target.value)} disabled={frozen}><option value="GRADED">Graded</option><option value="COMPLETION">Ungraded · completion</option></select></label>{form.gradingMode !== 'COMPLETION' && <><label>Total points<input type="number" min="0.01" max="1000" step="0.01" {...field('totalPoints')} value={form.totalPoints} onChange={event => onChange('totalPoints', event.target.value)} disabled={frozen} />{error('totalPoints')}</label><label>Credited result<select {...field('creditPolicy')} value={form.creditPolicy} onChange={event => onChange('creditPolicy', event.target.value)} disabled={frozen}><option value="LATEST">Latest attempt</option><option value="HIGHEST">Highest attempt</option></select>{error('creditPolicy')}</label></>}</div></section>
      <section className="activity-authoring-section"><h3>Deadline &amp; attempts</h3><div className="instructor-form-grid"><label>Deadline<input type="datetime-local" {...field('dueDate')} value={form.dueDate} onChange={event => onChange('dueDate', event.target.value)} disabled={readOnly} />{error('dueDate')}</label><label>Maximum attempts<select {...field('maxAttempts')} value={form.maxAttempts} onChange={event => onChange('maxAttempts', event.target.value)} disabled={readOnly}><option value="1">1 attempt</option><option value="2">2 attempts</option><option value="3">3 attempts</option></select>{error('maxAttempts')}</label></div></section></div>
      {status === 'PUBLISHED' && <p className="activity-lifecycle-note">Published grading and test cases are locked. You can extend the deadline or increase attempts.</p>}
    </div>
    <section className="activity-authoring-section" role="tabpanel" id="activity-settings-java" aria-labelledby="activity-tab-java" hidden={section !== 'java'}><h3>Java starter</h3><div className="instructor-form-grid"><label>Programming language<span className="instructor-fixed-value">Java</span></label><label>Java entry class<input {...field('entryClassName')} value={form.entryClassName} onChange={event => onChange('entryClassName', event.target.value)} disabled={frozen} />{error('entryClassName')}</label></div><label>Starter source<GrowingTextarea className="activity-source-input" {...field('starterCode')} value={form.starterCode} onChange={event => onChange('starterCode', event.target.value)} disabled={frozen} />{error('starterCode')}</label></section>
  </>
}

function GrowingTextarea(props) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${Math.min(260, Math.max(72, ref.current.scrollHeight))}px` } }, [props.value])
  return <textarea {...props} ref={ref} rows={3} />
}
function TestCaseEditor({ activity, testCases, setTestCases, dirty, setDirty, busy, onSave }) {
  const [selected, setSelected] = useState(null)
  const [removing, setRemoving] = useState(false)
  const nameInput = useRef(null)
  const editable = activity.status === 'DRAFT'
  const completion = activity.gradingMode === 'COMPLETION'
  const index = Math.max(0, testCases.findIndex(row => row.id === selected))
  const row = testCases[index]
  const errors = validateTestCases(testCases, activity.totalPoints, activity.gradingMode)
  const update = (field, value) => { setDirty(true); setTestCases(rows => rows.map(item => item.id === row.id ? { ...item, [field]: value } : item)) }
  const move = offset => {
    const target = index + offset
    if (target < 0 || target >= testCases.length) return
    setSelected(row.id); setDirty(true)
    setTestCases(rows => { const next = [...rows]; [next[index], next[target]] = [next[target], next[index]]; return next })
  }
  const add = () => { const item = emptyTestCase(); setDirty(true); setTestCases(rows => [...rows, item]); setSelected(item.id); requestAnimationFrame(() => nameInput.current?.focus()) }
  return <section className="instructor-testcase-panel activity-testcase-editor"><div className="instructor-section-title"><div><h3>Test cases</h3><p>{testCases.length} of 50{!completion && ` · ${testCases.reduce((sum, testCase) => sum + (Number(testCase.points) || 0), 0)} of ${activity.totalPoints} points`}</p></div>{editable && <button type="button" className="student-outline-action" onClick={add} disabled={testCases.length >= 50 || busy}>Add test case</button>}</div>{!editable && <p>Test cases are read-only after publication.</p>}{testCases.length === 0 && <p>Add a visible test case to provide feedback.</p>}<div className="case-workbench"><nav className="case-navigator" aria-label="Test cases">{testCases.map((item, number) => <button type="button" key={item.id} aria-current={row?.id === item.id ? 'true' : undefined} onClick={() => setSelected(item.id)}><strong>{number + 1}. {item.name || 'Untitled case'}</strong><small>{item.isHidden ? 'Hidden' : 'Visible'}</small></button>)}</nav>{row && <fieldset className="case-selected" disabled={!editable || busy}><legend>Test case {index + 1}</legend><div className="instructor-form-grid"><label>Name<input ref={nameInput} value={row.name} onChange={event => update('name', event.target.value)} /></label>{!completion && <label>Points<input type="number" min="0" max="1000" step="0.01" value={row.points} onChange={event => update('points', event.target.value)} /></label>}<label className="activity-testcase-wide">Input<GrowingTextarea value={row.inputData} onChange={event => update('inputData', event.target.value)} /></label><label className="activity-testcase-wide">Expected output<GrowingTextarea value={row.expectedOutput} onChange={event => update('expectedOutput', event.target.value)} /></label></div><label><input type="checkbox" checked={row.isHidden} onChange={event => update('isHidden', event.target.checked)} /> Hidden from students</label>{editable && <div className="activity-testcase-actions"><button type="button" onClick={() => move(-1)} disabled={index === 0}>Move up</button><button type="button" onClick={() => move(1)} disabled={index === testCases.length - 1}>Move down</button><button type="button" onClick={() => setRemoving(true)}>Remove</button></div>}</fieldset>}</div>{errors.length > 0 && <div className="activity-validation-summary" role="alert"><strong>Check your test cases</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}{editable && <div className="instructor-form-actions"><button type="button" className="student-primary-action" onClick={onSave} disabled={!dirty || busy || errors.length > 0}>{busy ? 'Saving…' : 'Save test cases'}</button>{dirty && <p>Unsaved test-case changes.</p>}</div>}{removing && <AppDialog title="Remove test case?" onClose={() => setRemoving(false)}><p>Remove “{row?.name || `Test case ${index + 1}`}” from this draft?</p><footer><button type="button" className="student-primary-action" onClick={() => setRemoving(false)}>Keep case</button><button type="button" className="student-outline-action" onClick={() => { setDirty(true); setTestCases(rows => rows.filter(item => item.id !== row.id)); setRemoving(false) }}>Remove case</button></footer></AppDialog>}</section>
}

export function InstructorActivityList({ api = activityApi }) {
  const { selectedClass } = useClasses()
  return selectedClass ? <GroupedClasswork key={selectedClass.id} classId={selectedClass.id} instructor editable={selectedClass.status !== 'ARCHIVED'} api={api} /> : null
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
  const [confirmation, setConfirmation] = useState('')
  const [settingsSection, setSettingsSection] = useState('details')
  const mutationLock = useRef(false)
  const acceptedNavigation = useRef(false)

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
      if (error?.name !== 'AbortError') setState(previous => preserveEdits && previous.activity ? { ...previous, error } : { key, status: 'error', activity: null, testCases: [], error })
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
    if (Object.keys(nextErrors).length) setSettingsSection(nextErrors.entryClassName || nextErrors.starterCode ? 'java' : 'details')
    if (Object.keys(nextErrors).length > 0 || !selectedClass) return
    setBusy('create'); setNotice('')
    try {
      const response = await api.createActivity(selectedClass.id, activityPayload(form, 'DRAFT'))
      acceptedNavigation.current = true
      navigate(classHref(`/instructor/activity/${response.data.id}/settings`, selectedClass.id), { replace: true })
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const saveActivity = async () => {
    const nextErrors = validateActivityForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) setSettingsSection(nextErrors.entryClassName || nextErrors.starterCode ? 'java' : 'details')
    if (Object.keys(nextErrors).length > 0 || !state.activity) return
    setBusy('activity'); setNotice('')
    try {
      const changes = activityUpdatePayload(form, state.activity)
      if (Object.keys(changes).length === 0) {
        setFormDirty(false); setNotice('No changes to save.'); return
      }
      const response = await api.updateActivity(state.activity.id, { expectedUpdatedAt: state.activity.updatedAt, ...changes })
      setState((current) => ({ ...current, activity: response.data }))
      if ((response.data.gradingMode ?? 'GRADED') !== (state.activity.gradingMode ?? 'GRADED')) { setTestCases(rows => rows.map(row => ({ ...row, points: response.data.gradingMode === 'COMPLETION' ? '' : '0' }))); setTestsDirty(true) }
      setForm(formFromActivity(response.data)); setFormDirty(false); setNotice('Activity saved.')
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const saveTestCases = async () => {
    const testErrors = validateTestCases(testCases, state.activity.totalPoints, state.activity.gradingMode)
    if (testErrors.length > 0) { setNotice(testErrors[0]); return }
    setBusy('tests'); setNotice('')
    try {
      const response = await api.replaceTestCases(state.activity.id, { expectedUpdatedAt: state.activity.updatedAt, testCases: testCasePayload(testCases, state.activity.gradingMode) })
      const activity = { ...state.activity, updatedAt: response.data.activityUpdatedAt }
      const rows = rowsFromResponse(response.data.testCases)
      setState((current) => ({ ...current, activity, testCases: rows }))
      setTestCases(rows); setTestsDirty(false); setNotice('Test cases saved.')
    } catch (error) { await handleError(error) } finally { setBusy('') }
  }

  const transition = async (action) => {
    if (!state.activity || formDirty || testsDirty) return
    if (mutationLock.current) return
    mutationLock.current = true
    setBusy(action); setNotice('')
    try {
      const response = await api.transition(state.activity.id, action, { expectedUpdatedAt: state.activity.updatedAt })
      setState((current) => ({ ...current, activity: response.data }))
      setForm(formFromActivity(response.data)); setFormDirty(false)
      setNotice(
        action === 'reopen' && response.data.dueState === 'PAST_DUE'
          ? 'Activity reopen succeeded. The deadline has already passed; extend it separately before ordinary submissions can resume.'
          : `Activity ${action} succeeded.`,
      )
    } catch (error) { await handleError(error) } finally { setBusy(''); setConfirmation(''); mutationLock.current = false }
  }

  const currentKey = `${selectedClass?.id}:${activityId}`
  const current = creating || state.key === currentKey ? state : { ...state, status: 'loading', activity: null }
  const readOnly = Boolean(current.activity && (current.activity.status === 'CLOSED' || current.activity.status === 'ARCHIVED' || selectedClass?.status === 'ARCHIVED'))
  const publishReasons = useMemo(() => current.activity ? publicationRequirements(current.activity, testCases) : [], [current.activity, testCases])
  const noticeIsConflict = notice.includes('changed while')
  const noticeIsSuccess = /saved|succeeded|already match/i.test(notice)

  if (!creating && current.status === 'loading') return <RequestState kind="loading" message="Loading activity settings." />
  if (!creating && current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />

  return (
    <div className="student-assignment-panel instructor-assignment-panel instructor-form-panel academic-activity-settings academic-class-frame">
      <UnsavedChangesGuard dirty={formDirty || testsDirty} bypass={acceptedNavigation} />
      <nav className="academic-project-toolbar" aria-label="Activity navigation">
        <NavLink to={classHref(creating ? '/instructor/activity' : `/instructor/activity/${current.activity?.id}/submissions`, selectedClass?.id)} className="student-back-link">{creating ? 'Back to activities' : 'Back to submissions'}</NavLink>
        {current.activity && <ProjexStatus value={current.activity.status}>{formatActivityStatus(current.activity.status)}</ProjexStatus>}
      </nav>
      <header className="academic-project-heading"><div><p>{creating ? 'New activity' : 'Activity settings'}</p><h2>{creating ? 'Create a programming activity' : current.activity?.title}</h2></div></header>
      <div className="activity-settings-tabs" role="tablist" aria-label="Activity settings sections" onKeyDown={event => {
        const tabs = [...event.currentTarget.querySelectorAll('[role=tab]')]
        const index = tabs.indexOf(event.target)
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
        if (next !== null) { event.preventDefault(); tabs[next].focus(); tabs[next].click() }
      }}>{[['details', 'Details'], ['java', 'Java starter'], ...(current.activity ? [['tests', 'Test cases']] : [])].map(([id, label]) => <button type="button" role="tab" key={id} id={`activity-tab-${id}`} aria-controls={`activity-settings-${id}`} aria-selected={settingsSection === id} tabIndex={settingsSection === id ? 0 : -1} onClick={() => setSettingsSection(id)}>{label}{id === 'tests' && ` (${testCases.length})`}</button>)}</div>
      {notice && (noticeIsSuccess ? <div className="activity-save-notice" role="status"><strong>Changes saved</strong><p>{notice}</p></div> : <RequestState kind={noticeIsConflict ? 'conflict' : 'unavailable'} compact title={noticeIsConflict ? 'Review the latest changes' : 'Action not completed'} message={notice} />)}
      <form noValidate onSubmit={creating ? create : event => event.preventDefault()}>
        <ActivityFormFields form={form} errors={errors} onChange={changeForm} readOnly={readOnly || Boolean(busy)} status={current.activity?.status || 'DRAFT'} section={settingsSection} topicSelector={<TopicSelector classId={selectedClass?.id} value={form.topicId} onChange={value => changeForm('topicId', value)} disabled={Boolean(busy) || selectedClass?.status === 'ARCHIVED' || current.activity?.status === 'ARCHIVED'} api={api} />} />
        <div className="instructor-form-actions" hidden={settingsSection === 'tests'}>
          {creating ? <button type="submit" className="student-primary-action" disabled={busy === 'create' || selectedClass?.status === 'ARCHIVED'}>{busy === 'create' ? 'Creating…' : 'Create draft'}</button> : <button type="button" className="student-primary-action" onClick={saveActivity} disabled={!formDirty || current.activity?.status === 'ARCHIVED' || selectedClass?.status === 'ARCHIVED' || Boolean(busy)}>{busy === 'activity' ? 'Saving…' : 'Save activity'}</button>}
          <p>{creating ? 'Add test cases after saving the draft.' : formDirty ? 'Unsaved activity changes.' : ''}</p>
        </div>
      </form>
      {current.activity && <div role="tabpanel" id="activity-settings-tests" aria-labelledby="activity-tab-tests" hidden={settingsSection !== 'tests'}><TestCaseEditor activity={current.activity} testCases={testCases} setTestCases={setTestCases} dirty={testsDirty} setDirty={setTestsDirty} busy={Boolean(busy)} onSave={saveTestCases} /></div>}
      {current.activity && (
        <section className="activity-lifecycle-panel">
          <div><h3>Publishing &amp; availability</h3><p>Save changes before changing availability.</p></div>
          {current.activity.status === 'DRAFT' && publishReasons.length > 0 && <div className="activity-validation-summary"><strong>Before publishing</strong><ul>{publishReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
          <div className="instructor-form-actions">
            {current.activity.status === 'DRAFT' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || formDirty || testsDirty || publishReasons.length > 0 || selectedClass?.status === 'ARCHIVED'} onClick={() => setConfirmation('publish')}>Publish</button>}
            {current.activity.status === 'PUBLISHED' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || formDirty || selectedClass?.status === 'ARCHIVED'} onClick={() => setConfirmation('close')}>Close</button>}
            {current.activity.status === 'CLOSED' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || formDirty || testsDirty || selectedClass?.status === 'ARCHIVED'} onClick={() => setConfirmation('reopen')}>Reopen Activity</button>}
            {current.activity.status !== 'ARCHIVED' && <button type="button" className="student-outline-action" disabled={Boolean(busy) || formDirty || testsDirty || selectedClass?.status === 'ARCHIVED'} onClick={() => setConfirmation('archive')}>Archive</button>}
            {current.activity.status === 'ARCHIVED' && <button type="button" className="student-primary-action" disabled={Boolean(busy) || selectedClass?.status === 'ARCHIVED'} onClick={() => setConfirmation('restore')}>Restore</button>}
          </div>
        </section>
      )}
      {confirmation && <AppDialog title={`Confirm ${confirmation}`} busy={Boolean(busy)} onClose={() => setConfirmation('')}><p>{confirmation === 'reopen' ? 'Attempts and deadline stay the same. Reopen this activity?' : `Continue and ${confirmation} this activity?`}</p><footer><button type="button" className="student-outline-action" onClick={() => setConfirmation('')} disabled={Boolean(busy)}>Cancel</button><button type="button" className="student-primary-action" onClick={() => transition(confirmation)} disabled={Boolean(busy)}>Confirm {confirmation}</button></footer></AppDialog>}
    </div>
  )
}
