import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ApiError, describeApiError } from '../api/api-client.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'
import { collectGroupFiles, matchGroupFiles } from './group-file-search.js'

// Parent is keyed by repository + immutable commit. The index and any pending
// read belong only to that snapshot and never contain file source or secrets.
export function GroupFileFinder({ repositoryId, commitId, api, onOpenFile, onDirtyChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState({ status: 'idle' })
  const [selected, setSelected] = useState(0)
  const root = useRef(null), input = useRef(null), ready = useRef(null), pending = useRef(null)
  const alive = useRef(true), version = useRef(0)
  const listId = useId(), helpId = useId()
  const matches = useMemo(() => index.status === 'ready' ? matchGroupFiles(index.data.files, query) : [], [index, query])
  const shown = matches.slice(0, 50)
  const visible = open && Boolean(query.trim())
  const active = Math.min(selected, Math.max(0, shown.length - 1))
  useEffect(() => { onDirtyChange?.(Boolean(query)); return () => onDirtyChange?.(false) }, [query, onDirtyChange])
  useEffect(() => {
    alive.current = true
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => { alive.current = false; pending.current?.controller.abort(); document.removeEventListener('pointerdown', outside) }
  }, [])
  const load = useCallback(() => {
    if (ready.current || pending.current) return
    const controller = new AbortController()
    const request = { controller }
    pending.current = request
    setIndex({ status: 'loading' })
    const timer = setTimeout(() => controller.abort(new ApiError({ code: 'REQUEST_TIMEOUT' })), 10000)
    collectGroupFiles({ api, repositoryId, commitId, signal: controller.signal }).then((data) => {
      if (!alive.current || controller.signal.aborted || pending.current !== request) return
      ready.current = data; setIndex({ status: 'ready', data })
    }).catch((error) => {
      if (!alive.current || pending.current !== request) return
      setIndex({ status: 'error', error: controller.signal.aborted ? controller.signal.reason : error })
    }).finally(() => { clearTimeout(timer); if (pending.current === request) pending.current = null })
  }, [api, repositoryId, commitId])
  useEffect(() => {
    if (!query.trim() || !open || index.status === 'error') return undefined
    const timer = setTimeout(load, 180)
    return () => clearTimeout(timer)
  }, [query, open, index.status, load])
  useEffect(() => { if (visible) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, listId, visible])
  const clear = () => {
    version.current += 1; setQuery(''); setOpen(false); setSelected(0)
    if (pending.current) { pending.current.controller.abort(); pending.current = null; setIndex({ status: 'idle' }) }
    input.current?.focus()
  }
  const choose = async (path) => {
    const started = version.current
    setOpen(false)
    if (await onOpenFile(path) && alive.current && version.current === started) { setQuery(''); setSelected(0) }
  }
  const enter = () => {
    if (!query.trim()) return
    setOpen(true)
    if (index.status === 'ready' && shown[active]) choose(shown[active])
    else if (index.status !== 'error') load()
  }
  const exactFallback = index.status === 'ready' && !index.data.complete && query.includes('/') && !query.endsWith('/') && !/[:\\\0]/.test(query)
  return <div className="group-file-finder" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <form className="group-go-to-file" role="search" aria-label="Search repository files" onSubmit={(event) => { event.preventDefault(); enter() }}>
      <label className="group-sr-only" htmlFor={`${listId}-input`}>Search files</label>
      <input ref={input} id={`${listId}-input`} role="combobox" name="fileSearch" autoComplete="off" spellCheck={false} maxLength={1024} placeholder="Go to file…" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? listId : undefined} aria-activedescendant={visible && shown[active] ? `${listId}-${active}` : undefined} aria-describedby={helpId} value={query}
        onFocus={() => { if (query.trim()) setOpen(true) }}
        onChange={(event) => { version.current += 1; setQuery(event.target.value); setSelected(0); setOpen(Boolean(event.target.value.trim())); if (!event.target.value) clear() }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); if (shown.length) setSelected((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length) }
        }} />
      {query && <button type="button" className="group-file-clear" aria-label="Clear search" onClick={clear}>×</button>}
      <span id={helpId} className="group-sr-only">Search filenames or paths. Use Up and Down, Enter to open, Escape to close.</span>
    </form>
    {visible && <div className="group-file-suggestions" aria-label="File suggestions">
      {['idle', 'loading'].includes(index.status) && <p role="status">Finding files…</p>}
      {index.status === 'error' && <div role="alert"><p>{describeApiError(index.error)}</p><button type="button" onClick={load}>Retry search</button></div>}
      <div id={listId} role="listbox" aria-label="Matching files" aria-busy={index.status === 'loading'}>{shown.map((path, position) => <div id={`${listId}-${position}`} key={path} role="option" aria-label={path} aria-selected={position === active} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(path)}><ProjexIcon name={path.endsWith('.java') ? 'java-source' : 'file'} size={18} /><span><strong>{path.split('/').at(-1)}</strong><small>{path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'Repository root'}</small></span></div>)}</div>
      {index.status === 'ready' && !matches.length && <p role="status">{index.data.complete ? 'No matching files.' : 'No matches in searched folders.'}</p>}
      {index.status === 'ready' && (!index.data.complete || matches.length > shown.length) && <p className="group-help">{!index.data.complete ? 'Search limit reached. Browse folders or open an exact path.' : 'Narrow your search for more matches.'}</p>}
      {exactFallback && <button type="button" onClick={() => choose(query.trim())}>Open exact path</button>}
    </div>}
  </div>
}
