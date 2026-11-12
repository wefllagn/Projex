import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'

const messages = {
  insufficient_source: 'This submission has too little distinct code after excluding starter code and common boilerplate.',
  unsupported_source: 'The submitted or starter code could not be compared reliably.',
  no_comparable_submissions: 'No other student has a comparable official submission for this activity.',
  workload_limit: 'This activity exceeds the comparison workload limit.',
}

export default function InstructorSimilarityPanel({ submissions, submissionId, activityId, classId }) {
  const request = useRef(null)
  const [state, setState] = useState({ status: 'idle' })

  useEffect(() => () => request.current?.abort(), [])

  async function compare() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setState({ status: 'loading' })
    try {
      const { data } = await submissions.compareSimilarity(submissionId, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (data?.submissionId !== submissionId || (data.status !== 'workload_limit' && data.activityId !== activityId)) {
        throw new ApiError({ code: 'INVALID_API_RESPONSE' })
      }
      setState({ status: 'result', result: data })
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: 'error', error })
    } finally {
      if (request.current === controller) request.current = null
    }
  }

  const result = state.result
  return (
    <section className="instructor-testcase-panel" aria-label="Java source similarity">
      <div className="instructor-section-title">
        <h3>Java source similarity</h3>
        <button type="button" className="student-outline-action" onClick={compare} disabled={state.status === 'loading'}>
          Compare Submissions
        </button>
      </div>
      <p>Similarity measures shared code patterns after excluding starter code and common boilerplate. It does not establish plagiarism.</p>
      {state.status === 'loading' && <p role="status">Comparing official submissions…</p>}
      {state.status === 'error' && <p role="alert">{describeApiError(state.error)}</p>}
      {result && result.status !== 'ready' && <p role="status">{messages[result.status] || 'Comparison is unavailable.'}</p>}
      {result?.status === 'ready' && (
        <>
          <p role="status">Compared {result.comparedCount} of {result.candidateCount} other students’ latest official submissions.</p>
          <ol>
            {result.matches.map((match) => (
              <li key={match.submissionId}>
                <NavLink to={classHref('/instructor/activity/' + activityId + '/submissions/' + match.submissionId, classId)}>
                  {match.studentName} · Attempt {match.attemptNumber}
                </NavLink>
                {' · '}<strong>{match.percentage}% similarity</strong>
                {' · '}{match.sharedWindows} of {match.totalWindows} distinct code patterns shared
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
