import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import useBoundedPolling from './use-bounded-polling.js'
import './interactive-console.css'

const active = (record) => ['QUEUED', 'COMPILING', 'RUNNING'].includes(record?.phase)
const labels = { QUEUED: 'Queued', COMPILING: 'Compiling…', RUNNING: 'Running', COMPLETED: 'Completed', COMPILE_ERROR: 'Compilation failed', RUNTIME_ERROR: 'Runtime error', CANCELLED: 'Stopped', EXPIRED: 'Session expired', TIMEOUT: 'Execution timed out', OUTPUT_LIMIT: 'Output limit reached', FAILED: 'Execution interrupted' }

export default function InteractiveConsole({ ref, activityId, source, api, onActiveChange }) {
  const [record, setRecord] = useState(null)
  const [error, setError] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState(false)
  const [runSource, setRunSource] = useState(null)
  const intent = useRef(null)
  const pendingInput = useRef(null)
  const live = useRef(true)
  const scroll = useRef(null)
  const followOutput = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  useEffect(() => { onActiveChange(requesting || active(record)) }, [record, requesting, onActiveChange])
  useEffect(() => {
    if (followOutput.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [record?.transcript])

  const update = useCallback((response) => {
    if (response.data.activityId !== activityId) throw new Error('CONSOLE_CONTEXT_MISMATCH')
    const incoming = response.data
    setRecord((current) => {
      if (!current || current.id !== incoming.id) return incoming
      const phases = ['QUEUED', 'COMPILING', 'RUNNING']
      // Reads may finish after a newer input/control response. Never regress the
      // acknowledged sequence, output, closure, cancellation or terminal state.
      const preservePhase = (!active(current) && active(incoming))
        || (active(current) && active(incoming) && phases.indexOf(current.phase) > phases.indexOf(incoming.phase))
      return { ...incoming,
        phase: preservePhase ? current.phase : incoming.phase,
        exitCode: preservePhase ? current.exitCode : incoming.exitCode,
        nextSequence: Math.max(current.nextSequence ?? 1, incoming.nextSequence ?? 1),
        transcript: (current.transcript?.length ?? 0) > (incoming.transcript?.length ?? 0) ? current.transcript : incoming.transcript,
        inputClosed: current.inputClosed || incoming.inputClosed,
        cancelRequested: current.cancelRequested || incoming.cancelRequested,
      }
    })
    return active(incoming)
  }, [activityId])
  const load = useCallback((id, options) => api.getInteractiveCodeRun(id, options), [api])
  useBoundedPolling({ identity: record?.id, active: active(record) && !error,
    load, onData: update, onError: setError, onBoundedStop: () => setError({ code: 'NETWORK_ERROR' }),
    initialDelayMs: 250, maximumDelayMs: 250, maximumDurationMs: 180000 })

  async function start(sourceCode) {
    if (requesting || active(record)) return
    intent.current ??= { sourceCode, requestKey: crypto.randomUUID() }
    setRequesting(true); setError(null); setRunSource(intent.current.sourceCode)
    try {
      const result = await api.createInteractiveCodeRun(activityId, intent.current.sourceCode, intent.current.requestKey)
      if (!live.current) return
      update(result)
      setInput(''); pendingInput.current = null; setPending(false)
    } catch (failure) { if (live.current) setError(failure) }
    finally { if (live.current) setRequesting(false) }
  }
  useImperativeHandle(ref, () => ({ start: (value) => {
    if (!active(record) && !requesting && (record || !error)) intent.current = null
    return start(value)
  } }))

  async function control(action) {
    if (!record || sending) return
    setSending(true); setError(null)
    if (action !== 'stop') pendingInput.current ??= { sequence: record.nextSequence, text: action === 'eof' ? '' : input, eof: action === 'eof' }
    setPending(action !== 'stop')
    try {
      const result = action === 'stop' ? await api.stopInteractiveCodeRun(record.id)
        : await api.sendInteractiveInput(record.id, pendingInput.current)
      if (!live.current) return
      update(result)
      if (action !== 'stop') { pendingInput.current = null; setPending(false); setInput('') }
    } catch (failure) { if (live.current) setError(failure) }
    finally { if (live.current) setSending(false) }
  }
  async function retry() {
    if (!record) return start(intent.current?.sourceCode ?? source)
    setError(null)
    try { update(await load(record.id)) } catch (failure) { setError(failure) }
  }
  return <section className="interactive-console" aria-label="Interactive Java console">
    <div className="student-panel-status-row"><strong>Run Code</strong><span role="status">{requesting ? 'Starting…' : labels[record?.phase] ?? 'Ready'}</span>
      {active(record) && <button type="button" className="student-outline-action" disabled={sending || record.cancelRequested} onClick={() => control('stop')}>{record.cancelRequested ? 'Stopping…' : 'Stop'}</button>}
    </div>
    <pre className="interactive-console-output" ref={scroll} tabIndex={0} aria-label="Java console output" onScroll={() => {
      const node = scroll.current
      followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 32
    }}>{record?.transcript || (requesting ? 'Queueing Java execution…' : record ? '' : 'Run your code to open a console.')}</pre>
    {record?.phase === 'RUNNING' && <form className="interactive-console-input" onSubmit={(event) => { event.preventDefault(); control('input') }}>
      <label htmlFor="java-console-input">Program input</label>
      <div><input id="java-console-input" autoComplete="off" value={input} maxLength={4000} disabled={sending || record.inputClosed || record.cancelRequested || pending} onChange={(event) => setInput(event.target.value)} placeholder={record.inputClosed ? 'Input ended' : 'Type a line and press Enter'} />
        <button type="submit" className="student-primary-action" disabled={sending || record.inputClosed || record.cancelRequested}>{pending ? 'Retry input' : 'Send'}</button>
        <button type="button" className="student-outline-action" disabled={sending || record.inputClosed || record.cancelRequested || pending} onClick={() => control('eof')}>End input</button></div>
    </form>}
    {record?.exitCode !== null && record?.exitCode !== undefined && <p>Process finished with exit code {record.exitCode}</p>}
    {record && !active(record) && record.phase !== 'COMPLETED' && <p>{`${labels[record.phase]}.`}{['EXPIRED', 'FAILED'].includes(record.phase) ? ' Run Code again to start a new session.' : ''}</p>}
    {record && runSource !== source && <p>Source changed since this run.</p>}
    {error && <div role="alert"><p>{describeApiError(error)}</p><button type="button" className="student-outline-action" onClick={retry} disabled={requesting}>Retry console status</button></div>}
  </section>
}
