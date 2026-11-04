import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useBlocker, useParams } from 'react-router-dom'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import { describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import JavaSourceEditor from './JavaSourceEditor.jsx'
import InteractiveConsole from './InteractiveConsole.jsx'
import { VisibleOutcomeList } from './StudentSubmissionViews.jsx'
import { projectPracticeRun, isPracticePending } from './submission-projections.js'
import useBoundedPolling from './use-bounded-polling.js'
import { practiceApi } from './practice-api.js'
import './student-practice.css'

export default function StudentPracticeWorkspace({ api = practiceApi }) {
  const { activityId } = useParams()
  const { selectedClass, selectionStatus, selectionError } = useClasses()
  if (!selectedClass && selectionStatus !== 'loading') return <RequestState kind="unavailable" error={selectionError} message="Choose an authorized class to open practice." action={<NavLink to="/student" className="student-outline-action">Back to classes</NavLink>} />
  return <PracticeEditor key={`${selectedClass?.id}:${activityId}`} api={api} activityId={activityId} classId={selectedClass?.id} />
}
function PracticeEditor({ api, activityId, classId }) {
  const [workspace, setWorkspace] = useState(null), [source, setSource] = useState(''), [saved, setSaved] = useState('')
  const [error, setError] = useState(null), [busy, setBusy] = useState(false), [pending, setPending] = useState(null)
  const [notice, setNotice] = useState(''), [run, setRun] = useState(null), [runError, setRunError] = useState(null)
  const [retryable, setRetryable] = useState(false)
  const [running, setRunning] = useState(false), [testing, setTesting] = useState(false)
  const editor = useRef(null), consoleRef = useRef(null), sourceRef = useRef(source), intent = useRef(null), live = useRef(true)
  const [confirm, confirmation] = useConfirmation()
  const dirty = workspace?.ready && source !== saved
  const blocker = useBlocker(({ currentLocation, nextLocation }) => Boolean((dirty || pending || busy || retryable) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)))
  useEffect(() => { sourceRef.current = source }, [source])
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  useEffect(() => {
    if (!dirty && !pending && !busy && !retryable) return undefined
    const guard = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty, pending, busy, retryable])
  const accept = useCallback(response => {
    if (response.data.activityId !== activityId || response.data.classId !== classId) throw new Error('PRACTICE_CONTEXT_MISMATCH')
    return response.data
  }, [activityId, classId])
  const enter = useCallback(async () => {
    setError(null); setBusy(true)
    try {
      await api.enter(activityId)
      const value = accept(await api.get(activityId))
      if (live.current) { setWorkspace(value); setSource(value.sourceCode); setSaved(value.sourceCode) }
    } catch (e) { if (live.current) setError(e) }
    finally { if (live.current) setBusy(false) }
  }, [api, activityId, accept])
  useEffect(() => { if (classId) Promise.resolve().then(enter) }, [classId, enter])
  const load = useCallback((_id, options) => api.get(activityId, options), [api, activityId])
  useBoundedPolling({ identity: workspace?.workspaceId, active: Boolean(workspace && !workspace.ready && !error), load,
    onData: response => { const value = accept(response); setWorkspace(value); if (value.ready) { setSource(value.sourceCode); setSaved(value.sourceCode) }; if (value.job?.status === 'FAILED' || value.job?.status === 'CONFLICTED') setError({ code: 'PRACTICE_UNAVAILABLE' }); return !value.ready },
    onError: setError, onBoundedStop: () => setError({ code: 'PRACTICE_UNAVAILABLE' }) })
  const loadSave = useCallback((id, options) => api.getSave(activityId, id, options), [api, activityId])
  useBoundedPolling({ identity: pending?.id, active: Boolean(pending && !error), load: loadSave,
    onData: response => {
      const job = response.data
      if (job.id !== pending?.id) return true
      if (['PENDING', 'RUNNING'].includes(job.status)) return true
      const value = intent.current
      setPending(null); setRetryable(false)
      if (job.status !== 'SUCCEEDED') { intent.current = null; setError({ code: job.status === 'CONFLICTED' ? 'PRACTICE_HEAD_CHANGED' : 'PRACTICE_UNAVAILABLE' }); return false }
      setWorkspace(current => ({ ...current, head: job.head, canStartOver: value.operation === 'SAVE' || current.canStartOver }))
      setSaved(value.operation === 'RESET' ? workspace.starterCode ?? '' : value.sourceCode)
      // Reset completion must not discard edits made while the worker was saving.
      if (value.operation === 'RESET') {
        if (sourceRef.current === value.editorSource) setSource(workspace.starterCode ?? '')
        api.get(activityId).then(result => {
          if (!live.current) return
          const updated = accept(result)
          if (updated.head !== job.head) { setNotice('Newer saved changes are available. Reload practice when you are ready.'); return }
          setSaved(updated.sourceCode)
          if (sourceRef.current === value.editorSource) setSource(updated.sourceCode)
          setWorkspace(updated)
        }).catch(failure => { if (live.current) setError(failure) })
      }
      intent.current = null; setNotice(value.operation === 'RESET' ? 'Practice restored to the starter code.' : 'Practice saved.')
      return false
    }, onError: setError, onBoundedStop: () => setError({ code: 'PRACTICE_SAVE_PENDING' }) })
  async function save(operation = 'SAVE') {
    if (busy || pending || !workspace?.ready) return
    if (operation === 'RESET' && !await confirm('Start over from the activity starter code? Your current practice work will be replaced.', 'Start Over')) return
    intent.current ??= { operation, ...(operation === 'SAVE' ? { sourceCode: source } : {}), expectedHead: workspace.head, requestKey: crypto.randomUUID(), editorSource: source }
    setRetryable(true)
    setBusy(true); setError(null); setNotice('')
    try {
      const input = { operation: intent.current.operation, expectedHead: intent.current.expectedHead, requestKey: intent.current.requestKey, ...(intent.current.operation === 'SAVE' ? { sourceCode: intent.current.sourceCode } : {}) }
      const result = await api.save(activityId, input)
      if (live.current) setPending(result.data)
    } catch (e) { if (live.current) setError(e) }
    finally { if (live.current) setBusy(false) }
  }
  async function reload() {
    if ((dirty || intent.current) && !await confirm('Reload your saved practice? Unsaved editor changes will be replaced.', 'Reload practice')) return
    setBusy(true); setError(null)
    const snapshot = sourceRef.current
    try {
      const value = accept(await api.get(activityId))
      if (sourceRef.current !== snapshot) { if (live.current) setNotice('Your editor changed while loading. Reload saved practice again when you are ready.'); return }
      if (live.current) { setWorkspace(value); setSource(value.sourceCode); setSaved(value.sourceCode); intent.current = null; setRetryable(false); setPending(null); setNotice('Saved practice loaded.') }
    } catch (e) { if (live.current) setError(e) }
    finally { if (live.current) setBusy(false) }
  }
  const loadRun = useCallback((id, options) => api.getPracticeRun(id, options), [api])
  useBoundedPolling({ identity: run?.id, active: isPracticePending(run) && !runError, load: loadRun,
    onData: response => { const value = projectPracticeRun(response.data); if (value.activityId !== activityId) throw new Error('PRACTICE_CONTEXT_MISMATCH'); setRun(value); return isPracticePending(value) }, onError: setRunError, onBoundedStop: () => setRunError({ code: 'EXECUTION_CAPACITY_UNAVAILABLE' }) })
  async function test() {
    setTesting(true); setRunError(null)
    try { const response = await api.createPracticeRun(activityId, source); if (live.current) setRun(projectPracticeRun(response.data)) }
    catch (e) { if (live.current) setRunError(e) }
    finally { if (live.current) setTesting(false) }
  }
  if (!workspace) return <RequestState kind={error ? 'unavailable' : 'loading'} error={error} message="Preparing your practice." action={error && <button className="student-outline-action" onClick={enter}>Try again</button>} />
  return <main className="student-practice">
    <NavLink className="student-back-link" to={classHref(`/student/activity/${activityId}`, classId)}>Back to activity</NavLink>
    <header><div><h1>{workspace.title} · Practice</h1><p>Your official submissions and grades won’t change.</p></div>
      <div className="student-practice-actions">
        <button className="student-primary-action" disabled={!workspace.ready || busy || Boolean(pending) || retryable && Boolean(error)} onClick={() => save()}>Save practice</button>
        {(workspace.canStartOver || dirty) && <button className="student-outline-action" disabled={busy || Boolean(pending) || retryable && Boolean(error)} onClick={() => save('RESET')}>Start Over</button>}
        <button className="student-outline-action" disabled={busy || Boolean(pending)} onClick={reload}>Reload saved practice</button>
      </div>
    </header>
    {!workspace.ready && <p role="status">Preparing your practice…</p>}
    {workspace.entryMissing && <p role="status">The saved entry file is missing. Write new code or use Start Over to restore the starter.</p>}
    {error && <div role="alert"><p>{error.code === 'PRACTICE_HEAD_CHANGED' ? 'Your saved practice changed elsewhere. Your editor is preserved. Reload saved practice to review it before saving again.' : describeApiError(error)}</p>
      {retryable && !pending && <button className="student-outline-action" disabled={busy} onClick={() => save()}>Retry save</button>}
      {pending && <button className="student-outline-action" onClick={() => setError(null)}>Check save</button>}
      {!workspace.ready && <button className="student-outline-action" onClick={enter}>Check again</button>}
    </div>}
    <p role="status">{pending || busy ? 'Saving practice…' : notice || (dirty ? 'Unsaved practice changes' : '')}</p>
    {workspace.ready && <div className="student-practice-grid">
      <section className="student-practice-brief"><h2>Instructions</h2><p className="student-practice-instructions">{workspace.instructions}</p></section>
      <section className="student-practice-editor"><JavaSourceEditor value={source} onChange={setSource} entryClassName={workspace.entryClassName} editorRef={editor} />
        <div className="student-practice-actions"><button className="student-outline-action" disabled={running || testing || isPracticePending(run)} onClick={() => consoleRef.current?.start(source)}>Run Code</button>
          <button className="student-outline-action" disabled={running || testing || isPracticePending(run)} onClick={test}>Run visible tests</button></div>
        <InteractiveConsole ref={consoleRef} activityId={activityId} source={source} api={api} onActiveChange={setRunning} />
        {runError && <div role="alert"><p>{describeApiError(runError)}</p>{run?.id && <button className="student-outline-action" onClick={() => setRunError(null)}>Check test results</button>}</div>}
        {run && <section><h2>Visible tests</h2><p>{run.compileStatus}</p>{run.compilerOutput && <pre>{run.compilerOutput}</pre>}<VisibleOutcomeList outcomes={run.visibleTestOutcomes} /></section>}
      </section>
    </div>}
    {confirmation}
    {blocker.state === 'blocked' && <div role="alertdialog" aria-label="Leave practice?"><p>{pending || busy ? 'A practice save is still processing.' : 'You have unsaved practice changes.'}</p><button className="student-outline-action" onClick={() => blocker.reset()}>Keep practicing</button><button className="student-outline-action" onClick={() => blocker.proceed()}>Leave practice</button></div>}
  </main>
}
