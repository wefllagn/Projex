import { useEffect, useState } from 'react'
import { useClasses } from '../classes/class-context.js'
import { apiClient } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
const statuses = { NOT_SUBMITTED: 'Not submitted', MISSING: 'Missing', PENDING: 'Pending assessment', UNRELEASED: 'Not released', UNGRADED: 'Ungraded' }
export default function Gradebook({ client = apiClient }) {
  const { selectedClass } = useClasses()
  const [period, setPeriod] = useState('PRELIM')
  const [state, setState] = useState({ status: 'loading', data: null })
  const [revision, setRevision] = useState(0)
  const classId = selectedClass?.id
  useEffect(() => {
    if (!classId) return undefined
    const controller = new AbortController()
    client.get(`/classes/${classId}/gradebook?period=${period}`, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setState({ status: 'ready', data: response.data, classId, period })
    }).catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setState({ status: 'error', error, classId, period }) })
    return () => controller.abort()
  }, [classId, period, revision, client])
  const current = state.classId === classId && state.period === period ? state : { status: 'loading' }
  return <section className="student-assignment-panel academic-class-frame">
    <div className="instructor-section-title"><h2>Gradebook</h2><label>Grading period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="PRELIM">Prelim</option><option value="MIDTERM">Midterm</option><option value="FINAL">Final</option><option value="UNASSIGNED">Unassigned</option></select></label></div>
    <p className="academic-inline-help">Activity score summary. Only credited released graded results contribute to totals. Missing, pending, unreleased and ungraded work is not counted as zero. This is not an official course grade.</p>
    {current.status === 'loading' && <RequestState kind="loading" />}
    {current.status === 'error' && <RequestState kind="unavailable" error={current.error} action={<button className="student-outline-action" type="button" onClick={() => setRevision(value => value + 1)}>Try again</button>} />}
    {current.status === 'ready' && <div className="instructor-data-table" style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Student</th>{current.data.activities.map(activity => <th key={activity.id}>{activity.title}<small> {activity.gradingMode === 'COMPLETION' ? 'Ungraded' : `${activity.totalPoints} points`}</small></th>)}<th>Released points</th><th>Percentage</th></tr></thead><tbody>{current.data.rows.map(row => <tr key={row.studentId}><th scope="row">{row.fullName}</th>{row.scores.map(score => <td key={score.activityId}>{score.status === 'RELEASED' ? `${score.earned} / ${score.possible}` : statuses[score.status] || 'Not available'}{score.hasUnreleasedAttempt && <small> · Another attempt not released</small>}</td>)}<td>{row.possible ? `${row.earned} / ${row.possible}` : 'No released grades'}</td><td>{row.percentage === null ? '—' : `${row.percentage}%`}</td></tr>)}</tbody></table>{!current.data.activities.length && <p>No published Activities in this grading period.</p>}</div>}
  </section>
}
