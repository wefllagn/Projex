import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { adminApi } from './admin-api.js'
import { AdminDialog, AdminPageHeader, AdminPanel } from './AdminViews.jsx'
import { pageNumber } from './admin-view-utils.js'
import { useAdminFreshness } from './use-admin-freshness.js'
import { AdminPagination, AdminSearch } from './AdminListControls.jsx'

const PAGE_SIZE = 20

export default function AdminCourseCatalog({ api = adminApi }) {
  const [parameters, setParameters] = useSearchParams()
  const page = pageNumber(parameters)
  const search = parameters.get('search') || ''
  const [catalog, setCatalog] = useState({ status: 'loading', items: [], totalItems: 0 })
  const [mode, setMode] = useState(null)
  const [editing, setEditing] = useState(null)
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)
  const [fileError, setFileError] = useState('')
  const fileGeneration = useRef(0)
  useEffect(() => () => { fileGeneration.current += 1 }, [])
  const load = useCallback(({ signal } = {}) => api.listCourses({ page, pageSize: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}) }, { signal })
    .then((result) => { if (!signal?.aborted) setCatalog({ status: 'ready', ...result.data }) })
    .catch((cause) => { if (!signal?.aborted && cause?.name !== 'AbortError') setCatalog({ status: 'error', items: [], totalItems: 0, error: cause }) }), [api, page, search])
  const refresh = useAdminFreshness(load, !!mode || busy)
  const query = (changes) => {
    setCatalog({ status: 'loading', items: [], totalItems: 0 })
    const next = new URLSearchParams(parameters)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    setParameters(next)
  }

  const save = async (event) => {
    event.preventDefault(); setBusy(true); setNotice(''); setError(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const input = { courseNumber: String(data.get('courseNumber')), courseName: String(data.get('courseName')) }
    try {
      if (editing) await api.updateCourse(editing.id, input)
      else await api.createCourse(input)
      setEditing(null); setMode(null); form.reset(); refresh(); setNotice('Course saved.')
    } catch (cause) { setError(cause) }
    finally { setBusy(false) }
  }
  const choose = async (event) => {
    const generation = ++fileGeneration.current
    setPreview(null); setNotice(''); setError(null); setFileError(''); setCsv('')
    const file = event.target.files?.[0]
    if (!file) { setCsv(''); return }
    if (file.size > 262_144) { setFileError('Choose a CSV file of at most 256 KiB.'); return }
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
      setNotice(`${result.imported} Courses imported.`); setPreview(null); setCsv(''); setMode(null); refresh()
    } catch (cause) { setError(cause); setPreview(null) }
    finally { setBusy(false) }
  }
  return <div className="admin-page-stack">
    <AdminPageHeader title="Course Catalog" actions={<><button type="button" className="student-outline-action" disabled={busy} onClick={() => { setMode('import'); setError(null) }}>Import Courses</button><button type="button" className="student-primary-action" disabled={busy} onClick={() => { setEditing(null); setMode('course'); setError(null) }}>Add Course</button></>} />
    {notice ? <p role="status" className="admin-notice">{notice}</p> : null}
    {mode === 'course' ? <AdminDialog title={editing ? 'Edit Course' : 'Add Course'} onSubmit={save} onClose={() => { setMode(null); setEditing(null) }} submitLabel="Save Course" busy={busy}>
      <div key={editing?.id ?? 'new'} className="admin-form-grid">
        <label>Course Number<input name="courseNumber" required maxLength={40} defaultValue={editing?.courseNumber ?? ''} /></label>
        <label>Course Name<input name="courseName" required maxLength={200} defaultValue={editing?.courseName ?? ''} /></label>
      </div>
      {error ? <p role="alert" className="class-form-error">{describeApiError(error)}</p> : null}
    </AdminDialog> : null}
    {mode === 'import' ? <AdminDialog title="Import Courses" onClose={() => { fileGeneration.current += 1; setMode(null); setCsv(''); setPreview(null); setFileError('') }} onSubmit={(event) => { event.preventDefault(); if (preview) confirm(); else inspect() }} submitLabel={preview ? 'Confirm import' : 'Preview import'} submitDisabled={preview ? !preview.valid : !csv} busy={busy}>
      <p>Choose a CSV with columns <code>courseNumber,courseName</code>. Review it before importing.</p>
      <input type="file" accept=".csv,text/csv" aria-label="Course CSV" aria-invalid={!!fileError} aria-describedby={fileError ? 'admin-course-file-error' : undefined} onChange={choose} disabled={busy} />
      {fileError ? <p id="admin-course-file-error" className="class-form-error" role="alert">{fileError}</p> : null}
      {preview ? <div><p>{preview.count} rows · {preview.valid ? 'Ready to confirm' : 'Resolve errors before confirming'}</p><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Row</th><th>Number</th><th>Name</th><th>Validation</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.courseNumber}</td><td>{row.courseName}</td><td>{row.reason ?? 'Ready'}</td></tr>)}</tbody></table></div></div> : null}
      {error ? <p role="alert" className="class-form-error">{describeApiError(error)}</p> : null}
    </AdminDialog> : null}
    <AdminPanel>
      <div className="admin-filter-bar admin-filter-bar--search-only">
        <AdminSearch label="Find Course" initialValue={search} onSearch={(search) => query({ search, page: 1 })} maxLength={100} placeholder="Search number or name" />
      </div>
      {catalog.status === 'loading' ? <RequestState kind="loading" compact message="Loading Course catalog." /> : null}
      {catalog.status === 'error' ? <RequestState error={catalog.error} compact action={<button type="button" onClick={refresh}>Retry Course catalog</button>} /> : null}
      {catalog.status === 'ready' && !catalog.items.length ? <p>{search ? 'No Courses match this search.' : 'No Courses on this page.'}</p> : null}
      {catalog.status === 'ready' && catalog.items.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Course Number</th><th>Course Name</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{catalog.items.map((course) => <tr key={course.id}><td>{course.courseNumber}</td><td>{course.courseName}</td><td><button type="button" className="student-outline-action" disabled={busy} aria-label={`Edit ${course.courseNumber}`} onClick={() => { setEditing(course); setMode('course'); setError(null) }}>Edit</button></td></tr>)}</tbody></table></div> : null}
      {catalog.status === 'ready' ? <AdminPagination noun="Courses" pagination={{ totalItems: catalog.totalItems, totalPages: Math.ceil(catalog.totalItems / PAGE_SIZE), hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < catalog.totalItems }} page={page} onPage={(page) => query({ page })} /> : null}
    </AdminPanel>
  </div>
}
