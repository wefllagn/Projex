import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { adminApi } from './admin-api.js'
import { AdminPageHeader, AdminPanel } from './AdminViews.jsx'
import { pageNumber } from './admin-view-utils.js'

const PAGE_SIZE = 20

export default function AdminCourseCatalog({ api = adminApi }) {
  const [parameters, setParameters] = useSearchParams()
  const page = pageNumber(parameters)
  const search = parameters.get('search') || ''
  const [catalog, setCatalog] = useState({ status: 'loading', items: [], totalItems: 0 })
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState(null)
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)
  const fileGeneration = useRef(0)
  useEffect(() => () => { fileGeneration.current += 1 }, [])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    api.listCourses({ page, pageSize: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}) }, { signal: controller.signal })
      .then((result) => { if (active) setCatalog({ status: 'ready', ...result.data }) })
      .catch((cause) => { if (active && cause?.name !== 'AbortError') setCatalog({ status: 'error', items: [], totalItems: 0, error: cause }) })
    return () => { active = false; controller.abort() }
  }, [api, search, page, revision])
  const refresh = () => { setCatalog({ status: 'loading', items: [], totalItems: 0 }); setRevision((value) => value + 1) }
  const query = (changes) => {
    setCatalog({ status: 'loading', items: [], totalItems: 0 })
    const next = new URLSearchParams(parameters)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    setParameters(next)
    setRevision((value) => value + 1)
  }

  const save = async (event) => {
    event.preventDefault(); setBusy(true); setNotice(''); setError(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const input = { courseNumber: String(data.get('courseNumber')), courseName: String(data.get('courseName')) }
    try {
      if (editing) await api.updateCourse(editing.id, input)
      else await api.createCourse(input)
      setEditing(null); form.reset(); refresh(); setNotice('Course saved.')
    } catch (cause) { setError(cause) }
    finally { setBusy(false) }
  }
  const choose = async (event) => {
    const generation = ++fileGeneration.current
    setPreview(null); setNotice(''); setError(null); setCsv('')
    const file = event.target.files?.[0]
    if (!file) { setCsv(''); return }
    if (file.size > 262_144) { setCsv(''); setNotice('CSV must be at most 256 KiB.'); return }
    try {
      const contents = await file.text()
      if (generation === fileGeneration.current) setCsv(contents)
    } catch (cause) { if (generation === fileGeneration.current) setError(cause) }
  }
  const inspect = async () => {
    setBusy(true); setNotice(''); setError(null); setPreview(null)
    try { setPreview((await api.previewCourseCsv(csv)).data) }
    catch (cause) { setError(cause) }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    setBusy(true); setNotice(''); setError(null)
    try {
      const result = (await api.confirmCourseCsv(csv, preview.fingerprint)).data
      setNotice(`${result.imported} Courses imported.`); setPreview(null); setCsv(''); refresh()
    } catch (cause) { setError(cause); setPreview(null) }
    finally { setBusy(false) }
  }
  return <div className="admin-page-stack">
    <AdminPageHeader eyebrow="Academic foundation" title="Course Catalog" summary="Reusable Course Number and Course Name. Offerings belong to Classes, not to a fixed semester." actions={<Link className="student-outline-action" to="/admin/academic">Back to academic administration</Link>} />
    {notice ? <p role="status" className="admin-notice">{notice}</p> : null}
    {error ? <p role="alert" className="class-form-error">{describeApiError(error)}</p> : null}
    <AdminPanel title={editing ? 'Edit Course' : 'Create Course'}>
      <form key={editing?.id ?? 'new'} className="admin-form-grid" onSubmit={save}>
        <label>Course Number<input name="courseNumber" required maxLength={40} defaultValue={editing?.courseNumber ?? ''} /></label>
        <label>Course Name<input name="courseName" required maxLength={200} defaultValue={editing?.courseName ?? ''} /></label>
        <div className="admin-form-span admin-dialog__actions"><button type="submit" className="student-primary-action" disabled={busy}>Save Course</button>{editing ? <button type="button" className="student-outline-action" disabled={busy} onClick={() => setEditing(null)}>Cancel edit</button> : null}</div>
      </form>
    </AdminPanel>
    <AdminPanel title="Import Courses" eyebrow="Preview makes no writes">
      <p>CSV header: <code>courseNumber,courseName</code>. Confirmation revalidates and imports the entire valid file atomically.</p>
      <input type="file" accept=".csv,text/csv" aria-label="Course CSV" onChange={choose} disabled={busy} />
      <button type="button" className="student-outline-action" onClick={inspect} disabled={!csv || busy}>Preview import</button>
      {preview ? <div><p>{preview.count} rows · {preview.valid ? 'Ready to confirm' : 'Resolve errors before confirming'}</p><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Row</th><th>Number</th><th>Name</th><th>Validation</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.courseNumber}</td><td>{row.courseName}</td><td>{row.reason ?? 'Ready'}</td></tr>)}</tbody></table></div><button type="button" className="student-primary-action" onClick={confirm} disabled={!preview.valid || busy}>Confirm import</button></div> : null}
    </AdminPanel>
    <AdminPanel title="Available Courses">
      <form className="admin-filter-bar" onSubmit={(event) => { event.preventDefault(); query({ search: new FormData(event.currentTarget).get('search').trim(), page: 1 }) }} key={search}>
        <label>Find Course<input name="search" maxLength={100} defaultValue={search} placeholder="Search number or name" /></label><button type="submit" className="student-outline-action">Search Courses</button>
      </form>
      {catalog.status === 'loading' ? <RequestState kind="loading" compact message="Loading Course catalog." /> : null}
      {catalog.status === 'error' ? <RequestState error={catalog.error} compact action={<button type="button" onClick={refresh}>Retry Course catalog</button>} /> : null}
      {catalog.status === 'ready' && !catalog.items.length ? <p>{search ? 'No Courses match this search.' : 'No Courses on this page.'}</p> : null}
      {catalog.status === 'ready' && catalog.items.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Course Number</th><th>Course Name</th><th /></tr></thead><tbody>{catalog.items.map((course) => <tr key={course.id}><td>{course.courseNumber}</td><td>{course.courseName}</td><td><button type="button" className="student-outline-action" disabled={busy} aria-label={`Edit ${course.courseNumber}`} onClick={() => setEditing(course)}>Edit</button></td></tr>)}</tbody></table></div> : null}
      {catalog.status === 'ready' && (catalog.totalItems > 0 || page > 1) ? <nav className="admin-pagination" aria-label="Course pages"><span>Page {page} of {Math.max(1, Math.ceil(catalog.totalItems / PAGE_SIZE))} · {catalog.totalItems} Courses</span><div><button type="button" className="student-outline-action" disabled={page <= 1} onClick={() => query({ page: page - 1 })}>Previous</button><button type="button" className="student-outline-action" disabled={page * PAGE_SIZE >= catalog.totalItems} onClick={() => query({ page: page + 1 })}>Next</button></div></nav> : null}
    </AdminPanel>
  </div>
}
