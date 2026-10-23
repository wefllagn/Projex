import AcademicEmptyState from '../components/AcademicEmptyState.jsx'
import OutlinedSelect from '../components/OutlinedSelect.jsx'
import AcademicIcon from '../components/icons/ProjexIcon.jsx'
import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { ProjexStatus } from '../design/ProjexStatus.jsx'
import { useGroupFreshness } from '../repositories/use-group-freshness.js'
import './group-project.css'
import { useCapabilities } from '../capabilities/capability-context.js'
import { repositoryApi } from '../repositories/repository-api.js'
import { StudentInvitationInbox } from '../repositories/RepositoryCollaborationViews.jsx'
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
const EMPTY_FORM = { title: '', instructions: '', dueDate: '', maxTeamSize: '8' }

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

function ProjectListRow({ project, role, classId }) {
  return <NavLink to={classHref(`/${role}/projects/${project.id}`, classId)} className="classwork-row academic-project-row">
    <span className="academic-row-icon"><AcademicIcon name="project" size={24} /></span>
    <span className="academic-project-identity classwork-row-content"><strong>{project.title}</strong><span className="academic-project-meta"><span className="academic-project-topic">No topic</span><span>{formatProjectStatus(project.status)}</span><time dateTime={project.dueDate}>Due {formatProjectDate(project.dueDate)}</time><span>Up to {project.maxTeamSize} members</span><ProjectStatus value={project.dueState} /></span></span>
    <AcademicIcon name="chevronRight" size={18} />
  </NavLink>
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
      <section className="student-assignment-panel student-assignment-panel--board academic-classwork-panel">
        <div className="student-assignment-toolbar student-assignment-toolbar--board">
          <h2>Group Projects</h2>
          <OutlinedSelect label="Project filter" value={query.status} onChange={status => setQuery({ ...FIRST_PAGE, status })} options={[{ value: '', label: 'All projects' }, { value: 'PUBLISHED', label: 'Active projects' }, { value: 'CLOSED', label: 'Closed projects' }]} />
        </div>
        {current.status === 'loading' && <RequestState kind="loading" compact message="Loading project requirements." />}
        {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
        {current.status === 'ready' && current.items.length === 0 && <AcademicEmptyState icon="project" title="No projects to show" description="Published group projects will appear here." />}
        {current.status === 'ready' && current.items.length > 0 && (
          <div className="student-assignment-list">
            {current.items.map((project) => <ProjectListRow key={project.id} project={project} role="student" classId={selectedClass.id} />)}
          </div>
        )}
        <Pagination pagination={current.pagination} onPage={(page) => setQuery((value) => ({ ...value, page }))} />
      </section>
    </div>
  )
}

function ClassRepositoryForm({ busy, onSubmit, onDirtyChange }) {
  const [form, setForm] = useState({ teamName: '', repositoryName: '', description: '' })
  const setField = (field, value) => { onDirtyChange?.(true); setForm((current) => ({ ...current, [field]: value })) }
  const valid = form.teamName.trim() && form.repositoryName.trim()
  return (
    <form className="project-repository-create" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ teamName: form.teamName.trim(), repositoryName: form.repositoryName.trim(), description: form.description.trim() || null }) }}>
      <h3>Create Group</h3>
      <p className="group-help">Create a group or ask a Maintainer for an invitation.</p>
      <label>Group name<input name="teamName" autoComplete="off" value={form.teamName} maxLength={120} onChange={(event) => setField('teamName', event.target.value)} disabled={busy} /></label>
      <label>Repository name<input name="repositoryName" autoComplete="off" spellCheck={false} value={form.repositoryName} maxLength={120} onChange={(event) => setField('repositoryName', event.target.value)} disabled={busy} /></label>
      <label>Description<textarea name="description" autoComplete="off" value={form.description} maxLength={5000} onChange={(event) => setField('description', event.target.value)} disabled={busy} /></label>
      <button type="submit" className="student-primary-action" disabled={!valid || busy}>{busy ? 'Creating…' : 'Create Group'}</button>
    </form>
  )
}

