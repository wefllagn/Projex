import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { repositoryApi } from '../repositories/repository-api.js'
import { repositoryCatalogProjection, repositoryMatchesProject } from '../repositories/repository-projections.js'
import { projectApi } from './project-api.js'
import {
  formatProjectDate,
  formatProjectStatus,
  monitoringProjection,
  projectMatchesClass,
  projectPayload,
  projectTaskProjection,
  teamSummaryProjection,
  toDateTimeLocal,
  validateProjectForm,
} from './project-projections.js'

const FIRST_PAGE = { page: 1, pageSize: 20 }
const EMPTY_FORM = { title: '', instructions: '', dueDate: '', maxTeamSize: '4' }

function projectContextError() {
  return new ApiError({
    status: 404,
    code: 'PROJECT_TASK_NOT_FOUND',
    message: 'The project task is not available in the selected class.',
  })
}

function repositoryContextError() {
  return new ApiError({
    status: 404,
    code: 'REPOSITORY_NOT_FOUND',
    message: 'The repository is not available for the selected project task.',
  })
}

function ProjectStatus({ value }) {
  return <em className={`project-status project-status--${String(value).toLowerCase()}`}>{formatProjectStatus(value)}</em>
}

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null
  return (
    <nav className="activity-pagination" aria-label="Project task pages">
      <button type="button" className="student-outline-action" disabled={!pagination.hasPreviousPage} onClick={() => onPage(pagination.page - 1)}>Previous</button>
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <button type="button" className="student-outline-action" disabled={!pagination.hasNextPage} onClick={() => onPage(pagination.page + 1)}>Next</button>
    </nav>
  )
}

export function StudentProjectList({ api = projectApi }) {
  const { selectedClass, selectionStatus } = useClasses()
  const [query, setQuery] = useState({ ...FIRST_PAGE, status: '' })
  const [state, setState] = useState({ classId: null, status: 'idle', items: [], pagination: null, error: null })

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass) return
    try {
      const response = await api.listProjectTasks(selectedClass.id, query, { signal })
      const items = response.data.map(projectTaskProjection)
      if (items.some((item) => !projectMatchesClass(item, selectedClass))) throw projectContextError()
      setState({ classId: selectedClass.id, status: 'ready', items, pagination: response.pagination, error: null })
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
    <div className="student-assignment-board project-task-board">
      <section className="student-assignment-stats" aria-label="Project requirement overview">
        <article className="student-dashboard-stat student-assignment-stat"><div><span>Project Requirements</span><strong>{current.pagination?.totalItems ?? current.items.length}</strong><small>authorized records</small></div></article>
        <article className="student-dashboard-stat student-assignment-stat"><div><span>Open</span><strong>{current.items.filter((item) => item.dueState === 'OPEN').length}</strong><small>on this page</small></div></article>
        <article className="student-dashboard-stat student-assignment-stat"><div><span>Closed</span><strong>{current.items.filter((item) => item.status === 'CLOSED').length}</strong><small>on this page</small></div></article>
      </section>
      <section className="student-assignment-panel student-assignment-panel--board">
        <div className="student-assignment-toolbar student-assignment-toolbar--board">
          <div><strong>Class Projects</strong><p>Published and closed project requirements for {selectedClass?.className}.</p></div>
          <label className="student-sort-control">Status<select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}><option value="">Published and closed</option><option value="PUBLISHED">Published</option><option value="CLOSED">Closed</option></select></label>
        </div>
        {current.status === 'loading' && <RequestState kind="loading" compact message="Loading project requirements." />}
        {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
        {current.status === 'ready' && current.items.length === 0 && <RequestState kind="empty" compact message="No project requirements match this view." />}
        {current.status === 'ready' && current.items.length > 0 && (
          <div className="student-assignment-list">
            {current.items.map((project) => (
              <article className="student-assignment-row project-task-row" key={project.id}>
                <div className="student-assignment-type"><span className="student-group-icon" aria-hidden="true" /><strong>Project</strong></div>
                <div><h2>{project.title}</h2><p>{project.instructions}</p><small>Team size up to {project.maxTeamSize}</small></div>
                <div className="student-assignment-due"><span>Due {formatProjectDate(project.dueDate)}</span><ProjectStatus value={project.dueState} /></div>
                <NavLink to={classHref(`/student/projects/${project.id}`, selectedClass.id)} className="student-assignment-action">View details</NavLink>
              </article>
            ))}
          </div>
        )}
        <Pagination pagination={current.pagination} onPage={(page) => setQuery((value) => ({ ...value, page }))} />
      </section>
    </div>
  )
}

