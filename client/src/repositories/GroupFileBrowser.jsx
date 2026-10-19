import { useEffect, useRef, useState } from 'react'
import { treeProjection, fileProjection } from './repository-content-projections.js'
import RequestState from './GroupRequestState.jsx'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { GroupFileFinder } from './GroupFileFinder.jsx'

// The parent keys this browser by repository + commit. Every read uses that
// exact snapshot, never a moving branch name.
export function GroupFileBrowser({ repositoryId, commitId, api, onRootChange, renderToolbar, latestCommit, onDirtyChange }) {
  const [path, setPath] = useState('')
  const [tree, setTree] = useState({ status: 'loading' })
  const [file, setFile] = useState(null)
  const [finderVersion, setFinderVersion] = useState(0)
  const [revision, setRevision] = useState(0)
  const fileRequest = useRef(null)
  const sequence = useRef(0)
  useEffect(() => { onRootChange(true) }, [onRootChange])
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!controller.signal.aborted) setTree({ status: 'loading' }) })
    api.getTree(repositoryId, { commitId, path }, { signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return
      const data = treeProjection(response.data)
      if (data.commitId !== commitId || data.path !== path) throw new Error('Repository folder changed. Refresh and try again.')
      setTree({ status: 'ready', data })
    }).catch((error) => { if (!controller.signal.aborted) setTree({ status: 'error', error }) })
    return () => controller.abort()
  }, [api, repositoryId, commitId, path, revision])
  useEffect(() => () => { sequence.current += 1; fileRequest.current?.abort() }, [])
  const folder = (next) => {
    sequence.current += 1; fileRequest.current?.abort(); setFile(null); setPath(next); setFinderVersion((value) => value + 1); onRootChange(next === '')
  }
  const openFile = async (next) => {
    fileRequest.current?.abort()
    const controller = new AbortController(); fileRequest.current = controller
    const request = ++sequence.current
    setFile({ status: 'loading', path: next }); onRootChange(false)
    try {
      const response = await api.getFile(repositoryId, { commitId, path: next }, { signal: controller.signal })
      const data = fileProjection(response.data)
      if (data.commitId !== commitId || data.path !== next) throw new Error('Repository file changed. Refresh and try again.')
      if (!controller.signal.aborted && sequence.current === request) { setFile({ status: 'ready', path: next, data }); return true }
    } catch (error) { if (!controller.signal.aborted && sequence.current === request) setFile({ status: 'error', path: next, error }) }
    return false
  }
  const shownPath = file?.path || path
  const segments = shownPath.split('/').filter(Boolean)
  const goToFile = <GroupFileFinder key={finderVersion} {...{ repositoryId, commitId, api, onDirtyChange }} onOpenFile={openFile} />
  return <div className="group-file-browser">
    {renderToolbar ? renderToolbar(goToFile) : <div className="group-file-tools">{goToFile}</div>}
    {latestCommit}
    {segments.length > 0 && <div className="group-file-tools"><nav aria-label="Repository path"><button type="button" onClick={() => folder('')}>Files</button>{segments.map((segment, index) => <span key={index}> / {index === segments.length - 1 && file ? <strong>{segment}</strong> : <button type="button" onClick={() => folder(segments.slice(0, index + 1).join('/'))}>{segment}</button>}</span>)}</nav></div>}
    {file ? <section className="group-file-preview" aria-label="Selected file"><header><strong>{file.path}</strong><button type="button" onClick={() => folder(file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '')}>Back to folder</button></header>
      {file.status === 'loading' && <RequestState kind="loading" compact message="Loading file…" />}{file.status === 'error' && <RequestState kind="unavailable" compact resource="file" title="File preview unavailable" error={file.error} action={<button type="button" onClick={() => openFile(file.path)}>Retry file</button>} />}{file.status === 'ready' && <pre>{file.data.content}</pre>}
    </section> : <>
      {tree.status === 'loading' && <RequestState kind="loading" compact message="Loading files." />}
      {tree.status === 'error' && <RequestState kind="unavailable" compact title="Files unavailable" error={tree.error} action={<button type="button" onClick={() => setRevision((value) => value + 1)}>Retry files</button>} />}
      {tree.status === 'ready' && <div className="group-file-list" aria-label="Repository files">
        {path && <button type="button" onClick={() => folder(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')}><span aria-hidden="true">↰</span><strong>..</strong><small>Parent folder</small></button>}
        {[...tree.data.entries].sort((a, b) => (a.entryType === b.entryType ? a.name.localeCompare(b.name) : a.entryType === 'tree' ? -1 : 1)).map((entry) => <button type="button" key={entry.path} aria-label={`${entry.entryType === 'tree' ? 'Folder' : 'File'} ${entry.name}`} onClick={() => entry.entryType === 'tree' ? folder(entry.path) : openFile(entry.path)}><ProjexIcon name={entry.entryType === 'tree' ? 'folder' : entry.name.endsWith('.java') ? 'java-source' : 'file'} size={18} /><strong>{entry.name}</strong><small>{entry.entryType === 'tree' ? 'Directory' : `${entry.sizeBytes ?? '—'} B`}</small></button>)}
        {!tree.data.entries.length && <p>This folder is empty.</p>}
      </div>}
    </>}
  </div>
}
