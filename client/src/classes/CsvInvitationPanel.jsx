import { useState } from 'react'
import { describeApiError } from '../api/api-client.js'

export default function CsvInvitationPanel({ api, classId }) {
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const choose = async (event) => {
    setPreview(null); setNotice('')
    const file = event.target.files?.[0]
    if (!file) { setCsv(''); return }
    if (file.size > 262_144) { setCsv(''); setNotice('CSV must be at most 256 KiB.'); return }
    setCsv(await file.text())
  }
  const inspect = async () => {
    setBusy(true); setNotice(''); setPreview(null)
    try { setPreview((await api.previewStudentInvitationCsv(classId, csv)).data) }
    catch (error) { setNotice(describeApiError(error)) }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    setBusy(true); setNotice('')
    try {
      const result = (await api.confirmStudentInvitationCsv(classId, csv, preview.fingerprint)).data
      setNotice(`${result.invited} invitations created; ${result.alreadyMember} already joined; ${result.alreadyPending} already pending. Students must accept invitations to join.`)
      setPreview(null); setCsv('')
    } catch (error) { setNotice(describeApiError(error)); setPreview(null) }
    finally { setBusy(false) }
  }
  return <section className="admin-panel class-csv-panel">
    <h3>Invite students from CSV</h3>
    <p>Use one registered student email per row under an <code>email</code> header. Preview makes no changes. Invitations are not official enrollment.</p>
    <input type="file" accept=".csv,text/csv" aria-label="Student invitation CSV" onChange={choose} disabled={busy} />
    <button type="button" className="student-outline-action" onClick={inspect} disabled={!csv || busy}>Preview invitations</button>
    {preview ? <div>
      <p>{preview.ready} ready to invite. {preview.valid ? 'Review each row before confirming.' : 'Fix invalid rows and preview again.'}</p>
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Row</th><th>Email</th><th>Result</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.email}</td><td>{row.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>
      <button type="button" className="student-primary-action" onClick={confirm} disabled={!preview.valid || busy}>Confirm invitations</button>
    </div> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>
}