function ClassRepositoryForm({ busy, onSubmit }) {
  const [form, setForm] = useState({ teamName: '', repositoryName: '', description: '' })
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const valid = form.teamName.trim() && form.repositoryName.trim()
  return (
    <form className="project-repository-create" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ teamName: form.teamName.trim(), repositoryName: form.repositoryName.trim(), description: form.description.trim() || null }) }}>
      <h3>Create your team repository</h3>
      <p>Creation atomically establishes your team and owner membership. Joining another team requires accepting an authorized repository invitation.</p>
      <label>Team name<input value={form.teamName} maxLength={120} onChange={(event) => setField('teamName', event.target.value)} disabled={busy} /></label>
      <label>Repository name<input value={form.repositoryName} maxLength={120} onChange={(event) => setField('repositoryName', event.target.value)} disabled={busy} /></label>
      <label>Description<textarea value={form.description} maxLength={5000} onChange={(event) => setField('description', event.target.value)} disabled={busy} /></label>
      <button type="submit" className="student-primary-action" disabled={!valid || busy}>{busy ? 'Creating…' : 'Create Repository'}</button>
    </form>
  )
}

export function StudentProjectDetail({ api = projectApi, repositories = repositoryApi }) {
  const capabilities = useCapabilities()
  const { projectTaskId } = useParams()
  const navigate = useNavigate()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', project: null, repositoryItems: [], error: null })
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !projectTaskId) return
    const key = `${selectedClass.id}:${projectTaskId}`
    try {
      const [projectResponse, repositoryResponse] = await Promise.all([
        api.getProjectTask(projectTaskId, { signal }),
        repositories.listRepositories({ page: 1, pageSize: 100, projectTaskId }, { signal }),
      ])
      const project = projectTaskProjection(projectResponse.data)
      const repositoryItems = repositoryResponse.data.map(repositoryCatalogProjection)
      if (!projectMatchesClass(project, selectedClass)) throw projectContextError()
      if (repositoryItems.some((item) => !repositoryMatchesProject(item, projectTaskId))) throw repositoryContextError()
      setState({ key, status: 'ready', project, repositoryItems, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', project: null, repositoryItems: [], error })
    }
  }, [api, projectTaskId, repositories, selectedClass])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const createRepository = async (input) => {
    setCreating(true)
    setActionError(null)
    try {
      const response = await repositories.createClassProject(projectTaskId, input)
      const repository = repositoryCatalogProjection(response.data)
      if (!repositoryMatchesProject(repository, projectTaskId)) throw repositoryContextError()
      navigate(classHref(`/student/projects/${projectTaskId}/repositories/${repository.id}`, selectedClass.id))
    } catch (error) {
      setActionError(error)
    } finally {
      setCreating(false)
    }
  }

  const key = `${selectedClass?.id}:${projectTaskId}`
  const current = state.key === key ? state : { ...state, status: 'loading', project: null, repositoryItems: [] }
  if (current.status === 'loading') return <RequestState kind="loading" message="Loading the selected project requirement." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.project) return null
  const project = current.project
  const mayCreate = selectedClass.status === 'ACTIVE' && project.status === 'PUBLISHED' && project.dueState === 'OPEN'
  return (
    <div className="student-detail-layout student-project-detail-layout">
      <main className="student-activity-detail-card">
        <NavLink to={classHref('/student/projects', selectedClass.id)} className="student-back-link">Back to Group Projects</NavLink>
        <article className="student-detail-card student-project-detail-card">
          <div className="student-detail-heading"><span className="student-detail-icon student-project-detail-icon" aria-hidden="true" /><div><h2>{project.title}</h2><p><span>{project.createdBy.fullName}</span><span>{formatProjectStatus(project.status)}</span></p><p className="student-detail-due">Due {formatProjectDate(project.dueDate)}</p></div></div>
          <div className="student-detail-divider" />
          <section className="student-project-instructions"><h3>Project requirement</h3><p>{project.instructions}</p><ul><li>Maximum team size: {project.maxTeamSize}</li><li>Lifecycle: {formatProjectStatus(project.dueState)}</li></ul></section>
        </article>
        <section className="student-detail-card project-repository-list">
          <div className="student-side-card-heading"><h2>Class repositories</h2><span>{current.repositoryItems.length} visible</span></div>
          {current.repositoryItems.length === 0 && <RequestState kind="empty" compact message="No class repository is available for this project yet." />}
          {current.repositoryItems.map((repository) => (
            <NavLink to={classHref(`/student/projects/${project.id}/repositories/${repository.id}`, selectedClass.id)} className="student-repository-index-row" key={repository.id}>
              <span className="student-repository-row-icon" aria-hidden="true" /><strong>{repository.repositoryName}</strong><span>{repository.owner.fullName}</span><small>{formatProjectStatus(repository.storageStatus)}</small><em>{formatProjectStatus(repository.status)}</em>
            </NavLink>
          ))}
        </section>
      </main>
      <aside className="student-work-rail">
        <section className="student-work-card">
          {mayCreate && capabilities.git.provisioning ? <ClassRepositoryForm busy={creating} onSubmit={createRepository} /> : <RequestState kind="unavailable" compact title={mayCreate ? 'Repository provisioning unavailable' : 'Repository creation is closed'} message={mayCreate ? 'This environment preserves repository records but cannot provision new Git storage.' : 'A team repository can be created only while the project is published, before its deadline, in an active class.'} />}
          {actionError && <p className="activity-action-error">{describeApiError(actionError)}</p>}
        </section>
        <section className="student-work-card student-private-card"><h2>Collaboration</h2><p>Repository invitations are available from My Repositories. Direct arbitrary repository joining is not supported.</p></section>
      </aside>
    </div>
  )
}

