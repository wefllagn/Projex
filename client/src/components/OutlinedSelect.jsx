import { useEffect, useId, useRef, useState } from 'react'
import ProjexIcon from './icons/ProjexIcon.jsx'

export default function OutlinedSelect({ label, value, options, onChange, disabled = false }) {
  const id = useId()
  const root = useRef(null), trigger = useRef(null), typing = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!open) return undefined
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => { if (open) root.current?.querySelectorAll('[role="option"]')[active]?.scrollIntoView?.({ block: 'nearest' }) }, [open, active])
  const choose = index => { if (options[index]) onChange(options[index].value); setOpen(false); trigger.current?.focus() }
  const keys = event => {
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); setOpen(true)
      setActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : !open ? selected : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(active); else { setActive(selected); setOpen(true) }
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now(), text = (now - typing.current.time < 700 ? typing.current.text : '') + event.key.toLowerCase()
      typing.current = { text, time: now }
      const match = options.findIndex(option => option.label.toLowerCase().startsWith(text))
      if (match >= 0) { event.preventDefault(); setActive(match); setOpen(true) }
    }
  }
  return <div className={`academic-outlined-select${open ? ' is-open' : ''}`} ref={root}>
    <span className="academic-outlined-select-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" role="combobox" aria-labelledby={`${id}-label`} aria-controls={`${id}-options`} aria-expanded={open} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-option-${active}` : undefined} disabled={disabled} onKeyDownCapture={keys} onClick={() => { setActive(selected); setOpen(!open) }}><span>{options[selected]?.label || 'Select'}</span><ProjexIcon name="expand" size={18} /></button>
    {open && <ul role="listbox" aria-labelledby={`${id}-label`} id={`${id}-options`}><>{options.map((option,index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={value === option.value} className={index === active ? 'is-focused' : ''} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>{option.label}{value === option.value && <ProjexIcon name="published" size={16} />}</li>)}</></ul>}
  </div>
}
