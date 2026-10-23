import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import { apiClient } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'

const PERIODS = [['PRELIM', 'Prelim'], ['MIDTERM', 'Midterm'], ['FINAL', 'Final'], ['UNASSIGNED', 'Unassigned']]
const STATUSES = { NOT_SUBMITTED: 'Not submitted', MISSING: 'Missing', PENDING: 'Pending assessment', FAILED_ASSESSMENT: 'Failed assessment', FAILURE_RESOLVED: 'Assessment failure resolved', AWAITING_REVIEW: 'Awaiting review', REVIEWED_UNRELEASED: 'Reviewed · not released', RELEASED: 'Released' }

function useGradebookRequest(client, path, revision) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    if (!path) return undefined
    const controller = new AbortController()
    client.get(path, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setState({ status: 'ready', data: response.data, path, revision })
    }).catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setState({ status: 'error', error, path, revision }) })
    return () => controller.abort()
  }, [client, path, revision])
  return state.path === path && state.revision === revision ? state : { status: 'loading' }
}
export function PeriodResult({ period }) {
  if (!period || !period.activityCount) return <span>—<small> · No graded Activities</small></span>
  return <span>{period.percentage === null ? '— · No released grades' : `${period.earned}/${period.possible} · ${period.percentage}%`}{period.provisional && ' · Provisional'}<small> · {period.releasedCount}/{period.activityCount} released{period.outstandingAttemptCount > 0 && ` · ${period.outstandingAttemptCount} with another attempt not released`}</small></span>
}
function Request({ state, retry, children }) {
  if (state.status === 'loading') return <RequestState kind="loading" />
  if (state.status === 'error') return <RequestState kind="unavailable" error={state.error} action={<button className="student-outline-action" type="button" onClick={retry}>Try again</button>} />
  return children(state.data)
}
export default function Gradebook({ client = apiClient }) {
  const { selectedClass } = useClasses()
  const [parameters] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const classId = selectedClass?.id
  const overview = useGradebookRequest(client, classId ? `/classes/${classId}/gradebook/overview` : null, revision)
  const own = overview.status === 'ready' && overview.data.viewerRole === 'STUDENT' ? overview.data.rows[0]?.studentId : null
  const studentId = own || parameters.get('studentId')
  const details = useGradebookRequest(client, classId && studentId ? `/classes/${classId}/gradebook/students/${encodeURIComponent(studentId)}` : null, revision)
  const refresh = () => setRevision(value => value + 1)
  const studentHref = id => { const next = new URLSearchParams(parameters); if (id) next.set('studentId', id); else next.delete('studentId'); return `?${next}` }
  return <section className="student-assignment-panel academic-class-frame">
    <div className="instructor-section-title"><h2>Gradebook</h2><button type="button" className="student-outline-action" onClick={refresh}>Refresh grades</button></div>
    <p className="academic-inline-help">Activity score summary. Only credited released graded results contribute to totals. Missing, pending, unreleased and ungraded work is not counted as zero. Coverage refers to currently published Activities, including retained published history. This is not an official course grade.</p>
    <Request state={overview} retry={refresh}>{data => <>
      {!studentId && <><div className="instructor-data-table" style={{ overflowX: 'auto' }}><table className="admin-table"><caption>Student results by grading period</caption><thead><tr><th>Student</th>{PERIODS.slice(0, 3).map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={row.studentId}><th scope="row"><Link className="admin-row-link" to={studentHref(row.studentId)}>{row.fullName}</Link></th>{PERIODS.slice(0, 3).map(([key]) => <td key={key}><PeriodResult period={row.periods.find(period => period.period === key)} /></td>)}</tr>)}</tbody></table></div>{!data.rows.length && <p>No enrolled Students in this Class.</p>}<p className="academic-inline-help">Select a Student to inspect their Activities, submission records and legacy Unassigned work.</p></>}
      {studentId && <>{data.viewerRole === 'INSTRUCTOR' && <Link className="student-back-link" to={studentHref(null)}>Back to Class overview</Link>}<Request state={details} retry={refresh}>{record => <>
        <h3>{record.fullName}</h3>
        {PERIODS.map(([key, label]) => {
          const period = record.periods.find(item => item.period === key)
          return <section className="activity-authoring-section" key={key} aria-label={`${label} Activity records`}><h4>{label}</h4><p><PeriodResult period={period} /></p>{period?.ungradedCount > 0 && <p className="academic-inline-help">{period.ungradedCount} Ungraded Activity/Activities excluded from numeric totals.</p>}{!period?.activities.length ? <p>No published Activities in this grading period.</p> : <div className="instructor-data-table" style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Activity</th><th>Released score</th><th>Status</th><th>Record</th></tr></thead><tbody>{period.activities.map(activity => {
            const role = data.viewerRole === 'INSTRUCTOR' ? 'instructor' : 'student'
            const submissionId = role === 'instructor' ? activity.outstandingSubmissionId || activity.submissionId : activity.submissionId
            const activityPath = role === 'instructor' ? `/${role}/activity/${activity.activityId}/submissions` : `/${role}/activity/${activity.activityId}`
            const submissionPath = id => classHref(`/${role}/activity/${activity.activityId}/submissions/${id}`, classId)
            return <tr key={activity.activityId}><th scope="row"><Link className="admin-row-link" to={classHref(activityPath, classId)}>{activity.title}</Link>{activity.gradingMode === 'COMPLETION' && <small> · Ungraded</small>}</th><td>{activity.earned === null ? '—' : `${activity.earned}/${activity.possible}`}</td><td>{STATUSES[activity.status] || 'Not available'}{activity.hasUnreleasedAttempt && <small> · Another attempt: {STATUSES[activity.outstandingAttemptStatus] || 'Not released'}</small>}</td><td>{submissionId ? <Link className="admin-row-link" to={submissionPath(submissionId)}>{role === 'instructor' ? 'Open review' : 'View submission'}</Link> : 'No submission'}{activity.creditedSubmissionId && activity.creditedSubmissionId !== submissionId && <><br /><Link className="admin-row-link" to={submissionPath(activity.creditedSubmissionId)}>Credited released result</Link></>}</td></tr>
          })}</tbody></table></div>}</section>
        })}
      </>}</Request></>}
    </>}</Request>
  </section>
}
