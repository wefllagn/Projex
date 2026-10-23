import { StudentSubmissionHistory } from '../submissions/StudentSubmissionViews.jsx'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { GroupedClasswork } from './TopicViews.jsx'
import { useCallback, useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { repositoryApi } from '../repositories/repository-api.js'
import { useActivityRepositoryAction } from '../repositories/use-activity-repository-action.js'
import { activityApi } from './activity-api.js'
import { submissionApi } from '../submissions/submission-api.js'
import { projectStudentAttemptState } from '../submissions/submission-projections.js'
import {
  activityClassMatches,
  formatActivityDate,
  formatActivityStatus,
} from './activity-utils.js'


function contextMismatchError() {
  return new ApiError({
    status: 404,
    code: 'ACTIVITY_NOT_FOUND',
    message: 'The activity is not available in the selected class.',
  })
}

export function StudentActivityList({ api = activityApi }) {
  const { selectedClass } = useClasses()
  return selectedClass ? <GroupedClasswork key={selectedClass.id} classId={selectedClass.id} api={api} /> : null
}

function StudentActivityReady({ activity, attemptState, testCases, classId, repositories, api, submissions }) {
  const repositoryAction = useActivityRepositoryAction({ activity, classId, api: repositories })
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <div className="student-detail-layout student-project-detail-layout academic-detail-layout">
      <NavLink to={classHref('/student/activity', classId)} className="student-back-link academic-detail-back">Back to Activities</NavLink>
      <main className="student-activity-detail-card">
        <article className="student-detail-card">
          <div className="student-detail-heading activity-detail-heading">
            <span className="student-detail-icon" aria-hidden="true"><ProjexIcon name="activity" size={26} /></span>
            <div className="activity-detail-identity">
              <div className="activity-detail-title-row">
                <h2>{activity.title}</h2>
                <span className="activity-open-status">{formatActivityStatus(activity.dueState)}</span>
              </div>
              <p><span>{activity.createdBy.fullName}</span><span>{formatActivityStatus(activity.status)}</span></p>
            </div>
          </div>
          <div className="student-detail-divider" />
          <section className="activity-instructions">
            <h3>Instructions</h3>
            <p>{activity.instructions}</p>
          </section>
          <div className="student-detail-divider" />
          <section className="activity-visible-tests">
            <h3>Visible test cases</h3>
            {testCases.length === 0 ? <p>No visible examples are available.</p> : testCases.map((testCase) => (
              <article key={testCase.id}>
                <strong>{testCase.name}</strong>
                <span>Input</span><pre>{testCase.inputData || '(no input)'}</pre>
                <span>Expected output</span><pre>{testCase.expectedOutput}</pre>
                {activity.gradingMode !== 'COMPLETION' && <small>{testCase.points} points</small>}
              </article>
            ))}
          </section>
        </article>
      </main>
      <aside className="student-work-rail">
        <section className="student-work-card">
          <div className="student-work-card__header"><h2>Your work</h2><span className="student-work-status">{formatActivityStatus(activity.dueState)}</span></div>
          <dl className="activity-facts academic-work-facts">
            <div><dt><ProjexIcon name="calendar" size={18} />Due</dt><dd><time dateTime={activity.dueDate}>{formatActivityDate(activity.dueDate)}</time></dd></div>
            <div><dt>Attempts</dt><dd>{attemptState.countingAttemptsUsed} of {attemptState.maxAttempts} used</dd></div>
          </dl>
          <div className="submission-released-result">
            <strong>{activity.gradingMode === 'COMPLETION' ? 'Ungraded · completion' : 'Credited result'}</strong>
            {activity.gradingMode === 'COMPLETION' ? <p>{attemptState.completionState === 'COMPLETE' ? 'Complete · official submission accepted' : 'Not submitted'}</p> : attemptState.creditedResult
              ? <><p>{attemptState.creditedResult.attemptLabel}</p><h3>{attemptState.creditedResult.score} / {attemptState.creditedResult.totalPoints}</h3></>
              : <p>No result has been released yet.</p>}
          </div>
          {attemptState.replacementAvailable && <p className="submission-notice">A replacement attempt is available until {formatActivityDate(attemptState.replacement?.expiresAt)}.</p>}
          {!['ORDINARY', 'REPLACEMENT'].includes(attemptState.nextAllowedSubmissionKind) && <small>Another submission is not currently available.</small>}
          <button type="button" className="student-primary-action" disabled={repositoryAction.busy} onClick={() => repositoryAction.start('workspace')}>Open workspace</button>
          <button type="button" className="student-outline-action" disabled={repositoryAction.busy} onClick={() => repositoryAction.start('repository')}><ProjexIcon name="repository" size={18} />View repository</button>
          <button type="button" className="student-outline-action" onClick={() => setHistoryOpen(true)} aria-haspopup="dialog">Attempt history</button>
          {repositoryAction.busy && <p role="status">Preparing your repository…</p>}
          {repositoryAction.error && <p role="alert" className="activity-action-error">{describeApiError(repositoryAction.error)}</p>}
          {repositoryAction.stopped && <><small>Repository preparation is taking longer than expected.</small><button type="button" className="student-outline-action" onClick={repositoryAction.retry}>Check again</button></>}
          {repositoryAction.error && <button type="button" className="student-outline-action" onClick={repositoryAction.retry}>Try again</button>}
        </section>
      </aside>
      {historyOpen && <AppDialog title="Attempt history" className="academic-attempt-dialog" onClose={() => setHistoryOpen(false)}><StudentSubmissionHistory compact api={api} submissions={submissions} /></AppDialog>}

    </div>
  )
}

