import './group-repository.css'
import { RepositoryCodeMenu } from './RepositoryCodeMenu.jsx'
import { GroupFileBrowser } from './GroupFileBrowser.jsx'
import { GroupLatestCommit } from './GroupLatestCommit.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { GroupDiff } from './GroupDiff.jsx'
import GroupRequestState from './GroupRequestState.jsx'
import { useGroupCopyFeedback } from './GroupCopyFeedback.jsx'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { useCapabilities } from '../capabilities/capability-context.js'
import { formatProjectDate } from '../projects/project-projections.js'
import { repositoryContentApi } from './repository-content-api.js'
import {
  branchProjection,
  commitDetailProjection,
  commitSummaryProjection,
  diffProjection,
  fileProjection,
  repositoryGitSummaryProjection,
  treeProjection,
} from './repository-content-projections.js'

const TABS = [
  ['files', 'Files'],
  ['history', 'History'],
  ['branches', 'Branches'],
  ['local', 'Local Git'],
]

const SAFE_GIT_MESSAGES = {
  GIT_INSPECTION_UNAVAILABLE: 'Git inspection is unavailable in this environment or for this repository.',
  GIT_BINARY_FILE_UNSUPPORTED: 'This file is binary and cannot be previewed as text.',
  GIT_FILE_LIMIT_EXCEEDED: 'This file exceeds the safe preview limit.',
  GIT_CHANGED_FILE_LIMIT_EXCEEDED: 'This commit contains more changed files than the safe inspection limit.',
  GIT_BRANCH_LIMIT_EXCEEDED: 'This repository contains more branches than the safe inspection limit.',
  GIT_OUTPUT_LIMIT_EXCEEDED: 'The Git result exceeded the safe output limit.',
  GIT_REVISION_NOT_FOUND: 'The selected Git revision is no longer available.',
  GIT_CONTENT_NOT_FOUND: 'The selected repository path is no longer available.',
  GIT_SMART_HTTP_UNAVAILABLE: 'Local Git credential issuance is disabled in this environment.',
  GIT_OPERATION_NOT_AUTHORIZED: 'Current repository access does not authorize that Git operation.',
}

function gitErrorMessage(error) {
  return SAFE_GIT_MESSAGES[error?.code] ?? describeApiError(error)
}

function gitContextError() {
  return new ApiError({ code: 'INVALID_API_RESPONSE', message: 'Origin returned mismatched repository Git data.' })
}

function shortCommit(commitId) {
  return commitId ? commitId.slice(0, 8) : 'No commit'
}

function byteLabel(value) {
  if (!Number.isFinite(value)) return 'Unknown size'
  if (value < 1024) return `${value} B`
  return `${(value / 1024).toFixed(value < 10_240 ? 1 : 0)} KB`
}

function state(status = 'idle', data = null, error = null) {
  return { status, data, error }
}

function studentWriteLikely(repository, role, project, activity) {
  if (role !== 'student' || repository.status !== 'ACTIVE') return false
  if (repository.repositoryType === 'PERSONAL' || repository.repositoryType === 'CLASS_WORKSPACE') return true
  if (repository.repositoryType === 'ACTIVITY_WORKSPACE') {
    return activity?.id === repository.activityId
      && activity?.status === 'PUBLISHED'
      && activity?.dueState === 'OPEN'
  }
  return project?.status === 'PUBLISHED'
    && project?.dueState === 'OPEN'
    && ['WORKING', 'CHANGES_REQUESTED'].includes(repository.reviewStatus)
}

