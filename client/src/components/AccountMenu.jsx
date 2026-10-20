import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.js'
import { describeApiError } from '../api/api-client.js'
import ProjexIcon from './icons/ProjexIcon.jsx'

export default function AccountMenu({ expanded, onExpandedChange }) {
  const auth = useAuth(), navigate = useNavigate()
  const [localOpen, setLocalOpen] = useState(false)
  const open = expanded ?? localOpen
  const setOpen = useCallback(value => { if (onExpandedChange) onExpandedChange(value); else setLocalOpen(value) }, [onExpandedChange])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const menu = useRef(null), trigger = useRef(null)
  const role = auth.user.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'
  useEffect(() => {
    if (!open) return undefined
    const key = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    const outside = event => { if (!menu.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside) }
  }, [open, setOpen])
  const signOut = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { await auth.logout(); navigate('/', { replace: true }) }
    catch (cause) { setError(describeApiError(cause)); setBusy(false) }
  }
  return <div className="student-profile-menu" ref={menu}>
    <button ref={trigger} type="button" className="student-profile-trigger" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="student-user-avatar" aria-hidden="true" />
      <span className="student-user-name"><strong>{auth.user.fullName}</strong><span>{role}</span></span>
      <ProjexIcon name="expand" size={16} />
    </button>
    {open && <section className="student-profile-dropdown academic-account-menu academic-account-reference" aria-label="Account">
      <button type="button" className="academic-account-close" aria-label="Close account menu" onClick={() => { setOpen(false); trigger.current?.focus() }}><ProjexIcon name="close" /></button>
      <strong className="academic-account-email">{auth.user.email}</strong>
      <span className="academic-account-organization">Managed by slu.edu.ph</span>
      <div className="student-profile-photo" aria-hidden="true"><span className="student-user-avatar" /></div>
      <h2>Hi, {auth.user.fullName.toUpperCase()}!</h2>
      <button type="button" className="student-manage-account" disabled title="Account management is not available yet.">Manage your Projex account</button>
      <div className="student-profile-menu-list">
        <button type="button" className="academic-account-signout" disabled={busy} onClick={signOut}><ProjexIcon name="signout" />{busy ? 'Signing out…' : 'Sign out'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>}
  </div>
}
