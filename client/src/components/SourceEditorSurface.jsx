import { useLayoutEffect, useRef, useState } from 'react'
import { editSourceSelection } from './source-editing.js'
import '../submissions/java-source-editor.css'

export default function SourceEditorSurface({ value, onChange, editorRef, label = 'Source code', description, maxLength = 65536, disabled = false, onKeyDown, onFocus }) {
  const gutter = useRef(null), guides = useRef(null), selection = useRef(null)
  const [captureTab, setCaptureTab] = useState(true)
  useLayoutEffect(() => { if (selection.current) { editorRef.current?.setSelectionRange(selection.current.start, selection.current.end); selection.current = null } }, [value, editorRef])
  const syncScroll = () => {
    const editor = editorRef.current
    if (gutter.current) gutter.current.style.transform = `translateY(${-editor.scrollTop}px)`
    if (guides.current) guides.current.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`
  }
  const keyDown = event => {
    if (onKeyDown) { onKeyDown(event); return }
    if (event.key === 'Escape') { setCaptureTab(false); return }
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab' && !captureTab) return
    const edit = editSourceSelection(value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd, event.key, event.shiftKey)
    if (!edit) return
    event.preventDefault()
    if (edit.value.length > maxLength) return
    selection.current = edit
    onChange(edit.value)
    if (edit.value === value) { event.currentTarget.setSelectionRange(edit.start, edit.end); selection.current = null }
  }
  return <div className="java-source-surface">
    <div className="java-source-gutter" aria-hidden="true"><div ref={gutter}>{value.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}</div></div>
    <div className="java-source-input-wrap"><div className="java-source-guides" aria-hidden="true"><div ref={guides}>{value.split('\n').map((line,i) => <div key={i}><span style={{ width: `${Math.floor(line.match(/^[\t ]*/)[0].replace(/\t/g,'    ').length / 4) * 4}ch` }} /></div>)}</div></div>
      <textarea ref={editorRef} aria-label={label} aria-describedby={description} className="student-code-editor-input java-source-input" spellCheck="false" autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={maxLength} disabled={disabled} value={value} onFocus={event => { setCaptureTab(true); onFocus?.(event) }} onChange={event => onChange(event.target.value)} onKeyDown={keyDown} onScroll={syncScroll} />
    </div>
  </div>
}
