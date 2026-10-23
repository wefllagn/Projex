import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AuthContext } from '../auth/auth-context.js'
import { ClassContext } from '../classes/class-context.js'
import { InstructorActivityEditor, InstructorActivityList } from './InstructorActivityViews.jsx'
import { StudentActivityDetail, StudentActivityList } from './StudentActivityViews.jsx'

const classId = '00000000-0000-4000-8000-000000000001'
const activityId = '00000000-0000-4000-8000-000000000010'
const selectedClass = {
  id: classId,
  className: 'Programming Fundamentals',
  section: 'BSIT 1A',
  status: 'ACTIVE',
  instructor: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}
const activity = {
  id: activityId,
  classId,
  title: 'Repository-backed Loops',
  instructions: 'Read integers and print a loop summary.',
  dueDate: '2099-09-03T09:00:00.000Z',
  dueState: 'OPEN',
  language: 'JAVA',
  entryClassName: 'Main',
  starterCode: 'public class Main {}',
  maxAttempts: 2,
  creditPolicy: 'LATEST',
  totalPoints: 100,
  status: 'DRAFT',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
  publishedAt: null,
  closedAt: null,
  archivedAt: null,
  createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}
const testCase = {
  id: 'test-1',
  name: 'Visible sample',
  testCaseOrder: 0,
  inputData: '3',
  expectedOutput: '1 2 3',
  isHidden: false,
  points: 40,
}
const pagination = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

const activityWorkspace = {
  id: 'repository-activity-1',
  projectTaskId: null,
  activityId,
  classId: null,
  teamId: null,
  repositoryType: 'ACTIVITY_WORKSPACE',
  repositoryName: 'activity-workspace',
  slug: 'activity-workspace',
  description: null,
  defaultBranch: 'main',
  visibility: 'PRIVATE',
  status: 'ACTIVE',
  storageStatus: 'READY',
  reviewStatus: 'WORKING',
  owner: { userId: 'student-1', fullName: 'Synthetic Student' },
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

function submissionApiMock() {
  return {
    getAttemptState: vi.fn().mockResolvedValue({ data: {
      activityId,
      activityStatus: 'PUBLISHED',
      dueState: 'OPEN',
      maxAttempts: 2,
      creditPolicy: 'LATEST',
      countingAttemptsUsed: 0,
      remainingOrdinaryAttempts: 2,
      ordinarySubmissionAllowed: true,
      replacementAvailable: false,
      replacement: null,
      nextAllowedSubmissionKind: 'ORDINARY',
      submissionBlockedReason: null,
      releasedAttempts: [],
      creditedResult: null,
    } }),
  }
}

function studentActivityApi(record = { ...activity, status: 'PUBLISHED' }) {
  return {
    getActivity: vi.fn().mockResolvedValue({ data: record }),
    listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
  }
}

afterEach(() => { vi.useRealTimers(); sessionStorage.clear() })

function classValue(overrides = {}) {
  return {
    selectedClass,
    requestedClassId: classId,
    selectionStatus: 'ready',
    selectionError: null,
    ...overrides,
  }
}

function renderView(element, { entry = '/', path = '*' } = {}) {
  if (element.props.api && !element.props.api.listTopics) element.props.api.listTopics = vi.fn().mockResolvedValue({ data: { version: 0, topics: [], page: 1, hasNextPage: false } })
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={{ user: { id: 'student-1', role: 'STUDENT', status: 'ACTIVE' } }}><ClassContext.Provider value={classValue()}>
        <Routes><Route path={path} element={element} /><Route path="/student/repositories/:repositoryId" element={<Destination />} /><Route path="/student/activity/:activityId/workspace" element={<Destination />} /></Routes>
      </ClassContext.Provider></AuthContext.Provider>
    </MemoryRouter>,
  )
}

function Destination() { const location = useLocation(); return <output aria-label="Destination">{location.pathname}{location.search}</output> }

