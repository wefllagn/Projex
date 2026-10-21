import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from './class-context.js'

export function StaffInvitationsPanel() {
  const { api, refreshClasses } = useClasses()
  const [invitations, setInvitations] = useState([])
  const [error, setError] = useState('')
  const load = useCallback(() => api.listStaffInvitations().then((result) => setInvitations(result.data)).catch((cause) => setError(describeApiError(cause))), [api])
  useEffect(() => { load() }, [load])
  const accept = async (classId) => {
    setError('')
    try { await api.acceptStaffInvitation(classId); await Promise.all([load(), refreshClasses()]) }
    catch (cause) { setError(describeApiError(cause)) }
  }
  if (!invitations.length && !error) return null
  return <section className="student-global-panel class-staff-panel">
    <h2>Co-Instructor invitations</h2>
    {invitations.map((item) => <div key={item.id} className="admin-action-row"><span>{item.class.className} · invited by {item.class.instructor?.fullName ?? 'Admin'}</span><button type="button" className="student-primary-action" onClick={() => accept(item.classId)}>Accept invitation</button></div>)}
    {error ? <p role="alert">{error}</p> : null}
  </section>
}

export function ClassStaffPanel({ classRecord }) {
  const [confirm, confirmation] = useConfirmation()
  const { api, refreshClasses } = useClasses()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [nextPrimaryId, setNextPrimaryId] = useState('')
  const [formerPrimary, setFormerPrimary] = useState('CO_INSTRUCTOR')
  const [notice, setNotice] = useState('')
  const primary = classRecord.instructor?.userId === user.id
  const load = useCallback(() => api.listClassStaff(classRecord.id).then((result) => setStaff(result.data)).catch((cause) => setNotice(describeApiError(cause))), [api, classRecord.id])
  useEffect(() => { load() }, [load])
  const action = async (operation, success) => {
    if (busy) return false
    setBusy(true); setNotice('')
    try { await operation(); await Promise.all([load(), refreshClasses()]); setNotice(success); return true }
    catch (cause) { setNotice(describeApiError(cause)); return false }
    finally { setBusy(false) }
  }
  const exitClass = async (operation) => {
    setNotice('')
    try {
      await operation()
      navigate('/instructor/classes', { replace: true })
      await refreshClasses()
    } catch (cause) { setNotice(describeApiError(cause)) }
  }
  const primaryName = staff?.primary?.fullName ?? classRecord.instructor?.fullName ?? 'Not assigned'
  return <section className="student-people-panel class-staff-panel">
    {confirmation}
    <div className="academic-class-info-heading"><h2>Teaching staff</h2></div>
    <div className="academic-staff-person"><span className="academic-person-avatar" aria-hidden="true">{primaryName.split(' ').map(part => part.charAt(0)).join('').slice(0, 2)}</span><div><small>Primary Instructor</small><strong>{primaryName}</strong></div></div>
    {primary && classRecord.status === 'ACTIVE' && <button type="button" className="student-outline-action academic-staff-invite-action" onClick={() => { setNotice(''); setInviting(true) }}><ProjexIcon name="people" />Invite Co-Instructor</button>}
    <ul>{staff?.coInstructors.map((member) => <li key={member.userId}>{member.fullName}{primary ? <button type="button" className="student-outline-action" onClick={() => action(() => api.removeCoInstructor(classRecord.id, member.userId), 'Co-Instructor removed.')}>Remove</button> : null}</li>)}</ul>
    {primary && classRecord.status === 'ACTIVE' ? <>
      {inviting && <AppDialog title="Invite Co-Instructor" busy={busy} onClose={() => { setNotice(''); setInviting(false) }}><form className="academic-staff-invite-form" noValidate onSubmit={async event => { event.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setNotice('Enter a valid university email.'); return } if (await action(() => api.inviteCoInstructor(classRecord.id, email.trim()), 'Invitation sent. Access begins after acceptance.')) { setEmail(''); setInviting(false) } }}>
        <label>Co-Instructor email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {notice && <p role="alert">{notice}</p>}<footer><button type="button" className="student-outline-action" disabled={busy} onClick={() => { setNotice(''); setInviting(false) }}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button></footer>
      </form></AppDialog>}
      {staff?.coInstructors.length ? <details className="academic-class-settings"><summary>Change teaching ownership</summary><div className="instructor-form-grid">
        <label>New Primary Instructor<select value={nextPrimaryId} onChange={(event) => setNextPrimaryId(event.target.value)}><option value="">Select active Co-Instructor</option>{staff.coInstructors.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>
        <label>Your role after transfer<select value={formerPrimary} onChange={(event) => setFormerPrimary(event.target.value)}><option value="CO_INSTRUCTOR">Stay as Co-Instructor</option><option value="LEAVE">Leave class</option></select></label>
        <button type="button" className="student-primary-action" disabled={!nextPrimaryId} onClick={async () => { if (await confirm('Transfer Primary Instructor?', 'Transfer Primary Instructor')) { const operation = () => api.transferPrimary(classRecord.id, nextPrimaryId, formerPrimary); if (formerPrimary === 'LEAVE') exitClass(operation); else action(operation, 'Primary Instructor transferred.') } }}>Transfer Primary</button>
      </div></details> : null}
    </> : null}
    {!primary && classRecord.status === 'ACTIVE' ? <button type="button" className="student-outline-action" onClick={async () => { if (await confirm('Leave this class as Co-Instructor?', 'Leave class')) exitClass(() => api.leaveClassStaff(classRecord.id)) }}>Leave class</button> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>
}
