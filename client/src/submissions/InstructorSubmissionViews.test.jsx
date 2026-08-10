import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ClassContext } from '../classes/class-context.js'
import {
  InstructorActivityMonitorRedirect,
  InstructorSubmissionQueue,
  InstructorSubmissionReview,
} from './InstructorSubmissionViews.jsx'

const classId = '00000000-0000-4000-8000-000000000001'
const otherClassId = '00000000-0000-4000-8000-000000000002'
const activityId = '00000000-0000-4000-8000-000000000010'
const submissionId = '00000000-0000-4000-8000-000000000020'

const selectedClass = { id: classId, className: 'Programming Fundamentals', section: 'BSIT 1A', status: 'ACTIVE' }
const activity = { id: activityId, classId, title: 'Repository-backed Assessment', dueDate: '2099-09-03T09:00:00.000Z', status: 'PUBLISHED' }
const pagination = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

function record(overrides = {}) {
  return {
    id: submissionId,
    activityId,
    activityTitle: activity.title,
    attemptLabel: 'Attempt 1',
    replacementForAttemptNumber: null,
    attemptNumber: 1,
    countsTowardAttemptLimit: true,
    submittedAt: '2026-08-10T01:00:00.000Z',
    status: 'assessed',
    isLate: false,
    updatedAt: '2026-08-10T01:00:00.000Z',
    student: { id: 'student-1', fullName: 'Synthetic Student', email: 'student@example.edu' },
    sourceCode: 'public class Main { public static void main(String[] args) {} }',
    assessment: {
      compileStatus: 'succeeded',
      runtimeStatus: 'succeeded',
      compilerOutput: 'Compilation succeeded.',
      infrastructureFailureCode: null,
      startedAt: '2026-08-10T01:00:01.000Z',
      completedAt: '2026-08-10T01:00:02.000Z',
      testResults: [
        { testCaseId: 'visible-1', name: 'Visible sample', order: 1, input: '1', expectedOutput: '1', isHidden: false, outcome: 'passed', actualOutput: '1', automatedPoints: 40, maximumPoints: 40, executionTimeMs: 2 },
        { testCaseId: 'hidden-1', name: 'Hidden boundary', order: 2, input: 'HIDDEN-INPUT', expectedOutput: 'HIDDEN-EXPECTED', isHidden: true, outcome: 'failed', actualOutput: 'HIDDEN-ACTUAL', errorMessage: null, automatedPoints: 0, maximumPoints: 40, executionTimeMs: 3 },
      ],
    },
    scores: { originalAutomatedScore: 40, effectiveAutomatedScore: 40, automatedMaximum: 80, instructorPoints: 0, instructorMaximum: 20, finalScore: null, totalPoints: 100 },
    corrections: [],
    feedback: null,
    failureResolution: null,
    ...overrides,
  }
}

function activityTransport(overrides = {}) {
  return { getActivity: vi.fn().mockResolvedValue({ data: activity }), ...overrides }
}

function submissionTransport(overrides = {}) {
  return {
    listSubmissions: vi.fn().mockResolvedValue({ data: [record()], pagination }),
    getSubmission: vi.fn().mockResolvedValue({ data: record() }),
    correctAutomatedScore: vi.fn(),
    saveReview: vi.fn(),
    releaseSubmission: vi.fn(),
    retryAssessment: vi.fn(),
    resolveAssessmentFailure: vi.fn(),
    ...overrides,
  }
}

function renderInstructor(element, {
  entry = `/instructor/activity/${activityId}/submissions/${submissionId}?classId=${classId}`,
  path = '/instructor/activity/:activityId/submissions/:submissionId',
  context = {},
  destination = false,
} = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ClassContext.Provider value={{ selectedClass, requestedClassId: classId, selectionStatus: 'ready', selectionError: null, ...context }}>
        <Routes>
          <Route path={path} element={element} />
          {destination && <Route path="/instructor/activity/:activityId/submissions" element={<LocationProbe />} />}
        </Routes>
      </ClassContext.Provider>
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <p>{location.pathname}{location.search}</p>
}

