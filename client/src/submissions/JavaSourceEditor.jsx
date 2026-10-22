import SourceEditorSurface from '../components/SourceEditorSurface.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { editJavaSelection, MAX_SOURCE_CHARACTERS, readJavaFile } from './java-source-tools.js'
import './java-source-editor.css'

export default function JavaSourceEditor({ value, onChange, entryClassName, editorRef }) {
  const [confirm, confirmation] = useConfirmation()
  const [message, setMessage] = useState('')
  const [reading, setReading] = useState(false)
  const [captureTab, setCaptureTab] = useState(true)
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
      if (currentValue.current.length && !await confirm('Replace the current Java source with this file? Unsaved editor changes will be lost.', 'Replace Java source?')) return
      if (ticket !== generation.current) return
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
        <label className="academic-import-file"><ProjexIcon name="upload" size={18} />Import .java<input aria-label="Import Java file" type="file" accept=".java" disabled={reading} onChange={importFile} /></label>
        <small>{entryClassName}.java · UTF-8</small>
        <details className="academic-editor-help"><summary>Editor help</summary><small id="java-editor-help">Tab indents; Shift+Tab unindents. Escape then Tab leaves the editor. Maximum 100,000 characters and 100,000 UTF-8 bytes.</small></details>
        {message && <p role="status">{message}</p>}
      </div>
      <SourceEditorSurface value={value} onChange={onChange} editorRef={editorRef} label="Java source code" description="java-editor-help" maxLength={MAX_SOURCE_CHARACTERS} onFocus={() => setCaptureTab(true)} onKeyDown={keyDown} />
      {confirmation}
    </div>
  )
}
