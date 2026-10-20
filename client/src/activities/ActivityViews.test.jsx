import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
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

function repositorySummary(commit = null) {
  return {
    data: {
      repositoryId: activityWorkspace.id,
      repositoryStatus: 'ACTIVE',
      storageStatus: 'READY',
      empty: commit === null,
      defaultBranch: 'main',
      branchCount: commit ? 1 : 0,
      commitCount: commit ? 1 : 0,
      latestCommit: commit,
    },
  }
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

afterEach(() => vi.useRealTimers())

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
      <ClassContext.Provider value={classValue()}>
        <Routes><Route path={path} element={element} /></Routes>
      </ClassContext.Provider>
    </MemoryRouter>,
  )
}

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

    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
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
    expect(screen.getByText('Latest attempt')).toBeInTheDocument()
    expect(await screen.findByText('Not prepared')).toBeInTheDocument()
  })

  it('keeps Activity Detail usable when no Git Workspace exists and offers lifecycle-safe creation', async () => {
    const repositories = {
      getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Not found' })),
      createActivityWorkspace: vi.fn(),
    }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Visible sample')).toBeInTheDocument()
    expect(await screen.findByText('Not prepared')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare workspace' })).toBeInTheDocument()
    expect(screen.getByText('Git push saves your work. It does not submit the Activity.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Code/ })).toBeDisabled()
  })

  it('creates exactly one matching Activity Workspace and issues the correct native Git credential from Code', async () => {
    const repositories = {
      getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Not found' })),
      createActivityWorkspace: vi.fn().mockResolvedValue({ data: activityWorkspace }),
    }
    const repositoryContent = {
      getSummary: vi.fn().mockResolvedValue(repositorySummary()),
      getTransportUrl: vi.fn().mockReturnValue(`http://localhost:3300/api/v1/git/repositories/${activityWorkspace.id}`),
      issueCredential: vi.fn().mockResolvedValue({ data: {
        credentialId: 'credential-1', repositoryId: activityWorkspace.id, operations: ['READ', 'WRITE'],
        createdAt: '2026-08-10T00:00:00.000Z', expiresAt: '2099-09-03T09:15:00.000Z', lastUsedAt: null, revokedAt: null,
        username: 'student-git-user', secret: 'temporary-secret',
      } }),
    }
    const user = userEvent.setup()
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} repositoryContent={repositoryContent} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    const create = await screen.findByRole('button', { name: 'Prepare workspace' })
    await user.dblClick(create)
    expect((await screen.findAllByText('Ready')).length).toBeGreaterThan(0)
    expect(repositories.createActivityWorkspace).toHaveBeenCalledTimes(1)
    expect(repositories.createActivityWorkspace).toHaveBeenCalledWith(activityId)
    expect(screen.getByText('main · 0 commits')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Code/ }))
    expect(repositoryContent.issueCredential).toHaveBeenCalledWith(activityWorkspace.id, ['READ', 'WRITE'])
    expect(await screen.findByText('student-git-user')).toBeInTheDocument()
    expect(screen.getByText('temporary-secret')).toBeInTheDocument()
    expect(screen.getByText('Temporary access token')).toBeInTheDocument()
    expect(screen.queryByText(/Clone command/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Issue Read/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close Code menu' }))
    expect(screen.queryByText('temporary-secret')).not.toBeInTheDocument()
  })

  it('fails closed when creation returns a workspace linked to another Activity', async () => {
    const repositories = {
      getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 404, code: 'ACTIVITY_WORKSPACE_NOT_FOUND', message: 'Not found' })),
      createActivityWorkspace: vi.fn().mockResolvedValue({ data: { ...activityWorkspace, activityId: 'other-activity' } }),
    }
    const user = userEvent.setup()
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    await user.click(await screen.findByRole('button', { name: 'Prepare workspace' }))
    expect(await screen.findByText(/latest Git Workspace status could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Code/ })).toBeDisabled()
    expect(repositories.createActivityWorkspace).toHaveBeenCalledTimes(1)
  })

  it('discards a one-time Git secret if the Code menu closes while issuance is still in flight', async () => {
    let resolveCredential
    const repositoryContent = {
      getSummary: vi.fn().mockResolvedValue(repositorySummary()),
      getTransportUrl: vi.fn().mockReturnValue(`http://localhost:3300/api/v1/git/repositories/${activityWorkspace.id}`),
      issueCredential: vi.fn(() => new Promise((resolve) => { resolveCredential = resolve })),
    }
    const user = userEvent.setup()
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={{ getActivityWorkspace: vi.fn().mockResolvedValue({ data: activityWorkspace }) }} repositoryContent={repositoryContent} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    await user.click(await screen.findByRole('button', { name: /Code/ }))
    await user.click(screen.getByRole('button', { name: 'Close Code menu' }))
    await act(async () => resolveCredential({ data: {
      credentialId: 'credential-late', repositoryId: activityWorkspace.id, operations: ['READ', 'WRITE'],
      createdAt: '2026-08-10T00:00:00.000Z', expiresAt: '2099-09-03T09:15:00.000Z', lastUsedAt: null, revokedAt: null,
      username: 'late-user', secret: 'late-secret',
    } }))

    expect(screen.queryByText('late-secret')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Native Git access' })).not.toBeInTheDocument()
  })

  it('polls a provisioning Activity Workspace until Ready', async () => {
    const repositories = {
      getActivityWorkspace: vi.fn()
        .mockResolvedValueOnce({ data: { ...activityWorkspace, storageStatus: 'PENDING' } })
        .mockResolvedValueOnce({ data: { ...activityWorkspace, storageStatus: 'PROVISIONING' } })
        .mockResolvedValueOnce({ data: activityWorkspace }),
    }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} repositoryContent={{ getSummary: vi.fn().mockResolvedValue(repositorySummary()) }} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Projex is preparing your private Git workspace.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Ready').length).toBeGreaterThan(0), { timeout: 3500 })
    expect(repositories.getActivityWorkspace).toHaveBeenCalledTimes(3)
  })

  it('keeps automatic polling paused until a bounded-stop manual refresh completes', async () => {
    vi.useFakeTimers()
    let activeRequests = 0
    let maximumActiveRequests = 0
    let holdNextRequest = false
    let resolveManualRefresh
    let finishWithReady = false
    const getActivityWorkspace = vi.fn(() => {
      activeRequests += 1
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests)
      if (holdNextRequest) {
        holdNextRequest = false
        return new Promise((resolve) => {
          resolveManualRefresh = () => {
            activeRequests -= 1
            resolve({ data: { ...activityWorkspace, storageStatus: 'PROVISIONING' } })
          }
        })
      }
      activeRequests -= 1
      return Promise.resolve({ data: { ...activityWorkspace, storageStatus: finishWithReady ? 'READY' : 'PENDING' } })
    })
    const repositories = { getActivityWorkspace }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} repositoryContent={{ getSummary: vi.fn().mockResolvedValue(repositorySummary()) }} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    await act(async () => {})
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    const refresh = screen.getByRole('button', { name: 'Refresh status' })
    const callsBeforeRefresh = getActivityWorkspace.mock.calls.length
    holdNextRequest = true
    fireEvent.click(refresh)
    expect(getActivityWorkspace).toHaveBeenCalledTimes(callsBeforeRefresh + 1)
    expect(activeRequests).toBe(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(getActivityWorkspace).toHaveBeenCalledTimes(callsBeforeRefresh + 1)
    expect(maximumActiveRequests).toBe(1)

    finishWithReady = true
    await act(async () => { resolveManualRefresh() })
    expect(screen.queryByRole('button', { name: 'Refresh status' })).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(750) })
    expect(getActivityWorkspace).toHaveBeenCalledTimes(callsBeforeRefresh + 2)
    expect(maximumActiveRequests).toBe(1)
  })

  it.each(['FAILED', 'QUARANTINED'])('shows %s storage as unavailable without credential actions', async (storageStatus) => {
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: { ...activityWorkspace, storageStatus } }) }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={repositories} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Repository storage is unavailable. Internal worker and storage details are not shown.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Code/ })).toBeDisabled()
  })

  it('keeps a closed Activity Workspace visible with read-only guidance', async () => {
    const closed = { ...activity, status: 'CLOSED', dueState: 'CLOSED' }
    const repositories = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: activityWorkspace }) }
    const repositoryContent = {
      getSummary: vi.fn().mockResolvedValue(repositorySummary()),
      getTransportUrl: vi.fn().mockReturnValue(`http://localhost:3300/api/v1/git/repositories/${activityWorkspace.id}`),
      issueCredential: vi.fn().mockResolvedValue({ data: {
        credentialId: 'credential-read', repositoryId: activityWorkspace.id, operations: ['READ'],
        createdAt: '2026-08-10T00:00:00.000Z', expiresAt: '2099-09-03T09:15:00.000Z', lastUsedAt: null, revokedAt: null,
        username: 'student-read-only', secret: 'read-secret',
      } }),
    }
    const user = userEvent.setup()
    renderView(<StudentActivityDetail api={studentActivityApi(closed)} submissions={submissionApiMock()} repositories={repositories} repositoryContent={repositoryContent} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Activity closed — repository is read-only.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Code/ }))
    expect(repositoryContent.issueCredential).toHaveBeenCalledWith(activityWorkspace.id, ['READ'])
    expect(await screen.findByText('student-read-only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prepare workspace' })).not.toBeInTheDocument()
  })

  it('shows current repository history and refetches a native Git HEAD on focus', async () => {
    const firstCommit = {
      commitId: 'a'.repeat(40),
      subject: 'Initial browser save',
      authorName: 'Student',
      authoredAt: '2026-10-18T00:00:00.000Z',
    }
    const pushedCommit = {
      commitId: 'b'.repeat(40),
      subject: 'Native IDE update',
      authorName: 'Student',
      authoredAt: '2026-10-18T01:00:00.000Z',
    }
    const repositoryContent = {
      getSummary: vi.fn()
        .mockResolvedValueOnce({ data: { ...repositorySummary(firstCommit).data, commitCount: 1 } })
        .mockResolvedValue({ data: { ...repositorySummary(pushedCommit).data, commitCount: 2 } }),
      getTransportUrl: vi.fn().mockReturnValue('http://localhost/repository.git'),
      issueCredential: vi.fn(),
    }
    renderView(<StudentActivityDetail api={studentActivityApi()} submissions={submissionApiMock()} repositories={{ getActivityWorkspace: vi.fn().mockResolvedValue({ data: activityWorkspace }) }} repositoryContent={repositoryContent} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Initial browser save')).toBeInTheDocument()
    expect(screen.getByText('main · 1 commit')).toBeInTheDocument()
    act(() => window.dispatchEvent(new Event('focus')))
    expect(await screen.findByText('Native IDE update')).toBeInTheDocument()
    expect(screen.getByText('main · 2 commits')).toBeInTheDocument()
    expect(repositoryContent.getSummary.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('renders loading and empty states without falling back to activity mocks', async () => {
    let resolve
    const api = { listActivities: vi.fn(() => new Promise((done) => { resolve = done })) }
    renderView(<StudentActivityList api={api} />)
    expect(await screen.findByText('Loading activities…')).toBeInTheDocument()
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    resolve({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
    await waitFor(() => expect(screen.queryByText('Loading activities…')).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'No topic' })).not.toBeInTheDocument()
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
  it('lists drafts and links to the dynamic settings route', async () => {
    const api = { listActivities: vi.fn().mockResolvedValue({ data: [activity], pagination }) }
    renderView(<InstructorActivityList api={api} />)

    expect(await screen.findByText('Repository-backed Loops')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: activity.title })).toHaveAttribute('href', `/instructor/activity/${activityId}/settings?classId=${classId}`)
    expect(screen.getByText(/Draft · Due/)).toBeInTheDocument()
  })

  it('creates a draft using only the supported backend fields', async () => {
    const api = { createActivity: vi.fn().mockResolvedValue({ data: activity }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="create" />, { entry: `/instructor/activity/new?classId=${classId}`, path: '/instructor/activity/new' })

    await user.type(screen.getByLabelText('Activity title'), 'Loop practice')
    await user.type(screen.getByLabelText('Instructions'), 'Solve the loop exercise.')
    const creditedResult = screen.getByRole('combobox', { name: /^Credited result/ })
    expect(creditedResult).toHaveValue('LATEST')
    await user.selectOptions(creditedResult, 'HIGHEST')
    await user.clear(screen.getByLabelText('Deadline'))
    await user.type(screen.getByLabelText('Deadline'), '2099-09-03T17:00')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => expect(api.createActivity).toHaveBeenCalled())
    expect(api.createActivity.mock.calls[0][0]).toBe(classId)
    expect(api.createActivity.mock.calls[0][1]).toEqual(expect.objectContaining({
      title: 'Loop practice', instructions: 'Solve the loop exercise.', language: 'JAVA', entryClassName: 'Main', maxAttempts: 1, creditPolicy: 'HIGHEST', totalPoints: 100,
    }))
    expect(api.createActivity.mock.calls[0][1]).not.toHaveProperty('attachments')
    expect(screen.queryByText(/rubric/i)).not.toBeInTheDocument()
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

      await user.click(await screen.findByRole('button', { name: 'Add test case' }))
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

    const name = await screen.findByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Updated visible sample')
    await user.click(screen.getByRole('button', { name: 'Save test cases' }))
    expect(await screen.findByText('Test cases saved.')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Save activity' }))

    expect(await screen.findByText('This record changed while you were working. Refresh it before trying again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Activity title')).toHaveValue('My unsaved title')
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
    await user.click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => expect(api.createActivity).toHaveBeenCalled())
    expect(api.createActivity.mock.calls[0][1]).toMatchObject({ gradingMode: 'COMPLETION', totalPoints: null, maxAttempts: 1, language: 'JAVA' })
    expect(api.createActivity.mock.calls[0][1].starterCode).toContain('public class Main')
  })
  it('keeps edits while switching selected cases, focuses a new case and confirms removal', async () => {
    const api = { getActivity: vi.fn().mockResolvedValue({ data: activity }), listTestCases: vi.fn().mockResolvedValue({ data: [testCase, { ...testCase, id: 'second', name: 'Boundary' }], pagination }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} />, { entry: `/instructor/activity/${activityId}/settings?classId=${classId}`, path: '/instructor/activity/:activityId/settings' })
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
