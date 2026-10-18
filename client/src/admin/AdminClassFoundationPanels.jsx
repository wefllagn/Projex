import { useCallback, useEffect, useRef, useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import CsvInvitationPanel from '../classes/CsvInvitationPanel.jsx'
import { AdminPanel } from './AdminViews.jsx'
import { adminApi } from './admin-api.js'

export function AdminOfficialMetadataPanel({ classRecord, onSaved, api = adminApi }) {
  return <OfficialMetadataPanel key={`${classRecord.classId}:${classRecord.updatedAt}`} classRecord={classRecord} onSaved={onSaved} api={api} />
}

function OfficialMetadataPanel({ classRecord, onSaved, api }) {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState(classRecord.courseId ?? '')
  const [courseSearch, setCourseSearch] = useState('')
  const [impact, setImpact] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [courseStatus, setCourseStatus] = useState('loading')
  const [impactError, setImpactError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    api.listCourses({ pageSize: 100, ...(courseSearch.trim() ? { search: courseSearch.trim() } : {}) }, { signal: controller.signal })
      .then((result) => { if (active) { setCourses(result.data.items); setCourseStatus('ready'); setError('') } })
      .catch((cause) => { if (active && cause?.name !== 'AbortError') { setCourses([]); setCourseStatus('error'); setError(describeApiError(cause)) } })
    return () => { active = false; controller.abort() }
  }, [api, courseSearch, revision])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    api.getOfficialMetadataImpact(classRecord.classId, { signal: controller.signal }).then((result) => {
      if (result.data?.class?.id !== classRecord.classId || !Number.isFinite(Date.parse(result.data.class.updatedAt)) || !result.data.history) throw new Error('Class history impact did not match this offering. Refresh before correcting metadata.')
      if (Date.parse(result.data.class.updatedAt) !== Date.parse(classRecord.updatedAt)) throw new Error('The Class changed. Refresh the Class record before correcting metadata.')
      if (active) { setImpact(result.data); setImpactError('') }
    }).catch((cause) => { if (active && cause?.name !== 'AbortError') { setImpact(null); setImpactError(describeApiError(cause)) } })
    return () => { active = false; controller.abort() }
  }, [api, classRecord.classId, classRecord.updatedAt, revision])
  const historyPresent = Boolean(impact && Object.values(impact.history).some((count) => count > 0))
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    if (!impact || courseStatus !== 'ready') { setBusy(false); return }
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
    {impact ? <p>Existing records: {Object.entries(impact.history).map(([kind, count]) => `${kind} ${count}`).join(' · ')}</p> : impactError ? <p role="alert" className="class-form-error">{impactError}</p> : <p role="status">Loading history impact…</p>}
    {impactError || courseStatus === 'error' ? <button type="button" className="student-outline-action" onClick={async () => { setImpact(null); setImpactError(''); setCourseStatus('loading'); try { await onSaved(); setRevision((value) => value + 1) } catch (cause) { setImpactError(describeApiError(cause)) } }}>Retry offering context</button> : null}
    <form className="admin-form-grid" onSubmit={save} key={classRecord.updatedAt}>
      <label>Find Course<input maxLength={100} value={courseSearch} onChange={(event) => { setCourseStatus('loading'); setCourseSearch(event.target.value) }} placeholder="Search number or name" /></label>
      <label>Course<select name="courseId" required value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Select Course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseNumber} — {course.courseName}</option>)}</select></label>
      <label>Official Class Code<input name="officialClassCode" required maxLength={100} defaultValue={classRecord.officialClassCode ?? ''} /></label>
      <label>Academic Period<select name="academicPeriod" required defaultValue={classRecord.academicPeriod ?? ''}><option value="">Select period</option><option value="FIRST_SEMESTER">1st Semester</option><option value="SECOND_SEMESTER">2nd Semester</option></select></label>
      <label>School Year<input name="schoolYear" required maxLength={20} defaultValue={classRecord.schoolYear ?? ''} /></label>
      <label>Schedule<input name="schedule" maxLength={200} defaultValue={classRecord.schedule ?? ''} /></label>
      <label>Days<input name="days" maxLength={100} defaultValue={classRecord.days ?? ''} /></label>
      <label>Room<input name="room" maxLength={100} defaultValue={classRecord.room ?? ''} /></label>
      {historyPresent ? <label className="admin-form-span"><input type="checkbox" name="acknowledgeHistory" required /> I reviewed the existing academic history; this is a deliberate official-metadata correction.</label> : null}
      <label className="admin-form-span">Reason<textarea name="reason" required minLength={10} maxLength={500} /></label>
      <button type="submit" className="student-primary-action" disabled={busy || !impact || courseStatus !== 'ready' || !courses.length || classRecord.status === 'ARCHIVED'}>Save official metadata</button>
    </form>
    {error ? <p className="class-form-error" role="alert">{error}</p> : null}
  </AdminPanel>
}

