import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { adminApi } from './admin-api.js'
import { AdminPageHeader, AdminPanel } from './AdminViews.jsx'

export default function AdminCourseCatalog({ api = adminApi }) {
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    try { setCourses((await api.listCourses({ pageSize: 100, ...(search.trim() ? { search: search.trim() } : {}) })).data.items) }
    catch (error) { setNotice(describeApiError(error)) }
  }, [api, search])
  useEffect(() => {
    let active = true
    api.listCourses({ pageSize: 100, ...(search.trim() ? { search: search.trim() } : {}) })
      .then((result) => { if (active) setCourses(result.data.items) })
      .catch((error) => { if (active) setNotice(describeApiError(error)) })
    return () => { active = false }
  }, [api, search])

  const save = async (event) => {
    event.preventDefault(); setBusy(true); setNotice('')
    const form = event.currentTarget
    const data = new FormData(form)
    const input = { courseNumber: String(data.get('courseNumber')), courseName: String(data.get('courseName')) }
    try {
      if (editing) await api.updateCourse(editing.id, input)
      else await api.createCourse(input)
      setEditing(null); form.reset(); await load(); setNotice('Course saved.')
    } catch (error) { setNotice(describeApiError(error)) }
    finally { setBusy(false) }
  }
  const choose = async (event) => {
    setPreview(null); setNotice('')
    const file = event.target.files?.[0]
    if (!file) { setCsv(''); return }
    if (file.size > 262_144) { setCsv(''); setNotice('CSV must be at most 256 KiB.'); return }
    setCsv(await file.text())
  }
  const inspect = async () => {
    setBusy(true); setNotice(''); setPreview(null)
    try { setPreview((await api.previewCourseCsv(csv)).data) }
    catch (error) { setNotice(describeApiError(error)) }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    setBusy(true); setNotice('')
    try {
      const result = (await api.confirmCourseCsv(csv, preview.fingerprint)).data
      setNotice(`${result.imported} Courses imported.`); setPreview(null); setCsv(''); await load()
    } catch (error) { setNotice(describeApiError(error)); setPreview(null) }
    finally { setBusy(false) }
  }
  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Academic foundation" title="Course Catalog" summary="Reusable Course Number and Course Name. Offerings belong to Classes, not to a fixed semester." actions={<Link className="student-outline-action" to="/admin/academic">Back to academic administration</Link>} />
    {notice ? <p role="status" className="admin-notice">{notice}</p> : null}
    <AdminPanel title={editing ? 'Edit Course' : 'Create Course'}>
      <form key={editing?.id ?? 'new'} className="admin-form-grid" onSubmit={save}>
        <label>Course Number<input name="courseNumber" required maxLength={40} defaultValue={editing?.courseNumber ?? ''} /></label>
        <label>Course Name<input name="courseName" required maxLength={200} defaultValue={editing?.courseName ?? ''} /></label>
        <div className="admin-form-span admin-dialog__actions"><button type="submit" className="student-primary-action" disabled={busy}>Save Course</button>{editing ? <button type="button" className="student-outline-action" onClick={() => setEditing(null)}>Cancel edit</button> : null}</div>
      </form>
    </AdminPanel>
    <AdminPanel title="Import Courses" eyebrow="Preview makes no writes">
      <p>CSV header: <code>courseNumber,courseName</code>. Confirmation revalidates and imports the entire valid file atomically.</p>
      <input type="file" accept=".csv,text/csv" aria-label="Course CSV" onChange={choose} disabled={busy} />
      <button type="button" className="student-outline-action" onClick={inspect} disabled={!csv || busy}>Preview import</button>
      {preview ? <div><p>{preview.count} rows · {preview.valid ? 'Ready to confirm' : 'Resolve errors before confirming'}</p><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Row</th><th>Number</th><th>Name</th><th>Validation</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.courseNumber}</td><td>{row.courseName}</td><td>{row.reason ?? 'Ready'}</td></tr>)}</tbody></table></div><button type="button" className="student-primary-action" onClick={confirm} disabled={!preview.valid || busy}>Confirm import</button></div> : null}
    </AdminPanel>
    <AdminPanel title="Available Courses">
      <label>Find Course<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search number or name" /></label>
      {courses.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Course Number</th><th>Course Name</th><th /></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td>{course.courseNumber}</td><td>{course.courseName}</td><td><button type="button" className="student-outline-action" onClick={() => setEditing(course)}>Edit</button></td></tr>)}</tbody></table></div> : <p>No Courses are in the catalog yet.</p>}
    </AdminPanel>
  </div>
}
