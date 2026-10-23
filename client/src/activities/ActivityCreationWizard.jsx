import './activity-creation-wizard.css'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.js'
import { activityDraftKey, readActivityDraft, writeActivityDraft, removeActivityDraft } from '../auth/private-session-drafts.js'
import { describeApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import AppDialog from '../components/AppDialog.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import { TopicSelector } from './TopicViews.jsx'
import { ActivityFormFields, TestCaseEditor } from './activity-authoring-fields.jsx'
import { EMPTY_FORM, formFromActivity, rowsFromResponse, validateAuthoringStep, createActivityRequestId } from './activity-authoring-model.js'
import { activityPayload, activityUpdatePayload, testCasePayload, publicationRequirements, sumTestCasePoints, formatActivityDate } from './activity-utils.js'
import { weightedPreview, BUILTIN_CRITERIA } from './weighted-grading.js'

const STEPS = [['details', 'Details'], ['java', 'Java starter'], ['tests', 'Test cases'], ['publishing', 'Publishing']]
export default function ActivityCreationWizard({ api, initialActivity, initialCases, selectedClass, onPublished }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const key = activityDraftKey(user.id, selectedClass.id, initialActivity?.id)
  const [recovery] = useState(() => readActivityDraft(key))
  const [activity, setActivity] = useState(() => initialActivity ? { ...initialActivity, updatedAt: recovery?.expectedUpdatedAt || initialActivity.updatedAt } : null)
  const [form, setForm] = useState(() => recovery?.form || (initialActivity ? formFromActivity(initialActivity) : structuredClone(EMPTY_FORM)))
  const [tests, setTests] = useState(() => recovery?.tests || initialCases || [])
  const [step, setStep] = useState(() => Math.max(0, Math.min(3, recovery?.step || 0)))
  const [formDirty, setFormDirty] = useState(Boolean(recovery?.formDirty))
  const [testsDirty, setTestsDirty] = useState(Boolean(recovery?.testsDirty))
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(recovery ? 'Draft work recovered in this tab.' : '')
  const [conflict, setConflict] = useState(Boolean(recovery && initialActivity && recovery.expectedUpdatedAt !== initialActivity.updatedAt))
  const [busy, setBusy] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const creationId = useRef(recovery?.creationId || createActivityRequestId())
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const locked = useRef(false), bypass = useRef(false), heading = useRef(null)
  const cache = (overrides = {}) => ({ creationId: creationId.current, expectedUpdatedAt: activity?.updatedAt, form, tests, step, formDirty, testsDirty, ...overrides })
  useEffect(() => {
    const available = writeActivityDraft(key, { creationId: creationId.current, expectedUpdatedAt: activity?.updatedAt, form, tests, step, formDirty, testsDirty })
    // This only reports recovery availability; server persistence still guards every step.
    if (!available) queueMicrotask(() => setStorageAvailable(false))
  }, [key, activity?.updatedAt, form, tests, step, formDirty, testsDirty])
  useEffect(() => { heading.current?.focus() }, [step])
  useEffect(() => {
    if (!Object.keys(errors).length) return
    const invalid = heading.current?.parentElement.querySelector('[aria-invalid="true"], .activity-field-error')
    invalid?.scrollIntoView?.({ block: 'center' })
    invalid?.focus?.({ preventScroll: true })
  }, [errors])
  const change = (field, value) => { setForm(old => ({ ...old, [field]: value })); setFormDirty(true); setErrors({}); setNotice('') }
  const run = async action => {
    if (locked.current || selectedClass.status === 'ARCHIVED') return
    locked.current = true; setBusy(true); setNotice('')
    try { await action() } catch (error) { setNotice(describeApiError(error)); if (error.status === 409) setConflict(true) }
    finally { locked.current = false; setBusy(false) }
  }
  const saveForm = async targetStep => {
    if (!activity) {
      if (!creationId.current) { setNotice('Secure draft creation is unavailable in this browser. Use a current browser over HTTPS or localhost.'); return null }
      // A stable UUID is also the Activity id; replay safely returns that same scoped draft.
      writeActivityDraft(key, cache())
      const response = await api.createActivity(selectedClass.id, { ...activityPayload(form), creationRequestId: creationId.current })
      if (!active.current) return null
      const saved = response.data
      const same = saved.status === 'DRAFT' && JSON.stringify(activityPayload(formFromActivity(saved))) === JSON.stringify(activityPayload(form))
      const targetKey = activityDraftKey(user.id, selectedClass.id, saved.id)
      writeActivityDraft(targetKey, cache({ expectedUpdatedAt: same ? saved.updatedAt : saved.createdAt, step: same ? targetStep : 0, formDirty: !same }))
      removeActivityDraft(key); bypass.current = true
      navigate(classHref(`/instructor/activity/${saved.id}/settings`, selectedClass.id), { replace: true })
      return null
    }
    const candidate = activityUpdatePayload(form, activity)
    const persisted = activityPayload(formFromActivity(activity))
    let changes = Object.fromEntries(Object.entries(candidate).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(persisted[field])))
    if (targetStep === 1) { delete changes.entryClassName; delete changes.starterCode }
    if (targetStep === 2) changes = Object.fromEntries(Object.entries(changes).filter(([field]) => ['entryClassName', 'starterCode'].includes(field)))
    if (!Object.keys(changes).length) { setFormDirty(JSON.stringify(candidate) !== JSON.stringify(persisted)); return activity }
    const response = await api.updateActivity(activity.id, { ...changes, expectedUpdatedAt: activity.updatedAt })
    setActivity(response.data)
    const remaining = activityPayload(formFromActivity(response.data))
    setFormDirty(Object.keys(candidate).some(field => JSON.stringify(candidate[field]) !== JSON.stringify(remaining[field])))
    if (!testsDirty && targetStep === 1 && ['gradingConfiguration', 'totalPoints', 'gradingMode'].some(field => field in changes)) {
      const cases = await api.listTestCases(activity.id, { page: 1, pageSize: 50 }); setTests(rowsFromResponse(cases.data))
    }
    return response.data
  }

  const next = () => {
    const invalid = validateAuthoringStep(form, step, tests); setErrors(invalid)
    if (Object.keys(invalid).length) return
    return run(async () => {
      if (step < 2) {
        const saved = await saveForm(step + 1)
        if (saved) setStep(step + 1)
      } else {
        if (testsDirty) {
          const response = await api.replaceTestCases(activity.id, { expectedUpdatedAt: activity.updatedAt, testCases: testCasePayload(tests, activity.gradingMode, activity.gradingConfiguration) })
          setActivity(old => ({ ...old, updatedAt: response.data.activityUpdatedAt })); setTests(rowsFromResponse(response.data.testCases)); setTestsDirty(false)
        }
        setStep(3)
      }
    })
  }
  const reload = () => run(async () => {
    const [record, cases] = await Promise.all([api.getActivity(activity.id), api.listTestCases(activity.id, { page: 1, pageSize: 50 })])
    if (record.data.status !== 'DRAFT') { removeActivityDraft(key); await onPublished(); return }
    setActivity(record.data); setForm(formFromActivity(record.data)); setTests(rowsFromResponse(cases.data)); setFormDirty(false); setTestsDirty(false); setConflict(false); setErrors({}); setStep(0); setNotice('Latest saved draft loaded.')
  })
  const reasons = activity ? publicationRequirements(activity, tests) : []
  const allocations = form.gradingConfiguration && form.gradingMode !== 'COMPLETION' ? weightedPreview(form.totalPoints, form.gradingConfiguration).maxima : null
  const publish = () => run(async () => {
    if (formDirty || testsDirty || reasons.length || conflict) return
    await api.transition(activity.id, 'publish', { expectedUpdatedAt: activity.updatedAt })
    removeActivityDraft(key); bypass.current = true; setConfirmPublish(false); await onPublished()
  })
  return <section className="student-assignment-panel instructor-assignment-panel instructor-form-panel academic-activity-settings academic-class-frame activity-creation-wizard">
    <UnsavedChangesGuard dirty={formDirty || testsDirty} bypass={bypass} />
    <NavLink className="student-back-link" aria-disabled={busy} onClick={event => { if (busy) event.preventDefault() }} to={classHref('/instructor/activity', selectedClass.id)}>Back to Activities</NavLink>
    <header className="academic-project-heading"><div><h2>{initialActivity ? 'Continue Activity draft' : 'Create Activity'}</h2><p>Set up your Activity in four steps. Next saves your progress.</p></div></header>
    <nav aria-label="Activity creation progress"><ol className="activity-wizard-progress">{STEPS.map(([, label], index) => <li key={label} aria-current={index === step ? 'step' : undefined}><button type="button" disabled={busy || index >= step} onClick={() => { setStep(index); setErrors({}) }}><span aria-hidden="true">{index < step ? '✓' : index + 1}</span><span>{label}<small>{index === step ? 'Current step' : index < step ? 'Completed' : 'Not started'}</small></span></button></li>)}</ol></nav>
    {notice && <p role="status" className="academic-inline-help">{notice}</p>}
    {!storageAvailable && <p role="status">Tab recovery is unavailable. Next saves to Origin; keep this page open until changes are saved.</p>}
    {conflict && <div role="alert" className="activity-validation-summary"><strong>A newer saved draft may be available.</strong><p>Your local work remains on this page. Load the latest saved draft to replace these local changes before continuing.</p><button type="button" className="student-outline-action" disabled={busy} onClick={reload}>Load latest saved draft</button></div>}
    <div className="activity-wizard-content"><h3 ref={heading} tabIndex={-1}>{`Step ${step + 1}: ${STEPS[step][1]}`}</h3>
      {step < 2 && <ActivityFormFields automatedPoints={sumTestCasePoints(tests)} form={form} errors={errors} onChange={change} readOnly={busy} status="DRAFT" section={STEPS[step][0]} topicSelector={<TopicSelector classId={selectedClass.id} value={form.topicId} onChange={value => change('topicId', value)} disabled={busy} api={api} />} />}
      {step === 2 && <><TestCaseEditor guided showValidation={Boolean(errors.tests)} activity={activity} testCases={tests} setTestCases={setTests} dirty={testsDirty} setDirty={setTestsDirty} busy={busy} />{errors.tests && <p role="alert" className="activity-field-error">{errors.tests}</p>}</>}
      {step === 3 && <section aria-label="Publication summary"><h4>{form.title}</h4><dl className="activity-wizard-summary"><div><dt>Grading period</dt><dd>{form.gradingPeriod || 'Unassigned'}</dd></div><div><dt>Grade</dt><dd>{form.gradingMode === 'COMPLETION' ? 'Ungraded · completion' : `${form.totalPoints} total points`}</dd></div>{allocations && <div><dt>Allocation</dt><dd>{BUILTIN_CRITERIA.map(([, label], index) => `${label}: ${allocations[index]} points`).join(' · ')}</dd></div>}<div><dt>Java starter</dt><dd>{form.entryClassName}.java · Starter source provided</dd></div><div><dt>Test cases</dt><dd>{tests.length} total · {tests.filter(row => !row.isHidden).length} visible · {tests.filter(row => row.isHidden).length} hidden</dd></div><div><dt>Deadline</dt><dd>{formatActivityDate(form.dueDate)}</dd></div><div><dt>Attempts</dt><dd>{form.maxAttempts} · {form.creditPolicy === 'HIGHEST' ? 'Highest' : 'Latest'} released attempt credited</dd></div></dl><div className={reasons.length ? "activity-validation-summary" : "activity-save-notice"}>{reasons.length ? <><strong>Before publishing</strong><ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></> : <p>Ready to publish. Students can access the Activity after publication.</p>}</div></section>}
    </div>
    <footer className="activity-wizard-actions"><button type="button" className="student-outline-action" disabled={step === 0 || busy} onClick={() => { setStep(old => old - 1); setErrors({}) }}>Back</button><span className="academic-inline-help">{busy ? 'Saving progress…' : formDirty || testsDirty ? 'Changes are kept in this tab. Next saves to Origin.' : activity ? 'Progress saved to Origin.' : 'Next saves a private draft.'}</span>{step < 3 ? <button type="button" className="student-primary-action" disabled={busy || conflict || selectedClass.status === 'ARCHIVED'} onClick={next}>Next</button> : <div><button type="button" className="student-outline-action" disabled={busy || conflict || formDirty || testsDirty} onClick={() => setNotice('Draft saved. You can return to this Activity and continue here.')}>Save Draft</button><button type="button" className="student-primary-action" disabled={busy || conflict || formDirty || testsDirty || reasons.length > 0} onClick={() => setConfirmPublish(true)}>Publish</button></div>}</footer>
    {confirmPublish && <AppDialog title="Confirm publish" busy={busy} onClose={() => setConfirmPublish(false)}><p>Publish “{form.title}” for your Students? Grading rules, Java starter and test cases lock after publication.</p><footer><button type="button" className="student-outline-action" onClick={() => setConfirmPublish(false)} disabled={busy}>Back</button><button type="button" className="student-primary-action" onClick={publish} disabled={busy}>Confirm publish</button></footer></AppDialog>}
  </section>
}