export function InstructorProjectList({ api = projectApi }) {
  const { selectedClass, selectionStatus } = useClasses()
  const [query, setQuery] = useState({ ...FIRST_PAGE, status: '' })
  const [state, setState] = useState({ classId: null, status: 'idle', items: [], pagination: null, error: null })
  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass) return
    try {
      const response = await api.listProjectTasks(selectedClass.id, query, { signal })
      const items = response.data.map(projectTaskProjection)
      if (items.some((item) => !projectMatchesClass(item, selectedClass))) throw projectContextError()
      setState({ classId: selectedClass.id, status: 'ready', items, pagination: response.pagination, error: null })
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
      <div className="instructor-assignment-toolbar instructor-assignment-toolbar--board"><div><strong>Project Requirements</strong><p>Repository-backed project tasks for {selectedClass?.className}.</p></div><div className="instructor-assignment-toolbar-actions"><label className="instructor-status-filter"><span>Status</span><select value={query.status} onChange={(event) => setQuery({ ...FIRST_PAGE, status: event.target.value })}><option value="">All statuses</option>{['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].map((status) => <option value={status} key={status}>{formatProjectStatus(status)}</option>)}</select></label>{selectedClass?.status === 'ARCHIVED' ? <button type="button" className="student-primary-action" disabled>New Project</button> : <NavLink to={classHref('/instructor/projects/new', selectedClass?.id)} className="student-primary-action">New Project</NavLink>}</div></div>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading project requirements." />}
      {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {current.status === 'ready' && current.items.length === 0 && <RequestState kind="empty" compact message="Create a draft project requirement for this class to begin." />}
      {current.status === 'ready' && current.items.length > 0 && <div className="instructor-data-table" role="table" aria-label="Project requirements"><div className="instructor-table-row instructor-table-row--head instructor-project-row" role="row"><span>Project</span><span>Due date</span><span>Status</span><span>Team size</span><span>Actions</span></div>{current.items.map((project) => <div className="instructor-table-row instructor-project-row" role="row" key={project.id}><div><strong>{project.title}</strong><small>{project.instructions}</small></div><span>{formatProjectDate(project.dueDate)}</span><ProjectStatus value={project.status} /><span>{project.maxTeamSize}</span><div><NavLink to={classHref(`/instructor/projects/${project.id}`, selectedClass.id)}>Monitor</NavLink><NavLink to={classHref(`/instructor/projects/${project.id}/settings`, selectedClass.id)}>Configure</NavLink></div></div>)}</div>}
      <Pagination pagination={current.pagination} onPage={(page) => setQuery((value) => ({ ...value, page }))} />
    </div>
  )
}

function formFromProject(project) {
  return { title: project.title, instructions: project.instructions, dueDate: toDateTimeLocal(project.dueDate), maxTeamSize: String(project.maxTeamSize) }
}

export function InstructorProjectEditor({ mode, api = projectApi }) {
  const { projectTaskId } = useParams()
  const navigate = useNavigate()
  const { selectedClass, selectionStatus } = useClasses()
  const [project, setProject] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loadState, setLoadState] = useState(mode === 'create' ? 'ready' : 'loading')
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async ({ signal, preserveForm = false } = {}) => {
    if (mode === 'create' || !selectedClass || !projectTaskId) return
    setLoadState('loading')
    try {
      const response = await api.getProjectTask(projectTaskId, { signal })
      const next = projectTaskProjection(response.data)
      if (!projectMatchesClass(next, selectedClass)) throw projectContextError()
      setProject(next)
      if (!preserveForm) { setForm(formFromProject(next)); setDirty(false) }
      setError(null)
      setLoadState('ready')
    } catch (nextError) {
      if (nextError?.name !== 'AbortError') { setError(nextError); setLoadState('error') }
    }
  }, [api, mode, projectTaskId, selectedClass])

  useEffect(() => {
    if (mode === 'create' || selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, mode, selectionStatus])

  const setField = (field, value) => { setDirty(true); setNotice(''); setForm((current) => ({ ...current, [field]: value })) }
  const adopt = (next) => { const projected = projectTaskProjection(next); if (!projectMatchesClass(projected, selectedClass)) throw projectContextError(); setProject(projected); setForm(formFromProject(projected)); setDirty(false); setNotice('Project task updated from the server.') }

  const save = async (event) => {
    event.preventDefault()
    const errors = validateProjectForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setBusy(true); setError(null); setNotice('')
    try {
      const payload = projectPayload(form)
      const response = mode === 'create'
        ? await api.createProjectTask(selectedClass.id, payload)
        : await api.updateProjectTask(projectTaskId, { expectedUpdatedAt: project.updatedAt, ...payload })
      const next = projectTaskProjection(response.data)
      if (!projectMatchesClass(next, selectedClass)) throw projectContextError()
      if (mode === 'create') navigate(classHref(`/instructor/projects/${next.id}/settings`, selectedClass.id), { replace: true })
      else adopt(next)
    } catch (nextError) {
      setError(nextError)
      if (mode === 'edit' && nextError?.status === 409) {
        await load({ preserveForm: true })
        setDirty(true)
        setNotice('The project changed on the server. Your unsaved values are preserved; review them and retry deliberately.')
      }
    } finally { setBusy(false) }
  }

  const transition = async (action) => {
    setBusy(true); setError(null); setNotice('')
    try {
      const response = await api.transitionProjectTask(project.id, action, { expectedUpdatedAt: project.updatedAt })
      adopt(response.data)
    } catch (nextError) {
      setError(nextError)
      if (nextError?.status === 409) {
        await load({ preserveForm: dirty })
        setNotice('The project changed on the server. The latest version is loaded; review it and retry the lifecycle action deliberately.')
      }
    } finally { setBusy(false) }
  }

  if (selectionStatus === 'loading' || loadState === 'loading') return <RequestState kind="loading" message="Loading project settings." />
  if (loadState === 'error') return <RequestState kind={error?.status === 404 ? 'notFound' : 'unavailable'} error={error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  const status = project?.status ?? 'DRAFT'
  const editable = mode === 'create' || (status === 'DRAFT' && selectedClass?.status !== 'ARCHIVED')
  return (
    <div className="student-assignment-panel instructor-create-panel">
      <div className="instructor-assignment-toolbar"><NavLink to={classHref('/instructor/projects', selectedClass?.id)} className="student-outline-action">Back to projects</NavLink></div>
      <section className="instructor-page-heading"><p>{mode === 'create' ? 'New Project Requirement' : 'Project Requirement Settings'}</p><h2>{mode === 'create' ? 'Create a project task' : project?.title}</h2><span>Only backend-supported project metadata and lifecycle controls are available.</span></section>
      <form onSubmit={save}>
        <div className="instructor-form-grid">
          <label>Project title<input value={form.title} maxLength={200} disabled={!editable || busy} onChange={(event) => setField('title', event.target.value)} />{fieldErrors.title && <small className="activity-field-error">{fieldErrors.title}</small>}</label>
          <label>Deadline<input type="datetime-local" value={form.dueDate} disabled={!editable || busy} onChange={(event) => setField('dueDate', event.target.value)} />{fieldErrors.dueDate && <small className="activity-field-error">{fieldErrors.dueDate}</small>}</label>
          <label>Maximum team size<select value={form.maxTeamSize} disabled={!editable || busy} onChange={(event) => setField('maxTeamSize', event.target.value)}>{[2,3,4,5,6,7,8].map((size) => <option value={size} key={size}>{size} students</option>)}</select>{fieldErrors.maxTeamSize && <small className="activity-field-error">{fieldErrors.maxTeamSize}</small>}</label>
          <label>Lifecycle<span className="instructor-fixed-value">{formatProjectStatus(status)}</span></label>
        </div>
        <label className="instructor-wide-field">Instructions<textarea value={form.instructions} maxLength={20000} disabled={!editable || busy} onChange={(event) => setField('instructions', event.target.value)} />{fieldErrors.instructions && <small className="activity-field-error">{fieldErrors.instructions}</small>}</label>
        <p className="activity-lifecycle-note">Rubrics, attachments, grading configuration, similarity, and contribution settings are not part of the project-task contract.</p>
        <div className="instructor-form-actions">
          {editable && <button type="submit" className="student-primary-action" disabled={busy || (mode === 'edit' && !dirty)}>{busy ? 'Saving…' : mode === 'create' ? 'Create Draft' : 'Save Changes'}</button>}
          {status === 'DRAFT' && project && <button type="button" className="student-primary-action" disabled={busy || dirty} onClick={() => transition('publish')}>Publish</button>}
          {status === 'PUBLISHED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('close')}>Close</button>}
          {status === 'CLOSED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('archive')}>Archive</button>}
          {status === 'ARCHIVED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('restore')}>Restore to Closed</button>}
        </div>
        {notice && <p className="activity-action-success">{notice}</p>}
        {error && <p className="activity-action-error">{describeApiError(error)}</p>}
      </form>
    </div>
  )
}

export function InstructorProjectDetail({ api = projectApi }) {
  const { projectTaskId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', project: null, teams: [], monitoring: null, error: null })
  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !projectTaskId) return
    const key = `${selectedClass.id}:${projectTaskId}`
    try {
      const [projectResponse, teamResponse, monitoringResponse] = await Promise.all([api.getProjectTask(projectTaskId, { signal }), api.listTeams(projectTaskId, { signal }), api.getMonitoring(projectTaskId, { signal })])
      const project = projectTaskProjection(projectResponse.data)
      const teams = teamResponse.data.map(teamSummaryProjection)
      const monitoring = monitoringProjection(monitoringResponse.data)
      if (!projectMatchesClass(project, selectedClass) || monitoring.projectTaskId !== projectTaskId) throw projectContextError()
      setState({ key, status: 'ready', project, teams, monitoring, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', project: null, teams: [], monitoring: null, error })
    }
  }, [api, projectTaskId, selectedClass])
  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])
  const key = `${selectedClass?.id}:${projectTaskId}`
  const current = state.key === key ? state : { ...state, status: 'loading', project: null, teams: [], monitoring: null }
  if (current.status === 'loading') return <RequestState kind="loading" message="Loading project monitoring." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  return (
    <div className="student-assignment-panel instructor-assignment-panel">
      <div className="instructor-assignment-toolbar"><NavLink to={classHref('/instructor/projects', selectedClass.id)} className="student-outline-action">Back to projects</NavLink><NavLink to={classHref(`/instructor/projects/${projectTaskId}/settings`, selectedClass.id)} className="student-primary-action">Configure</NavLink></div>
      <section className="instructor-page-heading"><p>Project Requirement Monitoring</p><h2>{current.project.title}</h2><span>Due {formatProjectDate(current.project.dueDate)} · {formatProjectStatus(current.project.status)}</span></section>
      <div className="instructor-stat-grid instructor-monitor-grid"><article className="instructor-stat-card"><span>Teams</span><strong>{current.monitoring.teamCount}</strong><p>authoritative records</p></article><article className="instructor-stat-card"><span>Repositories</span><strong>{current.monitoring.repositoryCount}</strong><p>created for this task</p></article><article className="instructor-stat-card"><span>Active members</span><strong>{current.monitoring.activeMemberCount}</strong><p>across project teams</p></article></div>
      {current.teams.length === 0 && <RequestState kind="empty" compact message="No teams or repositories have been created for this project task." />}
      {current.teams.length > 0 && <div className="instructor-data-table" role="table" aria-label="Project teams"><div className="instructor-table-row instructor-table-row--head instructor-team-row project-team-foundation-row" role="row"><span>Team</span><span>Lead</span><span>Members</span><span>Repository</span><span>Status</span><span>Action</span></div>{current.teams.map((team) => <div className="instructor-table-row instructor-team-row project-team-foundation-row" role="row" key={team.teamId}><strong>{team.name}</strong><span>{team.lead.fullName}</span><span>{team.activeMemberCount}</span><span>{team.repository?.repositoryName ?? 'No repository'}</span><ProjectStatus value={team.repository?.reviewStatus ?? team.status} /><div>{team.repository ? <NavLink to={classHref(`/instructor/projects/${projectTaskId}/repositories/${team.repository.repositoryId}`, selectedClass.id)}>View metadata</NavLink> : <span>Unavailable</span>}</div></div>)}</div>}
      <RequestState kind="unavailable" compact title="Git contribution evidence is not active yet" message="Open an authorized repository above for collaboration, feedback, and academic review. Git history, contribution analytics, and similarity remain later boundaries." />
    </div>
  )
}
