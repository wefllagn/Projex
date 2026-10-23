import OutlinedSelect from '../components/OutlinedSelect.jsx'
import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { activityApi } from './activity-api.js'
import { formatActivityDate, formatActivityStatus } from './activity-utils.js'

export function TopicSelector({ classId, value, onChange, disabled, api = activityApi }) {
  const [state, setState] = useState({ topics: [], version: 0, error: '', page: 0, more: true })
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async (page = 1, signal) => {
    try {
      const { data } = await api.listTopics(classId, page, { signal })
      if (!signal?.aborted) setState(old => ({ ...data, topics: page === 1 ? data.topics : [...old.topics, ...data.topics], more: data.hasNextPage, error: '' }))
    } catch (error) { if (error.name !== 'AbortError') setState(old => ({ ...old, error: describeApiError(error) })) }
  }, [api, classId])
  useEffect(() => { const c = new AbortController(); load(1, c.signal); return () => c.abort() }, [load])
  const create = async event => {
    event.preventDefault(); event.stopPropagation(); if (busy) return
    setBusy(true)
    try {
      const result = await api.changeTopic(classId, { action: 'create', name: name.trim(), expectedVersion: state.version })
      onChange(result.data.createdId); setCreating(false); setName(''); await load()
    } catch (error) { setState(old => ({ ...old, error: describeApiError(error) })) }
    finally { setBusy(false) }
  }
  return <div className="topic-picker"><label>Topic<select value={value || ''} onChange={event => event.target.value === '__create' ? setCreating(true) : onChange(event.target.value)} disabled={disabled}><option value="">No topic</option>{value && !state.topics.some(t => t.id === value) && <option value={value}>Selected topic</option>}{state.topics.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}<option value="__create">Create Topic…</option></select></label>{state.more && state.page > 0 && <button type="button" className="student-outline-action" onClick={() => load(state.page + 1)}>More topics</button>}{state.error && <p role="alert">{state.error} <button type="button" onClick={() => load()}>Reload topics</button></p>}{creating && <AppDialog title="Create Topic" busy={busy} onClose={() => setCreating(false)}><form onSubmit={create}><label>Topic name<input value={name} onChange={event => setName(event.target.value)} required maxLength={200} /></label>{state.error && <p role="alert">{state.error}</p>}<footer><button type="button" className="student-outline-action" onClick={() => setCreating(false)} disabled={busy}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy || !name.trim()}>Create Topic</button></footer></form></AppDialog>}</div>
}

function ClassworkActivityRow({ activity, classId, instructor }) {
  const titleId = `classwork-activity-${activity.id}`
  const href = classHref(instructor ? `/instructor/activity/${activity.id}/submissions` : `/student/activity/${activity.id}`, classId)
  return <li>
    <NavLink to={href} className="classwork-row" aria-labelledby={titleId}>
      <span className="classwork-row-icon origin-activity-icon" aria-hidden="true"><ProjexIcon name="activity" size={22} /></span>
      <span className="classwork-row-content">
        <strong id={titleId}>{activity.title}</strong>
        <small>{formatActivityStatus(activity.status)} · Due {formatActivityDate(activity.dueDate)} · {activity.gradingMode === 'COMPLETION' ? 'Ungraded' : `${activity.totalPoints} points`}{instructor && Number.isInteger(activity.submissionCount) ? ` · ${activity.submissionCount} submissions` : !instructor && activity.gradingMode === 'COMPLETION' ? ` · ${activity.completionState === 'COMPLETE' ? 'Complete' : 'Not submitted'}` : ''}</small>
      </span>
      <ProjexIcon name="chevronRight" size={18} className="classwork-row-arrow" />
    </NavLink>
  </li>
}

