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
  const { api, refreshClasses } = useClasses()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [email, setEmail] = useState('')
  const [nextPrimaryId, setNextPrimaryId] = useState('')
  const [formerPrimary, setFormerPrimary] = useState('CO_INSTRUCTOR')
  const [notice, setNotice] = useState('')
  const primary = classRecord.instructor?.userId === user.id
  const load = useCallback(() => api.listClassStaff(classRecord.id).then((result) => setStaff(result.data)).catch((cause) => setNotice(describeApiError(cause))), [api, classRecord.id])
  useEffect(() => { load() }, [load])
  const action = async (operation, success) => {
    setNotice('')
    try { await operation(); await Promise.all([load(), refreshClasses()]); setNotice(success) }
    catch (cause) { setNotice(describeApiError(cause)) }
  }
  const exitClass = async (operation) => {
    setNotice('')
    try {
      await operation()
      navigate('/instructor/classes', { replace: true })
      await refreshClasses()
    } catch (cause) { setNotice(describeApiError(cause)) }
  }
  return <section className="student-people-panel class-staff-panel">
    <h2>Teaching staff</h2>
    <p>Primary: {staff?.primary?.fullName ?? 'Not assigned'}</p>
    <ul>{staff?.coInstructors.map((member) => <li key={member.userId}>{member.fullName}{primary ? <button type="button" className="student-outline-action" onClick={() => action(() => api.removeCoInstructor(classRecord.id, member.userId), 'Co-Instructor removed.')}>Remove</button> : null}</li>)}</ul>
    {primary && classRecord.status === 'ACTIVE' ? <>
      <form onSubmit={(event) => { event.preventDefault(); action(() => api.inviteCoInstructor(classRecord.id, email), 'Invitation sent. The Co-Instructor must accept it before receiving access.'); setEmail('') }}>
        <label>Invite registered Instructor by university email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <button type="submit" className="student-outline-action">Invite Co-Instructor</button>
      </form>
      {staff?.coInstructors.length ? <div className="instructor-form-grid">
        <label>New Primary<select value={nextPrimaryId} onChange={(event) => setNextPrimaryId(event.target.value)}><option value="">Select active Co-Instructor</option>{staff.coInstructors.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>
        <label>Former Primary access<select value={formerPrimary} onChange={(event) => setFormerPrimary(event.target.value)}><option value="CO_INSTRUCTOR">Remain as active Co-Instructor</option><option value="LEAVE">Leave class</option></select></label>
        <button type="button" className="student-primary-action" disabled={!nextPrimaryId} onClick={() => { if (window.confirm('Transfer Primary Instructor?')) { const operation = () => api.transferPrimary(classRecord.id, nextPrimaryId, formerPrimary); if (formerPrimary === 'LEAVE') exitClass(operation); else action(operation, 'Primary Instructor transferred.') } }}>Transfer Primary</button>
      </div> : null}
    </> : null}
    {!primary && classRecord.status === 'ACTIVE' ? <button type="button" className="student-outline-action" onClick={() => { if (window.confirm('Leave this class as Co-Instructor?')) exitClass(() => api.leaveClassStaff(classRecord.id)) }}>Leave class</button> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>
}
