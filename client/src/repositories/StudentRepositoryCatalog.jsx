import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import { useCapabilities } from '../capabilities/capability-context.js'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import RequestState from '../components/RequestState.jsx'
import { StudentInvitationInbox } from './RepositoryCollaborationViews.jsx'
import { repositoryApi } from './repository-api.js'
import { repositoryCatalogProjection, formatRepositoryLabel } from './repository-projections.js'

const groups = [['ACTIVITY_WORKSPACE', 'Activity repositories'], ['CLASS_PROJECT', 'Project repositories'], ['PERSONAL', 'Personal repositories'], ['CLASS_WORKSPACE', 'Class workspaces · legacy']]
const types = { PERSONAL: 'Personal', ACTIVITY_WORKSPACE: 'Activity', CLASS_PROJECT: 'Project', CLASS_WORKSPACE: 'Class workspace · legacy' }
function pathFor(repository) {
  return repository.projectTaskId ? `/student/projects/${repository.projectTaskId}/repositories/${repository.id}` : `/student/repositories/${repository.id}`
}
function RepositoryRow({ repository }) {
  const context = repository.activityTitle || repository.projectTitle
  return <article className="academic-repository-row">
    <ProjexIcon name="repository" size={22} />
    <div className="academic-repository-identity">
      <NavLink to={pathFor(repository)}>{repository.repositoryName}</NavLink>
      <p>{types[repository.repositoryType]}{repository.className && <> · {repository.className}</>}{context && context !== repository.repositoryName && <> · {context}</>}</p>
      {repository.description && <p className="academic-repository-description">{repository.description}</p>}
      {repository.activityId && <NavLink className="academic-context-link" to={classHref(`/student/activity/${repository.activityId}`, repository.contextClassId || repository.classId)}>View Activity</NavLink>}
      {repository.repositoryType === 'CLASS_PROJECT' && repository.groupRelationship !== 'MY_GROUP' && <small>Class metadata · no source access</small>}
    </div>
    <span className={`academic-repository-state${['FAILED', 'QUARANTINED'].includes(repository.storageStatus) ? ' is-error' : ''}`}>{repository.status === 'ARCHIVED' ? 'Archived' : formatRepositoryLabel(repository.storageStatus)}</span>
    <NavLink to={pathFor(repository)} className="academic-repository-open" aria-label={`Open repository ${repository.repositoryName}`}><ProjexIcon name="chevronRight" size={18} /></NavLink>
  </article>
}
function PersonalRepositoryForm({ busy, error, onSubmit, onCancel }) {
  const [form, setForm] = useState({ repositoryName: '', description: '' })
  return <AppDialog title="New repository" onClose={onCancel} busy={busy} className="academic-repository-dialog">
    <form onSubmit={event => { event.preventDefault(); if (!busy && form.repositoryName.trim()) onSubmit({ repositoryName: form.repositoryName.trim(), description: form.description.trim() || null }) }}>
      <p className="academic-dialog-hint">Private to your account.</p>
      <label>Repository name<input autoComplete="off" required value={form.repositoryName} maxLength={120} onChange={event => setForm(current => ({ ...current, repositoryName: event.target.value }))} disabled={busy} /></label>
      <label>Description (optional)<textarea value={form.description} maxLength={5000} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} disabled={busy} /></label>
      {error && <p role="alert" className="activity-action-error">{describeApiError(error)}</p>}
      <footer><button type="button" className="student-outline-action" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy || !form.repositoryName.trim()}>{busy ? 'Creating…' : 'Create repository'}</button></footer>
    </form>
  </AppDialog>
}
export default function StudentRepositoryCatalog({ archived = false, api = repositoryApi }) {
  const capabilities = useCapabilities()
  const [query, setQuery] = useState({ page: 1, pageSize: 20, repositoryType: '', status: archived ? 'ARCHIVED' : 'ACTIVE' })
  const [state, setState] = useState({ key: '', status: 'loading', items: [], pagination: null, error: null })
  const [revision, setRevision] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState(null)
  const key = JSON.stringify(query)
  useEffect(() => {
    const controller = new AbortController()
    api.listRepositories(query, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setState({ key, status: 'ready', items: response.data.map(repositoryCatalogProjection), pagination: response.pagination, error: null }) })
      .catch(error => { if (!controller.signal.aborted) setState({ key, status: 'error', items: [], pagination: null, error }) })
    return () => controller.abort()
  }, [api, key, query, revision])
  const current = state.key === key ? state : { status: 'loading', items: [], pagination: null }
  const createPersonal = async input => {
    if (creating) return
    setCreating(true); setActionError(null)
    try {
      const created = repositoryCatalogProjection((await api.createPersonal(input)).data)
      if (!created.id || created.repositoryType !== 'PERSONAL' || created.projectTaskId !== null) throw new ApiError({ code: 'INVALID_API_RESPONSE' })
      setCreateOpen(false)
      setQuery({ page: 1, pageSize: 20, repositoryType: 'PERSONAL', status: 'ACTIVE' })
      setRevision(value => value + 1)
    } catch (error) { setActionError(error) } finally { setCreating(false) }
  }
  return <>
    {!archived && <StudentInvitationInbox api={api} />}
    <section className="academic-repository-catalog">
      <div className="academic-list-toolbar">
        <label className="academic-filter"><span className="academic-sr-only">Repository type</span><select aria-label="Repository type" value={query.repositoryType} onChange={event => setQuery(current => ({ ...current, page: 1, repositoryType: event.target.value }))}><option value="">All types</option><option value="PERSONAL">Personal</option><option value="ACTIVITY_WORKSPACE">Activity</option><option value="CLASS_PROJECT">Project</option><option value="CLASS_WORKSPACE">Class workspace (legacy)</option></select></label>
        <span className="academic-list-count">{current.status === 'ready' ? `${current.pagination?.totalItems ?? current.items.length} repositories` : 'Loading repositories…'}</span>
        {!archived && <button type="button" className="student-primary-action" disabled={!capabilities.git.provisioning} onClick={() => { setActionError(null); setCreateOpen(true) }}><ProjexIcon name="plus" size={18} />New repository</button>}
      </div>
      {!archived && !capabilities.git.provisioning && <RequestState kind="unavailable" compact title="Repository creation unavailable" message="You can still open existing repositories." />}
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading repositories." />}
      {current.status === 'error' && <RequestState kind="unavailable" compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => setRevision(value => value + 1)}>Try again</button>} />}
      {current.status === 'ready' && !current.items.length && <RequestState kind="empty" compact message={archived ? 'No archived repositories.' : 'No repositories match this view.'} />}
      {current.status === 'ready' && groups.map(([type, title]) => {
        const items = current.items.filter(item => item.repositoryType === type)
        return items.length > 0 && <section className="academic-repository-group" key={type}><h2>{title}</h2>{items.map(repository => <RepositoryRow repository={repository} key={repository.id} />)}</section>
      })}
      {current.pagination?.totalPages > 1 && <nav className="activity-pagination" aria-label="Repository pages"><button type="button" className="student-outline-action" disabled={!current.pagination.hasPreviousPage} onClick={() => setQuery(current => ({ ...current, page: current.pagination.page - 1 }))}>Previous</button><span>Page {current.pagination.page} of {current.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!current.pagination.hasNextPage} onClick={() => setQuery(current => ({ ...current, page: current.pagination.page + 1 }))}>Next</button></nav>}
    </section>
    {createOpen && <PersonalRepositoryForm busy={creating} error={actionError} onSubmit={createPersonal} onCancel={() => { if (!creating) { setCreateOpen(false); setActionError(null) } }} />}
  </>
}
