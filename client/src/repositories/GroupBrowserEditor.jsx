import { EXTENSIONS, browserFileSupported } from './group-browser-validation.js'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { NavLink, useParams, useSearchParams } from 'react-router-dom'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import { describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import AppDialog from '../components/AppDialog.jsx'
import GroupGitActions from './GroupGitActions.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import SourceEditorSurface from '../components/SourceEditorSurface.jsx'
import { repositoryApi } from './repository-api.js'
import { repositoryContentApi } from './repository-content-api.js'
import { groupBrowserApi } from './group-browser-api.js'
import { groupContextProjection } from './repository-projections.js'
import { branchProjection, fileProjection, treeProjection } from './repository-content-projections.js'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import './group-browser-editor.css'

const blank = { filePath: '', content: '', initial: '', operation: 'UPDATE' }
const WELCOME_KEY = 'projex.group-editor.hide-welcome'
const welcomeHidden = () => { try { return localStorage.getItem(WELCOME_KEY) === 'yes' } catch { return false } }
const pendingStatus = value => ['PENDING','RUNNING'].includes(value?.status)
export default function GroupBrowserEditor({ api = repositoryApi, gitApi = repositoryContentApi, commits = groupBrowserApi, refsApi, pollingOptions }) {
  const { repositoryId, projectTaskId } = useParams()
  const { selectedClass } = useClasses()
  const [params, setParams] = useSearchParams()
  const [confirm, confirmation] = useConfirmation()
  const [state, setState] = useState({ status: 'loading' })
  const [draft, setDraft] = useState(blank)
  const [tree, setTree] = useState({ path: '', entries: [] })
  const [newPath, setNewPath] = useState('README.md')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refBusy,setRefBusy] = useState(false)
  const [branchMoved,setBranchMoved] = useState(false)
  const [job, setJob] = useState(null)
  const [bounded, setBounded] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [latest, setLatest] = useState(null)
  const [helpOpen, setHelpOpen] = useState(() => !welcomeHidden())
  const [hideWelcome, setHideWelcome] = useState(welcomeHidden)
  const [newFileOpen, setNewFileOpen] = useState(false)
  const [fileError, setFileError] = useState('')
  const [existingFile, setExistingFile] = useState(null)
  const editorRef = useRef(null), generation = useRef(0), request = useRef(null), mutation = useRef(false)
  const navigationBypass = useRef(false)
  const setBranchUrl = name => {
    navigationBypass.current = true
    try { setParams(current => { current.set('branch',name); return current }) }
    finally { navigationBypass.current = false }
  }
  const identity = `${projectTaskId}:${repositoryId}:${selectedClass?.id}`
  const dirty = Boolean(draft.filePath && (draft.operation === 'CREATE' || draft.content !== draft.initial))
  const working = busy || pendingStatus(job) || refBusy
  const branchName = state.branchName || params.get('branch') || 'main'
  const canWrite = Boolean(state.context?.permissions.canWrite && (branchName.toLowerCase() !== 'main' || state.context.permissions.canUpdateMain))
  const repoPath = classHref(`/student/projects/${projectTaskId}/repositories/${repositoryId}`, state.context?.class.id || selectedClass?.id)
  const back = `${repoPath}${repoPath.includes('?') ? '&' : '?'}tab=code&branch=${encodeURIComponent(branchName)}`
  const contextFor = async () => {
    const raw = (await api.getGroupContext(repositoryId)).data
    if (raw?.project?.id !== projectTaskId || selectedClass && raw.class?.id !== selectedClass.id) throw new Error('Repository context is unavailable.')
    const context = groupContextProjection(raw, { id: repositoryId, projectTaskId, teamId: raw.team?.id })
    if (!context.permissions.canRead) throw new Error('Repository source access is unavailable.')
    return context
  }
  const load = async (requestedBranch = params.get('branch'), discard = false) => {
    if (!discard && dirty && !await confirm('Discard your unsaved file changes and reload the repository?', 'Discard changes?')) return
    const ticket = ++generation.current
    setBusy(true); setError(null)
    try {
      const [context, repository] = await Promise.all([contextFor(), api.getRepository(repositoryId)])
      if (repository.data?.id !== repositoryId || repository.data.projectTaskId !== projectTaskId || !repository.data.repositoryName) throw new Error('Repository identity is unavailable.')
      const branches = (await gitApi.listBranches(repositoryId)).data.map(branchProjection)
      const name = requestedBranch || 'main'
      const branch = branches.find(item => item.branchName === name)
      if (branches.length && !branch) throw new Error('Choose an existing repository branch.')
      const head = branch?.commitId ?? null
      const entries = head ? treeProjection((await gitApi.getTree(repositoryId,{ commitId: head })).data) : { path: '', entries: [] }
      const editableFiles = entries.entries.filter(item => item.entryType === 'blob' && browserFileSupported(item.path) && Number.isSafeInteger(item.sizeBytes) && item.sizeBytes <= 65536)
      const firstFile = editableFiles.find(item => item.path === 'README.md') || editableFiles[0]
      let opened = blank
      if (head && firstFile) {
        try {
          const file = fileProjection((await gitApi.getFile(repositoryId,{ commitId: head, path: firstFile.path })).data)
          if (file.commitId !== head || file.path !== firstFile.path || file.sizeBytes > 65536 || file.content.includes('\0')) throw new Error('This file cannot be edited in the browser.')
          opened = { filePath: file.path, content: file.content, initial: file.content, operation: 'UPDATE' }
        } catch (failure) { if (failure.status !== 415) throw failure }
      }
      if (ticket !== generation.current) return
      setState({ status: 'ready', repositoryName: repository.data.repositoryName, context, branches, branchName: name, head }); setTree(entries)
      setDraft(!head && context.permissions.canWrite && context.permissions.canUpdateMain ? { filePath: 'README.md', content: `# ${context.project.title}\n`, initial: '', operation: 'CREATE' } : opened)
      setBranchMoved(false); setJob(null); request.current = null; setUncertain(false); setLatest(null)
    } catch (failure) { if (ticket === generation.current) { setError(failure); setState(current => current.status === 'ready' ? current : { status: 'error' }) } }
    finally { if (ticket === generation.current) setBusy(false) }
  }
  const initialize = useEffectEvent(() => {
    const hidden = welcomeHidden()
    setHideWelcome(hidden); setHelpOpen(!hidden)
    void load(params.get('branch'),true)
  })
  useEffect(() => { const fence = generation; Promise.resolve().then(() => initialize()); return () => { fence.current++ } }, [identity])
  const browse = async path => {
    if (!state.head) return
    const ticket = ++generation.current
    setBusy(true); setError(null)
    try { const value = treeProjection((await gitApi.getTree(repositoryId,{ commitId: state.head, path: path || undefined })).data); if (value.commitId !== state.head || value.path !== path) throw new Error('File list changed. Reload the branch.'); if (ticket === generation.current) setTree(value) }
    catch (failure) { if (ticket === generation.current) setError(failure) }
    finally { if (ticket === generation.current) setBusy(false) }
  }
  const openFile = async entry => {
    if (!browserFileSupported(entry.path) || entry.sizeBytes > 65536) { setError(new Error('Choose a supported UTF-8 file no larger than 64 KiB.')); return }
    if (dirty && !await confirm('Discard your unsaved file changes and open this file?', 'Discard changes?')) return
    const ticket = ++generation.current
    setBusy(true); setError(null)
    try {
      const file = fileProjection((await gitApi.getFile(repositoryId,{ commitId: state.head, path: entry.path })).data)
      if (file.commitId !== state.head || file.path !== entry.path || file.sizeBytes > 65536 || file.content.includes('\0')) throw new Error('This file cannot be edited in the browser.')
      if (ticket === generation.current) { setDraft({ filePath: file.path, content: file.content, initial: file.content, operation: 'UPDATE' }); setLatest(null) }
    } catch (failure) { if (ticket === generation.current) setError(failure) }
    finally { if (ticket === generation.current) setBusy(false) }
  }
  const createFile = async event => {
    event.preventDefault()
    if (busy || !canWrite) return
    if (!browserFileSupported(newPath)) { setFileError('Use a source/text filename such as src/Main.java or README.md.'); return }
    const ticket = generation.current
    setBusy(true); setFileError(''); setExistingFile(null)
    try {
      if (state.head) {
        try {
          await gitApi.getFile(repositoryId,{ commitId: state.head, path: newPath })
          if (ticket === generation.current) { setFileError('This file already exists. Open it to edit its contents.'); setExistingFile({path:newPath,sizeBytes:0}) }
          return
        } catch (failure) { if (failure.status !== 404) throw failure }
      }
      if (ticket !== generation.current) return
      setNewFileOpen(false)
      if (dirty && !await confirm('Discard the current unsaved file and create another?', 'Discard changes?')) return
      if (ticket !== generation.current) return
      setDraft({ filePath: newPath, content: '', initial: '', operation: 'CREATE' }); setLatest(null); setError(null); setJob(null)
    } catch { if (ticket === generation.current) setFileError('We could not check this filename. Try again before creating it.') }
    finally { if (ticket === generation.current) setBusy(false) }
  }
  const adoptJob = useCallback(response => {
    const value = response.data
    if (value?.repositoryId !== repositoryId || value.jobId !== request.current?.jobId || value.branchName !== request.current?.input.branchName || value.filePath !== request.current?.input.filePath) throw new Error('Commit result could not be confirmed.')
    setJob(value)
    if (value.status === 'SUCCEEDED') {
      if (!/^[0-9a-f]{40}$/.test(value.commitHash)) throw new Error('Commit result could not be confirmed.')
      const input = request.current.input
      setDraft({ filePath: input.filePath, content: input.content, initial: input.content, operation: 'UPDATE' })
      setState(current => ({ ...current, head: value.commitHash, branches: current.branches.some(branch => branch.branchName === input.branchName) ? current.branches.map(branch => branch.branchName === input.branchName ? { ...branch, commitId: value.commitHash } : branch) : [{ branchName: input.branchName, commitId: value.commitHash }] }))
      setMessage(''); setError(null); request.current = null; setUncertain(false)
      const ticket = generation.current
      void gitApi.getTree(repositoryId,{ commitId: value.commitHash }).then(response => {
        const valueTree = treeProjection(response.data)
        if (valueTree.commitId !== value.commitHash || valueTree.path !== '') throw new Error('Committed file list could not be refreshed. Reload latest to inspect it.')
        if (ticket === generation.current) setTree(valueTree)
      }).catch(failure => { if (ticket === generation.current) setError(failure) })
    }
    if (['FAILED','CONFLICTED'].includes(value.status)) { request.current = null; setUncertain(false) }
    return pendingStatus(value)
  }, [repositoryId, gitApi])
  const poll = useCallback((id,options) => commits.get(repositoryId,id,options),[commits,repositoryId])
  const pollError = useCallback(failure => { setError(failure); setBounded(true) },[])
  const stopPolling = useCallback(() => setBounded(true),[])
  useBoundedPolling({ identity: job?.jobId, active: pendingStatus(job) && !bounded, load: poll, onData: adoptJob, onError: pollError, onBoundedStop: stopPolling, maximumDurationMs: 60000, ...pollingOptions })
  const commit = async event => {
    event.preventDefault()
    if (mutation.current || pendingStatus(job)) return
    if (!request.current && (!dirty || !message.trim() || !canWrite)) return
    mutation.current = true; setBusy(true); setError(null)
    const ticket = generation.current
    try {
      const context = await contextFor()
      setState(current => ({ ...current, context }))
      if (!request.current && (!context.permissions.canWrite || branchName.toLowerCase() === 'main' && !context.permissions.canUpdateMain)) throw new Error('Your current permissions do not allow this commit. Your edits are kept.')
      if (!request.current) request.current = { key: `group:${crypto.randomUUID()}`, input: { branchName, filePath: draft.filePath, operation: draft.operation, content: draft.content, commitMessage: message.trim(), expectedHeadCommitHash: state.head } }
      setUncertain(true)
      const result = await commits.create(repositoryId,request.current.input,request.current.key)
      if (ticket !== generation.current) return
      if (!result.data?.jobId || result.data.repositoryId !== repositoryId || result.data.branchName !== branchName || result.data.filePath !== request.current.input.filePath) throw new Error('Commit request could not be confirmed.')
      request.current.jobId = result.data.jobId
      setUncertain(false)
      setJob(result.data); setBounded(false)
      if (!pendingStatus(result.data)) adoptJob(result)
    } catch (failure) { if (ticket === generation.current) { setError(failure); if (failure.status && failure.status < 500) { request.current = null; setUncertain(false) } } }
    finally { mutation.current = false; if (ticket === generation.current) setBusy(false) }
  }
  const compareLatest = async () => {
    const ticket = generation.current
    setBusy(true); setError(null)
    try {
      const branches = (await gitApi.listBranches(repositoryId)).data.map(branchProjection)
      const head = branches.find(branch => branch.branchName === branchName)?.commitId
      if (!head) throw new Error('The branch no longer exists. Copy your edits before choosing another branch.')
      let file = null
      try { file = fileProjection((await gitApi.getFile(repositoryId,{ commitId: head, path: draft.filePath })).data); if (file.commitId !== head || file.path !== draft.filePath) throw new Error('Latest file context is unavailable.') }
      catch (failure) { if (failure.status !== 404) throw failure }
      if (ticket === generation.current) setLatest({ head, content: file?.content ?? '', exists: Boolean(file) })
    } catch (failure) { if (ticket === generation.current) setError(failure) } finally { if (ticket === generation.current) setBusy(false) }
  }
  const closeHelp = () => {
    try {
      if (hideWelcome) localStorage.setItem(WELCOME_KEY,'yes')
      else localStorage.removeItem(WELCOME_KEY)
    } catch { /* Optional guide preference only; source and credentials are never stored. */ }
    setHelpOpen(false)
  }
  const openHelp = () => { setHideWelcome(welcomeHidden()); setHelpOpen(true) }
  const fileChanged = job?.status === 'FAILED' && job.failureCode === 'BROWSER_FILE_CHANGED'
  const needsComparison = job?.status === 'CONFLICTED' || fileChanged || branchMoved
  const failureCopy = {
    BROWSER_ACCESS_REVOKED: 'Editing access changed, or this project is now read-only. Your draft is kept.',
    BROWSER_FILE_UNSUPPORTED: 'This file cannot be edited in the browser. Use a supported UTF-8 text file.',
    BROWSER_PATH_UNSAFE: 'This filename conflicts with a protected path or another file. Choose a different filename.',
    BROWSER_STORAGE_LIMIT: 'This repository has reached its storage limit. Ask your instructor for help.',
  }
  if (state.status === 'loading') return <RequestState kind="loading" message="Opening the Group editor." />
  if (state.status === 'error') return <RequestState kind="unavailable" error={error} action={<button onClick={() => load(params.get('branch'),true)}>Try again</button>} />
  const frozen = !state.context.permissions.canWrite
  const bytes = new TextEncoder().encode(draft.content).length
  return <main className="group-browser-editor">
    <UnsavedChangesGuard dirty={dirty || working || uncertain} bypass={navigationBypass} />
    <header className="group-editor-heading">
      <div><NavLink className="student-back-link" to={back}>Back to repository</NavLink><h1>{state.repositoryName}</h1><p>{state.context.team.name} · {state.context.currentRole === 'MAINTAINER' ? 'Maintainer' : 'Developer'}</p></div>
      <button type="button" className="group-editor-help-button" aria-label="Editor help" title="Editor help" onClick={openHelp}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 0 1 4.6 1c0 1.8-2.3 1.9-2.3 3.5M12 16.8v.1" /></svg></button>
    </header>
    <form className="group-editor-actions" onSubmit={commit}>
      <label className="group-editor-branch">Branch<select aria-label="Editor branch" value={branchName} disabled={working || uncertain} onChange={async event => {
        const name = event.target.value
        if (dirty && !await confirm('Discard your unsaved edits and switch branches?', 'Discard changes?')) return
        setBranchUrl(name); await load(name,true)
      }}>{state.branches.length ? state.branches.map(branch => <option key={branch.branchName}>{branch.branchName}</option>) : <option>main</option>}</select></label>
      <label className="group-editor-message">Commit message<input value={message} onChange={event => setMessage(event.target.value)} maxLength={300} disabled={working || uncertain || !canWrite || !draft.filePath} placeholder="What did you change?" /></label>
      <GroupGitActions repositoryId={repositoryId} branchName={branchName} head={state.head} branches={state.branches} canWrite={state.context.permissions.canWrite} canUpdateMain={state.context.permissions.canUpdateMain} disabled={working||uncertain||needsComparison} dirty={dirty} api={refsApi} pollingOptions={pollingOptions} onBusyChange={setRefBusy}
        onCreated={value=>{ setState(current=>({...current,branchName:value.targetBranchName,head:value.commitHash,branches:[...current.branches,{branchName:value.targetBranchName,commitId:value.commitHash}]}));setBranchUrl(value.targetBranchName);setBranchMoved(false) }}
        onMerged={value=>{setState(current=>({...current,branches:current.branches.map(branch=>branch.branchName===value.targetBranchName?{...branch,commitId:value.commitHash}:branch)}));if(value.targetBranchName===branchName){if(dirty)setBranchMoved(true);else void load(branchName,true)} }}
        onRefreshBranches={async()=>{await contextFor();const branches=(await gitApi.listBranches(repositoryId)).data.map(branchProjection);setState(current=>({...current,branches}));if(branches.find(branch=>branch.branchName===branchName)?.commitId!==state.head)setBranchMoved(true)}}
        commitAction={<button className="student-primary-action" disabled={working || !uncertain && (!canWrite || !dirty || !message.trim() || bytes > 65536 || !draft.filePath) || needsComparison}><ProjexIcon name="save" size={17} />{pendingStatus(job) ? 'Committing…' : busy ? 'Please wait…' : uncertain ? 'Retry same commit request' : 'Commit Changes'}</button>} />
    </form>
    {frozen && <p role="status" className="group-editor-notice">This repository is read-only. Your draft is kept.</p>}
    {!frozen && !canWrite && <p role="status" className="group-editor-notice">Main is protected. Choose an existing feature branch, or ask your Maintainer to initialize an empty repository.</p>}
    {error && <p role="alert" className="activity-action-error">{error.status ? describeApiError(error) : error.message}</p>}
    {job?.status === 'SUCCEEDED' && <p role="status" className="activity-action-success">Committed {job.commitHash.slice(0,8)}. <NavLink to={`${repoPath}${repoPath.includes('?') ? '&' : '?'}tab=commits&branch=${encodeURIComponent(branchName)}&commit=${job.commitHash}`}>View real commit</NavLink></p>}
    {needsComparison && <div role="alert" className="group-editor-notice"><span>{fileChanged ? 'This file already exists or changed. Compare it with your draft before saving.' : 'The branch changed. Your edits are kept. Compare the latest file before retrying.'}</span><button type="button" className="student-outline-action" disabled={working} onClick={compareLatest}>Compare latest</button></div>}
    {job?.status === 'FAILED' && !fileChanged && <p role="alert" className="group-editor-notice">{failureCopy[job.failureCode] || 'The commit was not applied. Your draft is kept. Try again, or check Editor help.'}</p>}
    {bounded && pendingStatus(job) && <p role="status" className="group-editor-notice">The commit outcome is still being checked. <button type="button" className="student-outline-action" disabled={busy} onClick={async () => { setBusy(true); try { adoptJob(await commits.get(repositoryId,job.jobId)); setBounded(false) } catch (failure) { setError(failure) } finally { setBusy(false) } }}>Check commit status</button></p>}
    <div className="group-editor-workspace">
      <aside className="group-editor-files" aria-label="File explorer">
        <div className="group-editor-explorer-heading"><h2>Files</h2>{canWrite && <button type="button" className="group-editor-new-file" disabled={working || uncertain} onClick={() => { setFileError(''); setExistingFile(null); setNewPath(''); setNewFileOpen(true) }}><ProjexIcon name="plus" size={16} /> New file</button>}</div>
        <nav aria-label="Repository files">
          {tree.path && <button type="button" disabled={working || uncertain} onClick={() => browse(tree.path.split('/').slice(0,-1).join('/'))}>← Parent folder</button>}
          {tree.entries.map(entry => <button type="button" key={entry.path} aria-current={draft.filePath === entry.path ? 'true' : undefined} disabled={working || uncertain} onClick={() => entry.entryType === 'tree' ? browse(entry.path) : openFile(entry)}><ProjexIcon name={entry.entryType === 'tree' ? 'folder' : 'file'} size={16} />{entry.name}</button>)}
          {draft.operation === 'CREATE' && <span className="group-editor-draft-file"><ProjexIcon name="file" size={16} />{draft.filePath}<small>New</small></span>}
          {!state.head && <p>No commits yet.</p>}
        </nav>
        <button type="button" className="group-editor-reload" disabled={working || uncertain} onClick={() => load(branchName)}>Reload latest</button>
      </aside>
      <section className="group-editor-code" aria-label="Source editor">
        <div className="group-editor-file-heading"><strong><ProjexIcon name="file" size={16} />{draft.filePath || 'Choose a file'}</strong><span>{dirty ? 'Unsaved changes' : 'Saved snapshot'}</span></div>
        {draft.filePath ? <>
          <span id="group-source-help" className="sr-only">Tab indents. Escape then Tab leaves the editor.</span>
          <SourceEditorSurface value={draft.content} onChange={content => { setDraft(current => ({ ...current, content })); if (job?.status === 'SUCCEEDED') setJob(null) }} editorRef={editorRef} label="Group file source" description="group-source-help" disabled={working || uncertain || !canWrite} />
          {latest && <section className="group-editor-comparison"><h2>Latest file · {latest.head.slice(0,8)}</h2><pre>{latest.exists ? latest.content : 'The file does not exist at this revision.'}</pre><button type="button" className="student-outline-action" onClick={async () => { if (await confirm('Keep your edited content and use this latest revision as its base? The next commit will replace this file with your edited content.', 'Use latest base?')) { setState(current => ({ ...current, head: latest.head })); setDraft(current => ({ ...current, initial: latest.content, operation: latest.exists ? 'UPDATE' : 'CREATE' })); setLatest(null); setJob(null); setBranchMoved(false) } }}>Keep edits on latest base</button></section>}
        </> : <div className="group-editor-empty"><ProjexIcon name="file" size={28} /><h2>Start with a file</h2><p>Select a file from the explorer{canWrite ? ', or choose New file.' : '.'}</p></div>}
        <footer className="group-editor-status"><span>UTF-8 · {bytes.toLocaleString()} / 65,536 bytes</span><span>{canWrite ? 'One file per commit' : 'Read-only'}</span></footer>
      </section>
    </div>
    {helpOpen && <AppDialog title="Code in Origin" className="group-editor-dialog" onClose={closeHelp}>
      <p className="group-editor-intro">Make a quick change, then save it to your team’s Git repository.</p>
      <ol><li>Open a file, or choose <strong>New file</strong>.</li><li>Edit your code and describe your change.</li><li>Select <strong>Commit changes</strong> to save it to Git.</li></ol>
      <aside className="group-editor-local-advice"><span className="group-editor-advice-icon"><ProjexIcon name="repository" size={22} /></span><div><strong>Go further with your own IDE</strong><p>For advanced development and Git features, we recommend cloning this repository and using your preferred IDE.</p><NavLink className="student-outline-action" onClick={closeHelp} to={back}>View clone options <span aria-hidden="true">→</span></NavLink></div></aside>
      <details><summary>Supported files and shortcuts</summary><p>UTF-8 text, up to 64 KiB. {EXTENSIONS.map(ext => `.${ext}`).join(', ')}.</p><p>Tab indents; Shift+Tab unindents; Escape then Tab leaves the editor. Merges use fast-forward only. No compilation or grading.</p></details>
      <p className="group-editor-help-hint">You can reopen this guide anytime using the question-mark help button.</p>
      <footer className="group-editor-help-footer"><label className="group-editor-welcome-choice"><input type="checkbox" checked={hideWelcome} onChange={event => setHideWelcome(event.target.checked)} />Do not show this again</label><button type="button" className="student-primary-action" onClick={closeHelp}>I understand</button></footer>
    </AppDialog>}
    {newFileOpen && <AppDialog title="New file" className="group-editor-dialog" busy={busy} onClose={() => setNewFileOpen(false)}><form onSubmit={createFile}>
      <label>New file path<input value={newPath} onChange={event => { setNewPath(event.target.value); setFileError(''); setExistingFile(null) }} disabled={busy} maxLength={240} placeholder="e.g. src/Main.java" /></label>
      {fileError && <p role="alert">{fileError}</p>}
      <footer><button type="button" className="student-outline-action" disabled={busy} onClick={() => setNewFileOpen(false)}>Cancel</button>{existingFile ? <button type="button" className="student-primary-action" disabled={busy} onClick={() => { setNewFileOpen(false); void openFile(existingFile) }}>Open existing file</button> : <button className="student-primary-action" disabled={busy || !newPath.trim()}>{busy ? 'Checking…' : 'Create file'}</button>}</footer>
    </form></AppDialog>}
    {confirmation}
  </main>
}
