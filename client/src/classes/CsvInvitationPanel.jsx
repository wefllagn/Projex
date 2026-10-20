import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { useRef, useState } from 'react'
import { describeApiError } from '../api/api-client.js'

export default function CsvInvitationPanel({ api, classId }) {
  const [open, setOpen] = useState(false)
  const [filename, setFilename] = useState('')
  const sequence = useRef(0)
  const mutationLock = useRef(false)
  const fileInput = useRef(null)
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const choose = async (event) => {
    const request = ++sequence.current
    setPreview(null); setNotice(''); setCsv(''); setFilename('')
    const file = event.target.files?.[0]
    if (!file) { setCsv(''); return }
    if (!/\.csv$/i.test(file.name)) { setNotice('Choose a .csv file.'); return }
    setFilename(file.name)
    if (file.size > 262_144) { setCsv(''); setNotice('CSV must be at most 256 KiB.'); return }
    try { const text = await file.text(); if (request === sequence.current) setCsv(text) }
    catch { if (request === sequence.current) setNotice('The file could not be read. Choose it again.') }
  }
  const inspect = async () => {
    setBusy(true); setNotice(''); setPreview(null)
    try { setPreview((await api.previewStudentInvitationCsv(classId, csv)).data) }
    catch (error) { setNotice(describeApiError(error)) }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    if (mutationLock.current || !preview?.valid) return
    mutationLock.current = true
    setBusy(true); setNotice('')
    try {
      const result = (await api.confirmStudentInvitationCsv(classId, csv, preview.fingerprint)).data
      setNotice(`${result.invited} invitations created; ${result.alreadyMember} already joined; ${result.alreadyPending} already pending. Students must accept invitations to join.`)
      setPreview(null); setCsv(''); setFilename(''); if (fileInput.current) fileInput.current.value = ''
    } catch (error) { setNotice(describeApiError(error)); setPreview(null) }
    finally { setBusy(false); mutationLock.current = false }
  }
  return (
    <section className="class-csv-panel">
      <button type="button" className="student-outline-action" onClick={() => setOpen(true)}>Invite students from CSV</button>
      {open && <AppDialog title="Invite students from CSV" className="projex-dialog--csv" busy={busy} onClose={() => setOpen(false)}>
        <div className="csv-dialog-body">
          <p className="csv-dialog-description">Use an <strong>email</strong> header, then one registered Student email per row.</p>
          <div className="csv-format-example">
            <div><ProjexIcon name="file" size={16} /><span>students.csv</span></div>
            <code>{'email\nstudent@slu.edu.ph\nanother@slu.edu.ph'}</code>
          </div>
          <label className={`csv-upload-zone${busy ? ' is-disabled' : ''}`}>
            <span className="csv-upload-icon"><ProjexIcon name="upload" size={22} /></span>
            <span className="csv-upload-content"><strong>{filename || 'Upload CSV'}</strong><span>{filename ? 'Choose a different file' : '.csv only · Up to 100 rows · 256 KiB max'}</span></span>
            <input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Student invitation CSV" onChange={choose} disabled={busy} />
          </label>
          {preview && <div className="csv-preview-results">
            <p>{preview.ready} ready to invite. {preview.valid ? 'Review each row before confirming.' : 'Fix invalid rows and preview again.'}</p>
            <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Row</th><th>Email</th><th>Result</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.email}</td><td>{row.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>
          </div>}
          {notice && <p className="csv-dialog-notice" role="status">{notice}</p>}
        </div>
        <footer className="csv-dialog-footer">
          <button type="button" className="student-outline-action" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
          {preview
            ? <button type="button" className="student-primary-action" onClick={confirm} disabled={!preview.valid || busy}>{busy ? 'Inviting…' : 'Confirm invitations'}</button>
            : <button type="button" className="student-primary-action" onClick={inspect} disabled={!csv || busy}>{busy ? 'Previewing…' : 'Preview invitations'}</button>}
        </footer>
      </AppDialog>}
    </section>
  )
}
