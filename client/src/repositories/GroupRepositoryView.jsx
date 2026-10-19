import { useCallback, useEffect, useState } from 'react'
import { describeApiError, isTemporaryApiError } from '../api/api-client.js'
import { NavLink, useSearchParams } from 'react-router-dom'
import RequestState from './GroupRequestState.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { classHref } from '../classes/class-links.js'
import { formatProjectDate } from '../projects/project-projections.js'
import { groupContextProjection, formatRepositoryLabel } from './repository-projections.js'
import { repositoryContentApi } from './repository-content-api.js'
import { branchProjection, fileProjection, repositoryGitSummaryProjection, treeProjection } from './repository-content-projections.js'
import { HistoryView, BranchesView } from './RepositoryGitViews.jsx'
import { GroupFileBrowser } from './GroupFileBrowser.jsx'
import { GroupDialog } from './GroupDialog.jsx'
import { RepositoryCollaborationPanel, RepositoryLifecyclePanel } from './RepositoryCollaborationViews.jsx'
import { RepositoryActivityPanel } from './RepositoryActivityPanel.jsx'
import { GroupCodeMenu } from './GroupCodeMenu.jsx'
import { GroupLatestCommit } from './GroupLatestCommit.jsx'
import { useGroupFreshness } from './use-group-freshness.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { ProjexStatus } from '../design/ProjexStatus.jsx'
import './group-repository.css'

function Readme({ repositoryId, branch, api }) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setResult(null)
      try {
        const tree = treeProjection((await api.getTree(repositoryId, { commitId: branch.commitId, path: '' }, { signal: controller.signal })).data)
        const entry = tree.entries.find((item) => item.entryType === 'blob' && /^readme(?:\.(?:md|txt))?$/i.test(item.name))
        if (!entry) return
        const file = fileProjection((await api.getFile(repositoryId, { commitId: branch.commitId, path: entry.path }, { signal: controller.signal })).data)
        if (file.path !== entry.path || file.commitId !== branch.commitId) throw new Error('README identity mismatch.')
        if (!controller.signal.aborted) setResult(file)
      } catch (error) { if (!controller.signal.aborted && error?.name !== 'AbortError') setResult({ unavailable: true }) }
    })
    return () => controller.abort()
  }, [api, branch.commitId, repositoryId])
  if (!result) return null
  return <section className="group-readme"><h2>README</h2>{result.unavailable ? <p>README preview unavailable or exceeds the safe text limit.</p> : <><small>{result.path} · Plain text preview</small><pre>{result.content}</pre></>}</section>
}

