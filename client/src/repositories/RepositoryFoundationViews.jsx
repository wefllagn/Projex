import { useCallback, useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { projectApi } from '../projects/project-api.js'
import { formatProjectDate, formatProjectStatus, projectMatchesClass, projectTaskProjection } from '../projects/project-projections.js'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import { repositoryApi } from './repository-api.js'
import {
  RepositoryCollaborationPanel,
  RepositoryLifecyclePanel,
  StudentInvitationInbox,
} from './RepositoryCollaborationViews.jsx'
import {
  formatRepositoryLabel,
  isProvisioning,
  repositoryCatalogProjection,
  repositoryMatchesProject,
  repositoryProjection,
} from './repository-projections.js'

const FIRST_PAGE = { page: 1, pageSize: 20 }

function repositoryContextError() {
  return new ApiError({ status: 404, code: 'REPOSITORY_NOT_FOUND', message: 'The repository is not available in this context.' })
}

function projectContextError() {
  return new ApiError({ status: 404, code: 'PROJECT_TASK_NOT_FOUND', message: 'The related project task is not available in this class.' })
}

function repositoryPath(repository, role = 'student') {
  if (repository.projectTaskId) return `/${role}/projects/${repository.projectTaskId}/repositories/${repository.id}`
  return `/${role}/repositories/${repository.id}`
}

function StorageState({ status }) {
  const messages = {
    PENDING: 'Repository storage is queued for provisioning.',
    PROVISIONING: 'Projex is preparing the managed repository.',
    READY: 'Repository storage is ready. Git inspection and credentials arrive in Phase 10C.3.',
    FAILED: 'Repository provisioning failed. The repository is not usable; an administrator may inspect recovery options.',
    QUARANTINED: 'Unsafe or mismatched storage was quarantined. The repository is not usable.',
  }
  const kind = status === 'READY' ? 'ready' : status === 'FAILED' || status === 'QUARANTINED' ? 'blocked' : 'pending'
  return <section className={`repository-storage-state repository-storage-state--${kind}`}><strong>{formatRepositoryLabel(status)}</strong><p>{messages[status] ?? 'Repository storage state is unavailable.'}</p></section>
}

function RepositoryRow({ repository, role = 'student' }) {
  return (
    <NavLink to={repositoryPath(repository, role)} className={`student-repository-index-row student-repository-index-row--${repository.repositoryType === 'PERSONAL' ? 'personal' : 'active'}`}>
      <span className="student-repository-row-icon" aria-hidden="true" />
      <strong>{repository.repositoryName}</strong>
      <span>{repository.repositoryType === 'PERSONAL' ? 'Personal repository' : 'Class project repository'}</span>
      <small>{formatRepositoryLabel(repository.storageStatus)}</small>
      <em>{formatRepositoryLabel(repository.status)}</em>
    </NavLink>
  )
}

function PersonalRepositoryForm({ busy, onSubmit, onCancel }) {
  const [form, setForm] = useState({ repositoryName: '', description: '' })
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="personal-repository-title">
      <form className="student-action-modal project-repository-create" onSubmit={(event) => { event.preventDefault(); if (form.repositoryName.trim()) onSubmit({ repositoryName: form.repositoryName.trim(), description: form.description.trim() || null }) }}>
        <button type="button" className="student-modal-close" onClick={onCancel} aria-label="Close create repository" />
        <p>Personal Repository</p><h2 id="personal-repository-title">Create a private repository</h2>
        <label>Repository name<input value={form.repositoryName} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, repositoryName: event.target.value }))} disabled={busy} /></label>
        <label>Description<textarea value={form.description} maxLength={5000} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} disabled={busy} /></label>
        <p className="activity-lifecycle-note">Visibility is server-controlled as Private. No browser Git repository is initialized by this form.</p>
        <div className="student-submit-modal-actions"><button type="button" className="student-outline-action" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy || !form.repositoryName.trim()}>{busy ? 'Creating…' : 'Create Repository'}</button></div>
      </form>
    </div>
  )
}

