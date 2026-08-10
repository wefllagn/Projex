import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { formatProjectDate } from '../projects/project-projections.js'
import { repositoryContentApi } from './repository-content-api.js'
import {
  branchProjection,
  commitDetailProjection,
  commitSummaryProjection,
  credentialProjection,
  diffProjection,
  fileProjection,
  issuedCredentialProjection,
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
  return new ApiError({ code: 'INVALID_API_RESPONSE', message: 'Projex returned mismatched repository Git data.' })
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

function BranchSelector({ branches, value, onChange }) {
  const options = branches.length > 0 ? branches : value ? [{ branchName: value, isDefault: true }] : []
  return (
    <label className="repository-git-branch-select">
      Branch
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((branch) => <option value={branch.branchName} key={branch.branchName}>{branch.branchName}{branch.isDefault ? ' (default)' : ''}</option>)}
      </select>
    </label>
  )
}

function FilesView({ api, repositoryId, summary, branches, selectedBranch, onSelectBranch }) {
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

function HistoryView({ api, repositoryId, summary, branches, selectedBranch, onSelectBranch }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState(state())
  const [detail, setDetail] = useState(state())
  const [selectedParent, setSelectedParent] = useState('')
  const [diff, setDiff] = useState(state())
  const detailController = useRef(null)

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
  }, [api, page, repositoryId, selectedBranch, summary.empty])

  useEffect(() => () => detailController.current?.abort(), [])

  const selectCommit = useCallback(async (commitId) => {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
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
  }, [api, detail, repositoryId, selectedParent])

  if (summary.empty) return <RequestState kind="empty" compact title="No commit history" message="This empty repository has no commits to inspect." />
  return (
    <div className="repository-git-history">
      <BranchSelector branches={branches} value={selectedBranch} onChange={onSelectBranch} />
      {history.status === 'loading' && <RequestState kind="loading" compact message="Loading commit history." />}
      {history.status === 'error' && <RequestState kind="unavailable" compact title="Commit history unavailable" message={gitErrorMessage(history.error)} />}
      {history.status === 'ready' && <div className="repository-git-history-grid"><div className="repository-git-commit-list">{history.data.commits.map((commit) => <button type="button" key={commit.commitId} onClick={() => selectCommit(commit.commitId)}><code>{shortCommit(commit.commitId)}</code><strong>{commit.subject || 'Untitled commit'}</strong><span>{commit.authorName} · self-asserted Git author</span><small>{formatProjectDate(commit.authoredAt)}</small></button>)}</div><section className="repository-git-commit-detail">{detail.status === 'idle' && <p>Select a commit to view bounded metadata and its parent diff.</p>}{detail.status === 'loading' && <RequestState kind="loading" compact message="Loading commit detail." />}{detail.status === 'error' && <RequestState kind="unavailable" compact message={gitErrorMessage(detail.error)} />}{detail.status === 'ready' && <><h3>{detail.data.subject || 'Untitled commit'}</h3><p><code>{detail.data.commitId}</code></p><p>{detail.data.authorName} · self-asserted Git author · {formatProjectDate(detail.data.authoredAt)}</p><h4>Changed files</h4><ul>{detail.data.files.map((change) => <li key={`${change.status}:${change.path}`}><strong>{change.status}</strong> {change.path}{change.previousPath ? ` (from ${change.previousPath})` : ''}</li>)}</ul>{detail.data.parentCommitIds.length === 0 ? <p className="activity-lifecycle-note">This is a root commit, so there is no parent diff.</p> : <><label>Compare with parent<select value={selectedParent} onChange={(event) => setSelectedParent(event.target.value)}>{detail.data.parentCommitIds.map((parent) => <option key={parent} value={parent}>{shortCommit(parent)}</option>)}</select></label>{diff.status === 'loading' && <RequestState kind="loading" compact message="Loading bounded diff." />}{diff.status === 'error' && <RequestState kind="unavailable" compact title="Diff unavailable" message={gitErrorMessage(diff.error)} />}{diff.status === 'ready' && <pre className="repository-git-diff">{diff.data.patch || 'No textual changes in this comparison.'}</pre>}</>}</>}</section></div>}
      {history.status === 'ready' && history.data.pagination?.totalPages > 1 && <nav className="activity-pagination" aria-label="Commit history pages"><button type="button" className="student-outline-action" disabled={!history.data.pagination.hasPreviousPage} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {history.data.pagination.page} of {history.data.pagination.totalPages}</span><button type="button" className="student-outline-action" disabled={!history.data.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
    </div>
  )
}

function BranchesView({ summary, branches, loading, error }) {
  if (summary.empty) return <RequestState kind="empty" compact title="No branches" message="This empty repository has no branches yet." />
  if (loading) return <RequestState kind="loading" compact message="Loading branches." />
  if (error) return <RequestState kind="unavailable" compact title="Branches unavailable" message={gitErrorMessage(error)} />
  return <div className="repository-git-branch-list">{branches.map((branch) => <article key={branch.branchName}><div><strong>{branch.branchName}</strong>{branch.isDefault && <span>Default</span>}</div><code>{shortCommit(branch.commitId)}</code><p>{branch.subject || 'Untitled commit'}</p><small>{branch.authorName} · self-asserted Git author · {formatProjectDate(branch.authoredAt)}</small></article>)}</div>
}

function credentialLifecycle(credential) {
  if (credential.revokedAt) return 'Revoked'
  if (!credential.expiresAt || Date.parse(credential.expiresAt) <= Date.now()) return 'Expired'
  return 'Active'
}

function LocalGitView({ api, repository, role, project }) {
  const [credentials, setCredentials] = useState(state('loading', []))
  const [issued, setIssued] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState('')
  const active = useRef(true)
  let transportUrl = null
  let transportError = null
  try { transportUrl = api.getTransportUrl(repository.id) } catch (urlError) { transportError = urlError }

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.listCredentials(repository.id, { signal })
      if (signal?.aborted || !active.current) return
      const projected = Array.isArray(response.data) ? response.data.map(credentialProjection) : []
      if (projected.some((credential) => credential.repositoryId !== repository.id)) throw gitContextError()
      setCredentials(state('ready', projected))
    } catch (loadError) { if (loadError?.name !== 'AbortError' && active.current) setCredentials(state('error', [], loadError)) }
  }, [api, repository.id])

  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => { controller.abort(); active.current = false }
  }, [load])

  useEffect(() => {
    if (!issued?.expiresAt) return undefined
    const remaining = Math.max(0, Date.parse(issued.expiresAt) - Date.now())
    const timer = setTimeout(() => setIssued(null), Math.min(remaining, 2_147_000_000))
    return () => clearTimeout(timer)
  }, [issued])

  const issue = async (operations) => {
    setBusy(true); setError(null); setIssued(null); setCopied('')
    try {
      const response = await api.issueCredential(repository.id, operations)
      const projection = issuedCredentialProjection(response.data, repository.id)
      if (!active.current) return
      setIssued(projection)
      setCredentials((current) => state('ready', [credentialProjection(projection), ...(current.data ?? []).filter((item) => item.credentialId !== projection.credentialId)]))
    } catch (issueError) { if (active.current) setError(issueError) } finally { if (active.current) setBusy(false) }
  }

  const revoke = async (credentialId) => {
    setBusy(true); setError(null)
    try {
      const response = await api.revokeCredential(credentialId)
      const projection = credentialProjection(response.data)
      if (!active.current) return
      if (projection.repositoryId !== repository.id) throw gitContextError()
      setCredentials((current) => state('ready', current.data.map((item) => item.credentialId === projection.credentialId ? projection : item)))
      if (issued?.credentialId === credentialId) setIssued(null)
    } catch (revokeError) { if (active.current) setError(revokeError) } finally { if (active.current) setBusy(false) }
  }

  const copy = async (value, label) => {
    if (!navigator.clipboard?.writeText) { setCopied('Clipboard access is unavailable; select and copy the value manually.'); return }
    try { await navigator.clipboard.writeText(value); setCopied(`${label} copied.`) } catch { setCopied('Clipboard access was denied; select and copy the value manually.') }
  }

  const classWriteLikely = repository.repositoryType === 'CLASS_PROJECT' && project?.status === 'PUBLISHED' && project?.dueState === 'OPEN' && ['WORKING', 'CHANGES_REQUESTED'].includes(repository.reviewStatus)
  const canOfferWrite = role === 'student' && repository.status === 'ACTIVE' && (repository.repositoryType === 'PERSONAL' || classWriteLikely)
  return (
    <div className="repository-local-git">
      <section className="repository-git-clone"><h3>Local Git address</h3><p>Use a local Git client. Projex never runs these commands in the browser.</p>{transportUrl && <div className="repository-copy-row"><code>{transportUrl}</code><button type="button" className="student-outline-action" onClick={() => copy(transportUrl, 'Clone URL')}>Copy URL</button></div>}<pre>git clone &quot;{transportUrl || '<configured Projex Git URL>'}&quot;</pre><p>When Git prompts, enter the separately issued username and one-time secret. Never place credentials in the URL or command.</p></section>
      <section className="repository-git-issue"><h3>Issue a short-lived credential</h3><p>Authorization is checked now and again for every Git operation. A credential never guarantees future push access.</p><div className="repository-git-actions"><button type="button" className="student-outline-action" disabled={busy} onClick={() => issue(['READ'])}>Issue Read Credential</button>{canOfferWrite && <button type="button" className="student-primary-action" disabled={busy} onClick={() => issue(['READ', 'WRITE'])}>Issue Read + Write Credential</button>}</div>{role === 'instructor' && <p className="activity-lifecycle-note">Instructors receive read-only repository access. Write credentials are not available.</p>}{(error || transportError) && <p className="activity-action-error">{gitErrorMessage(error || transportError)}</p>}</section>
      {issued && <section className="repository-issued-credential" role="dialog" aria-modal="true" aria-labelledby="issued-credential-title"><div><h3 id="issued-credential-title">Copy this credential now</h3><button type="button" className="student-modal-close" aria-label="Close credential result" onClick={() => setIssued(null)} /></div><p>The secret is shown once and remains only in this page’s memory until this panel closes or expires.</p><label>Username<div className="repository-copy-row"><code>{issued.username}</code><button type="button" className="student-outline-action" onClick={() => copy(issued.username, 'Username')}>Copy Username</button></div></label><label>One-time secret<div className="repository-copy-row"><code>{issued.secret}</code><button type="button" className="student-outline-action" onClick={() => copy(issued.secret, 'Secret')}>Copy Secret</button></div></label><small>Expires {formatProjectDate(issued.expiresAt)}. Clipboard contents are controlled by your operating system and other local applications after copying.</small></section>}
      {copied && <p className="activity-action-success" aria-live="polite">{copied}</p>}
      <section className="repository-git-credentials"><h3>My credential metadata</h3>{credentials.status === 'loading' && <RequestState kind="loading" compact message="Loading credential metadata." />}{credentials.status === 'error' && <RequestState kind="unavailable" compact message={gitErrorMessage(credentials.error)} />}{credentials.status === 'ready' && credentials.data.length === 0 && <RequestState kind="empty" compact message="No credentials have been issued for this repository." />}{credentials.status === 'ready' && credentials.data.map((credential) => { const lifecycle = credentialLifecycle(credential); return <article key={credential.credentialId}><div><strong>{credential.operations.join(' + ')}</strong><span>{lifecycle}</span></div><code>{credential.credentialId}</code><small>Created {formatProjectDate(credential.createdAt)} · Expires {formatProjectDate(credential.expiresAt)}{credential.lastUsedAt ? ` · Last used ${formatProjectDate(credential.lastUsedAt)}` : ''}</small>{lifecycle === 'Active' && <button type="button" className="student-outline-action" disabled={busy} onClick={() => revoke(credential.credentialId)}>Revoke</button>}</article> })}</section>
      {issued?.operations.includes('WRITE') && <section className="repository-git-guidance"><h3>Local write workflow</h3><pre>{'git fetch origin\ngit checkout -b <branch-name>\ngit add .\ngit commit -m "Describe your change"\ngit push -u origin <branch-name>'}</pre><p>Projex may reject a later push if membership or academic lifecycle authorization changes.</p></section>}
    </div>
  )
}

