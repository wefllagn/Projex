import { useId, useState } from 'react'

export default function SubmissionSections({ sections, label = 'Submission sections' }) {
  const prefix = useId()
  const [selected, setSelected] = useState(sections[0].id)
  const active = sections.some(section => section.id === selected) ? selected : sections[0].id
  const keyboard = event => {
    const tabs = [...event.currentTarget.querySelectorAll('[role=tab]')]
    const index = tabs.indexOf(event.target)
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (next !== null) { event.preventDefault(); tabs[next].focus(); tabs[next].click() }
  }
  return <>
    <div className="activity-settings-tabs academic-record-tabs" role="tablist" aria-label={label} onKeyDown={keyboard}>{sections.map(section => <button key={section.id} id={`${prefix}-tab-${section.id}`} type="button" role="tab" aria-selected={active === section.id} aria-controls={`${prefix}-panel-${section.id}`} tabIndex={active === section.id ? 0 : -1} onClick={() => setSelected(section.id)}>{section.label}</button>)}</div>
    {sections.map(section => <section key={section.id} id={`${prefix}-panel-${section.id}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${section.id}`} tabIndex={0} hidden={active !== section.id}>{section.content}</section>)}
  </>
}