function EmptyRepositoryGuidance({ repository, role, owner, writeLikely, smartHttpAvailable, onOpenLocalGit }) {
  const classProject = repository.repositoryType === 'CLASS_PROJECT'
  const responsibleRole = classProject ? 'team lead' : 'repository owner'
  let title = `Waiting for the ${responsibleRole}`
  let message = `This repository has no commits yet. The ${responsibleRole} must establish main before other members begin feature work.`

  if (role === 'instructor') {
    title = 'Waiting for the first Student commit'
    message = `This repository has no commits yet. The ${responsibleRole} must initialize main through native Git; instructor browser access remains read-only.`
  } else if (!writeLikely) {
    title = 'Repository authoring is currently unavailable'
    message = 'This empty repository is read-only in its current lifecycle state. Origin does not edit or commit files in the browser.'
  } else if (owner && repository.repositoryType === 'ACTIVITY_WORKSPACE') {
    title = 'No commits yet'
    message = smartHttpAvailable
      ? 'Save your first commit from the coding workspace with Save to Git, or push main using Local Git.'
      : 'Open the coding workspace and use Save to Git to save your first commit.'
  } else if (owner) {
    title = classProject ? 'Initialize main as the team lead' : 'Initialize your repository'
    message = smartHttpAvailable
      ? 'Origin does not edit or commit files in the browser. Open Local Git for a short-lived credential, the clone address, and the initial main workflow.'
      : 'Origin does not edit or commit files in the browser. Native Git access is unavailable in this environment, so initialize main later from an approved environment where Local Git is enabled.'
  } else if (smartHttpAvailable) {
    message += ' Do not create an unrelated first branch. Refresh this view after the owner has pushed main.'
  } else {
    message += ' Native Git access is unavailable in this environment; refresh this browser view after main is initialized from an approved environment.'
  }

  return (
    <section className="repository-empty-guidance" aria-live="polite">
      <span>Empty Git repository</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {owner && writeLikely && smartHttpAvailable && role === 'student' && <button type="button" className="student-primary-action" onClick={onOpenLocalGit}>Open Local Git</button>}
    </section>
  )
}

function BranchSelector({ branches, value, onChange, group = false }) {
  const options = branches.length > 0 ? branches : value ? [{ branchName: value, isDefault: true }] : []
  return (
    <label className={group ? "group-branch-select" : "repository-git-branch-select"}>
      {group ? <ProjexIcon name="branch" size={16} /> : 'Branch'}
      <select aria-label="Branch" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((branch) => <option value={branch.branchName} key={branch.branchName}>{branch.branchName}{branch.isDefault ? ' (default)' : ''}</option>)}
      </select>
    </label>
  )
}

const keepRootState = () => {}

function ActivityRepositoryFiles({ api, repositoryId, branches, selectedBranch, onSelectBranch, onOpenCommit, onOpenHistory, refreshVersion }) {
  const branch = branches.data?.find(item => item.branchName === selectedBranch)
  if (branches.status === 'error') return <RequestState kind="unavailable" compact title="Branches unavailable" message={gitErrorMessage(branches.error)} />
  if (!branch) return branches.status === 'ready'
    ? <RequestState kind="unavailable" compact title="Selected branch unavailable" message="Refresh Git status to load the current branches." />
    : <RequestState kind="loading" compact message="Loading repository branch." />
  return <GroupFileBrowser key={`${repositoryId}:${branch.commitId}`} api={api} repositoryId={repositoryId} commitId={branch.commitId} onRootChange={keepRootState}
    renderToolbar={finder => <div className="group-code-toolbar"><BranchSelector group branches={branches.data} value={selectedBranch} onChange={onSelectBranch} />{finder}</div>}
    latestCommit={<GroupLatestCommit {...{ api, repositoryId, branch, refreshVersion, onOpenCommit, onOpenHistory }} />}
  />
}