export function StudentActivityDetail({ api = activityApi, submissions = submissionApi, repositories = repositoryApi }) {
  const { activityId } = useParams()
  const { selectedClass, selectionStatus } = useClasses()
  const [state, setState] = useState({ key: null, status: 'idle', activity: null, testCases: [], attemptState: null, error: null })

  const load = useCallback(async ({ signal } = {}) => {
    if (!selectedClass || !activityId) return
    const key = `${selectedClass.id}:${activityId}`
    try {
      const [activityResponse, testCaseResponse, attemptStateResponse] = await Promise.all([
        api.getActivity(activityId, { signal }),
        api.listTestCases(activityId, { page: 1, pageSize: 50 }, { signal }),
        submissions.getAttemptState(activityId, { signal }),
      ])
      if (!activityClassMatches(activityResponse.data, selectedClass)) throw contextMismatchError()
      const attemptState = projectStudentAttemptState(attemptStateResponse.data)
      if (attemptState.activityId !== activityId) throw contextMismatchError()
      setState({
        key,
        status: 'ready',
        activity: activityResponse.data,
        testCases: testCaseResponse.data.filter((testCase) => testCase.isHidden !== true),
        attemptState,
        error: null,
      })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ key, status: 'error', activity: null, testCases: [], attemptState: null, error })
    }
  }, [activityId, api, selectedClass, submissions])

  useEffect(() => {
    if (selectionStatus !== 'ready') return undefined
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load, selectionStatus])

  const key = `${selectedClass?.id}:${activityId}`
  const current = state.key === key ? state : { ...state, status: 'loading', activity: null, testCases: [], attemptState: null }

  if (current.status === 'loading') return <RequestState kind="loading" message="Loading the selected activity." />
  if (current.status === 'error') return <RequestState kind={current.error?.status === 404 ? 'notFound' : current.error?.status === 403 ? 'forbidden' : 'unavailable'} error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (!current.activity) return null

  return <StudentActivityReady key={key} activity={current.activity} attemptState={current.attemptState} testCases={current.testCases} classId={selectedClass.id} repositories={repositories} api={api} submissions={submissions} />
}