export function RepositoryGitPanel({ repository, role = 'student', project = null, api = repositoryContentApi }) {
  const [activeTab, setActiveTab] = useState('files')
  const [summary, setSummary] = useState(state())
  const [branches, setBranches] = useState(state())
  const [selectedBranch, setSelectedBranch] = useState(repository.defaultBranch)

  useEffect(() => {
    if (repository.storageStatus !== 'READY') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setSummary(state('loading')) })
    Promise.resolve().then(() => api.getSummary(repository.id, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const projected = repositoryGitSummaryProjection(response.data, repository)
        setSummary(state('ready', projected))
        setSelectedBranch(projected.defaultBranch)
      })
      .catch((error) => { if (error?.name !== 'AbortError') setSummary(state('error', null, error)) })
    return () => controller.abort()
  }, [api, repository.defaultBranch, repository.id, repository.storageStatus])

  useEffect(() => {
    if (summary.status !== 'ready' || summary.data.empty || !['files', 'history', 'branches'].includes(activeTab) || branches.status !== 'idle') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setBranches(state('loading')) })
    Promise.resolve().then(() => api.listBranches(repository.id, { signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted) return
        const projected = Array.isArray(response.data) ? response.data.map(branchProjection) : []
        setBranches(state('ready', projected))
        if (projected.length > 0 && !projected.some((branch) => branch.branchName === selectedBranch)) setSelectedBranch(projected.find((branch) => branch.isDefault)?.branchName ?? projected[0].branchName)
      })
      .catch((error) => { if (error?.name !== 'AbortError') setBranches(state('error', null, error)) })
    return () => controller.abort()
  }, [activeTab, api, branches.status, repository.id, selectedBranch, summary])

  if (['PENDING', 'PROVISIONING'].includes(repository.storageStatus)) return <RequestState kind="loading" compact title="Git repository provisioning" message="Git inspection will become available only after the backend marks storage Ready." />
  if (['FAILED', 'QUARANTINED'].includes(repository.storageStatus)) return <RequestState kind="unavailable" compact title="Git repository unavailable" message="Failed or quarantined repository storage cannot be inspected or used." />
  return (
    <section className="student-repo-card repository-git-panel">
      <div className="repository-git-heading"><div><h2>Repository Git</h2><p>Backend-authorized source inspection and short-lived local Git access.</p></div>{summary.status === 'ready' && <dl><div><dt>Branches</dt><dd>{summary.data.branchCount}</dd></div><div><dt>Commits</dt><dd>{summary.data.commitCount}</dd></div></dl>}</div>
      <div className="repository-git-tabs" role="tablist" aria-label="Repository Git views">{TABS.map(([id, label]) => <button type="button" role="tab" aria-selected={activeTab === id} key={id} onClick={() => setActiveTab(id)}>{label}</button>)}</div>
      {activeTab !== 'local' && summary.status === 'loading' && <RequestState kind="loading" compact message="Loading repository Git summary." />}
      {activeTab !== 'local' && summary.status === 'error' && <RequestState kind="unavailable" compact title="Git inspection unavailable" message={gitErrorMessage(summary.error)} />}
      {summary.status === 'ready' && activeTab === 'files' && <FilesView key={`${repository.id}:${selectedBranch}`} api={api} repositoryId={repository.id} summary={summary.data} branches={branches.data ?? []} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />}
      {summary.status === 'ready' && activeTab === 'history' && <HistoryView key={`${repository.id}:${selectedBranch}`} api={api} repositoryId={repository.id} summary={summary.data} branches={branches.data ?? []} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />}
      {summary.status === 'ready' && activeTab === 'branches' && <BranchesView summary={summary.data} branches={branches.data ?? []} loading={branches.status === 'loading'} error={branches.error} />}
      {activeTab === 'local' && <LocalGitView api={api} repository={repository} role={role} project={project} />}
    </section>
  )
}