export function FilesView({ api, repositoryId, summary, branches, selectedBranch, onSelectBranch }) {
  const [path, setPath] = useState('')
  const [tree, setTree] = useState(state())
  const [file, setFile] = useState(state())
  const fileController = useRef(null)

  useEffect(() => {
    if (!selectedBranch || summary.empty) return undefined
    const identity = `${repositoryId}:${selectedBranch}:${path}`
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setTree(state('loading')) })
    Promise.resolve().then(() => api.getTree(repositoryId, { branchName: selectedBranch, path }, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const projected = treeProjection(response.data)
        if (projected.path !== path) throw gitContextError()
        if (`${repositoryId}:${selectedBranch}:${path}` === identity) setTree(state('ready', projected))
      })
      .catch((error) => { if (error?.name !== 'AbortError') setTree(state('error', null, error)) })
    return () => controller.abort()
  }, [api, path, repositoryId, selectedBranch, summary.empty])

  useEffect(() => () => fileController.current?.abort(), [])

  const openFile = async (entryPath) => {
    fileController.current?.abort()
    const controller = new AbortController()
    fileController.current = controller
    const identity = `${repositoryId}:${selectedBranch}:${entryPath}`
    setFile(state('loading', { path: entryPath }))
    try {
      const response = await api.getFile(repositoryId, { branchName: selectedBranch, path: entryPath }, { signal: controller.signal })
      const projected = fileProjection(response.data)
      if (projected.path !== entryPath) throw gitContextError()
      if (`${repositoryId}:${selectedBranch}:${entryPath}` === identity) setFile(state('ready', projected))
    } catch (error) {
      if (error?.name !== 'AbortError') setFile(state('error', { path: entryPath }, error))
    }
  }

  const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  return (
    <div className="repository-git-files">
      <div className="repository-git-toolbar">
        <BranchSelector branches={branches} value={selectedBranch} onChange={onSelectBranch} />
        <div className="repository-git-path"><button type="button" onClick={() => { setPath(''); setFile(state()) }}>root</button>{path && <><span>/</span><strong>{path}</strong></>}</div>
      </div>
      {summary.empty && <RequestState kind="empty" compact title="Empty Git repository" message="This is a valid empty bare repository. It has no branches, commits, or files yet." />}
      {!summary.empty && tree.status === 'loading' && <RequestState kind="loading" compact message="Loading repository tree." />}
      {!summary.empty && tree.status === 'error' && <RequestState kind="unavailable" compact title="Repository tree unavailable" message={gitErrorMessage(tree.error)} />}
      {!summary.empty && tree.status === 'ready' && (
        <div className="repository-git-browser">
          <div className="repository-git-tree" aria-label="Repository files">
            {path && <button type="button" className="repository-git-entry repository-git-entry--tree" onClick={() => { setPath(parentPath); setFile(state()) }}><span>Folder</span><strong>..</strong><small>Parent</small></button>}
            {tree.data.entries.map((entry) => (
              <button type="button" className={`repository-git-entry repository-git-entry--${entry.entryType}`} key={`${entry.entryType}:${entry.path}`} onClick={() => entry.entryType === 'tree' ? (setPath(entry.path), setFile(state())) : openFile(entry.path)}>
                <span>{entry.entryType === 'tree' ? 'Folder' : 'File'}</span><strong>{entry.name}</strong><small>{entry.entryType === 'blob' ? byteLabel(entry.sizeBytes) : 'Directory'}</small>
              </button>
            ))}
            {tree.data.entries.length === 0 && <p className="activity-lifecycle-note">This directory is empty.</p>}
          </div>
          <section className="repository-git-preview" aria-live="polite">
            {file.status === 'idle' && <p>Select a text file to preview its backend-authorized content.</p>}
            {file.status === 'loading' && <RequestState kind="loading" compact message={`Loading ${file.data.path}.`} />}
            {file.status === 'error' && <RequestState kind="unavailable" compact title="File preview unavailable" message={gitErrorMessage(file.error)} />}
            {file.status === 'ready' && <><header><strong>{file.data.path}</strong><span>{byteLabel(file.data.sizeBytes)} · UTF-8</span></header><pre>{file.data.content}</pre></>}
          </section>
        </div>
      )}
    </div>
  )
}