export function StudentProjectDetail({ api = projectApi, repositories = repositoryApi }) {
  const capabilities = useCapabilities()
  const { projectTaskId } = useParams()
  const navigate = useNavigate()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', project: null, repositoryItems: [], myRepository: null, group: null, pagination: null, error: null })
  const [creating, setCreating] = useState(false)
  const [formState, setFormState] = useState({ key: null, dirty: false })
  const [invitationState, setInvitationState] = useState({ key: null, count: null })
  const [freshnessVersion, setFreshnessVersion] = useState(0)
  const [actionError, setActionError] = useState(null)
  const key = `${selectedClass?.id}:${projectTaskId}`
  const formDirty = formState.key === key && formState.dirty
  const pendingCount = invitationState.key === key ? invitationState.count : null
  const setFormDirty = useCallback((dirty) => setFormState({ key, dirty }), [key])
  const setPendingCount = useCallback((count) => setInvitationState({ key, count }), [key])
  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !projectTaskId) return
    const key = `${selectedClass.id}:${projectTaskId}`
    try {
      const [projectResponse, repositoryResponse, mineResponse] = await Promise.all([
        api.getProjectTask(projectTaskId, { signal }),
        repositories.listRepositories({ page: 1, pageSize: 20, projectTaskId, groupScope: 'CLASS_METADATA' }, { signal }),
        repositories.listRepositories({ page: 1, pageSize: 20, projectTaskId, groupScope: 'MINE' }, { signal }),
      ])
      const project = projectTaskProjection(projectResponse.data)
      const repositoryItems = repositoryResponse.data.map(repositoryCatalogProjection)
      const mine = mineResponse.data.map(repositoryCatalogProjection)
      if (!projectMatchesClass(project, selectedClass)) throw projectContextError()
      if (repositoryItems.some((item) => !repositoryMatchesProject(item, projectTaskId) || item.groupRelationship !== 'CLASS_METADATA')) throw repositoryContextError()
      if (mine.some((item) => !repositoryMatchesProject(item, projectTaskId) || item.groupRelationship !== 'MY_GROUP') || mine.length > 1) throw repositoryContextError()
      let group = null
      if (mine[0] && repositories.getGroupContext) {
        const response = await repositories.getGroupContext(mine[0].id, { signal })
        const data = response.data
        if (data?.repositoryId !== mine[0].id || data.project?.id !== projectTaskId || data.class?.id !== selectedClass.id || !Number.isSafeInteger(data.team?.activeMemberCount) || data.team.activeMemberCount < 0) throw repositoryContextError()
        group = { name: data.team.name, activeMemberCount: data.team.activeMemberCount }
      }
      if (signal?.aborted) return
      setState({ key, status: 'ready', project, repositoryItems, myRepository: mine[0] || null, group, pagination: repositoryResponse.pagination, error: null })
    } catch (error) {
      if (!signal?.aborted && error?.name !== 'AbortError') setState({ key, status: 'error', project: null, repositoryItems: [], myRepository: null, group: null, error })
    }
  }, [api, projectTaskId, repositories, selectedClass])
  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) load({ signal: controller.signal }) })
    return () => controller.abort()
  }, [load, selectionStatus])
  const refresh = useCallback(async (options) => { await load(options); if (!options?.signal?.aborted) setFreshnessVersion((value) => value + 1) }, [load])
  useGroupFreshness({ identity: key, refresh, blocked: creating || formDirty, activeKey: selectionStatus })
  const createRepository = async (input) => {
    setCreating(true); setActionError(null)
    try {
      const response = await repositories.createClassProject(projectTaskId, input)
      const repository = repositoryCatalogProjection(response.data)
      if (!repositoryMatchesProject(repository, projectTaskId)) throw repositoryContextError()
      navigate(classHref(`/student/projects/${projectTaskId}/repositories/${repository.id}`, selectedClass.id))
    } catch (error) { setActionError(error) }
    finally { setCreating(false) }
  }
  const current = state.key === key ? state : { ...state, status: 'loading', project: null, repositoryItems: [], myRepository: null, group: null }
  if (current.status === 'loading' || current.status === 'idle') return <RequestState kind="loading" message="Loading the selected project requirement." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Retry project</button>} />
  const project = current.project
  const open = selectedClass.status === 'ACTIVE' && project.status === 'PUBLISHED' && project.dueState === 'OPEN'
  const mayCreate = !current.myRepository && open && capabilities.git.provisioning
  return <div className="student-detail-layout student-project-detail-layout group-project-detail academic-detail-layout">
    <NavLink to={classHref('/student/projects', selectedClass.id)} className="student-back-link academic-detail-back">Back to Group Projects</NavLink>
    <main className="student-activity-detail-card">
      <article className="student-detail-card student-project-detail-card">
        <div className="student-detail-heading"><ProjexIcon name="group-project" size={32} /><div><h2>{project.title}</h2><p>{project.createdBy.fullName}{project.status !== 'PUBLISHED' ? ` · ${formatProjectStatus(project.status)}` : ''}</p><p className="group-project-due">Due {formatProjectDate(project.dueDate)}</p></div></div>
        <div className="student-detail-divider" />
        <section className="student-project-instructions"><h3>Project requirements</h3><p>{project.instructions}</p><p className="group-help">Up to {project.maxTeamSize} members, including the Maintainer{project.dueState !== 'OPEN' ? ` · ${formatProjectStatus(project.dueState)}` : ''}</p></section>
      </article>
      {(current.repositoryItems.length > 0 || current.pagination?.hasNextPage) && <details className="group-class-metadata"><summary>Other class repositories · {current.repositoryItems.length}</summary><p className="group-help">Class-visible summaries only. Source access still requires group membership.</p>{current.repositoryItems.map((repository) => <NavLink to={classHref(`/student/projects/${project.id}/repositories/${repository.id}`, selectedClass.id)} className="student-repository-index-row" key={repository.id}><ProjexIcon name="repository" /><strong>{repository.repositoryName}</strong><small>{formatProjectStatus(repository.storageStatus)}</small></NavLink>)}{current.pagination?.hasNextPage && <button type="button" className="student-outline-action" onClick={async () => {
        try {
          const response = await repositories.listRepositories({ page: current.pagination.page + 1, pageSize: 20, projectTaskId, groupScope: 'CLASS_METADATA' })
          const items = response.data.map(repositoryCatalogProjection)
          if (items.some((item) => !repositoryMatchesProject(item, projectTaskId) || item.groupRelationship !== 'CLASS_METADATA')) throw repositoryContextError()
          setState((previous) => previous.key === key ? { ...previous, repositoryItems: [...new Map([...previous.repositoryItems, ...items].map((item) => [item.id, item])).values()], pagination: response.pagination } : previous)
        } catch (error) { setActionError(error) }
      }}>Load more class repositories</button>}</details>}
    </main>
    <aside className="student-work-rail" aria-label="Project collaboration">
      <section className="student-work-card group-project-collaboration">
        {current.myRepository ? <><ProjexIcon name="repository" size={28} /><h2>{current.myRepository.repositoryName}</h2><p className="group-help">{current.group?.name || 'Group repository'}{current.group ? ` · ${current.group.activeMemberCount}/${project.maxTeamSize} members` : ''}</p><div className="group-project-states"><ProjexStatus value={current.myRepository.storageStatus}>{formatProjectStatus(current.myRepository.storageStatus)}</ProjexStatus><ProjexStatus value={current.myRepository.reviewStatus}>{formatProjectStatus(current.myRepository.reviewStatus)}</ProjexStatus></div><NavLink className="student-primary-action" to={classHref(`/student/projects/${project.id}/repositories/${current.myRepository.id}`, selectedClass.id)}>Open Repository</NavLink></> : <>
          <h2><ProjexIcon name="members" /> Collaboration</h2>
          <StudentInvitationInbox key={key} compact allowActions={open} api={repositories} projectTaskId={project.id} onAccepted={refresh} onPendingChange={setPendingCount} refreshVersion={freshnessVersion} />
          {pendingCount === 0 && (mayCreate ? <ClassRepositoryForm busy={creating} onSubmit={createRepository} onDirtyChange={setFormDirty} /> : <p>{!open ? 'Group creation is closed for this project.' : 'New Git repositories cannot be provisioned in this environment.'}</p>)}
          {pendingCount === null && <p className="group-help">Checking group invitations…</p>}
          {!open && pendingCount > 0 && <p className="group-help">Invitation actions are closed for this project.</p>}
        </>}
        {actionError && <p role="alert" className="activity-action-error">{describeApiError(actionError)}</p>}
      </section>
    </aside>
  </div>
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
    <div className="student-assignment-panel instructor-assignment-panel academic-classwork-panel project-task-board">
      <div className="instructor-assignment-toolbar instructor-assignment-toolbar--board"><div><h2>Group Projects</h2></div><div className="instructor-assignment-toolbar-actions"><OutlinedSelect label="Status" value={query.status} onChange={status => setQuery({ ...FIRST_PAGE, status })} options={[{ value: '', label: 'All statuses' }, ...['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].map(value => ({ value, label: formatProjectStatus(value) }))]} />{selectedClass?.status === 'ARCHIVED' ? <button type="button" className="student-primary-action" disabled>New Project</button> : <NavLink to={classHref('/instructor/projects/new', selectedClass?.id)} className="student-primary-action">New Project</NavLink>}</div></div>
      {current.status === 'loading' && <RequestState kind="loading" compact message="Loading project requirements." />}
      {current.status === 'error' && <RequestState kind={current.error?.status === 404 ? 'notFound' : 'unavailable'} compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />}
      {current.status === 'ready' && current.items.length === 0 && <AcademicEmptyState icon="project" title="No group projects yet" description="Create a project when your class is ready to collaborate." />}
      {current.status === 'ready' && current.items.length > 0 && <div className="student-assignment-list">{current.items.map((project) => <ProjectListRow key={project.id} project={project} role="instructor" classId={selectedClass.id} />)}</div>}
      <Pagination pagination={current.pagination} onPage={(page) => setQuery((value) => ({ ...value, page }))} />
    </div>
  )
}

function formFromProject(project) {
  return { title: project.title, instructions: project.instructions, dueDate: toDateTimeLocal(project.dueDate), maxTeamSize: String(project.maxTeamSize) }
}

export function InstructorProjectEditor({ mode, api = projectApi }) {
  const { projectTaskId } = useParams()
  const [confirm, confirmation] = useConfirmation()
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
  const adopt = (next) => { const projected = projectTaskProjection(next); if (!projectMatchesClass(projected, selectedClass)) throw projectContextError(); setProject(projected); setForm(formFromProject(projected)); setDirty(false); setNotice('Project changes saved.') }

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
    if (busy) return
    const question = action === 'close'
      ? 'Are you sure? Closing this project stops new student collaboration and Git writes. Existing work stays available for instructor review.'
      : action === 'archive'
        ? 'Are you sure? Archiving makes this project read-only and preserves its records. Origin checks that repository reviews and invitations are resolved first. Restoring returns the project to Closed.'
        : null
    if (question && !await confirm(question, action === 'close' ? 'Close project?' : 'Archive project?')) return
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
  const backPath = mode === 'create' ? '/instructor/projects' : `/instructor/projects/${projectTaskId}`
  const backLabel = mode === 'create' ? 'Back to projects' : 'Back to project'
  return (
    <div className="student-assignment-panel instructor-create-panel academic-project-screen academic-class-frame">
      <nav className="academic-project-toolbar" aria-label="Project navigation"><NavLink to={classHref(backPath, selectedClass?.id)} className="student-back-link">{backLabel}</NavLink></nav>
      <header className="academic-project-heading"><div><p>{mode === 'create' ? 'New group project' : 'Project settings'}</p><h2>{mode === 'create' ? 'Create a group project' : project?.title}</h2></div><ProjexStatus value={status}>{formatProjectStatus(status)}</ProjexStatus></header>
      <form onSubmit={save}>
        <div className="instructor-form-grid">
          <label>Project title<input value={form.title} maxLength={200} disabled={!editable || busy} onChange={(event) => setField('title', event.target.value)} />{fieldErrors.title && <small className="activity-field-error">{fieldErrors.title}</small>}</label>
          <label>Deadline<input type="datetime-local" value={form.dueDate} disabled={!editable || busy} onChange={(event) => setField('dueDate', event.target.value)} />{fieldErrors.dueDate && <small className="activity-field-error">{fieldErrors.dueDate}</small>}</label>
          <label>Maximum members (including Maintainer)<select value={form.maxTeamSize} disabled={!editable || busy} onChange={(event) => setField('maxTeamSize', event.target.value)}>{[2,3,4,5,6,7,8].map((size) => <option value={size} key={size}>{size} members</option>)}</select>{fieldErrors.maxTeamSize && <small className="activity-field-error">{fieldErrors.maxTeamSize}</small>}</label>
          <label>Lifecycle<span className="instructor-fixed-value">{formatProjectStatus(status)}</span></label>
        </div>
        <label className="instructor-wide-field">Instructions<textarea value={form.instructions} maxLength={20000} disabled={!editable || busy} onChange={(event) => setField('instructions', event.target.value)} />{fieldErrors.instructions && <small className="activity-field-error">{fieldErrors.instructions}</small>}</label>
        {status !== 'DRAFT' && <p className="academic-project-readonly">Project details, including the member limit, are locked after publishing.</p>}
        <div className="instructor-form-actions">
          {editable && <button type="submit" className="student-primary-action" disabled={busy || (mode === 'edit' && !dirty)}>{busy ? 'Saving…' : mode === 'create' ? 'Create Draft' : 'Save Changes'}</button>}
          {status === 'DRAFT' && project && <button type="button" className="student-primary-action" disabled={busy || dirty} onClick={() => transition('publish')}>Publish</button>}
          {status === 'PUBLISHED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('close')}>Close project</button>}
          {status === 'CLOSED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('archive')}>Archive project</button>}
          {status === 'ARCHIVED' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => transition('restore')}>Restore to Closed</button>}
        </div>
        {notice && <p className="activity-action-success">{notice}</p>}
        {error && <p className="activity-action-error">{describeApiError(error)}</p>}
      </form>
      {confirmation}
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
    <section className="student-assignment-panel instructor-assignment-panel academic-project-screen academic-class-frame">
      <nav className="academic-project-toolbar" aria-label="Project navigation"><NavLink to={classHref('/instructor/projects', selectedClass.id)} className="student-back-link">Back to projects</NavLink><NavLink to={classHref(`/instructor/projects/${projectTaskId}/settings`, selectedClass.id)} className="student-outline-action"><AcademicIcon name="draft" size={18} />Project settings</NavLink></nav>
      <header className="academic-project-heading"><div><p>Group project</p><h2>{current.project.title}</h2><span>Due {formatProjectDate(current.project.dueDate)} · Up to {current.project.maxTeamSize} members per group</span></div><ProjexStatus value={current.project.status}>{formatProjectStatus(current.project.status)}</ProjexStatus></header>
      <dl className="academic-project-summary" aria-label="Project overview"><div><dt>Groups</dt><dd>{current.monitoring.teamCount}</dd></div><div><dt>Repositories</dt><dd>{current.monitoring.repositoryCount}</dd></div><div><dt>Active members</dt><dd>{current.monitoring.activeMemberCount}</dd></div></dl>
      <div className="academic-project-section-heading"><h3>Groups</h3></div>
      {current.teams.length === 0 && <AcademicEmptyState icon="people" title="No groups yet" description="Groups appear when students create their repositories." />}
      {current.teams.length > 0 && <ul className="academic-project-groups" aria-label="Project groups">{current.teams.map((team) => {
        const content = <><span className="academic-row-icon"><AcademicIcon name="people" size={24} /></span><span className="academic-project-identity"><strong>{team.name}</strong><span className="academic-project-meta"><span>Maintainer: {team.lead.fullName}</span><span>{team.activeMemberCount} / {current.project.maxTeamSize} members</span><span>{team.repository?.repositoryName ?? 'No repository'}</span></span></span><ProjexStatus value={team.repository?.reviewStatus ?? team.status}>{formatProjectStatus(team.repository?.reviewStatus ?? team.status)}</ProjexStatus>{team.repository && <AcademicIcon name="chevronRight" size={18} />}</>
        return <li key={team.teamId}>{team.repository ? <NavLink className="academic-project-group" to={classHref(`/instructor/projects/${projectTaskId}/repositories/${team.repository.repositoryId}`, selectedClass.id)}>{content}</NavLink> : <div className="academic-project-group">{content}</div>}</li>
      })}</ul>}
    </section>
  )
}
