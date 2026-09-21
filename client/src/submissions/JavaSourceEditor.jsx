import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { editJavaSelection, MAX_SOURCE_CHARACTERS, readJavaFile } from './java-source-tools.js'
import './java-source-editor.css'

export default function JavaSourceEditor({ value, onChange, entryClassName, editorRef }) {
  const [message, setMessage] = useState('')
  const [reading, setReading] = useState(false)
  const [captureTab, setCaptureTab] = useState(true)
  const gutterRef = useRef(null)
  const guidesRef = useRef(null)
  const selection = useRef(null)
  const generation = useRef(0)
  const currentValue = useRef(value)
  useLayoutEffect(() => { currentValue.current = value }, [value])
  useEffect(() => () => { generation.current++ }, [])
  useLayoutEffect(() => {
    if (selection.current) {
      editorRef.current?.setSelectionRange(selection.current.start, selection.current.end)
      selection.current = null
    }
  }, [value, editorRef])

  const syncScroll = () => {
    const editor = editorRef.current
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-editor.scrollTop}px)`
    if (guidesRef.current) guidesRef.current.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`
  }
  const importFile = async (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const ticket = ++generation.current
    setReading(true)
    setMessage('')
    try {
      const imported = await readJavaFile(files, entryClassName)
      if (ticket !== generation.current) return
      if (currentValue.current.length && !window.confirm('Replace the current Java source with this file? Unsaved editor changes will be lost.')) return
      onChange(imported)
      setMessage('Java file imported. Source stays in this tab until you run or submit.')
    } catch (error) {
      if (ticket === generation.current) setMessage(error.message)
    } finally {
      if (ticket === generation.current) setReading(false)
    }
  }
  const keyDown = (event) => {
    if (event.key === 'Escape') { setCaptureTab(false); return }
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey || (event.key === 'Tab' && !captureTab)) return
    const editor = event.currentTarget
    const edit = editJavaSelection(value, editor.selectionStart, editor.selectionEnd, event.key, event.shiftKey)
    if (!edit) return
    event.preventDefault()
    if (edit.value.length > MAX_SOURCE_CHARACTERS) { setMessage('Source is limited to 100,000 characters.'); return }
    selection.current = edit
    onChange(edit.value)
    if (edit.value === value) { editor.setSelectionRange(edit.start, edit.end); selection.current = null }
  }
  return (
    <div className="java-source-workspace">
      <div className="java-source-toolbar">
        <label>Import .java file<input aria-label="Import Java file" type="file" accept=".java" disabled={reading} onChange={importFile} /></label>
        <small>{entryClassName}.java · UTF-8 · 100,000 characters and 100,000 source bytes maximum</small>
        <small id="java-editor-help">Tab indents; Shift+Tab unindents. Escape then Tab leaves the editor.</small>
        {message && <p role="status">{message}</p>}
      </div>
      <div className="java-source-surface">
        <div className="java-source-gutter" aria-hidden="true"><div ref={gutterRef}>{value.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}</div></div>
        <div className="java-source-input-wrap">
          <div className="java-source-guides" aria-hidden="true"><div ref={guidesRef}>{value.split('\n').map((line, i) => <div key={i}><span style={{ width: `${Math.floor(line.match(/^[\t ]*/)[0].replace(/\t/g, '    ').length / 4) * 4}ch` }} /></div>)}</div></div>
          <textarea ref={editorRef} aria-label="Java source code" aria-describedby="java-editor-help" className="student-code-editor-input java-source-input" spellCheck="false" autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={MAX_SOURCE_CHARACTERS} value={value} onFocus={() => setCaptureTab(true)} onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} onScroll={syncScroll} />
        </div>
      </div>
    </div>
  )
}