export function HistoryView({ api, repositoryId, summary, branches, selectedBranch, onSelectBranch, group = false, refreshVersion = 0, selectedCommitId = null, onSelectCommit }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState(state())
  const [detail, setDetail] = useState(state())
  const [selectedParent, setSelectedParent] = useState('')
  const [diff, setDiff] = useState(state())
  const detailController = useRef(null)
  const [selectedId, setSelectedId] = useState('')
  const { copy, feedback } = useGroupCopyFeedback()
  const State = group ? GroupRequestState : RequestState
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (!selectedBranch || summary.empty) return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setHistory(state('loading')) })
    Promise.resolve().then(() => api.listCommits(repositoryId, { branchName: selectedBranch, page, limit: 20 }, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const commits = Array.isArray(response.data) ? response.data.map(commitSummaryProjection) : []
        setHistory(state('ready', { commits, pagination: response.pagination }))
      })
      .catch((error) => { if (error?.name !== 'AbortError') setHistory(state('error', null, error)) })
    return () => controller.abort()
  }, [api, page, repositoryId, selectedBranch, summary.empty, refreshVersion, retryVersion])

  useEffect(() => () => detailController.current?.abort(), [])

  const selectCommit = useCallback(async (commitId) => {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setSelectedId(commitId)
    setDetail(state('loading'))
    setDiff(state())
    try {
      const response = await api.getCommit(repositoryId, commitId, { signal: controller.signal })
      const projected = commitDetailProjection(response.data)
      if (projected.commitId !== commitId) throw gitContextError()
      if (!controller.signal.aborted) {
        setDetail(state('ready', projected))
        setSelectedParent(projected.parentCommitIds[0] ?? '')
      }
    } catch (error) { if (error?.name !== 'AbortError') setDetail(state('error', null, error)) }
  }, [api, repositoryId])

  useEffect(() => {
    if (!group || !selectedCommitId || !/^[a-f0-9]{40}$/i.test(selectedCommitId)) return undefined
    let active = true
    Promise.resolve().then(() => { if (active) selectCommit(selectedCommitId) })
    return () => { active = false; detailController.current?.abort() }
  }, [group, selectedCommitId, selectCommit])
  const openCommit = (id) => onSelectCommit ? onSelectCommit(id) : selectCommit(id)

  useEffect(() => {
    if (detail.status !== 'ready' || !selectedParent) return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setDiff(state('loading')) })
    Promise.resolve().then(() => api.getDiff(repositoryId, { baseCommitId: selectedParent, targetCommitId: detail.data.commitId }, { signal: controller.signal }))
      .then((response) => {
        const projected = diffProjection(response.data)
        if (projected.baseCommitId !== selectedParent || projected.targetCommitId !== detail.data.commitId) throw gitContextError()
        if (!controller.signal.aborted) setDiff(state('ready', projected))
      })
      .catch((error) => { if (error?.name !== 'AbortError') setDiff(state('error', null, error)) })
    return () => controller.abort()
  }, [api, detail, repositoryId, selectedParent, retryVersion])

  if (summary.empty) return <State kind="empty" compact title="No commit history" message="This empty repository has no commits to inspect." />
  const groups = new Map()
  for (const commit of group ? history.data?.commits || [] : []) {
    const day = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(commit.authoredAt))
    groups.set(day, [...(groups.get(day) || []), commit])
  }
  const groupList = group && <div className="group-commit-list">{[...groups].map(([day, commits]) => <section key={day}><h3><ProjexIcon name="commit" size={16} /> Commits on {day}</h3><ul>{commits.map((commit) => <li key={commit.commitId} data-selected={selectedId === commit.commitId}><button type="button" className="group-commit-select" aria-pressed={selectedId === commit.commitId} onClick={() => openCommit(commit.commitId)}><strong>{commit.subject || 'Untitled commit'}</strong>{' '}<small title="Git identity is supplied by the commit author, not verified by Origin.">{commit.authorName} · <time dateTime={commit.authoredAt}>{formatProjectDate(commit.authoredAt)}</time></small></button><div className="group-commit-hash"><button type="button" aria-label={`View commit ${shortCommit(commit.commitId)}`} aria-pressed={selectedId === commit.commitId} title={commit.commitId} onClick={() => openCommit(commit.commitId)}><code>{shortCommit(commit.commitId)}</code></button><button type="button" aria-label={`Copy commit hash ${shortCommit(commit.commitId)}`} onClick={(event) => copy(commit.commitId, event)}>Copy</button></div></li>)}</ul></section>)}{feedback}</div>
  return (
    <div className={group ? "repository-git-history group-history" : "repository-git-history"}>
      <BranchSelector group={group} branches={branches} value={selectedBranch} onChange={onSelectBranch} />
      {history.status === 'loading' && <State kind="loading" compact message="Loading commit history." />}
      {history.status === 'error' && <State kind="unavailable" compact title="Commit history unavailable" error={group ? history.error : undefined} message={gitErrorMessage(history.error)} action={group && <button type="button" onClick={() => setRetryVersion((value) => value + 1)}>Retry history</button>} />}
      {history.status === 'ready' && <div className="repository-git-history-grid">{group ? groupList : <div className="repository-git-commit-list">{history.data.commits.map((commit) => <button type="button" key={commit.commitId} onClick={() => openCommit(commit.commitId)}><code>{shortCommit(commit.commitId)}</code><strong>{commit.subject || 'Untitled commit'}</strong><span>{commit.authorName} · self-asserted Git author</span><small>{formatProjectDate(commit.authoredAt)}</small></button>)}</div>}{(!group || detail.status !== 'idle') && <section className="repository-git-commit-detail">{detail.status === 'idle' && <p>Select a commit to view bounded metadata and its parent diff.</p>}{detail.status === 'loading' && <State kind="loading" compact message="Loading commit detail." />}{detail.status === 'error' && <State kind="unavailable" compact error={group ? detail.error : undefined} message={gitErrorMessage(detail.error)} action={group && <button type="button" onClick={() => selectCommit(selectedId)}>Retry commit</button>} />}{detail.status === 'ready' && <><h3>{detail.data.subject || 'Untitled commit'}</h3><p><code>{detail.data.commitId}</code></p><p title="Git identity is supplied by the commit author, not verified by Origin.">{detail.data.authorName}{!group && ' · self-asserted Git author'} · {formatProjectDate(detail.data.authoredAt)}</p><h4>Changed files</h4><ul>{detail.data.files.map((change) => <li key={`${change.status}:${change.path}`}><strong>{change.status}</strong> {change.path}{change.previousPath ? ` (from ${change.previousPath})` : ''}</li>)}</ul>{detail.data.parentCommitIds.length === 0 ? <p className="activity-lifecycle-note">This is a root commit, so there is no parent diff.</p> : <><label>Compare with parent<select value={selectedParent} onChange={(event) => setSelectedParent(event.target.value)}>{detail.data.parentCommitIds.map((parent) => <option key={parent} value={parent}>{shortCommit(parent)}</option>)}</select></label>{diff.status === 'loading' && <State kind="loading" compact message={group ? "Loading comparison…" : "Loading bounded diff."} />}{diff.status === 'error' && <State kind="unavailable" compact title="Diff unavailable" error={group ? diff.error : undefined} message={gitErrorMessage(diff.error)} action={group && <button type="button" onClick={() => setRetryVersion((value) => value + 1)}>Retry comparison</button>} />}{diff.status === 'ready' && (group ? <GroupDiff patch={diff.data.patch || 'No textual changes in this comparison.'} /> : <pre className="repository-git-diff">{diff.data.patch || 'No textual changes in this comparison.'}</pre>)}</>}</>}</section>}</div>}
      {history.status === 'ready' && history.data.pagination?.totalPages > 1 && <nav className="activity-pagination" aria-label="Commit history pages"><button type="button" className="student-outline-action" disabled={!history.data.pagination.hasPreviousPage} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {history.data.pagination.page} of {history.data.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!history.data.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
    </div>
  )
}

export function BranchesView({ summary, branches, loading, error, group = false }) {
  if (summary.empty) return <RequestState kind="empty" compact title="No branches" message="This empty repository has no branches yet." />
  if (loading) return <RequestState kind="loading" compact message="Loading branches." />
  if (error) return <RequestState kind="unavailable" compact title="Branches unavailable" message={gitErrorMessage(error)} />
  if (group) return <ul className="group-branch-list">{[...branches].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.branchName.localeCompare(b.branchName)).map((branch) => <li key={branch.branchName}><ProjexIcon name="branch" /><div><strong>{branch.branchName}</strong><small>{branch.subject || 'Untitled commit'}</small></div><span className="group-branch-labels">{branch.isDefault && <span className="projex-status">Default</span>}{branch.branchName === 'main' && <span className="projex-status projex-status--success">Protected</span>}</span><code title={branch.commitId}>{shortCommit(branch.commitId)}</code></li>)}</ul>
  return <div className="repository-git-branch-list">{branches.map((branch) => <article key={branch.branchName}><div><strong>{branch.branchName}</strong>{branch.isDefault && <span>Default</span>}{group && branch.branchName === 'main' && <span>Protected</span>}</div><code>{shortCommit(branch.commitId)}</code><p>{branch.subject || 'Untitled commit'}</p><small>{branch.authorName} · self-asserted Git author · {formatProjectDate(branch.authoredAt)}</small></article>)}</div>
}