export function StudentRepositoryCatalog({ archived = false, api = repositoryApi }) {
  const [query, setQuery] = useState({ ...FIRST_PAGE, repositoryType: '', status: archived ? 'ARCHIVED' : 'ACTIVE' })
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: null })
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.listRepositories(query, { signal })
      const items = response.data.map(repositoryCatalogProjection)
      setState({ status: 'ready', items, pagination: response.pagination, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ status: 'error', items: [], pagination: null, error })
    }
  }, [api, query])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const createPersonal = async (input) => {
    setCreating(true); setActionError(null)
    try {
      const response = await api.createPersonal(input)
      const created = repositoryCatalogProjection(response.data)
      if (!created.id || created.repositoryType !== 'PERSONAL' || created.projectTaskId !== null) throw repositoryContextError()
      setCreateOpen(false)
      setState((current) => ({ ...current, items: [created, ...current.items], pagination: current.pagination ? { ...current.pagination, totalItems: current.pagination.totalItems + 1 } : current.pagination }))
    } catch (error) { setActionError(error) } finally { setCreating(false) }
  }

  const personal = state.items.filter((item) => item.repositoryType === 'PERSONAL')
  const classProjects = state.items.filter((item) => item.repositoryType === 'CLASS_PROJECT')
  return (
    <>
      <section className="student-repository-stats" aria-label="Repository overview"><article className="student-dashboard-stat"><div><span>Repositories</span><strong>{state.pagination?.totalItems ?? state.items.length}</strong><small>{archived ? 'archived records' : 'authorized records'}</small></div></article><article className="student-dashboard-stat"><div><span>Ready</span><strong>{state.items.filter((item) => item.storageStatus === 'READY').length}</strong><small>on this page</small></div></article><article className="student-dashboard-stat"><div><span>Provisioning</span><strong>{state.items.filter((item) => isProvisioning(item.storageStatus)).length}</strong><small>on this page</small></div></article></section>
      {!archived && <StudentInvitationInbox api={api} />}
      <section className="student-global-panel student-repository-board">
        <div className="student-assignment-toolbar student-assignment-toolbar--board"><div><strong>{archived ? 'Archived Repositories' : 'My Repository Catalog'}</strong><p>Server-authorized repository and collaboration records. Git content remains deferred to Phase 10C.3.</p></div><div className="repository-catalog-actions"><label className="student-sort-control">Type<select value={query.repositoryType} onChange={(event) => setQuery((current) => ({ ...current, page: 1, repositoryType: event.target.value }))}><option value="">All types</option><option value="CLASS_PROJECT">Class project</option><option value="PERSONAL">Personal</option></select></label>{!archived && <button type="button" className="student-primary-action" onClick={() => setCreateOpen(true)}>New Personal Repository</button>}</div></div>
        {state.status === 'loading' && <RequestState kind="loading" compact message="Loading repositories." />}
        {state.status === 'error' && <RequestState kind="unavailable" compact error={state.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
        {state.status === 'ready' && state.items.length === 0 && <RequestState kind="empty" compact message={archived ? 'No archived repositories are available.' : 'No repositories match this view.'} />}
        {state.status === 'ready' && state.items.length > 0 && <div className="repository-foundation-groups">{classProjects.length > 0 && <section><h2>Class Project Repositories</h2><div className="student-repository-index-list">{classProjects.map((repository) => <RepositoryRow repository={repository} key={repository.id} />)}</div></section>}{personal.length > 0 && <section><h2>Personal Repositories</h2><div className="student-repository-index-list">{personal.map((repository) => <RepositoryRow repository={repository} key={repository.id} />)}</div></section>}</div>}
        {state.pagination && state.pagination.totalPages > 1 && <nav className="activity-pagination" aria-label="Repository pages"><button type="button" className="student-outline-action" disabled={!state.pagination.hasPreviousPage} onClick={() => setQuery((current) => ({ ...current, page: state.pagination.page - 1 }))}>Previous</button><span>Page {state.pagination.page} of {state.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!state.pagination.hasNextPage} onClick={() => setQuery((current) => ({ ...current, page: state.pagination.page + 1 }))}>Next</button></nav>}
        {actionError && <p className="activity-action-error">{describeApiError(actionError)}</p>}
      </section>
      {createOpen && <PersonalRepositoryForm busy={creating} onSubmit={createPersonal} onCancel={() => { setCreateOpen(false); setActionError(null) }} />}
    </>
  )
}

function RepositoryMetadataForm({ repository, project, busy, notice, error, onSave }) {
  const [form, setForm] = useState({ repositoryName: repository.repositoryName, description: repository.description ?? '' })
  const [dirty, setDirty] = useState(false)
  const editable = repository.repositoryType === 'PERSONAL'
    ? repository.status === 'ACTIVE'
    : repository.status === 'ACTIVE' && project?.status === 'PUBLISHED' && project?.dueState === 'OPEN'
  return (
    <form className="repository-metadata-form" onSubmit={(event) => { event.preventDefault(); onSave({ expectedUpdatedAt: repository.updatedAt, repositoryName: form.repositoryName.trim(), description: form.description.trim() || null }, form, setDirty) }}>
      <h2>Repository Metadata</h2>
      <label>Name<input value={form.repositoryName} maxLength={120} disabled={!editable || busy} onChange={(event) => { setDirty(true); setForm((current) => ({ ...current, repositoryName: event.target.value })) }} /></label>
      <label>Description<textarea value={form.description} maxLength={5000} disabled={!editable || busy} onChange={(event) => { setDirty(true); setForm((current) => ({ ...current, description: event.target.value })) }} /></label>
      {editable ? <button type="submit" className="student-primary-action" disabled={!dirty || busy || !form.repositoryName.trim()}>{busy ? 'Saving…' : 'Save Metadata'}</button> : <p className="activity-lifecycle-note">Metadata is read-only for this user or lifecycle state.</p>}
      {notice && <p className="activity-action-success">{notice}</p>}
      {error && <p className="activity-action-error">{describeApiError(error)}</p>}
    </form>
  )
}

export function RepositoryFoundationDetail({ role = 'student', api = repositoryApi, projects = projectApi }) {
  const { repositoryId, projectTaskId } = useParams()
  const auth = useAuth()
  const { selectedClass, api: classApi } = useClasses()
  const [state, setState] = useState({ identity: null, status: 'loading', repository: null, project: null, projectUnavailable: false, error: null })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState('')
  const [pollingStopped, setPollingStopped] = useState(false)

  const applyRepository = useCallback((raw) => {
    const repository = repositoryProjection(raw)
    if (repository.id !== repositoryId) throw repositoryContextError()
    if (projectTaskId && !repositoryMatchesProject(repository, projectTaskId)) throw repositoryContextError()
    setState((current) => current.identity === repositoryId ? { ...current, repository, status: 'ready', error: null } : current)
    return repository
  }, [projectTaskId, repositoryId])

  const load = useCallback(async ({ signal } = {}) => {
    if (!repositoryId) return
    try {
      const response = await api.getRepository(repositoryId, { signal })
      const repository = repositoryProjection(response.data)
      if (repository.id !== repositoryId || (projectTaskId && !repositoryMatchesProject(repository, projectTaskId))) throw repositoryContextError()
      let project = null
      let projectUnavailable = false
      if (repository.projectTaskId) {
        try {
          const projectResponse = await projects.getProjectTask(repository.projectTaskId, { signal })
          project = projectTaskProjection(projectResponse.data)
          if (project.id !== repository.projectTaskId) throw projectContextError()
          if (projectTaskId && selectedClass && !projectMatchesClass(project, selectedClass)) throw projectContextError()
        } catch (projectError) {
          if (projectError?.name === 'AbortError') throw projectError
          if (repository.status === 'ARCHIVED' && role === 'student' && projectError?.status === 404) projectUnavailable = true
          else throw projectError
        }
      }
      setState({ identity: repositoryId, status: 'ready', repository, project, projectUnavailable, error: null })
      setPollingStopped(false)
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ identity: repositoryId, status: 'error', repository: null, project: null, projectUnavailable: false, error })
    }
  }, [api, projectTaskId, projects, repositoryId, role, selectedClass])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const current = state.identity === repositoryId ? state : { ...state, status: 'loading', repository: null, project: null }
  const polling = Boolean(current.repository && isProvisioning(current.repository.storageStatus) && !pollingStopped)
  useBoundedPolling({
    identity: repositoryId,
    active: polling,
    load: (identity, options) => api.getRepository(identity, options),
    onData: (response) => !['READY', 'FAILED', 'QUARANTINED'].includes(applyRepository(response.data).storageStatus),
    onError: (error) => setActionError(error),
    onBoundedStop: () => setPollingStopped(true),
    maximumDurationMs: 60_000,
  })

  const saveMetadata = async (input, unsavedForm, setDirty) => {
    setBusy(true); setActionError(null); setNotice('')
    try {
      const response = await api.updateRepository(repositoryId, input)
      applyRepository(response.data)
      setDirty(false)
      setNotice('Repository metadata updated from the server.')
    } catch (error) {
      setActionError(error)
      if (error?.status === 409) {
        try {
          const response = await api.getRepository(repositoryId)
          applyRepository(response.data)
          setNotice(`The repository changed on the server. Your unsaved name “${unsavedForm.repositoryName}” remains in the form; review and retry deliberately.`)
          setDirty(true)
        } catch (reloadError) { setActionError(reloadError) }
      }
    } finally { setBusy(false) }
  }

  if (current.status === 'loading') return <RequestState kind="loading" message="Loading repository metadata." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  const repository = current.repository
  const owner = auth.user?.id === repository.owner.userId
  const backPath = role === 'instructor'
    ? classHref(`/instructor/projects/${repository.projectTaskId}`, selectedClass?.id)
    : repository.projectTaskId
      ? classHref(`/student/projects/${repository.projectTaskId}`, selectedClass?.id)
      : '/student/repositories'
  return (
    <div className={`${role === 'instructor' ? 'instructor' : 'student'}-repository-page repository-foundation-page`}>
      <header className="student-repository-topbar"><div className="student-repository-breadcrumb"><NavLink to={backPath}>Back</NavLink>{current.project && <span>{current.project.title}</span>}<strong>{repository.repositoryName}</strong></div></header>
      <main className="student-repository-content">
        <section className="student-repository-hero"><span className="student-repo-mark" aria-hidden="true" /><div><h1>{repository.repositoryName}</h1><span className="student-repo-state">{formatRepositoryLabel(repository.status)}</span><p>{repository.description || 'No repository description.'}</p></div></section>
        <div className="student-repository-grid repository-foundation-grid">
          <section className="student-repo-main-column">
            <section className="student-repo-card"><h2>Repository Record</h2><dl className="repository-metadata-list"><div><dt>Type</dt><dd>{formatRepositoryLabel(repository.repositoryType)}</dd></div><div><dt>Visibility</dt><dd>{formatRepositoryLabel(repository.visibility)}</dd></div><div><dt>Owner</dt><dd>{repository.owner.fullName}</dd></div><div><dt>Default branch</dt><dd>{repository.defaultBranch}</dd></div><div><dt>Review state</dt><dd>{formatRepositoryLabel(repository.reviewStatus)}</dd></div><div><dt>Created</dt><dd>{formatProjectDate(repository.createdAt)}</dd></div></dl></section>
            {current.project && <section className="student-repo-card"><h2>Linked Project Requirement</h2><h3>{current.project.title}</h3><p>{current.project.instructions}</p><p>Due {formatProjectDate(current.project.dueDate)} · {formatProjectStatus(current.project.status)}</p></section>}
            {current.projectUnavailable && <RequestState kind="unavailable" compact title="Archived project detail unavailable" message="The archived repository record remains authorized, but the related archived project-task detail is not exposed to students by the current backend." />}
            <RepositoryCollaborationPanel role={role} owner={owner} repository={repository} project={current.project} api={api} classApi={classApi} onRepositoryChange={applyRepository} onReloadRepository={load} />
            <RequestState kind="unavailable" compact title="Repository content arrives in Phase 10C.3" message="Branches, commits, files, diffs, clone guidance, and Git credentials are intentionally not loaded in this milestone." />
          </section>
          <aside className="student-repo-side-column">
            <StorageState status={repository.storageStatus} />
            {polling && <p className="repository-polling-note">Checking provisioning status without overlapping requests…</p>}
            {pollingStopped && isProvisioning(repository.storageStatus) && <button type="button" className="student-outline-action" onClick={() => load()}>Refresh Status</button>}
            {owner ? <RepositoryMetadataForm key={repository.id} repository={repository} project={current.project} busy={busy} notice={notice} error={actionError} onSave={saveMetadata} /> : <section className="student-repo-card"><h2>Metadata</h2><p>Only the active repository owner may edit supported metadata. Backend authorization remains authoritative.</p></section>}
            <RepositoryLifecyclePanel role={role} owner={owner} repository={repository} api={api} onRepositoryChange={applyRepository} onReloadRepository={load} />
          </aside>
        </div>
      </main>
    </div>
  )
}

export function RepositorySelectionRequired({ role = 'student' }) {
  const { projectTaskId } = useParams()
  const { selectedClass } = useClasses()
  const path = classHref(`/${role}/projects/${projectTaskId}`, selectedClass?.id)
  return <RequestState kind="unavailable" title="Choose a repository" message="This compatibility route has no repository identifier and cannot guess one safely." action={<NavLink to={path} className="student-primary-action">View Project Repositories</NavLink>} />
}
