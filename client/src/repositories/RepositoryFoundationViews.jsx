import { useCallback, useEffect, useState } from 'react'
import { NavLink, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, describeApiError, isTemporaryApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { activityApi } from '../activities/activity-api.js'
import { formatActivityDate, formatActivityStatus } from '../activities/activity-utils.js'
import { projectApi } from '../projects/project-api.js'
import { formatProjectDate, formatProjectStatus, projectMatchesClass, projectTaskProjection } from '../projects/project-projections.js'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import { repositoryApi } from './repository-api.js'
import { RepositoryGitPanel } from './RepositoryGitViews.jsx'
import { RepositoryActivityPanel } from './RepositoryActivityPanel.jsx'
import { ActivityRepositoryView } from './ActivityRepositoryView.jsx'
import { GroupRepositoryView } from './GroupRepositoryView.jsx'
import {
  RepositoryCollaborationPanel,
  RepositoryLifecyclePanel,
} from './RepositoryCollaborationViews.jsx'
import {
  formatRepositoryLabel,
  isProvisioning,
  repositoryMatchesProject,
  repositoryProjection,
} from './repository-projections.js'

function repositoryContextError() {
  return new ApiError({ status: 404, code: 'REPOSITORY_NOT_FOUND', message: 'The repository is not available in this context.' })
}

function projectContextError() {
  return new ApiError({ status: 404, code: 'PROJECT_TASK_NOT_FOUND', message: 'The related project task is not available in this class.' })
}

function activityContextError() {
  return new ApiError({ status: 502, code: 'INVALID_API_RESPONSE', message: 'The linked Activity does not match this repository.' })
}

function StorageState({ status }) {
  const messages = {
    PENDING: 'Repository preparation is queued.',
    PROVISIONING: 'Preparing your repository.',
    READY: 'Git access is available.',
    FAILED: 'Repository preparation failed. Contact your administrator.',
    QUARANTINED: 'Repository access is paused. Contact your administrator.',
  }
  const kind = status === 'READY' ? 'ready' : status === 'FAILED' || status === 'QUARANTINED' ? 'blocked' : 'pending'
  return <section className={`repository-storage-state repository-storage-state--${kind}`}><strong>{formatRepositoryLabel(status)}</strong><p>{messages[status] ?? 'Repository storage state is unavailable.'}</p></section>
}

export { default as StudentRepositoryCatalog } from './StudentRepositoryCatalog.jsx'

function RepositoryMetadataForm({ repository, project, busy, notice, error, onSave }) {
  const [form, setForm] = useState({ repositoryName: repository.repositoryName, description: repository.description ?? '' })
  const [dirty, setDirty] = useState(false)
  const editable = repository.repositoryType === 'PERSONAL' || repository.repositoryType === 'CLASS_WORKSPACE'
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

export function RepositoryFoundationDetail({ role = 'student', api = repositoryApi, projects = projectApi, activities = activityApi, gitApi }) {
  const { repositoryId, projectTaskId } = useParams()
  const [searchParams] = useSearchParams()
  const identity = `${repositoryId}:${projectTaskId || ''}:${searchParams.get('classId') || ''}`
  const auth = useAuth()
  const { selectedClass, api: classApi } = useClasses()
  const [state, setState] = useState({ identity: null, status: 'loading', repository: null, project: null, projectUnavailable: false, activity: null, activityUnavailable: false, error: null })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState('')
  const [pollingStopped, setPollingStopped] = useState(false)

  const applyRepository = useCallback((raw) => {
    const repository = repositoryProjection(raw)
    if (repository.id !== repositoryId) throw repositoryContextError()
    if (projectTaskId && !repositoryMatchesProject(repository, projectTaskId)) throw repositoryContextError()
    setState((current) => current.identity === identity ? { ...current, repository, status: 'ready', error: null } : current)
    return repository
  }, [identity, projectTaskId, repositoryId])

  const load = useCallback(async ({ signal } = {}) => {
    if (!repositoryId) return
    try {
      const response = await api.getRepository(repositoryId, { signal })
      const repository = repositoryProjection(response.data)
      if (repository.id !== repositoryId || (projectTaskId && !repositoryMatchesProject(repository, projectTaskId))) throw repositoryContextError()
      let project = null
      let projectUnavailable = false
      let activity = null
      let activityUnavailable = false
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
      if (repository.repositoryType === 'ACTIVITY_WORKSPACE') {
        if (!repository.activityId) throw activityContextError()
        try {
          const activityResponse = await activities.getActivity(repository.activityId, { signal })
          activity = activityResponse.data
          if (activity?.id !== repository.activityId || (repository.classId && activity?.classId !== repository.classId) || (repository.contextClassId && activity?.classId !== repository.contextClassId) || (searchParams.get('classId') && activity?.classId !== searchParams.get('classId'))) throw activityContextError()
        } catch (activityError) {
          if (activityError?.name === 'AbortError') throw activityError
          if (activityError?.status === 404) activityUnavailable = true
          else throw activityError
        }
      }
      if (signal?.aborted) return
      setState({ identity, status: 'ready', repository, project, projectUnavailable, activity, activityUnavailable, error: null })
      setPollingStopped(false)
    } catch (error) {
      if (error?.name !== 'AbortError' && !signal?.aborted) setState((current) => current.identity === identity && current.status === 'ready' && ((current.repository?.repositoryType === 'CLASS_PROJECT' && (!projectTaskId || current.project?.id === projectTaskId) && (!selectedClass || current.project?.classId === selectedClass.id)) || (current.repository?.repositoryType === 'ACTIVITY_WORKSPACE' && (!searchParams.get('classId') || current.activity?.classId === searchParams.get('classId')))) && isTemporaryApiError(error) && error?.code !== 'INVALID_API_RESPONSE'
        ? { ...current, refreshError: error }
        : { identity, status: 'error', repository: null, project: null, projectUnavailable: false, activity: null, activityUnavailable: false, error })
    }
  }, [activities, api, identity, projectTaskId, projects, repositoryId, role, searchParams, selectedClass])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const current = state.identity === identity ? state : { ...state, status: 'loading', repository: null, project: null, activity: null }
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
  const activityWorkspace = repository.repositoryType === 'ACTIVITY_WORKSPACE'
  const owner = auth.user?.id === repository.owner.userId
  if (repository.repositoryType === 'CLASS_PROJECT') return <GroupRepositoryView key={repository.id} repository={repository} project={current.project} role={role} api={api} classApi={classApi} gitApi={gitApi} onReload={load} metadataError={current.refreshError} />
  if (activityWorkspace) return <ActivityRepositoryView key={repository.id} repository={repository} activity={current.activity} activityUnavailable={current.activityUnavailable} api={api} role={role} owner={owner} className={selectedClass?.id === current.activity?.classId ? selectedClass.className : repository.className} gitApi={gitApi} onReload={load} metadataError={current.refreshError} />
  const backPath = activityWorkspace && current.activity
    ? classHref(role === 'instructor' ? `/instructor/activity/${repository.activityId}/settings` : `/student/activity/${repository.activityId}`, current.activity.classId)
    : role === 'instructor'
      ? classHref(`/instructor/projects/${repository.projectTaskId}`, selectedClass?.id)
      : repository.projectTaskId
        ? classHref(`/student/projects/${repository.projectTaskId}`, selectedClass?.id)
        : '/student/repositories'
  return (
    <div className={`${role === 'instructor' ? 'instructor' : 'student'}-repository-page repository-foundation-page`}>
      <header className="student-repository-topbar"><div className="student-repository-breadcrumb"><NavLink to={backPath}>Back</NavLink>{current.project && <span>{current.project.title}</span>}<strong>{repository.repositoryName}</strong></div></header>
      <main className="student-repository-content">
        <section className="student-repository-hero"><span className="student-repo-mark" aria-hidden="true" /><div><h1>{repository.repositoryName}</h1><span className="student-repo-state">{formatRepositoryLabel(repository.status)}</span><p>{repository.description}</p></div></section>
        <div className="student-repository-grid repository-foundation-grid">
          <section className="student-repo-main-column">
            <RepositoryGitPanel key={repository.id} repository={repository} role={role} project={current.project} activity={current.activity} owner={owner} initialTab={searchParams.get('git') === 'local' ? 'local' : 'files'} api={gitApi} />
            <section className="student-repo-card"><h2>Repository details</h2><dl className="repository-metadata-list"><div><dt>Type</dt><dd>{formatRepositoryLabel(repository.repositoryType)}</dd></div><div><dt>Visibility</dt><dd>{formatRepositoryLabel(repository.visibility)}</dd></div><div><dt>Owner</dt><dd>{repository.owner.fullName}</dd></div><div><dt>Default branch</dt><dd>{repository.defaultBranch}</dd></div>{!activityWorkspace && <div><dt>Review state</dt><dd>{formatRepositoryLabel(repository.reviewStatus)}</dd></div>}<div><dt>Created</dt><dd>{formatProjectDate(repository.createdAt)}</dd></div></dl></section>
            {current.project && <section className="student-repo-card"><h2>Linked Project Requirement</h2><h3>{current.project.title}</h3><p>{current.project.instructions}</p><p>Due {formatProjectDate(current.project.dueDate)} · {formatProjectStatus(current.project.status)}</p></section>}
            {current.projectUnavailable && <RequestState kind="unavailable" compact title="Archived project detail unavailable" message="The archived repository record remains authorized, but the related archived project-task detail is not exposed to students by the current backend." />}
            {activityWorkspace && current.activity && <section className="student-repo-card"><h2>Activity</h2><h3>{current.activity.title}</h3><p>Git push saves your work. It does not submit the Activity.</p><p>{formatActivityStatus(current.activity.status)} · Due {formatActivityDate(current.activity.dueDate)} · {formatActivityStatus(current.activity.dueState)}</p></section>}
            {activityWorkspace && current.activityUnavailable && <RequestState kind="unavailable" compact title="Linked Activity unavailable" message="The repository remains available, but Projex cannot safely load its linked Activity. Back navigation returns to the repository catalog." />}
            {repository.repositoryType === 'CLASS_WORKSPACE'
              ? <section className="student-repo-card"><h2>Individual Class Workspace</h2><p>This is the Student-owned Git workspace for this class. Git pushes preserve work but never submit an academic activity or consume an attempt. Current class teaching staff may inspect source; only the active Student owner may push.</p></section>
              : !activityWorkspace && <RepositoryCollaborationPanel role={role} owner={owner} repository={repository} project={current.project} api={api} classApi={classApi} onRepositoryChange={applyRepository} onReloadRepository={load} />}
            <RepositoryActivityPanel key={`${repository.id}-activity`} repositoryId={repository.id} api={api} />
          </section>
          <aside className="student-repo-side-column">
            <StorageState status={repository.storageStatus} />
            {polling && <p className="repository-polling-note">Checking provisioning status without overlapping requests…</p>}
            {pollingStopped && isProvisioning(repository.storageStatus) && <button type="button" className="student-outline-action" onClick={() => load()}>Refresh Status</button>}
            {activityWorkspace
              ? <section className="student-repo-card"><h2>Metadata</h2><p>Name and lifecycle follow the linked Activity.</p></section>
              : owner ? <RepositoryMetadataForm key={repository.id} repository={repository} project={current.project} busy={busy} notice={notice} error={actionError} onSave={saveMetadata} /> : <section className="student-repo-card"><h2>Metadata</h2><p>Only the active repository owner may edit supported metadata. Backend authorization remains authoritative.</p></section>}
            {!activityWorkspace && <RepositoryLifecyclePanel role={role} owner={owner} repository={repository} api={api} onRepositoryChange={applyRepository} onReloadRepository={load} />}
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