function LocalGitView({ api, repository, role, project, activity, owner, empty }) {
  const capabilities = useCapabilities()
  const writeLikely = studentWriteLikely(repository, role, project, activity)
  const waitingForOwner = empty && role === 'student' && !owner
  const canOfferWrite = !waitingForOwner && writeLikely
  return <section className="repository-local-git">
    <RepositoryCodeMenu repository={repository} gitApi={api} available={repository.storageStatus === 'READY' && capabilities.git.smartHttp} canWrite={canOfferWrite} />
    {repository.repositoryType === 'ACTIVITY_WORKSPACE' && <p className="activity-git-submission-warning">Git push saves your work. It does not submit the Activity.</p>}
    {repository.repositoryType === 'ACTIVITY_WORKSPACE' && !writeLikely && <p className="activity-git-read-only">Activity closed — repository is read-only.</p>}
    {waitingForOwner && writeLikely && <p className="activity-lifecycle-note">The team lead must establish main first. After that push appears, refresh the Git status before creating a feature branch.</p>}
    {empty && owner && !writeLikely && <p className="activity-lifecycle-note">Current repository or project lifecycle rules do not allow the initial push.</p>}
  </section>
}

export function RepositoryGitPanel({ repository, role = 'student', project = null, activity = null, owner = false, initialTab = 'files', api = repositoryContentApi }) {
  const capabilities = useCapabilities()
  const writeLikely = studentWriteLikely(repository, role, project, activity)
  const [activeTab, setActiveTab] = useState(initialTab === 'local' ? 'local' : 'files')
  const [summary, setSummary] = useState(state())
  const [branches, setBranches] = useState(state())
  const [selectedBranch, setSelectedBranch] = useState(repository.defaultBranch)
  const [inspectionVersion, setInspectionVersion] = useState(0)
  const [selectedCommitId, setSelectedCommitId] = useState(null)
  const activityRepository = repository.repositoryType === 'ACTIVITY_WORKSPACE'
  const openActivityCommit = id => { setSelectedCommitId(id); setActiveTab('history') }
  const changeBranch = name => { setSelectedCommitId(null); setSelectedBranch(name) }

  const displayedTab = activeTab === 'local' && !capabilities.git.smartHttp ? 'files' : activeTab

  useEffect(() => {
    if (repository.storageStatus !== 'READY' || !capabilities.git.inspection) return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setSummary((current) => state('loading', current.data)) })
    Promise.resolve().then(() => api.getSummary(repository.id, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const projected = repositoryGitSummaryProjection(response.data, repository)
        setSummary(state('ready', projected))
        setSelectedBranch(projected.defaultBranch)
      })
      .catch((error) => { if (error?.name !== 'AbortError') setSummary(state('error', null, error)) })
    return () => controller.abort()
  }, [api, capabilities.git.inspection, inspectionVersion, repository, repository.defaultBranch, repository.id, repository.storageStatus])

  useEffect(() => {
    if (summary.status !== 'ready' || summary.data.empty || summary.data.repositoryId !== repository.id) return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setBranches(state('loading')) })
    Promise.resolve().then(() => api.listBranches(repository.id, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const projected = Array.isArray(response.data) ? response.data.map(branchProjection) : []
        setBranches(state('ready', projected))
        if (projected.length > 0) setSelectedBranch((current) => projected.some((branch) => branch.branchName === current) ? current : projected.find((branch) => branch.isDefault)?.branchName ?? projected[0].branchName)
      })
      .catch((error) => { if (!controller.signal.aborted) setBranches(state('error', null, error)) })
    return () => controller.abort()
  }, [api, repository.id, summary])

  const refreshInspection = () => {
    setSelectedCommitId(null)
    setSummary((current) => state('loading', current.data))
    setBranches(state())
    setSelectedBranch(repository.defaultBranch)
    setInspectionVersion((current) => current + 1)
  }

  if (['PENDING', 'PROVISIONING'].includes(repository.storageStatus)) return <RequestState kind="loading" compact title="Git repository provisioning" message="Git inspection will become available only after the backend marks storage Ready." />
  if (['FAILED', 'QUARANTINED'].includes(repository.storageStatus)) return <RequestState kind="unavailable" compact title="Git repository unavailable" message="Failed or quarantined repository storage cannot be inspected or used." />
  if (!capabilities.git.inspection) return <RequestState kind="unavailable" compact title="Git inspection unavailable" message="Repository metadata is preserved, but this environment cannot inspect Git source or history." />
  return (
    <section className="student-repo-card repository-git-panel">
      <div className="repository-git-heading"><div><h2>Repository Git</h2></div><div className="repository-git-heading-actions">{summary.data && <dl><div><dt>Branches</dt><dd>{summary.data.branchCount}</dd></div><div><dt>Commits</dt><dd>{summary.data.commitCount}</dd></div></dl>}<button type="button" className="student-outline-action" disabled={summary.status === 'loading'} onClick={refreshInspection}>{summary.status === 'loading' ? 'Refreshing…' : 'Refresh Git status'}</button></div></div>
      <div className="repository-git-tabs" role="tablist" aria-label="Repository Git views">{TABS.filter(([id]) => id !== 'local' || capabilities.git.smartHttp).map(([id, label]) => <button type="button" role="tab" aria-selected={displayedTab === id} key={id} onClick={() => setActiveTab(id)}>{label}</button>)}</div>
      {displayedTab !== 'local' && summary.status === 'loading' && <RequestState kind="loading" compact message="Loading repository Git summary." />}
      {displayedTab !== 'local' && summary.status === 'error' && <RequestState kind="unavailable" compact title="Git inspection unavailable" message={gitErrorMessage(summary.error)} />}
      {summary.status === 'ready' && summary.data.empty && displayedTab !== 'local' && <EmptyRepositoryGuidance repository={repository} role={role} owner={owner} writeLikely={writeLikely} smartHttpAvailable={capabilities.git.smartHttp} onOpenLocalGit={() => setActiveTab('local')} />}
      {summary.status === 'ready' && !summary.data.empty && displayedTab === 'files' && activityRepository && <ActivityRepositoryFiles key={`${repository.id}:${selectedBranch}:${inspectionVersion}`} api={api} repositoryId={repository.id} branches={branches} selectedBranch={selectedBranch} onSelectBranch={changeBranch} onOpenCommit={openActivityCommit} onOpenHistory={() => { setSelectedCommitId(null); setActiveTab('history') }} refreshVersion={inspectionVersion} />}
      {summary.status === 'ready' && !summary.data.empty && displayedTab === 'files' && !activityRepository && <FilesView key={`${repository.id}:${selectedBranch}:${inspectionVersion}`} api={api} repositoryId={repository.id} summary={summary.data} branches={branches.data ?? []} selectedBranch={selectedBranch} onSelectBranch={changeBranch} />}
      {summary.status === 'ready' && !summary.data.empty && displayedTab === 'history' && <HistoryView group={activityRepository} selectedCommitId={selectedCommitId} onSelectCommit={activityRepository ? setSelectedCommitId : undefined} key={`${repository.id}:${selectedBranch}:${inspectionVersion}`} api={api} repositoryId={repository.id} summary={summary.data} branches={branches.data ?? []} selectedBranch={selectedBranch} onSelectBranch={changeBranch} />}
      {summary.status === 'ready' && !summary.data.empty && displayedTab === 'branches' && <BranchesView group={activityRepository} summary={summary.data} branches={branches.data ?? []} loading={branches.status === 'loading'} error={branches.error} />}
      {displayedTab === 'local' && <LocalGitView api={api} repository={repository} role={role} project={project} activity={activity} owner={owner} empty={summary.data?.empty === true} />}
    </section>
  )
}