describe('student activity integration', () => {
  it('lists real selected-class activities with dynamic links and bounded pagination', async () => {
    const api = { listActivities: vi.fn().mockResolvedValue({ data: [{ ...activity, status: 'PUBLISHED' }], pagination }) }
    renderView(<StudentActivityList api={api} />)

    expect(await screen.findByText('Repository-backed Loops')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: activity.title })).toHaveAttribute('href', `/student/activity/${activityId}?classId=${classId}`)
    expect(api.listActivities).toHaveBeenCalledWith(classId, { page: 1, pageSize: 20, topicId: 'none' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.queryByText(/Prelim Programming Exercise/)).not.toBeInTheDocument()
  })

  it('fails closed when an activity response belongs to another class', async () => {
    const sensitiveTitle = 'Other Class Private Activity'
    const api = { listActivities: vi.fn().mockResolvedValue({ data: [{ ...activity, classId: 'another-class', title: sensitiveTitle }], pagination }) }
    renderView(<StudentActivityList api={api} />)

    expect(await screen.findByText('The requested Origin record was not found.')).toBeInTheDocument()
    expect(screen.queryByText(sensitiveTitle)).not.toBeInTheDocument()
  })

  it('renders only visible test examples and never reports hidden-test details or count', async () => {
    const hiddenSecret = 'HIDDEN-INPUT-SECRET'
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: { ...activity, status: 'PUBLISHED' } }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase, { ...testCase, id: 'hidden', name: 'Private edge case', inputData: hiddenSecret, isHidden: true }], pagination }),
    }
    const submissions = submissionApiMock()
    const repositories = { getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Not found' })) }
    renderView(<StudentActivityDetail api={api} submissions={submissions} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Visible sample')).toBeInTheDocument()
    expect(screen.queryByText('Private edge case')).not.toBeInTheDocument()
    expect(screen.queryByText(hiddenSecret)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hidden tests and their count|\d+ hidden tests/i)).not.toBeInTheDocument()
    expect(screen.getByText('0 of 2 used')).toBeInTheDocument()
    expect(screen.queryByText('Credited result policy', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('Due', { exact: true })).toBeInTheDocument()
    expect(repositories.getActivityWorkspace).not.toHaveBeenCalled()
  })

  it('does not prepare repositories or issue credentials merely by viewing Activity Detail', async () => {
    const repositories = { getActivityWorkspace: vi.fn(), createActivityWorkspace: vi.fn() }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    expect(await screen.findByRole('button', { name: 'View repository' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attempt history' })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(repositories.getActivityWorkspace).not.toHaveBeenCalled()
    expect(repositories.createActivityWorkspace).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('View Git')).not.toBeInTheDocument()
  })

  it.each([['Open workspace', `/student/activity/${activityId}/workspace`], ['View repository', `/student/repositories/${activityWorkspace.id}`]])('ensures a missing workspace on %s and navigates directly with Class context', async (action, path) => {
    const repositories = { getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404 })), createActivityWorkspace: vi.fn().mockResolvedValue({ data: activityWorkspace }) }
    const submissions = submissionApiMock()
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissions} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    const button = await screen.findByRole('button', { name: action })
    fireEvent.click(button); fireEvent.click(button)
    expect(await screen.findByLabelText('Destination')).toHaveTextContent(`${path}?classId=${classId}`)
    expect(repositories.createActivityWorkspace).toHaveBeenCalledExactlyOnceWith(activityId)
    expect(Object.keys(submissions)).toEqual(['getAttemptState'])
  })

  it('fails closed on mismatched repository identity and offers an intentional retry', async () => {
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValueOnce({ data: { ...activityWorkspace, activityId: 'other' } }).mockResolvedValue({ data: activityWorkspace }), createActivityWorkspace: vi.fn() }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    fireEvent.click(await screen.findByRole('button', { name: 'View repository' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Destination')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Destination')).toHaveTextContent(activityWorkspace.id)
    expect(repositories.createActivityWorkspace).not.toHaveBeenCalled()
  })

  it('polls preparation only after the action, then navigates when Ready', async () => {
    vi.useFakeTimers()
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValueOnce({ data: { ...activityWorkspace, storageStatus: 'PENDING' } }).mockResolvedValueOnce({ data: { ...activityWorkspace, storageStatus: 'PROVISIONING' } }).mockResolvedValue({ data: activityWorkspace }) }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    await act(async () => {})
    expect(repositories.getActivityWorkspace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View repository' }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'View repository' })).toBeDisabled()
    await act(async () => vi.advanceTimersByTimeAsync(3000))
    expect(screen.getByLabelText('Destination')).toHaveTextContent(activityWorkspace.id)
    expect(repositories.getActivityWorkspace).toHaveBeenCalledTimes(3)
  })

  it('bounds polling and waits for a single manual check before resuming', async () => {
    vi.useFakeTimers()
    let finish
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: { ...activityWorkspace, storageStatus: 'PENDING' } }) }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'View repository' }))
    await act(async () => {})
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    const before = repositories.getActivityWorkspace.mock.calls.length
    repositories.getActivityWorkspace.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    fireEvent.click(screen.getByRole('button', { name: 'View repository' }))
    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    expect(repositories.getActivityWorkspace).toHaveBeenCalledTimes(before + 1)
    await act(async () => finish({ data: activityWorkspace }))
    expect(screen.getByLabelText('Destination')).toHaveTextContent(activityWorkspace.id)
  })

  it.each(['FAILED', 'QUARANTINED'])('does not navigate or create over %s storage', async (storageStatus) => {
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: { ...activityWorkspace, storageStatus } }), createActivityWorkspace: vi.fn() }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    fireEvent.click(await screen.findByRole('button', { name: 'View repository' }))
    expect(await screen.findByText('Repository storage is unavailable. Try again later.')).toBeInTheDocument()
    expect(repositories.createActivityWorkspace).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Destination')).not.toBeInTheDocument()
  })

  it('reuses an existing closed Activity repository, but never creates a missing one', async () => {
    const repositories = { getActivityWorkspace: vi.fn().mockRejectedValueOnce(new ApiError({ status: 404 })).mockResolvedValue({ data: activityWorkspace }), createActivityWorkspace: vi.fn() }
    renderView(<StudentActivityDetail api={studentActivityApi({ ...activity, status: 'CLOSED', dueState: 'CLOSED' })} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
    fireEvent.click(await screen.findByRole('button', { name: 'View repository' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('only while this Activity is open')
    expect(repositories.createActivityWorkspace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Destination')).toHaveTextContent(activityWorkspace.id)
  })

  it('renders loading and empty states without falling back to activity mocks', async () => {
    let resolve
    const api = { listActivities: vi.fn(() => new Promise((done) => { resolve = done })) }
    renderView(<StudentActivityList api={api} />)
    expect(await screen.findByText('Loading activities…')).toBeInTheDocument()
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    resolve({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
    await waitFor(() => expect(screen.queryByText('Loading activities…')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'No topic' })).toBeInTheDocument()
    expect(screen.getByText('No activities in this topic.')).toBeInTheDocument()
  })

  it('loads the next bounded activity page without mixing class context', async () => {
    const second = { ...activity, id: '00000000-0000-4000-8000-000000000011', title: 'Second page activity', status: 'PUBLISHED' }
    const api = { listActivities: vi.fn()
      .mockResolvedValueOnce({ data: [{ ...activity, status: 'PUBLISHED' }], pagination: { ...pagination, totalItems: 2, totalPages: 2, hasNextPage: true } })
      .mockResolvedValueOnce({ data: [second], pagination: { ...pagination, page: 2, totalItems: 2, totalPages: 2, hasPreviousPage: true } }) }
    const user = userEvent.setup()
    renderView(<StudentActivityList api={api} />)

    expect(await screen.findByText('Repository-backed Loops')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Second page activity')).toBeInTheDocument()
    expect(api.listActivities).toHaveBeenLastCalledWith(classId, { page: 2, pageSize: 20, topicId: 'none' }, expect.any(Object))
  })
})

describe('instructor activity integration', () => {
  it('lists drafts and opens the submission queue before settings', async () => {
    const api = { listActivities: vi.fn().mockResolvedValue({ data: [activity], pagination }) }
    renderView(<InstructorActivityList api={api} />)

    expect(await screen.findByText('Repository-backed Loops')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: activity.title })).toHaveAttribute('href', `/instructor/activity/${activityId}/submissions?classId=${classId}`)
    expect(screen.getByText(/Draft · Due/)).toBeInTheDocument()
  })

  it('creates a draft using only the supported backend fields', async () => {
    const api = { createActivity: vi.fn().mockResolvedValue({ data: activity }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="create" />, { entry: `/instructor/activity/new?classId=${classId}`, path: '/instructor/activity/new' })

    await user.type(screen.getByLabelText('Activity title'), 'Loop practice')
    await user.type(screen.getByLabelText('Instructions'), 'Solve the loop exercise.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Grading period' }), 'PRELIM')
    const creditedResult = screen.getByRole('combobox', { name: /^Credited result/ })
    expect(creditedResult).toHaveValue('LATEST')
    await user.selectOptions(creditedResult, 'HIGHEST')
    await user.clear(screen.getByLabelText('Deadline'))
    await user.type(screen.getByLabelText('Deadline'), '2099-09-03T17:00')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(api.createActivity).toHaveBeenCalled())
    expect(api.createActivity.mock.calls[0][0]).toBe(classId)
    expect(api.createActivity.mock.calls[0][1]).toEqual(expect.objectContaining({
      title: 'Loop practice', instructions: 'Solve the loop exercise.', language: 'JAVA', entryClassName: 'Main', maxAttempts: 1, creditPolicy: 'HIGHEST', totalPoints: 100,
    }))
    expect(api.createActivity.mock.calls[0][1]).not.toHaveProperty('attachments')
    expect(api.createActivity.mock.calls[0][1]).toHaveProperty('creationRequestId', expect.any(String))
  })

  it('adds temporary test-case rows when crypto.randomUUID is unavailable', async () => {
    const nativeCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto),
    })
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: activity }),
      listTestCases: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }),
    }
    const user = userEvent.setup()

    try {
      renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

      await screen.findByLabelText('Activity title'); await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
      await user.click(screen.getByRole('button', { name: 'Add test case' }))
      await user.click(screen.getByRole('button', { name: 'Add test case' }))

      expect(screen.queryByRole('group', { name: 'Test case 1' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /1\. Untitled case.*Visible/ })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Test case 2' })).toBeInTheDocument()
      expect(screen.getByText('2 of 50 · 0 of 100 points')).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('adopts activityUpdatedAt after atomic test replacement before publishing', async () => {
    const updatedVersion = '2026-08-10T01:00:00.000Z'
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: activity }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      replaceTestCases: vi.fn().mockResolvedValue({ data: { testCases: [{ ...testCase, name: 'Updated visible sample' }], activityUpdatedAt: updatedVersion } }),
      transition: vi.fn().mockResolvedValue({ data: { ...activity, status: 'PUBLISHED', updatedAt: '2026-08-10T02:00:00.000Z' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    await screen.findByLabelText('Activity title'); await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
    const name = await screen.findByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Updated visible sample')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('region', { name: 'Publication summary' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await user.click(screen.getByRole('button', { name: 'Confirm publish' }))

    expect(api.replaceTestCases).toHaveBeenCalledWith(activityId, expect.objectContaining({ expectedUpdatedAt: activity.updatedAt }))
    expect(api.transition).toHaveBeenCalledWith(activityId, 'publish', { expectedUpdatedAt: updatedVersion })
  })

  it('sends only mutable fields when editing a published activity and closes with the returned version', async () => {
    const published = { ...activity, status: 'PUBLISHED', publishedAt: '2026-08-10T00:30:00.000Z' }
    const saved = { ...published, title: 'Updated published title', updatedAt: '2026-08-10T01:00:00.000Z' }
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: published }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      updateActivity: vi.fn().mockResolvedValue({ data: saved }),
      transition: vi.fn().mockResolvedValue({ data: { ...saved, status: 'CLOSED', closedAt: '2026-08-10T02:00:00.000Z' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    const title = await screen.findByLabelText('Activity title')
    expect(screen.getByLabelText('Java entry class')).toBeDisabled()
    expect(screen.getByLabelText('Starter source')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: /^Credited result/ })).toBeDisabled()
    await user.clear(title)
    await user.type(title, 'Updated published title')
    await user.click(screen.getByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Activity saved.')).toBeInTheDocument()
    expect(screen.getByText('Changes saved')).toBeInTheDocument()
    expect(screen.queryByText('Action not completed')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Confirm close' }))

    const updateBody = api.updateActivity.mock.calls[0][1]
    expect(updateBody).toEqual(expect.objectContaining({ title: 'Updated published title', expectedUpdatedAt: published.updatedAt }))
    expect(updateBody).not.toHaveProperty('starterCode')
    expect(updateBody).not.toHaveProperty('entryClassName')
    expect(updateBody).not.toHaveProperty('totalPoints')
    expect(updateBody).not.toHaveProperty('creditPolicy')
    expect(api.transition).toHaveBeenCalledWith(activityId, 'close', { expectedUpdatedAt: saved.updatedAt })
  })

  it('shows authorized hidden test configuration to the owning instructor', async () => {
    const hiddenSecret = 'INSTRUCTOR-ONLY-EXPECTED'
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: activity }),
      listTestCases: vi.fn().mockResolvedValue({ data: [{ ...testCase, isHidden: true, expectedOutput: hiddenSecret }], pagination }),
    }
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    await screen.findByLabelText('Activity title'); await userEvent.click(screen.getByRole('button', { name: 'Next' })); await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByDisplayValue(hiddenSecret)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Hidden from students' })).toBeChecked()
  })

  it('restores an archived activity with the authoritative version and keeps its fields read-only', async () => {
    const archived = { ...activity, status: 'ARCHIVED', archivedAt: '2026-08-10T01:00:00.000Z' }
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: archived }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      transition: vi.fn().mockResolvedValue({ data: { ...archived, status: 'DRAFT', archivedAt: null, updatedAt: '2026-08-10T02:00:00.000Z' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    expect(await screen.findByLabelText('Activity title')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(screen.getByRole('button', { name: 'Confirm restore' }))
    expect(api.transition).toHaveBeenCalledWith(activityId, 'restore', { expectedUpdatedAt: archived.updatedAt })
  })

  it('reopens a closed activity with explicit confirmation and explains a passed deadline', async () => {
    const closed = {
      ...activity,
      status: 'CLOSED',
      dueDate: '2026-08-09T09:00:00.000Z',
      dueState: 'CLOSED',
      publishedAt: '2026-08-08T09:00:00.000Z',
      closedAt: '2026-08-10T01:00:00.000Z',
    }
    const reopened = {
      ...closed,
      status: 'PUBLISHED',
      dueState: 'PAST_DUE',
      closedAt: null,
      updatedAt: '2026-08-10T02:00:00.000Z',
    }
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: closed }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      transition: vi.fn()
        .mockResolvedValueOnce({ data: reopened })
        .mockResolvedValueOnce({ data: { ...reopened, status: 'CLOSED', updatedAt: '2026-08-10T03:00:00.000Z' } }),
    }
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    const reopen = await screen.findByRole('button', { name: 'Reopen Activity' })
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await user.click(reopen)
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Confirm reopen' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.transition).not.toHaveBeenCalled()

    await user.click(reopen)
    await user.click(screen.getByRole('button', { name: 'Confirm reopen' }))
    expect(api.transition).toHaveBeenCalledWith(activityId, 'reopen', { expectedUpdatedAt: closed.updatedAt })
    expect(await screen.findByText(/deadline has already passed; extend it separately/i)).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reopen Activity' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /^Credited result/ })).toBeDisabled()
    expect(screen.getByLabelText('Starter source')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Confirm close' }))
    expect(api.transition).toHaveBeenLastCalledWith(activityId, 'close', { expectedUpdatedAt: reopened.updatedAt })
  })

  it.each(['DRAFT', 'PUBLISHED', 'ARCHIVED'])('does not show reopen for %s activities', async (status) => {
    const record = {
      ...activity,
      status,
      publishedAt: status === 'DRAFT' ? null : '2026-08-08T09:00:00.000Z',
      archivedAt: status === 'ARCHIVED' ? '2026-08-10T01:00:00.000Z' : null,
    }
    const api = {
      getActivity: vi.fn().mockResolvedValue({ data: record }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
    }
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    await screen.findByLabelText('Activity title')
    expect(screen.queryByRole('button', { name: 'Reopen Activity' })).not.toBeInTheDocument()
  })

  it('reloads authoritative closed state after a stale reopen conflict', async () => {
    const closed = {
      ...activity,
      status: 'CLOSED',
      publishedAt: '2026-08-08T09:00:00.000Z',
      closedAt: '2026-08-10T01:00:00.000Z',
    }
    const newer = { ...closed, updatedAt: '2026-08-10T03:00:00.000Z' }
    const api = {
      getActivity: vi.fn().mockResolvedValueOnce({ data: closed }).mockResolvedValueOnce({ data: newer }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      transition: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_ACTIVITY_VERSION', message: 'The activity changed.' })),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    await user.click(await screen.findByRole('button', { name: 'Reopen Activity' }))
    await user.click(screen.getByRole('button', { name: 'Confirm reopen' }))
    expect(await screen.findByText('This record changed while you were working. Refresh it before trying again.')).toBeInTheDocument()
    expect(api.getActivity).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Reopen Activity' })).toBeInTheDocument()
  })

  it('preserves unsaved form values and reloads the authoritative version after a conflict', async () => {
    const newer = { ...activity, title: 'Server title', updatedAt: '2026-08-10T03:00:00.000Z' }
    const api = {
      getActivity: vi.fn().mockResolvedValueOnce({ data: activity }).mockResolvedValueOnce({ data: newer }),
      listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }),
      updateActivity: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_ACTIVITY_VERSION', message: 'The activity changed.' })),
    }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="edit" />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })

    const title = await screen.findByLabelText('Activity title')
    await user.clear(title)
    await user.type(title, 'My unsaved title')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('This record changed while you were working. Refresh it before trying again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Activity title')).toHaveValue('My unsaved title')
    expect(api.getActivity).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Load latest saved draft' }))
    expect(await screen.findByDisplayValue('Server title')).toBeInTheDocument()
    expect(api.getActivity).toHaveBeenCalledTimes(2)
  })
})

describe('Instructor authoring overhaul', () => {
  it('creates an Ungraded draft with no numeric points while retaining deadline, source and attempts', async () => {
    const api = { createActivity: vi.fn().mockResolvedValue({ data: { ...activity, gradingMode: 'COMPLETION', totalPoints: null } }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="create" />, { entry: `/instructor/activity/new?classId=${classId}`, path: '/instructor/activity/new' })
    await user.type(screen.getByLabelText('Activity title'), 'Completion practice')
    await user.type(screen.getByLabelText('Instructions'), 'Practice until ready, then submit.')
    await user.type(screen.getByLabelText('Deadline'), '2099-09-03T17:00')
    await user.selectOptions(screen.getByLabelText('Grading mode'), 'COMPLETION')
    expect(screen.queryByLabelText('Total points')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Credited result')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(api.createActivity).toHaveBeenCalled())
    expect(api.createActivity.mock.calls[0][1]).toMatchObject({ gradingMode: 'COMPLETION', totalPoints: null, maxAttempts: 1, language: 'JAVA' })
    expect(api.createActivity.mock.calls[0][1].starterCode).toContain('public class Main')
  })
  it('keeps edits while switching selected cases, focuses a new case and confirms removal', async () => {
    const api = { getActivity: vi.fn().mockResolvedValue({ data: activity }), listTestCases: vi.fn().mockResolvedValue({ data: [testCase, { ...testCase, id: 'second', name: 'Boundary' }], pagination }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })
    await screen.findByLabelText('Activity title'); await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByDisplayValue('Visible sample')
    await user.clear(screen.getByLabelText('Input')); await user.type(screen.getByLabelText('Input'), 'Unsaved case input')
    await user.click(screen.getByRole('button', { name: /2\. Boundary/ }))
    expect(screen.getByLabelText('Name')).toHaveValue('Boundary')
    await user.click(screen.getByRole('button', { name: /1\. Visible sample/ }))
    expect(screen.getByLabelText('Input')).toHaveValue('Unsaved case input')
    await user.click(screen.getByRole('button', { name: 'Add test case' }))
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Keep case' }))
    expect(screen.getByRole('group', { name: 'Test case 3' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Remove case' }))
    expect(screen.queryByRole('button', { name: /3\. Untitled/ })).not.toBeInTheDocument()
  })
})


it('keeps only due date and attempts in Your work and opens history without leaving the Activity', async () => {
  const api = studentActivityApi(), submissions = submissionApiMock()
  submissions.listSubmissions = vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
  const repositories = { getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND' })) }
  const user = userEvent.setup()
  renderView(<StudentActivityDetail api={api} submissions={submissions} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })
  const history = await screen.findByRole('button', { name: 'Attempt history' })
  expect(screen.getByText('0 of 2 used')).toBeInTheDocument()
  for (const label of ['Language', 'Entry class', 'Maximum attempts', 'Ordinary attempts remaining', 'Credited result policy', 'Total points']) expect(screen.queryByText(label, { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('Due', { exact: true })).toBeInTheDocument()
  expect(submissions.listSubmissions).not.toHaveBeenCalled()
  await user.click(history)
  expect(screen.getByRole('dialog', { name: 'Attempt history' })).toBeInTheDocument()
  expect(await screen.findByText('No attempts yet')).toBeInTheDocument()
  expect(submissions.listSubmissions).toHaveBeenCalledWith(activityId, { page: 1, pageSize: 20, status: '' }, expect.any(Object))
  expect(screen.queryByText('Attempts are immutable records. Practice runs do not appear here.')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(history).toHaveFocus()
})


it('keeps draft form and test-case edits while moving Back and Next', async () => {
  const api = { getActivity: vi.fn().mockResolvedValue({ data: activity }), listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }), updateActivity: vi.fn().mockImplementation((_id, body) => Promise.resolve({ data: { ...activity, ...body, updatedAt: '2026-08-10T01:00:00.000Z' } })) }
  const user = userEvent.setup()
  renderView(<InstructorActivityEditor api={api} />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })
  await user.clear(await screen.findByLabelText('Activity title')); await user.type(screen.getByLabelText('Activity title'), 'Saved via Next')
  await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.clear(screen.getByLabelText('Name')); await user.type(screen.getByLabelText('Name'), 'Unsaved test name')
  await user.click(screen.getByRole('button', { name: 'Back', exact: true })); await user.click(screen.getByRole('button', { name: 'Back', exact: true }))
  expect(screen.getByLabelText('Activity title')).toHaveValue('Saved via Next')
  await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByLabelText('Name')).toHaveValue('Unsaved test name')
  expect(screen.queryByText('Before publishing')).not.toBeInTheDocument()
})


it('validates Java only when advancing from the Java step', async () => {
  const api = { getActivity: vi.fn().mockResolvedValue({ data: activity }), listTestCases: vi.fn().mockResolvedValue({ data: [testCase], pagination }) }
  const user = userEvent.setup()
  renderView(<InstructorActivityEditor api={api} />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })
  await screen.findByLabelText('Activity title'); await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.clear(screen.getByLabelText('Starter source'))
  await user.click(screen.getByRole('button', { name: 'Back', exact: true }))
  expect(screen.queryByText('Enter starter source of no more than 100,000 characters.')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Enter starter source of no more than 100,000 characters.')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Step 2: Java starter' })).toBeInTheDocument()
})
