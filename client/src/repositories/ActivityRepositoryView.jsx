import { useCallback, useEffect, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { isTemporaryApiError } from '../api/api-client.js'
import { useCapabilities } from '../capabilities/capability-context.js'
import { classHref } from '../classes/class-links.js'
import { formatActivityDate, formatActivityStatus } from '../activities/activity-utils.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { ProjexStatus } from '../design/ProjexStatus.jsx'
import RequestState from './GroupRequestState.jsx'
import { repositoryContentApi } from './repository-content-api.js'
import { branchProjection, repositoryGitSummaryProjection } from './repository-content-projections.js'
import { formatRepositoryLabel } from './repository-projections.js'
import { RepositoryGitTabs, RepositoryBranchSelector, RepositoryEmptyState } from './RepositoryGitLayout.jsx'
import { RepositoryCodeMenu } from './RepositoryCodeMenu.jsx'
import { RepositoryActivityPanel } from './RepositoryActivityPanel.jsx'
import { RepositoryReadme } from './RepositoryReadme.jsx'
import { GroupFileBrowser } from './GroupFileBrowser.jsx'
import { GroupLatestCommit } from './GroupLatestCommit.jsx'
import { HistoryView, BranchesView } from './RepositoryGitViews.jsx'
import { useGroupFreshness } from './use-group-freshness.js'
import './group-repository.css'

export function ActivityRepositoryView({ repository, activity, activityUnavailable, role, owner, className, gitApi = repositoryContentApi, onReload, metadataError, api }) {
  const capabilities = useCapabilities()
  const [params, setParams] = useSearchParams()
  const tab = ['commits', 'branches'].includes(params.get('tab')) ? params.get('tab') : 'code'
  const [source, setSource] = useState({ status: 'loading', branches: [], summary: null })
  const [version, setVersion] = useState(0)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [filePathDirty, setFilePathDirty] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [rootView, setRootView] = useState(true)
  const ready = repository.storageStatus === 'READY'
  const refresh = useCallback(async (options) => {
    await onReload(options)
    if (!options?.signal?.aborted) setVersion((value) => value + 1)
  }, [onReload])
  const recover = useGroupFreshness({ identity: repository.id, refresh, activeKey: `${tab}:${params.get('branch') || repository.defaultBranch}`, blocked: interactionOpen || filePathDirty })
  useEffect(() => {
    if (!ready || !capabilities.git.inspection) return undefined
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      try {
        const summary = repositoryGitSummaryProjection((await gitApi.getSummary(repository.id, { signal: controller.signal })).data, repository)
        const branches = summary.empty ? [] : (await gitApi.listBranches(repository.id, { signal: controller.signal })).data.map(branchProjection)
        if (!controller.signal.aborted) setSource({ status: 'ready', summary, branches })
      } catch (error) {
        if (!controller.signal.aborted) setSource((current) => current.status === 'ready' && isTemporaryApiError(error) && error?.code !== 'INVALID_API_RESPONSE' ? { ...current, refreshError: error } : { status: 'error', summary: null, branches: [], error })
      }
    })
    return () => controller.abort()
  }, [capabilities.git.inspection, gitApi, ready, repository, version])
  const branchName = params.get('branch') || repository.defaultBranch
  const branch = source.branches.find((item) => item.branchName === branchName)
  const chooseBranch = (name) => { setRootView(true); setParams((current) => { current.set('branch', name); current.delete('commit'); return current }) }
  const setTab = (next) => setParams((current) => { current.set('tab', next); current.delete('commit'); return current })
  const openCommit = (id) => setParams((current) => { current.set('tab', 'commits'); current.set('commit', id); return current })
  const activityPath = activity ? classHref(role === 'instructor' ? `/instructor/activity/${activity.id}/settings` : `/student/activity/${activity.id}`, activity.classId) : '/student/repositories'
  const idePath = role === 'student' && owner && activity ? classHref(`/student/activity/${activity.id}/workspace`, activity.classId) : null
  const canWrite = role === 'student' && owner && repository.status === 'ACTIVE' && activity?.status === 'PUBLISHED' && activity?.dueState === 'OPEN'
  const toolbar = (finder) => <div className="group-code-toolbar" aria-label="Repository toolbar"><RepositoryBranchSelector branches={source.branches} value={branch?.branchName || ''} defaultBranch={repository.defaultBranch} onChange={chooseBranch} /><div className="group-toolbar-end">{finder}{idePath && <NavLink className="student-outline-action repository-open-ide" to={idePath}>Open IDE</NavLink>}<RepositoryCodeMenu key={`${repository.id}:${repository.updatedAt}`} repository={repository} gitApi={gitApi} available={ready && capabilities.git.smartHttp && ![401, 403, 404].includes(source.error?.status)} canWrite={canWrite} label="Activity native Git access" onOpenChange={setInteractionOpen} initialOpen={params.get('git') === 'local'} /></div></div>
  return <main className="group-repository-page activity-repository-page">
    <NavLink className="student-back-link" to={activityPath}>{activity ? activity.title : 'My Repositories'}</NavLink>
    <header className="group-repository-header"><div><h1><ProjexIcon name="repository" size={26} /> {repository.repositoryName}</h1><dl className="group-context-metadata">{activity && <><div><dt>Activity</dt><dd><NavLink to={activityPath}>{activity.title}</NavLink></dd></div><div><dt>Class</dt><dd>{className || repository.className || 'Linked class'}</dd></div><div><dt><ProjexIcon name="calendar" size={14} /> Due</dt><dd>{formatActivityDate(activity.dueDate)}</dd></div></>}</dl><div className="group-state"><ProjexStatus value={repository.status}>{formatRepositoryLabel(repository.status)}</ProjexStatus><small>{repository.owner.fullName} · {formatRepositoryLabel(repository.visibility)}</small>{!canWrite && <small>Git read-only</small>}{!ready && <small>{formatRepositoryLabel(repository.storageStatus)}</small>}</div></div></header>
    <div className="group-repository-actions"><RepositoryGitTabs tabs={['code', 'commits', 'branches']} tab={tab} onChange={setTab} label="Activity repository views" /><details className="group-recovery"><summary>More</summary><button type="button" disabled={filePathDirty} onClick={() => recover(true)}>Reload repository</button></details></div>
    {(metadataError || source.refreshError) && <RequestState compact title="Repository refresh unavailable" error={metadataError || source.refreshError} action={<button type="button" disabled={filePathDirty} onClick={() => recover(true)}>Retry refresh</button>} />}
    {tab === 'code' && (!branch || source.status !== 'ready' || !capabilities.git.inspection) && toolbar(null)}
    {!ready ? <RequestState compact title={['FAILED', 'QUARANTINED'].includes(repository.storageStatus) ? 'Repository unavailable' : 'Preparing repository'} message={['FAILED', 'QUARANTINED'].includes(repository.storageStatus) ? 'Repository storage is unavailable. Try again later.' : 'Your repository is being prepared.'} action={<button type="button" onClick={() => recover(true)}>Check again</button>} /> : !capabilities.git.inspection ? <RequestState compact title="Source inspection unavailable" message="Source inspection is unavailable in this environment." /> : <section className="group-source" aria-label={`${tab} view`}>
      {source.status === 'loading' && <RequestState kind="loading" compact message="Loading Git source." />}
      {source.status === 'error' && <RequestState compact error={source.error} action={<button type="button" onClick={() => recover(true)}>Retry source</button>} />}
      {source.status === 'ready' && (source.summary.empty ? <RepositoryEmptyState idePath={idePath} /> : <>
        {tab === 'code' && branch && <><GroupFileBrowser key={`${repository.id}:${branch.commitId}`} api={gitApi} repositoryId={repository.id} commitId={branch.commitId} onRootChange={setRootView} onDirtyChange={setFilePathDirty} renderToolbar={toolbar} latestCommit={<GroupLatestCommit branch={branch} repositoryId={repository.id} api={gitApi} refreshVersion={version} onOpenCommit={openCommit} onOpenHistory={() => setTab('commits')} />} />{rootView && <RepositoryReadme key={branch.commitId} repositoryId={repository.id} branch={branch} api={gitApi} />}</>}
        {tab === 'code' && !branch && <RequestState compact title="Branch unavailable" message="Choose an available branch to browse its files." />}
        {tab === 'commits' && <HistoryView group selectedCommitId={params.get('commit')} onSelectCommit={openCommit} refreshVersion={version} key={branchName} api={gitApi} repositoryId={repository.id} summary={source.summary} branches={source.branches} selectedBranch={branchName} onSelectBranch={chooseBranch} />}
        {tab === 'branches' && <BranchesView group summary={source.summary} branches={source.branches} />}
      </>)}
    </section>}
    <details className="repository-about"><summary>About this repository</summary><dl><div><dt>Type</dt><dd>Activity Workspace</dd></div><div><dt>Owner</dt><dd>{repository.owner.fullName}</dd></div><div><dt>Visibility</dt><dd>{formatRepositoryLabel(repository.visibility)}</dd></div><div><dt>Default branch</dt><dd>{repository.defaultBranch}</dd></div><div><dt>Created</dt><dd>{formatActivityDate(repository.createdAt)}</dd></div><div><dt>Storage</dt><dd>{formatRepositoryLabel(repository.storageStatus)}</dd></div>{activity && <div><dt>Activity status</dt><dd>{formatActivityStatus(activity.status)} · {formatActivityStatus(activity.dueState)}</dd></div>}</dl>{repository.description && <p>{repository.description}</p>}<p>Git saves do not submit the Activity or consume attempts.</p></details>
    <details className="repository-about" onToggle={(event) => setActivityOpen(event.currentTarget.open)}><summary>Repository activity</summary>{activityOpen && <RepositoryActivityPanel compact repositoryId={repository.id} api={api} />}</details>
    {activityUnavailable && <RequestState compact title="Linked Activity unavailable" message="The repository remains available, but its linked Activity cannot be loaded. Return to My Repositories for navigation." />}
  </main>
}
