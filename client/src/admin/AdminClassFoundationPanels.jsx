import { useCallback, useEffect, useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import CsvInvitationPanel from '../classes/CsvInvitationPanel.jsx'
import { AdminPanel } from './AdminViews.jsx'
import { adminApi } from './admin-api.js'

export function AdminOfficialMetadataPanel({ classRecord, onSaved, api = adminApi }) {
  const [courses, setCourses] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [impact, setImpact] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.listCourses({ pageSize: 100, ...(courseSearch.trim() ? { search: courseSearch.trim() } : {}) }).then((result) => setCourses(result.data.items)).catch((cause) => setError(describeApiError(cause)))
    api.getOfficialMetadataImpact(classRecord.classId).then((result) => setImpact(result.data)).catch((cause) => setError(describeApiError(cause)))
  }, [api, classRecord.classId, classRecord.updatedAt, courseSearch])
  const historyPresent = Boolean(impact && Object.values(impact.history).some((count) => count > 0))
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      await api.correctOfficialMetadata(classRecord.classId, {
        courseId: data.get('courseId'), officialClassCode: data.get('officialClassCode'), academicPeriod: data.get('academicPeriod'), schoolYear: data.get('schoolYear'),
        schedule: data.get('schedule') || null, days: data.get('days') || null, room: data.get('room') || null,
        expectedUpdatedAt: impact.class.updatedAt, acknowledgeHistory: data.get('acknowledgeHistory') === 'on', reason: data.get('reason'),
      })
      await onSaved()
    } catch (cause) { setError(describeApiError(cause)) }
    finally { setBusy(false) }
  }
  return <AdminPanel title={classRecord.officialClassCode ? 'Correct official offering metadata' : 'Verify as official offering'} eyebrow="Admin-only audited correction">
    <p>The same Class ID and all existing academic records remain. Review the history impact before confirming.</p>
    {impact ? <p>Existing records: {Object.entries(impact.history).map(([kind, count]) => `${kind} ${count}`).join(' · ')}</p> : <p>Loading history impact…</p>}
    <form className="admin-form-grid" onSubmit={save} key={classRecord.updatedAt}>
      <label>Find Course<input value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="Search number or name" /></label>
      <label>Course<select name="courseId" required defaultValue={classRecord.courseId ?? ''}><option value="">Select Course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseNumber} — {course.courseName}</option>)}</select></label>
      <label>Official Class Code<input name="officialClassCode" required maxLength={100} defaultValue={classRecord.officialClassCode ?? ''} /></label>
      <label>Academic Period<select name="academicPeriod" required defaultValue={classRecord.academicPeriod ?? ''}><option value="">Select period</option><option value="FIRST_SEMESTER">1st Semester</option><option value="SECOND_SEMESTER">2nd Semester</option></select></label>
      <label>School Year<input name="schoolYear" required maxLength={20} defaultValue={classRecord.schoolYear ?? ''} /></label>
      <label>Schedule<input name="schedule" maxLength={200} defaultValue={classRecord.schedule ?? ''} /></label>
      <label>Days<input name="days" maxLength={100} defaultValue={classRecord.days ?? ''} /></label>
      <label>Room<input name="room" maxLength={100} defaultValue={classRecord.room ?? ''} /></label>
      {historyPresent ? <label className="admin-form-span"><input type="checkbox" name="acknowledgeHistory" required /> I reviewed the existing academic history; this is a deliberate official-metadata correction.</label> : null}
      <label className="admin-form-span">Reason<textarea name="reason" required minLength={10} maxLength={500} /></label>
      <button type="submit" className="student-primary-action" disabled={busy || !impact || !courses.length}>Save official metadata</button>
    </form>
    {error ? <p className="class-form-error" role="alert">{error}</p> : null}
  </AdminPanel>
}

export function AdminTeachingStaffPanel({ classRecord, onSaved, api = adminApi }) {
  const [staff, setStaff] = useState(null)
  const [search, setSearch] = useState('')
  const [instructors, setInstructors] = useState([])
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => api.listClassStaff(classRecord.classId).then((result) => setStaff(result.data)).catch((cause) => setError(describeApiError(cause))), [api, classRecord.classId])
  useEffect(() => { load() }, [load, classRecord.updatedAt])
  const find = async (event) => {
    event.preventDefault(); setError('')
    try { setInstructors((await api.listUsers({ role: 'INSTRUCTOR', status: 'ACTIVE', search, pageSize: 20 })).data) }
    catch (cause) { setError(describeApiError(cause)) }
  }
  const assign = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      await api.assignPrimary(classRecord.classId, { nextPrimaryId: targetId, formerPrimary: data.get('formerPrimary'), reason: data.get('reason'), expectedUpdatedAt: classRecord.updatedAt })
      setTargetId(''); await onSaved(); await load()
    } catch (cause) { setError(describeApiError(cause)) }
    finally { setBusy(false) }
  }
  return <AdminPanel title="Teaching staff" eyebrow="Current access and recovery">
    <p>Primary: {staff?.primary?.fullName ?? 'Unassigned'} · Co-Instructors: {staff?.coInstructors?.map((item) => item.fullName).join(', ') || 'None'}</p>
    {classRecord.status !== 'ARCHIVED' ? <>
      <form onSubmit={find} className="admin-form-grid"><label>Find ACTIVE Instructor<input value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="submit" className="student-outline-action">Search</button></form>
      <form onSubmit={assign} className="admin-form-grid">
        <label>Select new Primary<select value={targetId} onChange={(event) => setTargetId(event.target.value)} required><option value="">Select Instructor</option>{instructors.filter((item) => item.id !== staff?.primary?.id).map((item) => <option key={item.id} value={item.id}>{item.fullName} — {item.email}</option>)}</select></label>
        <label>Former Primary access<select name="formerPrimary" required><option value="LEAVE">Leave class</option><option value="CO_INSTRUCTOR">Remain Co-Instructor</option></select></label>
        <label className="admin-form-span">Reason<textarea name="reason" required minLength={10} maxLength={500} /></label>
        <button type="submit" className="student-primary-action" disabled={busy || !targetId}>Assign Primary</button>
      </form>
    </> : null}
    {error ? <p className="class-form-error" role="alert">{error}</p> : null}
  </AdminPanel>
}

export function AdminStudentInvitationCsvPanel({ classRecord, api = adminApi }) {
  return classRecord.status === 'ACTIVE' ? <CsvInvitationPanel api={api} classId={classRecord.classId} /> : null
}