afterEach(() => vi.restoreAllMocks())

describe('instructor submission queue', () => {
  it('loads only the selected activity, supports status filtering, and links real identities', async () => {
    const submissions = submissionTransport()
    renderInstructor(<InstructorSubmissionQueue api={activityTransport()} submissions={submissions} />, {
      entry: `/instructor/activity/${activityId}/submissions?classId=${classId}`,
      path: '/instructor/activity/:activityId/submissions',
    })

    expect(await screen.findByText('Synthetic Student')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', `/instructor/activity/${activityId}/submissions/${submissionId}?classId=${classId}`)
    expect(screen.queryByText(/Missing student/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Similarity/i)).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'REVIEWED')
    await waitFor(() => expect(submissions.listSubmissions).toHaveBeenLastCalledWith(activityId, { page: 1, pageSize: 20, status: 'REVIEWED' }, expect.any(Object)))
  })

  it('fails closed when the activity or returned submission disagrees with route context', async () => {
    renderInstructor(<InstructorSubmissionQueue api={activityTransport({ getActivity: vi.fn().mockResolvedValue({ data: { ...activity, classId: otherClassId } }) })} submissions={submissionTransport()} />, {
      entry: `/instructor/activity/${activityId}/submissions?classId=${classId}`,
      path: '/instructor/activity/:activityId/submissions',
    })
    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
  })

  it('redirects the legacy monitor route to the canonical queue without inventing totals', async () => {
    renderInstructor(<InstructorActivityMonitorRedirect />, {
      entry: `/instructor/activity/${activityId}/monitor?classId=${classId}`,
      path: '/instructor/activity/:activityId/monitor',
      destination: true,
    })
    expect(await screen.findByText(`/instructor/activity/${activityId}/submissions?classId=${classId}`)).toBeInTheDocument()
  })
})