function TopicSection({ topic, classId, instructor, api, status, controls, showEmpty = false }) {
  const [open, setOpen] = useState(true)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ key: '', items: [], status: 'loading' })
  const key = `${classId}:${topic.id || 'none'}:${page}:${status}:${revision}`
  useEffect(() => {
    const controller = new AbortController()
    api.listActivities(classId, { page, pageSize: 20, topicId: topic.id || 'none', ...(status ? { status } : {}) }, { signal: controller.signal })
      .then(result => { if (result.data.some(activity => activity.classId !== classId)) throw new ApiError({ status: 404, code: 'ACTIVITY_NOT_FOUND' }); if (!controller.signal.aborted) setState({ key, items: result.data, pagination: result.pagination, status: 'ready' }) })
      .catch(error => { if (error.name !== 'AbortError') setState({ key, items: [], status: 'error', error }) })
    return () => controller.abort()
  }, [api, classId, key, page, status, topic.id])
  const current = state.key === key ? state : { items: [], status: 'loading' }
  // Only a filtered, authorized list decides whether Students see No topic.
  if (!instructor && !showEmpty && current.status === 'ready' && current.items.length === 0) return null
  return <section className="classwork-topic"><header><button type="button" className="topic-heading" aria-expanded={open} onClick={() => setOpen(old => !old)}><ProjexIcon name="expand" className={open ? '' : 'is-collapsed'} /><h3>{topic.name}</h3></button>{controls}</header>{open && <div>{current.status === 'loading' && <p role="status">Loading activities…</p>}{current.status === 'error' && <div role="alert"><p>{describeApiError(current.error)}</p><button type="button" onClick={() => setRevision(n => n + 1)}>Try again</button></div>}{current.status === 'ready' && current.items.length === 0 && <div className="academic-topic-empty"><ProjexIcon name="activity" size={28} /><p>No activities in this topic.</p></div>}<ul className="classwork-rows">{current.items.map(activity => <ClassworkActivityRow key={activity.id} activity={activity} classId={classId} instructor={instructor} />)}</ul>{current.pagination?.totalPages > 1 && <nav className="activity-pagination" aria-label={`${topic.name} activity pages`}><button type="button" disabled={!current.pagination.hasPreviousPage} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page} of {current.pagination.totalPages}</span><button type="button" disabled={!current.pagination.hasNextPage} onClick={() => setPage(n => n + 1)}>Next</button></nav>}</div>}</section>
}
export function GroupedClasswork({ classId, instructor = false, editable = true, api = activityApi }) {
  const [state, setState] = useState({ key: '', topics: [], version: 0, page: 1, hasNextPage: false })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const load = useCallback(async (signal) => {
    try { const result = await api.listTopics(classId, page, { signal }); if (!signal?.aborted) { setState({ ...result.data, key: `${classId}:${page}` }); setError('') } }
    catch (err) { if (err.name !== 'AbortError') setError(describeApiError(err)) }
  }, [api, classId, page])
  useEffect(() => { const c = new AbortController(); Promise.resolve().then(() => load(c.signal)); return () => c.abort() }, [load])
  const change = async (action, topicId, topicName) => {
    if (busy) return
    setBusy(true); setError('')
    try { await api.changeTopic(classId, { action, ...(topicId ? { topicId } : {}), ...(topicName ? { name: topicName } : {}), expectedVersion: state.version }); setEdit(null); setRevision(n => n + 1); await load() }
    catch (err) { setError(describeApiError(err)) }
    finally { setBusy(false) }
  }
  const current = state.key === `${classId}:${page}`
  return <div className="projex-classwork academic-classwork-panel"><div className="classwork-toolbar"><h2>Classwork</h2>{instructor && <div><OutlinedSelect label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].map(value => ({ value, label: formatActivityStatus(value) }))]} />{editable && <><button type="button" className="student-outline-action" onClick={() => { setName(''); setEdit({ action: 'create' }) }}>Create Topic</button><NavLink className="student-primary-action" to={classHref('/instructor/activity/new', classId)}><ProjexIcon name="createActivity" />Create Activity</NavLink></>}</div>}{!instructor && <div className="academic-classwork-filters"><OutlinedSelect label="Topic filter" value={topicFilter} onChange={setTopicFilter} options={[{ value: 'all', label: 'All topics' }, { value: 'none', label: 'No topic' }, ...state.topics.map(topic => ({ value: topic.id, label: topic.name }))]} /><NavLink className="student-outline-action" to={`${classHref('/student/activity', classId)}&view=work`}><ProjexIcon name="submission" />View your work</NavLink></div>}</div>{error && <div role="alert"><p>{error}</p><button type="button" onClick={() => load()}>Reload topics</button></div>}{!current && !error && <p role="status">Loading topics…</p>}{current && <>{state.topics.filter(topic => topicFilter === 'all' || topicFilter === topic.id).map(topic => <TopicSection showEmpty={topicFilter === topic.id} key={`${topic.id}:${revision}:${status}`} topic={topic} classId={classId} instructor={instructor} api={api} status={status} controls={instructor && editable && <div className="topic-actions"><button type="button" disabled={busy} aria-label={`Move ${topic.name} up`} onClick={() => change('up', topic.id)}>↑</button><button type="button" disabled={busy} aria-label={`Move ${topic.name} down`} onClick={() => change('down', topic.id)}>↓</button><button type="button" onClick={() => { setName(topic.name); setEdit({ action: 'rename', topic }) }}>Rename</button><button type="button" onClick={() => setEdit({ action: 'remove', topic })}>Remove</button></div>} />)}{(topicFilter === 'none' || (topicFilter === 'all' && !state.hasNextPage)) && <TopicSection showEmpty={!state.topics.length || topicFilter === 'none'} key={`none:${revision}:${status}`} topic={{ id: null, name: 'No topic' }} classId={classId} instructor={instructor} api={api} status={status} />}{(page > 1 || state.hasNextPage) && <nav className="activity-pagination" aria-label="Topic pages"><button type="button" disabled={page === 1} onClick={() => { setTopicFilter('all'); setPage(n => n - 1) }}>Previous topics</button><span>Topic page {page}. Activities are paged within each topic.</span><button type="button" disabled={!state.hasNextPage} onClick={() => { setTopicFilter('all'); setPage(n => n + 1) }}>Next topics</button></nav>}</>}{edit && <AppDialog title={edit.action === 'remove' ? 'Remove Topic?' : edit.action === 'create' ? 'Create Topic' : 'Rename Topic'} busy={busy} onClose={() => setEdit(null)}><form onSubmit={event => { event.preventDefault(); change(edit.action, edit.topic?.id, name.trim()) }}>{edit.action === 'remove' ? <p>Activities in “{edit.topic.name}” will move to No topic. Submissions and Git work will be preserved.</p> : <label>Topic name<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>}{error && <p role="alert">{error}</p>}<footer><button type="button" className="student-outline-action" onClick={() => setEdit(null)} disabled={busy}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy || (edit.action !== 'remove' && !name.trim())}>{edit.action === 'remove' ? 'Remove Topic' : 'Save Topic'}</button></footer></form></AppDialog>}</div>
}
