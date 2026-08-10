import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', `/student/activity/${activityId}?classId=${classId}`)
    expect(api.listActivities).toHaveBeenCalledWith(classId, { page: 1, pageSize: 20, status: '' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
    renderView(<StudentActivityDetail api={api} />, { entry: `/student/activity/${activityId}?classId=${classId}`, path: '/student/activity/:activityId' })

    expect(await screen.findByText('Visible sample')).toBeInTheDocument()
    expect(screen.queryByText('Private edge case')).not.toBeInTheDocument()
    expect(screen.queryByText(hiddenSecret)).not.toBeInTheDocument()
    expect(screen.getByText(/Hidden tests and their count remain private/)).toBeInTheDocument()
  })

  it('renders loading and empty states without falling back to activity mocks', async () => {
    let resolve
    const api = { listActivities: vi.fn(() => new Promise((done) => { resolve = done })) }
    renderView(<StudentActivityList api={api} />)
    expect(screen.getByText('Loading programming activities.')).toBeInTheDocument()
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    resolve({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
    expect(await screen.findByText('No programming activities match this view.')).toBeInTheDocument()
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
    expect(api.listActivities).toHaveBeenLastCalledWith(classId, { page: 2, pageSize: 20, status: '' }, expect.any(Object))
  })
})

describe('instructor activity integration', () => {
  it('lists drafts and links to the dynamic settings route', async () => {
    const api = { listActivities: vi.fn().mockResolvedValue({ data: [activity], pagination }) }
    renderView(<InstructorActivityList api={api} />)

    expect(await screen.findByText('Repository-backed Loops')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Configure' })).toHaveAttribute('href', `/instructor/activity/${activityId}/settings?classId=${classId}`)
    expect(screen.getAllByText('Draft')).toHaveLength(2)
  })

  it('creates a draft using only the supported backend fields', async () => {
    const api = { createActivity: vi.fn().mockResolvedValue({ data: activity }) }
    const user = userEvent.setup()
    renderView(<InstructorActivityEditor api={api} mode="create" />, { entry: `/instructor/activity/new?classId=${classId}`, path: '/instructor/activity/new' })

    await user.type(screen.getByLabelText('Activity title'), 'Loop practice')
    await user.type(screen.getByLabelText('Instructions'), 'Solve the loop exercise.')
    await user.clear(screen.getByLabelText('Deadline'))
    await user.type(screen.getByLabelText('Deadline'), '2099-09-03T17:00')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => expect(api.createActivity).toHaveBeenCalled())
    expect(api.createActivity.mock.calls[0][0]).toBe(classId)
    expect(api.createActivity.mock.calls[0][1]).toEqual(expect.objectContaining({
      title: 'Loop practice', instructions: 'Solve the loop exercise.', language: 'JAVA', entryClassName: 'Main', maxAttempts: 1, totalPoints: 100,
    }))
    expect(api.createActivity.mock.calls[0][1]).not.toHaveProperty('attachments')
    expect(screen.queryByText(/rubric/i)).not.toBeInTheDocument()
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
    expect(await screen.findByText('Test cases saved. The latest activity version is now active.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish' }))

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
    await user.clear(title)
    await user.type(title, 'Updated published title')
    await user.click(screen.getByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Activity saved.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))

    const updateBody = api.updateActivity.mock.calls[0][1]
    expect(updateBody).toEqual(expect.objectContaining({ title: 'Updated published title', expectedUpdatedAt: published.updatedAt }))
    expect(updateBody).not.toHaveProperty('starterCode')
    expect(updateBody).not.toHaveProperty('entryClassName')
    expect(updateBody).not.toHaveProperty('totalPoints')
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
    expect(api.transition).toHaveBeenCalledWith(activityId, 'restore', { expectedUpdatedAt: archived.updatedAt })
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