export function GroupRepositoryView({ repository, project, role, api, classApi, gitApi = repositoryContentApi, onReload, metadataError }) {
  const capabilities = useCapabilities()
  const [contextState, setContextState] = useState({ status: 'loading' })
  const [source, setSource] = useState({ status: 'idle', summary: null, branches: [] })
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = ['commits', 'branches', 'members', 'activity'].includes(requestedTab) ? requestedTab : 'code'
  const requestedBranch = searchParams.get('branch') || repository.defaultBranch
  const branchName = source.status === 'ready' && source.branches.length && !source.branches.some((item) => item.branchName === requestedBranch) ? source.summary.defaultBranch : requestedBranch
  const setTab = (next) => setSearchParams((current) => { current.set('tab', next); current.delete('commit'); return current })
  const openCommit = (id) => setSearchParams((current) => { current.set('tab', 'commits'); current.set('commit', id); return current })
  const [version, setVersion] = useState(0)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [rootView, setRootView] = useState(true)
  const [filePathDirty, setFilePathDirty] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmReady, setConfirmReady] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setContextState((current) => current.status === 'ready' ? current : { status: 'loading' })
      try {
        const context = groupContextProjection((await api.getGroupContext(repository.id, { signal: controller.signal })).data, { id: repository.id, projectTaskId: repository.projectTaskId, teamId: repository.teamId })
        if (!controller.signal.aborted) setContextState((current) => current.status === 'ready' && JSON.stringify(current.context) === JSON.stringify(context) ? current.refreshError ? { ...current, refreshError: null } : current : { status: 'ready', context })
      } catch (error) { if (!controller.signal.aborted) setContextState((current) => current.status === 'ready' && isTemporaryApiError(error) ? { ...current, refreshError: error } : { status: 'error', error }) }
    })
    return () => controller.abort()
  }, [api, repository.id, repository.projectTaskId, repository.teamId, repository.updatedAt, version])
  const revalidate = useCallback(async (options) => {
    await onReload(options)
    if (!options?.signal?.aborted) refresh()
  }, [onReload, refresh])
  const recover = useGroupFreshness({ identity: repository.id, refresh: revalidate, activeKey: `${tab}:${branchName}`, blocked: reviewOpen || confirmReady || interactionOpen || filePathDirty })
  const context = contextState.status === 'ready' ? contextState.context : null
  useEffect(() => {
    if (!context?.permissions.canRead || !capabilities.git.inspection) return undefined
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setSource((current) => current.status === 'ready' ? { ...current, refreshing: true } : { status: 'loading', summary: null, branches: [] })
      try {
        const summary = repositoryGitSummaryProjection((await gitApi.getSummary(repository.id, { signal: controller.signal })).data, { id: repository.id, status: repository.status, storageStatus: repository.storageStatus })
        const branches = summary.empty ? [] : (await gitApi.listBranches(repository.id, { signal: controller.signal })).data.map(branchProjection)
        if (!controller.signal.aborted) {
          setSource({ status: 'ready', summary, branches })
        }
      } catch (error) { if (!controller.signal.aborted) setSource((current) => current.status === 'ready' && isTemporaryApiError(error) ? { ...current, refreshing: false, refreshError: error } : { status: 'error', summary: null, branches: [], error }) }
    })
    return () => controller.abort()
  }, [capabilities.git.inspection, context, gitApi, repository.id, repository.status, repository.storageStatus, version])
  if (contextState.status === 'loading') return <RequestState kind="loading" message="Loading Group Repository permissions." />
  if (!context) return <RequestState kind="unavailable" error={contextState.error} action={<><button type="button" onClick={refresh}>Retry group access</button><NavLink to={project?.id && project?.classId ? classHref(`/${role}/projects/${project.id}`, project.classId) : `/${role}/repositories`}>{project?.id && project?.classId ? 'Back to project' : 'My Repositories'}</NavLink></>} />
  const owner = context.currentRole === 'MAINTAINER'
  const metadataOnly = context.currentRole === 'METADATA_ONLY'
  const branch = source.branches.find((item) => item.branchName === branchName)
  const updated = () => { onReload(); refresh() }
  const chooseBranch = (name) => { setRootView(true); setSearchParams((current) => { current.set('branch', name); current.delete('commit'); return current }) }
  const codeMenu = <GroupCodeMenu key={`${repository.id}:${repository.updatedAt}:${JSON.stringify(context.permissions)}`} repository={repository} context={context} api={api} gitApi={gitApi} available={capabilities.git.smartHttp && (!capabilities.git.inspection || ['ready', 'error'].includes(source.status))} />
  const toolbar = (goToFile) => <div className="group-code-toolbar" aria-label="Repository toolbar"><label className="group-branch-select"><ProjexIcon name="branch" size={16} /><select aria-label="Branch" disabled={!source.branches.length} value={branchName} onChange={(event) => chooseBranch(event.target.value)}>{source.branches.map((item) => <option key={item.branchName} value={item.branchName}>{item.branchName}</option>)}</select></label><div className="group-toolbar-end">{goToFile}{codeMenu}</div></div>
  const ready = async () => {
    if (reviewBusy || !context.permissions.canSubmitForReview) return
    setReviewBusy(true); setReviewError(null)
    try {
      const result = await api.readyForReview(repository.id, { expectedUpdatedAt: repository.updatedAt })
      if (result.data?.id !== repository.id) throw new Error('Review response did not match this repository.')
      setConfirmReady(false); updated()
    } catch (error) { setReviewError(error); if (error?.status === 409) updated() }
    finally { setReviewBusy(false) }
  }
  return <main className="group-repository-page">
    <NavLink className="student-back-link" to={classHref(`/${role}/projects/${context.project.id}`, context.class.id)}>{context.project.title}</NavLink>
    <header className="group-repository-header"><div><h1><ProjexIcon name="repository" size={26} /> {repository.repositoryName}</h1><dl className="group-context-metadata"><div><dt>Group</dt><dd>{context.team.name}</dd></div><div><dt>Class</dt><dd>{context.class.className}</dd></div><div><dt>Project</dt><dd>{context.project.title}</dd></div><div><dt><ProjexIcon name="calendar" size={14} /> Due</dt><dd>{formatProjectDate(context.project.dueDate)}</dd></div></dl><div className="group-state"><ProjexStatus value={repository.reviewStatus}>{formatRepositoryLabel(repository.reviewStatus)}</ProjexStatus>{!context.permissions.canWrite && !metadataOnly && <small>Git read-only</small>}{repository.status !== 'ACTIVE' && <small>{formatRepositoryLabel(repository.status)}</small>}{repository.storageStatus !== 'READY' && <small>{formatRepositoryLabel(repository.storageStatus)}</small>}</div></div>
      <div className="group-header-actions">
        {!metadataOnly && <button type="button" className="student-outline-action" onClick={() => setReviewOpen(true)}>{role === 'instructor' ? 'Review' : 'Feedback'}</button>}
        {context.permissions.canSubmitForReview && <button type="button" className="student-outline-action" onClick={() => { setReviewError(null); setConfirmReady(true) }}>{repository.reviewStatus === 'CHANGES_REQUESTED' ? 'Resubmit for Review' : 'Mark Ready for Review'}</button>}
      </div>
    </header>
    {(metadataError || contextState.refreshError || source.refreshError) && <RequestState compact title="Repository refresh unavailable" error={metadataError || contextState.refreshError || source.refreshError} action={<><button type="button" disabled={filePathDirty} onClick={() => { onReload(); refresh() }}>Retry refresh</button>{filePathDirty && <small>Clear the file search before refreshing.</small>}</>} />}
    <div className="group-repository-actions"><div className="group-tabs" role="tablist" aria-label="Group repository views" onKeyDown={(event) => {
      const buttons = [...event.currentTarget.querySelectorAll('[role=tab]')]
      const index = buttons.indexOf(event.target)
      if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next].focus(); buttons[next].click()
    }}>{['code', 'commits', 'branches', 'members', 'activity'].map((id) => <button type="button" role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)}><ProjexIcon name={id === 'commits' ? 'commit' : id === 'branches' ? 'branch' : id} size={16} /> {id[0].toUpperCase() + id.slice(1)}</button>)}</div><details className="group-recovery"><summary>More</summary><button type="button" onClick={() => recover(true)}>Reload repository</button></details></div>
    {metadataOnly ? <RequestState kind="unavailable" compact title="Class-visible project metadata" message="Code and member activity are available to authorized group members and teaching staff." /> : <>
      {tab === 'code' && (!branch || source.status !== 'ready' || !capabilities.git.inspection) && toolbar(null)}
      {['code', 'commits', 'branches'].includes(tab) && (!capabilities.git.inspection || !context.permissions.canRead) && <RequestState kind="unavailable" compact title="Source inspection unavailable" message="Storage may still be provisioning, or current source permissions do not allow inspection." />}
      {context.permissions.canRead && capabilities.git.inspection && ['code', 'commits', 'branches'].includes(tab) && <section className="group-source" aria-label={`${tab} view`}>
        {source.status === 'loading' && <RequestState kind="loading" compact message="Loading live Git source." />}{source.status === 'error' && <RequestState kind="unavailable" compact error={source.error} action={<button type="button" onClick={() => recover(true)}>Retry source</button>} />}
        {source.status === 'ready' && (source.summary.empty ? <section className="repository-empty-guidance"><h2>No commits yet</h2><p>{owner ? 'Initialize main from your local Git client using Code above.' : 'Your Maintainer must establish main before shared feature work begins.'}</p>{owner && <pre>{'git checkout -b main\n# create your project files\ngit add .\ngit commit -m "Initial project"\ngit push -u origin main'}</pre>}</section> : <>
          {tab === 'code' && branch && <><GroupFileBrowser key={`${repository.id}:${branch.commitId}`} api={gitApi} repositoryId={repository.id} commitId={branch.commitId} onRootChange={setRootView} onDirtyChange={setFilePathDirty} renderToolbar={toolbar} latestCommit={<GroupLatestCommit branch={branch} repositoryId={repository.id} api={gitApi} refreshVersion={version} onOpenCommit={openCommit} onOpenHistory={() => setTab('commits')} />} />{rootView && <Readme key={branch.commitId} repositoryId={repository.id} branch={branch} api={gitApi} />}</>}
          {tab === 'commits' && <HistoryView group selectedCommitId={searchParams.get('commit')} onSelectCommit={openCommit} refreshVersion={version} key={branchName} api={gitApi} repositoryId={repository.id} summary={source.summary} branches={source.branches} selectedBranch={branchName} onSelectBranch={chooseBranch} />}
          {tab === 'branches' && <BranchesView group summary={source.summary} branches={source.branches} />}
        </>)}
      </section>}
      <RepositoryCollaborationPanel groupLayout refreshVersion={version} onInteractionChange={setInteractionOpen} activeTab={tab} reviewOpen={reviewOpen} onCloseReview={() => setReviewOpen(false)} teachingStaff={context.teachingStaff} key={`collaboration:${repository.id}`} role={role} owner={owner} repository={repository} project={project} permissions={context.permissions} api={api} classApi={classApi} onRepositoryChange={updated} onReloadRepository={updated} />
      {tab === 'activity' && context.permissions.canViewActivity && <RepositoryActivityPanel compact key={`activity:${repository.id}:${version}`} repositoryId={repository.id} api={api} />}
      <RepositoryLifecyclePanel compact permissions={context.permissions} role={role} owner={owner} repository={repository} api={api} onRepositoryChange={updated} onReloadRepository={updated} />
    </>}
    {confirmReady && context.permissions.canSubmitForReview && <GroupDialog title={repository.reviewStatus === 'CHANGES_REQUESTED' ? 'Resubmit for Review' : 'Mark Ready for Review'} busy={reviewBusy} onClose={() => setConfirmReady(false)}><p>Marking ready freezes Git writes for review.</p>{reviewError && <p role="alert" className="activity-action-error">{describeApiError(reviewError)}</p>}<footer><button type="button" className="student-outline-action" disabled={reviewBusy} onClick={() => setConfirmReady(false)}>Cancel</button><button type="button" className="student-primary-action" disabled={reviewBusy} onClick={ready}>{reviewBusy ? 'Saving…' : 'Confirm ready'}</button></footer></GroupDialog>}
  </main>
}