describe('instructor submission review', () => {
  it('shows immutable source and authorized hidden evidence without prototype rerun or per-test edits', async () => {
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissionTransport()} />)

    expect(await screen.findByText('Immutable submitted source')).toBeInTheDocument()
    expect(screen.getByText('Hidden boundary')).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByText('HIDDEN-INPUT')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run Tests' })).not.toBeInTheDocument()
    expect(screen.queryByText(/similarity/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Hidden boundary points/i)).not.toBeInTheDocument()
    expect(screen.getByText('Projected final score')).toBeInTheDocument()
  })

  it('adopts every returned version across correction, review, and release', async () => {
    const versionA = '2026-08-10T01:00:00.000Z'
    const versionB = '2026-08-10T01:01:00.000Z'
    const versionC = '2026-08-10T01:02:00.000Z'
    const versionD = '2026-08-10T01:03:00.000Z'
    const submissions = submissionTransport({
      correctAutomatedScore: vi.fn().mockResolvedValue({ data: record({ updatedAt: versionB, scores: { ...record().scores, effectiveAutomatedScore: 38 }, corrections: [{ correctionNumber: 1, originalAutomatedScore: 40, previousEffectiveScore: 40, newEffectiveScore: 38, reason: 'Correction supported by evidence.', correctedById: 'instructor-1', correctedAt: versionB }] }) }),
      saveReview: vi.fn().mockResolvedValue({ data: record({ status: 'reviewed', updatedAt: versionC, scores: { ...record().scores, effectiveAutomatedScore: 38, instructorPoints: 12 }, feedback: { text: 'Private draft feedback.', instructorId: 'instructor-1', updatedAt: versionC, releasedAt: null } }) }),
      releaseSubmission: vi.fn().mockResolvedValue({ data: record({ status: 'released', updatedAt: versionD, scores: { ...record().scores, effectiveAutomatedScore: 38, instructorPoints: 12, finalScore: 50 }, feedback: { text: 'Private draft feedback.', instructorId: 'instructor-1', updatedAt: versionC, releasedAt: versionD } }) }),
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)

    await screen.findByText('Immutable submitted source')
    await userEvent.type(screen.getByLabelText('New effective automated score'), '38')
    await userEvent.type(screen.getByLabelText('Correction reason'), 'Correction supported by evidence.')
    await userEvent.click(screen.getByRole('button', { name: 'Record correction' }))
    await screen.findByText('Automated-score correction recorded. Original assessment evidence remains unchanged.')

    fireEvent.change(screen.getByLabelText('Instructor points'), { target: { value: '12' } })
    await userEvent.type(screen.getByLabelText(/^Private feedback draft/), 'Private draft feedback.')
    await userEvent.click(screen.getByRole('button', { name: 'Save review draft' }))
    await screen.findByText('Review and private feedback draft saved.')
    await userEvent.click(screen.getByRole('button', { name: 'Release final result' }))
    expect(await screen.findByText('Final score and feedback released.')).toBeInTheDocument()

    expect(submissions.correctAutomatedScore).toHaveBeenCalledWith(submissionId, expect.objectContaining({ expectedUpdatedAt: versionA, newEffectiveScore: 38 }))
    expect(submissions.saveReview).toHaveBeenCalledWith(submissionId, expect.objectContaining({ expectedUpdatedAt: versionB, instructorPoints: 12, feedbackText: 'Private draft feedback.' }))
    expect(submissions.releaseSubmission).toHaveBeenCalledWith(submissionId, { expectedUpdatedAt: versionC })
    expect(screen.getByText('Released final score')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record correction' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save review draft' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Review Again/i)).not.toBeInTheDocument()
  })

  it('preserves unsaved forms and refetches without replaying a stale mutation', async () => {
    const submissions = submissionTransport({
      getSubmission: vi.fn()
        .mockResolvedValueOnce({ data: record() })
        .mockResolvedValueOnce({ data: record({ updatedAt: '2026-08-10T02:00:00.000Z' }) }),
      correctAutomatedScore: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_SUBMISSION_VERSION', message: 'stale' })),
    })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)
    await screen.findByText('Immutable submitted source')

    await userEvent.type(screen.getByLabelText('New effective automated score'), '39')
    await userEvent.type(screen.getByLabelText('Correction reason'), 'Preserve this correction reason.')
    fireEvent.change(screen.getByLabelText('Instructor points'), { target: { value: '11' } })
    await userEvent.type(screen.getByLabelText(/^Private feedback draft/), 'Preserved review draft.')
    await userEvent.click(screen.getByRole('button', { name: 'Record correction' }))

    expect(await screen.findByText('Latest version loaded')).toBeInTheDocument()
    expect(screen.getByLabelText('New effective automated score')).toHaveValue(39)
    expect(screen.getByLabelText('Correction reason')).toHaveValue('Preserve this correction reason.')
    expect(screen.getByLabelText('Instructor points')).toHaveValue(11)
    expect(screen.getByLabelText(/^Private feedback draft/)).toHaveValue('Preserved review draft.')
    expect(submissions.correctAutomatedScore).toHaveBeenCalledTimes(1)
    expect(submissions.getSubmission).toHaveBeenCalledTimes(2)
  })

  it('rejects a mutation response whose identifiers disagree with the review route', async () => {
    const submissions = submissionTransport({
      correctAutomatedScore: vi.fn().mockResolvedValue({ data: record({ id: '00000000-0000-4000-8000-000000000099' }) }),
    })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)
    await screen.findByText('Immutable submitted source')
    fireEvent.change(screen.getByLabelText('New effective automated score'), { target: { value: '39' } })
    await userEvent.type(screen.getByLabelText('Correction reason'), 'Reject mismatched response identity.')
    await userEvent.click(screen.getByRole('button', { name: 'Record correction' }))

    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
    expect(screen.getByText('Assessed')).toBeInTheDocument()
  })

  it('clears feedback only by sending the backend-defined empty string', async () => {
    const reviewed = record({ status: 'reviewed', feedback: { text: 'Existing draft', instructorId: 'instructor-1', updatedAt: '2026-08-10T01:00:00.000Z', releasedAt: null } })
    const submissions = submissionTransport({
      getSubmission: vi.fn().mockResolvedValue({ data: reviewed }),
      saveReview: vi.fn().mockResolvedValue({ data: record({ status: 'reviewed', updatedAt: '2026-08-10T02:00:00.000Z', feedback: null }) }),
    })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)
    expect(await screen.findByLabelText(/^Private feedback draft/)).toHaveValue('Existing draft')
    await userEvent.clear(screen.getByLabelText(/^Private feedback draft/))
    await userEvent.click(screen.getByRole('button', { name: 'Save review draft' }))
    expect(await screen.findByText('Review saved and the unreleased feedback draft was cleared.')).toBeInTheDocument()
    expect(submissions.saveReview).toHaveBeenCalledWith(submissionId, expect.objectContaining({ feedbackText: '' }))
  })

  it('enforces correction and instructor-point bounds before calling the backend', async () => {
    const submissions = submissionTransport()
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)
    await screen.findByText('Immutable submitted source')

    fireEvent.change(screen.getByLabelText('New effective automated score'), { target: { value: '81' } })
    await userEvent.type(screen.getByLabelText('Correction reason'), 'A sufficiently detailed correction reason.')
    expect(screen.getByRole('button', { name: 'Record correction' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('New effective automated score'), { target: { value: '70' } })
    await userEvent.clear(screen.getByLabelText('Correction reason'))
    await userEvent.type(screen.getByLabelText('Correction reason'), 'short')
    expect(screen.getByRole('button', { name: 'Record correction' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Instructor points'), { target: { value: '21' } })
    expect(screen.getByRole('button', { name: 'Save review draft' })).toBeDisabled()
    expect(submissions.correctAutomatedScore).not.toHaveBeenCalled()
    expect(submissions.saveReview).not.toHaveBeenCalled()
  })

  it('retries the same failed submission and boundedly polls the returned version', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const failed = record({ status: 'assessment_failed', assessment: { ...record().assessment, infrastructureFailureCode: 'JAVA_RUNTIME_UNAVAILABLE' } })
    const queued = record({ status: 'queued', updatedAt: '2026-08-10T02:00:00.000Z', assessment: { ...record().assessment, compileStatus: 'pending', runtimeStatus: 'not_run', testResults: [] } })
    const submissions = submissionTransport({
      getSubmission: vi.fn().mockResolvedValueOnce({ data: failed }).mockResolvedValueOnce({ data: record({ status: 'assessed', updatedAt: '2026-08-10T03:00:00.000Z' }) }),
      retryAssessment: vi.fn().mockResolvedValue({ data: queued }),
    })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 100 }} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Retry same assessment' }))
    expect(submissions.retryAssessment).toHaveBeenCalledWith(submissionId, { expectedUpdatedAt: failed.updatedAt })
    await waitFor(() => expect(submissions.getSubmission).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Assessed')).toBeInTheDocument()
  })

  it('resolves failures with exact close and time-limited replacement contracts', async () => {
    const failed = record({ status: 'assessment_failed' })
    const resolved = record({ status: 'failed_resolved', updatedAt: '2026-08-10T02:00:00.000Z', failureResolution: { resolutionType: 'REPLACEMENT_GRANTED', reason: 'Infrastructure failed after retry.', resolvedById: 'instructor-1', resolvedAt: '2026-08-10T02:00:00.000Z', replacementExpiresAt: '2099-09-04T09:00:00.000Z', replacementSubmissionId: null, replacementConsumedAt: null } })
    const submissions = submissionTransport({ getSubmission: vi.fn().mockResolvedValue({ data: failed }), resolveAssessmentFailure: vi.fn().mockResolvedValue({ data: resolved }) })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)

    await screen.findByText('Infrastructure assessment failure')
    await userEvent.selectOptions(screen.getByLabelText('Resolution'), 'REPLACEMENT_GRANTED')
    fireEvent.change(screen.getByLabelText(/^Replacement expires \(local time\)/), { target: { value: '2099-09-04T17:00' } })
    await userEvent.type(screen.getByLabelText('Mandatory reason'), 'Infrastructure failed after retry.')
    await userEvent.click(screen.getByRole('button', { name: 'Resolve failure' }))

    expect(submissions.resolveAssessmentFailure).toHaveBeenCalledWith(submissionId, expect.objectContaining({
      resolutionType: 'REPLACEMENT_GRANTED',
      reason: 'Infrastructure failed after retry.',
      expectedUpdatedAt: failed.updatedAt,
      replacementExpiresAt: expect.stringMatching(/^2099-09-04T/),
    }))
    expect(await screen.findByText('Time-limited replacement attempt granted.')).toBeInTheDocument()
    expect(screen.getByText('Unconsumed; the server enforces expiration when the student submits')).toBeInTheDocument()
  })

  it('closes infrastructure failure without sending replacement expiration', async () => {
    const failed = record({ status: 'assessment_failed' })
    const resolved = record({ status: 'failed_resolved', updatedAt: '2026-08-10T02:00:00.000Z', failureResolution: { resolutionType: 'CLOSED_WITHOUT_REPLACEMENT', reason: 'No replacement is appropriate.', resolvedById: 'instructor-1', resolvedAt: '2026-08-10T02:00:00.000Z', replacementExpiresAt: null, replacementSubmissionId: null, replacementConsumedAt: null } })
    const submissions = submissionTransport({ getSubmission: vi.fn().mockResolvedValue({ data: failed }), resolveAssessmentFailure: vi.fn().mockResolvedValue({ data: resolved }) })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissions} />)

    await userEvent.type(await screen.findByLabelText('Mandatory reason'), 'No replacement is appropriate.')
    await userEvent.click(screen.getByRole('button', { name: 'Resolve failure' }))
    expect(submissions.resolveAssessmentFailure).toHaveBeenCalledWith(submissionId, {
      resolutionType: 'CLOSED_WITHOUT_REPLACEMENT',
      reason: 'No replacement is appropriate.',
      expectedUpdatedAt: failed.updatedAt,
    })
    expect(await screen.findByText('Infrastructure failure closed without a replacement.')).toBeInTheDocument()
  })

  it('fails closed on mismatched submission identity and keeps released records immutable', async () => {
    const mismatch = submissionTransport({ getSubmission: vi.fn().mockResolvedValue({ data: record({ activityId: '00000000-0000-4000-8000-000000000099' }) }) })
    const first = renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={mismatch} />)
    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
    first.unmount()

    const released = record({ status: 'released', scores: { ...record().scores, finalScore: 40 }, feedback: { text: 'Released feedback', instructorId: 'instructor-1', updatedAt: '2026-08-10T01:00:00.000Z', releasedAt: '2026-08-10T02:00:00.000Z' } })
    renderInstructor(<InstructorSubmissionReview api={activityTransport()} submissions={submissionTransport({ getSubmission: vi.fn().mockResolvedValue({ data: released }) })} />)
    expect(await screen.findByText('Released final score')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record correction' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Release final result' })).not.toBeInTheDocument()
  })

  it('keeps closed-activity review available but makes archived records read-only', async () => {
    const closedApi = activityTransport({ getActivity: vi.fn().mockResolvedValue({ data: { ...activity, status: 'CLOSED' } }) })
    const first = renderInstructor(<InstructorSubmissionReview api={closedApi} submissions={submissionTransport()} />)
    expect(await screen.findByRole('button', { name: 'Record correction' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save review draft' })).toBeInTheDocument()
    first.unmount()

    const archivedApi = activityTransport({ getActivity: vi.fn().mockResolvedValue({ data: { ...activity, status: 'ARCHIVED' } }) })
    renderInstructor(<InstructorSubmissionReview api={archivedApi} submissions={submissionTransport()} />)
    expect(await screen.findByText('Archived classes and activities are read-only.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record correction' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save review draft' })).not.toBeInTheDocument()
  })
})
