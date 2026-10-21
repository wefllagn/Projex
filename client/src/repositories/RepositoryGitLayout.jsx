import { NavLink } from 'react-router-dom'
import { ProjexIcon } from '../design/ProjexIcon.jsx'

export function RepositoryGitTabs({ tabs, tab, onChange, label }) {
  return <div className="group-tabs" role="tablist" aria-label={label} onKeyDown={(event) => {
    const buttons = [...event.currentTarget.querySelectorAll('[role=tab]')]
    const index = buttons.indexOf(event.target)
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next].focus(); buttons[next].click()
  }}>{tabs.map((id) => <button type="button" role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} onClick={() => onChange(id)}><ProjexIcon name={id === 'commits' ? 'commit' : id === 'branches' ? 'branch' : id} size={16} /> {id[0].toUpperCase() + id.slice(1)}</button>)}</div>
}
export function RepositoryBranchSelector({ branches, value, defaultBranch, onChange }) {
  return <label className="group-branch-select"><ProjexIcon name="branch" size={16} /><select aria-label="Branch" disabled={!branches.length} value={branches.length ? value : ''} onChange={(event) => onChange(event.target.value)}>{branches.length > 0 && !branches.some((item) => item.branchName === value) && <option value="" disabled>Choose branch</option>}{branches.length ? branches.map((item) => <option key={item.branchName} value={item.branchName}>{item.branchName}</option>) : <option value="">{defaultBranch} · no commits</option>}</select></label>
}
export function RepositoryEmptyState({ idePath, group = false, owner = false }) {
  return <section className="repository-empty-guidance"><h2>No commits yet</h2><p>{idePath ? 'Save code from the IDE or push from a local Git client.' : group && !owner ? 'Your Maintainer can add the first project files using Code above.' : 'Push your first files from a local Git client. Access and commands are available in Code.'}</p>{idePath && <NavLink className="student-primary-action" to={idePath}>Open IDE</NavLink>}</section>
}