export function AdminTeachingStaffPanel({ classRecord, onSaved, api = adminApi }) {
  return <TeachingStaffPanel key={`${classRecord.classId}:${classRecord.updatedAt}`} classRecord={classRecord} onSaved={onSaved} api={api} />
}

function TeachingStaffPanel({ classRecord, onSaved, api }) {
  const [staff, setStaff] = useState(null)
  const [search, setSearch] = useState('')
  const [instructors, setInstructors] = useState([])
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [staffStatus, setStaffStatus] = useState('loading')
  const [searching, setSearching] = useState(false)
  const searchGeneration = useRef(0)
  useEffect(() => () => { searchGeneration.current += 1 }, [])
  const [revision, setRevision] = useState(0)
  const load = useCallback(({ signal } = {}) => api.listClassStaff(classRecord.classId, { signal }).then((result) => {
    if (!signal?.aborted) { setStaff(result.data); setStaffStatus('ready'); setError('') }
  }).catch((cause) => { if (!signal?.aborted && cause?.name !== 'AbortError') { setStaff(null); setStaffStatus('error'); setError(describeApiError(cause)) } }), [api, classRecord.classId])
  useEffect(() => { const controller = new AbortController(); load({ signal: controller.signal }); return () => controller.abort() }, [load, revision])
  const find = async (event) => {
    event.preventDefault(); setError(''); setSearching(true); setTargetId(''); setInstructors([])
    const generation = ++searchGeneration.current
    try { const result = await api.listUsers({ role: 'INSTRUCTOR', status: 'ACTIVE', search, pageSize: 20 }); if (generation === searchGeneration.current) setInstructors(result.data) }
    catch (cause) { if (generation === searchGeneration.current) setError(describeApiError(cause)) }
    finally { if (generation === searchGeneration.current) setSearching(false) }
  }
  const assign = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    if (staffStatus !== 'ready') { setBusy(false); return }
    const data = new FormData(event.currentTarget)
    try {
      await api.assignPrimary(classRecord.classId, { nextPrimaryId: targetId, formerPrimary: data.get('formerPrimary'), reason: data.get('reason'), expectedUpdatedAt: classRecord.updatedAt })
      setTargetId(''); await onSaved(); await load()
    } catch (cause) { setError(describeApiError(cause)) }
    finally { setBusy(false) }
  }
  return <AdminPanel title="Teaching staff" eyebrow="Current access and recovery">
    {staffStatus === 'ready' ? <p>Primary: {staff?.primary?.fullName ?? 'Unassigned'} · Co-Instructors: {staff?.coInstructors?.map((item) => item.fullName).join(', ') || 'None'}</p> : staffStatus === 'loading' ? <p role="status">Loading teaching staff…</p> : <p>Teaching staff unavailable. No assignment information could be confirmed.</p>}
    {staffStatus === 'error' ? <button type="button" className="student-outline-action" onClick={() => { setStaffStatus('loading'); setRevision((value) => value + 1) }}>Retry teaching staff</button> : null}
    {classRecord.status !== 'ARCHIVED' ? <>
      <form onSubmit={find} className="admin-form-grid"><label>Find ACTIVE Instructor<input maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="submit" className="student-outline-action" disabled={busy || searching}>{searching ? 'Searching…' : 'Search'}</button></form>
      <form onSubmit={assign} className="admin-form-grid">
        <label>Select new Primary<select value={targetId} onChange={(event) => setTargetId(event.target.value)} required><option value="">Select Instructor</option>{instructors.filter((item) => item.id !== staff?.primary?.id).map((item) => <option key={item.id} value={item.id}>{item.fullName} — {item.email}</option>)}</select></label>
        <label>Former Primary access<select name="formerPrimary" required><option value="LEAVE">Leave class</option><option value="CO_INSTRUCTOR">Remain Co-Instructor</option></select></label>
        <label className="admin-form-span">Reason<textarea name="reason" required minLength={10} maxLength={500} /></label>
        <button type="submit" className="student-primary-action" disabled={busy || searching || !targetId || staffStatus !== 'ready'}>Assign Primary</button>
      </form>
    </> : null}
    {error ? <p className="class-form-error" role="alert">{error}</p> : null}
  </AdminPanel>
}

export function AdminStudentInvitationCsvPanel({ classRecord, api = adminApi }) {
  return classRecord.status === 'ACTIVE' ? <CsvInvitationPanel api={api} classId={classRecord.classId} /> : null
}
