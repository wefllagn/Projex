import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ClassContext } from '../classes/class-context.js'
import {
  LegacySubmissionRoute,
  StudentProgrammingWorkspace,
  StudentSubmissionDetail,
  StudentSubmissionHistory,
} from './StudentSubmissionViews.jsx'

const classId = '00000000-0000-4000-8000-000000000001'
const activityId = '00000000-0000-4000-8000-000000000010'
const submissionId = '00000000-0000-4000-8000-000000000020'
const runId = '00000000-0000-4000-8000-000000000030'
const repositoryId = '00000000-0000-4000-8000-000000000040'
const commitId = 'a'.repeat(40)
const starterCode = 'public class Main {\n    public static void main(String[] args) {}\n}'
const changedCode = 'public class Main { public static void main(String[] args) { System.out.println("changed"); } }'

const selectedClass = {
  id: classId,
  className: 'Programming Fundamentals',
  section: 'BSIT 1A',
  status: 'ACTIVE',
}

const activity = {
  id: activityId,
  classId,
  title: 'Repository-backed Loops',
  instructions: 'Read the visible examples and implement Main.',
  dueDate: '2099-09-03T09:00:00.000Z',
  dueState: 'OPEN',
  language: 'JAVA',
  entryClassName: 'Main',
  starterCode,
  maxAttempts: 2,
  creditPolicy: 'LATEST',
  totalPoints: 100,
  status: 'PUBLISHED',
  createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}

const visibleTest = {
  id: 'visible-1',
  name: 'Visible sample',
  inputData: '3',
  expectedOutput: '1 2 3',
  isHidden: false,
}

const pagination = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

function activityTransport(overrides = {}) {
  return {
    getActivity: vi.fn().mockResolvedValue({ data: activity }),
    listTestCases: vi.fn().mockResolvedValue({ data: [visibleTest], pagination }),
    ...overrides,
  }
}

function submissionRecord(overrides = {}) {
  return {
    id: submissionId,
    activityId,
    activityTitle: activity.title,
    attemptLabel: 'Attempt 1',
    replacementForAttemptNumber: null,
    submittedAt: '2026-08-10T01:00:00.000Z',
    status: 'queued',
    isLate: false,
    updatedAt: '2026-08-10T01:00:00.000Z',
    sourceCode: changedCode,
    visibleTestOutcomes: [],
    gradeStatus: 'pending',
    isCreditedResult: false,
    failureResolution: null,
    ...overrides,
  }
}

function mockWorkspaceViewport(matches) {
  let current = matches
  const listeners = new Set()
  const query = {
    media: '(min-width: 1181px)',
    get matches() { return current },
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return {
    setMatches(next) {
      current = next
      listeners.forEach((listener) => listener({ matches: next, media: query.media }))
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function attemptState(overrides = {}) {
  return {
    activityId,
    activityStatus: activity.status,
    dueState: activity.dueState,
    maxAttempts: activity.maxAttempts,
    creditPolicy: 'LATEST',
    countingAttemptsUsed: 0,
    remainingOrdinaryAttempts: activity.maxAttempts,
    ordinarySubmissionAllowed: true,
    replacementAvailable: false,
    replacement: null,
    nextAllowedSubmissionKind: 'ORDINARY',
    submissionBlockedReason: null,
    releasedAttempts: [],
    creditedResult: null,
    observedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

function submissionTransport(overrides = {}) {
  return {
    getAttemptState: vi.fn().mockResolvedValue({ data: attemptState() }),
    listSubmissions: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }),
    createVisibleTestRun: vi.fn(),
    getVisibleTestRun: vi.fn(),
    createCodeRun: vi.fn(),
    getCodeRun: vi.fn(),
    createSubmission: vi.fn(),
    getSubmission: vi.fn().mockResolvedValue({ data: submissionRecord() }),
    ...overrides,
  }
}

function gitDependencies({ repositoryOverrides = {}, contentOverrides = {} } = {}) {
  return {
    repositories: {
      getActivityWorkspace: vi.fn().mockResolvedValue({ data: { id: repositoryId, repositoryType: 'ACTIVITY_WORKSPACE', activityId, storageStatus: 'READY' } }),
      createActivityCheckpoint: vi.fn(),
      getActivityCheckpoint: vi.fn(),
      ...repositoryOverrides,
    },
    repositoryContent: {
      getSummary: vi.fn().mockResolvedValue({ data: { repositoryId, empty: true, defaultBranch: 'main', latestCommit: null } }),
      getFile: vi.fn(),
      ...contentOverrides,
    },
  }
}

function renderWithClass(element, {
  entry = `/student/activity/${activityId}/workspace?classId=${classId}`,
  path = '/student/activity/:activityId/workspace',
  destination = false,
  legacyDestination = false,
  initialEntries = [entry],
} = {}) {
  const router = createMemoryRouter([{ path: '*', element:
      <ClassContext.Provider value={{
        selectedClass,
        requestedClassId: classId,
        selectionStatus: 'ready',
        selectionError: null,
      }}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/student/activity/:activityId" element={<p>Activity detail destination</p>} />
          {destination && <Route path="/student/activity/:activityId/submissions/:submissionId" element={<p>Canonical submission destination</p>} />}
          {legacyDestination && <Route path="/student/activity/:activityId/submissions" element={<LocationProbe />} />}
        </Routes>
      </ClassContext.Provider>
  }], { initialEntries })
  return { ...render(<RouterProvider router={router} />), router }
}

function LocationProbe() {
  const location = useLocation()
  return <p>{location.pathname}{location.search}</p>
}

describe('student programming workspace', () => {
  it('preserves unsaved source when cancelling link and history navigation, including Escape and focus', async () => {
    const user = userEvent.setup()
    const { router } = renderWithClass(<StudentProgrammingWorkspace api={activityTransport()} submissions={submissionTransport()} {...gitDependencies()} />, {
      initialEntries: [`/student/activity/${activityId}?classId=${classId}`, `/student/activity/${activityId}/workspace?classId=${classId}`],
    })
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    fireEvent.change(editor, { target: { value: changedCode } })
    await user.click(screen.getByRole('link', { name: 'Back to Activity' }))
    expect(await screen.findByRole('dialog', { name: 'Leave unsaved code?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(editor).toHaveValue(changedCode)
    expect(screen.getByRole('link', { name: 'Back to Activity' })).toHaveFocus()
    await act(async () => { await router.navigate(-1) })
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }))
    expect(editor).toHaveValue(changedCode)
    await user.click(screen.getByRole('link', { name: 'Back to Activity' }))
    await user.click(await screen.findByRole('button', { name: 'Leave without saving' }))
    expect(await screen.findByText('Activity detail destination')).toBeInTheDocument()
  })

  it('saves the current browser source as a Git checkpoint without creating a submission', async () => {
    const repositories = gitDependencies({
      repositoryOverrides: {
        createActivityCheckpoint: vi.fn().mockResolvedValue({ data: {
          checkpointId: '00000000-0000-4000-8000-000000000050',
          repositoryId,
          activityId,
          status: 'PENDING',
          resultingCommitHash: null,
        } }),
        getActivityCheckpoint: vi.fn().mockResolvedValue({ data: {
          checkpointId: '00000000-0000-4000-8000-000000000050',
          repositoryId,
          activityId,
          status: 'SUCCEEDED',
          resultingCommitHash: commitId,
        } }),
      },
    })
    const submissions = submissionTransport()
    renderWithClass(
      <StudentProgrammingWorkspace
        {...repositories}
        api={activityTransport()}
        submissions={submissions}
        pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 1000 }}
      />,
    )

    const editor = await screen.findByLabelText('Java source code')
    fireEvent.change(editor, { target: { value: changedCode } })
    await userEvent.click(await screen.findByRole('button', { name: 'Save to Git' }))

    await waitFor(() => expect(repositories.repositories.createActivityCheckpoint).toHaveBeenCalledOnce())
    expect(repositories.repositories.createActivityCheckpoint).toHaveBeenCalledWith(
      activityId,
      { sourceCode: changedCode, expectedHeadCommitHash: null },
      expect.stringMatching(/^checkpoint:[A-Za-z0-9-]{16,}$/),
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Git' }))
    expect(await screen.findByText(/Saved at commit aaaaaaaa/)).toBeInTheDocument()
    expect(submissions.createSubmission).not.toHaveBeenCalled()
    expect(submissions.getAttemptState).toHaveBeenCalledTimes(1)
  })

  it('keeps newer browser edits dirty when an earlier queued checkpoint succeeds', async () => {
    const checkpointId = '00000000-0000-4000-8000-000000000050'
    const queuedSource = changedCode
    const newerSource = 'public class Main { public static void main(String[] args) { System.out.println("newer"); } }'
    let latestCommit = null
    let completeCheckpoint
    const checkpointResult = new Promise((resolve) => { completeCheckpoint = resolve })
    const git = gitDependencies({
      repositoryOverrides: {
        createActivityCheckpoint: vi.fn().mockResolvedValue({ data: {
          checkpointId,
          repositoryId,
          activityId,
          status: 'PENDING',
          resultingCommitHash: null,
        } }),
        getActivityCheckpoint: vi.fn(() => checkpointResult),
      },
      contentOverrides: {
        getSummary: vi.fn(() => Promise.resolve({ data: {
          repositoryId,
          empty: latestCommit === null,
          defaultBranch: 'main',
          latestCommit,
        } })),
        getFile: vi.fn().mockResolvedValue({ data: {
          commitId,
          path: 'Main.java',
          content: queuedSource,
          sizeBytes: queuedSource.length,
          encoding: 'utf-8',
        } }),
      },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithClass(
      <StudentProgrammingWorkspace
        {...git}
        api={activityTransport()}
        submissions={submissionTransport()}
        pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 1000 }}
      />,
    )

    const editor = await screen.findByLabelText('Java source code')
    fireEvent.change(editor, { target: { value: queuedSource } })
    await userEvent.click(await screen.findByRole('button', { name: 'Save to Git' }))
    await waitFor(() => expect(git.repositories.getActivityCheckpoint).toHaveBeenCalledOnce())

    fireEvent.change(editor, { target: { value: newerSource } })
    latestCommit = { commitId }
    await act(async () => completeCheckpoint({ data: {
      checkpointId,
      repositoryId,
      activityId,
      status: 'SUCCEEDED',
      resultingCommitHash: commitId,
    } }))

    await userEvent.click(screen.getByRole('tab', { name: 'Git' }))
    expect(await screen.findByText(/Saved at commit aaaaaaaa/)).toBeInTheDocument()
    expect(screen.getByText('Browser draft')).toBeInTheDocument()
    expect(editor).toHaveValue(newerSource)

    await userEvent.click(screen.getByRole('button', { name: 'Load latest from Git' }))
    expect(window.confirm).toHaveBeenCalledWith('Replace the unsaved browser source with the latest Git Workspace version?')
    expect(editor).toHaveValue(newerSource)
  })

  it('loads the latest pushed Main.java into the editor but still requires explicit Submit', async () => {
    const pushedSource = 'public class Main { public static void main(String[] args) { System.out.println("home"); } }'
    const git = gitDependencies({ contentOverrides: {
      getSummary: vi.fn().mockResolvedValue({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId } } }),
      getFile: vi.fn().mockResolvedValue({ data: { commitId, path: 'Main.java', content: pushedSource, sizeBytes: pushedSource.length, encoding: 'utf-8' } }),
    } })
    const submissions = submissionTransport()
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissions} />)

    await userEvent.click(await screen.findByRole('tab', { name: 'Git' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Load latest from Git' }))
    expect(await screen.findByLabelText('Java source code')).toHaveValue(pushedSource)
    expect(screen.getByText(/Loaded Main.java from commit aaaaaaaa/)).toBeInTheDocument()
    expect(git.repositoryContent.getFile).toHaveBeenCalledWith(repositoryId, { commitId, path: 'Main.java' })
    expect(submissions.createSubmission).not.toHaveBeenCalled()
  })

  it('refuses to checkpoint stale browser source when a newer push is detected', async () => {
    const newerCommit = 'b'.repeat(40)
    const git = gitDependencies({ contentOverrides: {
      getSummary: vi.fn()
        .mockResolvedValueOnce({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId } } })
        .mockResolvedValueOnce({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId: newerCommit } } }),
    } })
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissionTransport()} />)
    fireEvent.change(await screen.findByLabelText('Java source code'), { target: { value: changedCode } })
    await userEvent.click(await screen.findByRole('button', { name: 'Save to Git' }))

    await userEvent.click(screen.getByRole('tab', { name: 'Git' }))
    expect(await screen.findByText('This record changed while you were working. Refresh it before trying again.')).toBeInTheDocument()
    expect(git.repositories.createActivityCheckpoint).not.toHaveBeenCalled()
  })

  it('retries an ambiguous checkpoint with the exact source snapshot and idempotency key', async () => {
    const checkpointRecord = {
      checkpointId: '00000000-0000-4000-8000-000000000050', repositoryId, activityId,
      status: 'SUCCEEDED', resultingCommitHash: commitId,
    }
    const git = gitDependencies({ repositoryOverrides: {
      createActivityCheckpoint: vi.fn()
        .mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: 'offline' }))
        .mockResolvedValueOnce({ data: checkpointRecord }),
    } })
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissionTransport()} />)
    const editor = await screen.findByLabelText('Java source code')
    fireEvent.change(editor, { target: { value: changedCode } })
    await userEvent.click(await screen.findByRole('button', { name: 'Save to Git' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Git' }))
    expect(await screen.findByText(/save result is uncertain/i)).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: starterCode } })
    await userEvent.click(screen.getByRole('button', { name: 'Retry Save to Git' }))
    await screen.findByText(/Saved at commit aaaaaaaa/)

    expect(git.repositories.createActivityCheckpoint).toHaveBeenCalledTimes(2)
    expect(git.repositories.createActivityCheckpoint.mock.calls[1]).toEqual(git.repositories.createActivityCheckpoint.mock.calls[0])
    expect(git.repositories.createActivityCheckpoint.mock.calls[1][1].sourceCode).toBe(changedCode)
  })

  it('keeps imported source local until deliberate Run/Submit and navigates current compiler lines', async () => {
    const imported = 'public class Main {\n    invalid\n}'
    const submissions = submissionTransport({
      createVisibleTestRun: vi.fn().mockResolvedValue({ data: { id: runId, activityId, status: 'succeeded', compilerOutput: 'Main.java:2: error: invalid statement', visibleTestOutcomes: [] } }),
      createSubmission: vi.fn().mockResolvedValue({ data: submissionRecord() }),
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />, { destination: true })
    const editor = await screen.findByLabelText('Java source code')
    fireEvent.change(screen.getByLabelText('Import Java file'), { target: { files: [{ name: 'Main.java', size: imported.length, arrayBuffer: async () => new TextEncoder().encode(imported).buffer }] } })
    await waitFor(() => expect(editor).toHaveValue(imported))
    expect(submissions.createVisibleTestRun).not.toHaveBeenCalled()
    expect(submissions.createSubmission).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Run Visible Tests' }))
    expect(submissions.createVisibleTestRun).toHaveBeenCalledWith(activityId, imported)
    await user.click(screen.getByRole('tab', { name: 'Output' }))
    await user.click(await screen.findByRole('button', { name: 'Go to line 2' }))
    expect(editor).toHaveFocus()
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('    invalid')
    fireEvent.change(editor, { target: { value: imported + '\n' } })
    expect(screen.queryByRole('button', { name: 'Go to line 2' })).not.toBeInTheDocument()
    expect(screen.getByText(/Source changed since this visible-test run/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await user.click(screen.getByRole('button', { name: 'Submit source' }))
    await waitFor(() => expect(submissions.createSubmission).toHaveBeenCalledWith(activityId, imported + '\n', expect.any(String)))
  })

  it('initializes real starter source in memory without fake autosave or custom input', async () => {
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissionTransport()} />)

    const editor = await screen.findByLabelText('Java source code')
    expect(screen.getByRole('link', { name: 'Back to Activity' })).toHaveAttribute('href', `/student/activity/${activityId}?classId=${classId}`)
    expect(editor).toHaveValue(starterCode)
    fireEvent.change(editor, { target: { value: changedCode } })
    expect(editor).toHaveValue(changedCode)
    expect(screen.getByText('Browser draft')).toBeInTheDocument()
    expect(screen.queryByText(/Auto-save/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Custom Input/i)).not.toBeInTheDocument()
    expect(screen.getByText('Visible sample')).toBeInTheDocument()
  })

  it('refetches Git on focus, reports a newer external commit, and never overwrites browser source', async () => {
    const newerCommit = 'b'.repeat(40)
    const getSummary = vi.fn()
      .mockResolvedValueOnce({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId } } })
      .mockResolvedValue({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId: newerCommit } } })
    const git = gitDependencies({ contentOverrides: { getSummary } })
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissionTransport()} />)

    const editor = await screen.findByLabelText('Java source code')
    await waitFor(() => expect(getSummary).toHaveBeenCalledTimes(1))
    fireEvent.change(editor, { target: { value: changedCode } })
    act(() => window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(getSummary.mock.calls.length).toBeGreaterThanOrEqual(2))
    await userEvent.click(screen.getByRole('tab', { name: 'Git' }))

    expect(await screen.findByText('Newer Git changes are available.')).toBeInTheDocument()
    expect(screen.getByText('Your browser source was not changed.')).toBeInTheDocument()
    expect(editor).toHaveValue(changedCode)
  })

  it('shows only the real read-only repository tree and navigates returned folders', async () => {
    const getTree = vi.fn()
      .mockResolvedValueOnce({ data: { commitId, path: '', entries: [{ name: 'src', path: 'src', entryType: 'tree' }] } })
      .mockResolvedValueOnce({ data: { commitId, path: 'src', entries: [{ name: 'Main.java', path: 'src/Main.java', entryType: 'blob' }] } })
    const git = gitDependencies({ contentOverrides: {
      getSummary: vi.fn().mockResolvedValue({ data: { repositoryId, empty: false, defaultBranch: 'main', latestCommit: { commitId } } }),
      getTree,
    } })
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissionTransport()} />)

    expect(await screen.findByText('read-only tree')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /src/ }))
    expect(await screen.findByText('Main.java', { selector: '.student-editor-explorer em:not(.is-active)' })).toBeInTheDocument()
    expect(getTree).toHaveBeenLastCalledWith(repositoryId, { commitId, path: 'src' })
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
  })

  it('resizes desktop panes with pointer input while preserving editor and activity state', async () => {
    mockWorkspaceViewport(true)
    const submissions = submissionTransport()
    const { container } = renderWithClass(
      <StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />,
    )

    const editor = await screen.findByLabelText('Java source code')
    const shell = container.querySelector('.student-coding-shell')
    vi.spyOn(shell, 'getBoundingClientRect').mockReturnValue({ width: 1300 })
    fireEvent.change(editor, { target: { value: changedCode } })

    const instructions = screen.getByRole('separator', { name: 'Resize instructions and code panes' })
    fireEvent.pointerDown(instructions, { pointerId: 1, button: 0, clientX: 320 })
    fireEvent.pointerMove(instructions, { pointerId: 1, clientX: 440 })
    fireEvent.pointerUp(instructions, { pointerId: 1, clientX: 440 })
    expect(instructions).toHaveAttribute('aria-valuenow', '440')
    expect(shell.style.getPropertyValue('--instruction-pane-width')).toBe('440px')

    const diagnostics = screen.getByRole('separator', { name: 'Resize code and diagnostics panes' })
    fireEvent.pointerDown(diagnostics, { pointerId: 2, button: 0, clientX: 700 })
    fireEvent.pointerMove(diagnostics, { pointerId: 2, clientX: 620 })
    fireEvent.pointerUp(diagnostics, { pointerId: 2, clientX: 620 })
    expect(diagnostics).toHaveAttribute('aria-valuenow', '440')
    expect(shell.style.getPropertyValue('--output-pane-width')).toBe('440px')

    fireEvent.pointerDown(instructions, { pointerId: 3, button: 0, clientX: 440 })
    fireEvent.pointerMove(instructions, { pointerId: 3, clientX: -1000 })
    fireEvent.pointerUp(instructions, { pointerId: 3, clientX: -1000 })
    expect(instructions).toHaveAttribute('aria-valuenow', '240')
    expect(editor).toHaveValue(changedCode)
    expect(screen.getByRole('button', { name: 'Run Visible Tests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(screen.getByText(/Run visible tests to check the current source/)).toBeInTheDocument()
    expect(submissions.createVisibleTestRun).not.toHaveBeenCalled()
    expect(submissions.createSubmission).not.toHaveBeenCalled()
  })

  it('supports focused keyboard resizing and enforces desktop pane boundaries', async () => {
    mockWorkspaceViewport(true)
    const { container } = renderWithClass(
      <StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissionTransport()} />,
    )
    await screen.findByLabelText('Java source code')
    const shell = container.querySelector('.student-coding-shell')
    vi.spyOn(shell, 'getBoundingClientRect').mockReturnValue({ width: 1600 })
    const instructions = screen.getByRole('separator', { name: 'Resize instructions and code panes' })

    instructions.focus()
    expect(instructions).toHaveFocus()
    fireEvent.keyDown(instructions, { key: 'ArrowRight' })
    expect(instructions).toHaveAttribute('aria-valuenow', '344')
    for (let index = 0; index < 20; index += 1) fireEvent.keyDown(instructions, { key: 'ArrowRight' })
    expect(instructions).toHaveAttribute('aria-valuenow', '520')
    for (let index = 0; index < 30; index += 1) fireEvent.keyDown(instructions, { key: 'ArrowLeft' })
    expect(instructions).toHaveAttribute('aria-valuenow', '240')
  })

  it('removes desktop sizing and separators when the workspace becomes narrow', async () => {
    const viewport = mockWorkspaceViewport(true)
    const { container } = renderWithClass(
      <StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissionTransport()} />,
    )
    await screen.findByLabelText('Java source code')
    expect(screen.getAllByRole('separator')).toHaveLength(2)

    act(() => viewport.setMatches(false))
    const shell = container.querySelector('.student-coding-shell')
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(shell.style.getPropertyValue('--instruction-pane-width')).toBe('')
    expect(shell.style.getPropertyValue('--output-pane-width')).toBe('')
    expect(screen.getByLabelText('Java source code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run Visible Tests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('starts and polls a real visible-test run without implying an attempt or score', async () => {
    const submissions = submissionTransport({
      createVisibleTestRun: vi.fn().mockResolvedValue({ data: {
        id: runId,
        activityId,
        status: 'queued',
        compileStatus: 'pending',
        runtimeStatus: 'pending',
        visibleTestOutcomes: [],
      } }),
      getVisibleTestRun: vi.fn()
        .mockResolvedValueOnce({ data: { id: runId, activityId, status: 'running', visibleTestOutcomes: [] } })
        .mockResolvedValueOnce({ data: {
          id: runId,
          activityId,
          status: 'succeeded',
          compileStatus: 'succeeded',
          runtimeStatus: 'succeeded',
          visibleTestOutcomes: [{ name: 'Visible sample', order: 1, outcome: 'passed', actualOutput: '1 2 3', executionTimeMs: 8 }],
          hiddenTestCount: 17,
          score: 9876,
        } }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 1000 }} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Run Visible Tests' }))
    expect(submissions.createVisibleTestRun).toHaveBeenCalledWith(activityId, starterCode)
    expect(await screen.findByText('Passed')).toBeInTheDocument()
    expect(screen.getAllByText('1 2 3')).toHaveLength(2)
    expect(screen.queryByText('17')).not.toBeInTheDocument()
    expect(screen.queryByText('9876')).not.toBeInTheDocument()
    expect(submissions.getVisibleTestRun).toHaveBeenCalledTimes(2)
  })

  it('runs unsaved Scanner code with multiline stdin without submission or Git side effects', async () => {
    const scannerSource = 'import java.util.Scanner; public class Main { public static void main(String[] args) { Scanner scanner = new Scanner(System.in); System.out.println("Hello " + scanner.nextLine()); } }'
    const submissions = submissionTransport({
      createCodeRun: vi.fn().mockResolvedValue({ data: {
        id: runId, activityId, status: 'queued', compileStatus: 'pending', runtimeStatus: 'not_run',
      } }),
      getCodeRun: vi.fn().mockResolvedValue({ data: {
        id: runId, activityId, status: 'succeeded', compileStatus: 'success', runtimeStatus: 'passed',
        stdout: 'Hello Julius\n', stderr: null, executionTimeMs: 12,
        hiddenTestResults: ['HIDDEN'], score: 100,
      } }),
    })
    const git = gitDependencies()
    renderWithClass(<StudentProgrammingWorkspace {...git} api={activityTransport()} submissions={submissions} pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 1000 }} />)

    fireEvent.change(await screen.findByLabelText('Java source code'), { target: { value: scannerSource } })
    await userEvent.click(screen.getByRole('button', { name: 'Run Code' }))
    fireEvent.change(screen.getByLabelText('Program input (stdin)'), { target: { value: 'Julius\n23' } })
    await userEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(submissions.createCodeRun).toHaveBeenCalledWith(activityId, scannerSource, 'Julius\n23')
    expect(await screen.findByText('Hello Julius')).toBeInTheDocument()
    expect(screen.queryByText('HIDDEN')).not.toBeInTheDocument()
    expect(submissions.createSubmission).not.toHaveBeenCalled()
    expect(git.repositories.createActivityCheckpoint).not.toHaveBeenCalled()
  })

  it('explains whitespace differences for failed visible tests without rendering hidden evidence', async () => {
    const submissions = submissionTransport({
      createVisibleTestRun: vi.fn().mockResolvedValue({ data: {
        id: runId,
        activityId,
        status: 'queued',
        visibleTestOutcomes: [],
      } }),
      getVisibleTestRun: vi.fn().mockResolvedValue({ data: {
        id: runId,
        activityId,
        status: 'succeeded',
        compileStatus: 'succeeded',
        runtimeStatus: 'failed',
        visibleTestOutcomes: [{
          name: 'Visible sample',
          order: 1,
          outcome: 'failed',
          expectedOutput: '5',
          actualOutput: '5\n\n',
          executionTimeMs: 8,
        }],
        hiddenTestResults: [{
          name: 'HIDDEN-NAME',
          expectedOutput: 'HIDDEN-EXPECTED',
          actualOutput: 'HIDDEN-ACTUAL',
        }],
      } }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} pollingOptions={{ initialDelayMs: 1, maximumDelayMs: 1, maximumDurationMs: 1000 }} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Run Visible Tests' }))
    const comparison = await screen.findByLabelText('Visible sample output comparison')
    expect(Array.from(comparison.querySelectorAll('pre'), (element) => element.textContent)).toEqual([
      '5',
      '5↵\n↵\n',
    ])
    expect(screen.getByText('Whitespace markers: · space, → tab, ↵ line ending.')).toBeInTheDocument()
    expect(screen.queryByText('HIDDEN-NAME')).not.toBeInTheDocument()
    expect(screen.queryByText('HIDDEN-EXPECTED')).not.toBeInTheDocument()
    expect(screen.queryByText('HIDDEN-ACTUAL')).not.toBeInTheDocument()
  })

  it('uses one in-memory idempotency key and blocks duplicate official mutations', async () => {
    let accept
    const submissions = submissionTransport({
      createSubmission: vi.fn(() => new Promise((resolve) => { accept = resolve })),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />, { destination: true })

    fireEvent.change(await screen.findByLabelText('Java source code'), { target: { value: changedCode } })
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit source' }))
    expect(screen.getAllByRole('button', { name: 'Submitting...' })).toHaveLength(2)
    screen.getAllByRole('button', { name: 'Submitting...' }).forEach((button) => expect(button).toBeDisabled())
    expect(submissions.createSubmission).toHaveBeenCalledTimes(1)
    const [calledActivity, calledSource, key] = submissions.createSubmission.mock.calls[0]
    expect(calledActivity).toBe(activityId)
    expect(calledSource).toBe(changedCode)
    expect(key).toMatch(/^submission:[A-Za-z0-9-]{16,}$/)

    await act(async () => accept({ data: submissionRecord({ sourceCode: changedCode }), meta: { idempotentReplay: false } }))
    expect(await screen.findByText('Canonical submission destination')).toBeInTheDocument()
  })

  it('retains the exact source and key after an ambiguous request and warns about changed source', async () => {
    const submissions = submissionTransport({
      createSubmission: vi.fn()
        .mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: 'offline' }))
        .mockResolvedValueOnce({ data: submissionRecord(), meta: { idempotentReplay: true } }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />, { destination: true })

    await screen.findByLabelText('Java source code')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit source' }))
    expect(await screen.findByText('Submission status is uncertain')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Java source code'), { target: { value: changedCode } })
    expect(screen.getByText('The editor now contains changed source.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry exact original request' }))
    await userEvent.click(screen.getByRole('button', { name: 'Retry same request' }))

    await screen.findByText('Canonical submission destination')
    expect(submissions.createSubmission).toHaveBeenCalledTimes(2)
    expect(submissions.createSubmission.mock.calls[1][1]).toBe(starterCode)
    expect(submissions.createSubmission.mock.calls[1][2]).toBe(submissions.createSubmission.mock.calls[0][2])
  })

  it('reports execution-disabled and capacity failures without simulated success', async () => {
    const submissions = submissionTransport({
      createVisibleTestRun: vi.fn().mockRejectedValue(new ApiError({ status: 503, code: 'EXECUTION_UNAVAILABLE' })),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Run Visible Tests' }))
    expect(await screen.findByText('Java execution is disabled in this environment. No result was simulated.')).toBeInTheDocument()
    expect(screen.queryByText(/All sample tests passed/)).not.toBeInTheDocument()
  })

  it('allows only a backend-reported replacement when the ordinary activity window is closed', async () => {
    const closedActivity = { ...activity, status: 'CLOSED', dueState: 'CLOSED' }
    const submissions = submissionTransport({
      getAttemptState: vi.fn().mockResolvedValue({ data: attemptState({
        activityStatus: 'CLOSED',
        dueState: 'CLOSED',
        ordinarySubmissionAllowed: false,
        replacementAvailable: true,
        replacement: {
          expiresAt: '2099-09-04T09:00:00.000Z',
          forAttemptLabel: 'Attempt 1',
        },
        nextAllowedSubmissionKind: 'REPLACEMENT',
      }) }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport({ getActivity: vi.fn().mockResolvedValue({ data: closedActivity }) })} submissions={submissions} />)

    expect(await screen.findByRole('button', { name: 'Submit replacement' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Run Visible Tests' })).toBeDisabled()
    expect(screen.getByText(/Replacement available until/)).toBeInTheDocument()
  })

  it('fails closed when attempt state is unavailable instead of inferring eligibility from history', async () => {
    const historyReplacement = submissionRecord({
      failureResolution: {
        status: 'resolved',
        replacementGranted: true,
        replacementAvailable: true,
        replacementExpiresAt: '2099-09-04T09:00:00.000Z',
      },
    })
    const submissions = submissionTransport({
      getAttemptState: vi.fn().mockRejectedValue(new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE' })),
      listSubmissions: vi.fn().mockResolvedValue({ data: [historyReplacement], pagination }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />)

    expect(await screen.findByText('Attempt availability could not be loaded. Submission remains disabled.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
    expect(submissions.listSubmissions).not.toHaveBeenCalled()
  })

  it('uses the authoritative exhausted-attempt state to disable submission', async () => {
    const submissions = submissionTransport({
      getAttemptState: vi.fn().mockResolvedValue({ data: attemptState({
        countingAttemptsUsed: 2,
        remainingOrdinaryAttempts: 0,
        ordinarySubmissionAllowed: false,
        nextAllowedSubmissionKind: 'NONE',
        submissionBlockedReason: 'ATTEMPT_LIMIT_REACHED',
      }) }),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />)

    expect(await screen.findByText('Another submission is not currently available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('refreshes authoritative attempt state after an eligibility conflict', async () => {
    const submissions = submissionTransport({
      getAttemptState: vi.fn()
        .mockResolvedValueOnce({ data: attemptState() })
        .mockResolvedValueOnce({ data: attemptState({
          countingAttemptsUsed: 2,
          remainingOrdinaryAttempts: 0,
          ordinarySubmissionAllowed: false,
          nextAllowedSubmissionKind: 'NONE',
          submissionBlockedReason: 'ATTEMPT_LIMIT_REACHED',
        }) }),
      createSubmission: vi.fn().mockRejectedValue(new ApiError({
        status: 409,
        code: 'ATTEMPT_LIMIT_REACHED',
        message: 'Attempt limit reached.',
      })),
    })
    renderWithClass(<StudentProgrammingWorkspace {...gitDependencies()} api={activityTransport()} submissions={submissions} />)

    const submit = await screen.findByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submit).toBeEnabled())
    await userEvent.click(submit)
    await userEvent.click(screen.getByRole('button', { name: 'Submit source' }))
    expect(await screen.findByText('Another submission is not currently available.')).toBeInTheDocument()
    expect(submissions.getAttemptState).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })
})

describe('student submission records', () => {
  it('redirects legacy feedback records to the canonical history while preserving class context', async () => {
    renderWithClass(<LegacySubmissionRoute />, {
      entry: `/student/activity/${activityId}/feedback?classId=${classId}`,
      path: '/student/activity/:activityId/feedback',
      legacyDestination: true,
    })

    expect(await screen.findByText(`/student/activity/${activityId}/submissions?classId=${classId}`)).toBeInTheDocument()
  })

  it('lists bounded per-activity history using backend attempt and replacement labels', async () => {
    const record = submissionRecord({
      attemptLabel: 'Replacement attempt for Attempt 2',
      isLate: true,
      status: 'released',
      gradeStatus: 'released',
      finalScore: 90,
      totalPoints: 100,
      isCreditedResult: true,
      failureResolution: {
        status: 'resolved',
        replacementGranted: true,
        replacementAvailable: true,
        replacementExpiresAt: '2099-09-04T09:00:00.000Z',
      },
    })
    const submissions = submissionTransport({ listSubmissions: vi.fn().mockResolvedValue({ data: [record], pagination }) })
    renderWithClass(<StudentSubmissionHistory api={activityTransport()} submissions={submissions} />, {
      entry: `/student/activity/${activityId}/submissions?classId=${classId}`,
      path: '/student/activity/:activityId/submissions',
    })

    expect(await screen.findByText('Replacement attempt for Attempt 2')).toBeInTheDocument()
    expect(screen.queryByText(/Attempt 3 of 2/)).not.toBeInTheDocument()
    expect(screen.getByText('Accepted after the ordinary deadline')).toBeInTheDocument()
    expect(screen.getByText('90 / 100 points')).toBeInTheDocument()
    expect(screen.getByText('Credited result')).toBeInTheDocument()
    expect(submissions.listSubmissions).toHaveBeenCalledWith(activityId, { page: 1, pageSize: 20, status: '' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('loads the next bounded submission page', async () => {
    const secondRecord = submissionRecord({ id: '00000000-0000-4000-8000-000000000021', attemptLabel: 'Attempt 2' })
    const submissions = submissionTransport({
      listSubmissions: vi.fn()
        .mockResolvedValueOnce({ data: [submissionRecord()], pagination: { ...pagination, totalItems: 2, totalPages: 2, hasNextPage: true } })
        .mockResolvedValueOnce({ data: [secondRecord], pagination: { ...pagination, page: 2, totalItems: 2, totalPages: 2, hasPreviousPage: true } }),
    })
    renderWithClass(<StudentSubmissionHistory api={activityTransport()} submissions={submissions} />, {
      entry: `/student/activity/${activityId}/submissions?classId=${classId}`,
      path: '/student/activity/:activityId/submissions',
    })

    expect(await screen.findByText('Attempt 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Attempt 2')).toBeInTheDocument()
    expect(submissions.listSubmissions).toHaveBeenLastCalledWith(activityId, { page: 2, pageSize: 20, status: '' }, expect.any(Object))
  })

  it('renders pending records without leaking deliberately supplied scores, corrections, feedback, or hidden tests', async () => {
    const secretValues = ['91', 'DRAFT-FEEDBACK-SECRET', 'CORRECTION-SECRET', 'HIDDEN-TEST-SECRET']
    const submissions = submissionTransport({
      getSubmission: vi.fn().mockResolvedValue({ data: submissionRecord({
        status: 'assessed',
        gradeStatus: 'pending',
        finalScore: 91,
        feedback: secretValues[1],
        scoreCorrections: [{ reason: secretValues[2] }],
        hiddenTestResults: [{ name: secretValues[3] }],
        visibleTestOutcomes: [{ name: 'Visible sample', order: 1, outcome: 'passed', actualOutput: 'ok' }],
      }) }),
    })
    renderWithClass(<StudentSubmissionDetail api={activityTransport()} submissions={submissions} />, {
      entry: `/student/activity/${activityId}/submissions/${submissionId}?classId=${classId}`,
      path: '/student/activity/:activityId/submissions/:submissionId',
    })

    expect(await screen.findByText('Result not released')).toBeInTheDocument()
    expect(screen.getByText(changedCode)).toBeInTheDocument()
    expect(screen.getByText('Visible sample')).toBeInTheDocument()
    secretValues.forEach((value) => expect(screen.queryByText(value)).not.toBeInTheDocument())
  })

  it('shows only backend-released final score and feedback', async () => {
    const submissions = submissionTransport({
      getSubmission: vi.fn().mockResolvedValue({ data: submissionRecord({
        status: 'released',
        gradeStatus: 'released',
        finalScore: 92,
        totalPoints: 100,
        feedback: 'Released feedback for the student.',
        correctionReason: 'PRIVATE-CORRECTION-REASON',
      }) }),
    })
    renderWithClass(<StudentSubmissionDetail api={activityTransport()} submissions={submissions} />, {
      entry: `/student/activity/${activityId}/submissions/${submissionId}?classId=${classId}`,
      path: '/student/activity/:activityId/submissions/:submissionId',
    })

    expect(await screen.findByText('92 / 100 points')).toBeInTheDocument()
    expect(screen.getByText('Released feedback for the student.')).toBeInTheDocument()
    expect(screen.queryByText('PRIVATE-CORRECTION-REASON')).not.toBeInTheDocument()
  })

  it('fails closed when the activity or submission identity crosses the selected context', async () => {
    const submissions = submissionTransport({
      getSubmission: vi.fn().mockResolvedValue({ data: submissionRecord({ activityId: 'another-activity', sourceCode: 'CROSS-CLASS-SOURCE' }) }),
    })
    renderWithClass(<StudentSubmissionDetail api={activityTransport()} submissions={submissions} />, {
      entry: `/student/activity/${activityId}/submissions/${submissionId}?classId=${classId}`,
      path: '/student/activity/:activityId/submissions/:submissionId',
    })

    expect(await screen.findByText('The requested Projex record was not found.')).toBeInTheDocument()
    expect(screen.queryByText('CROSS-CLASS-SOURCE')).not.toBeInTheDocument()
  })
})

describe('Ungraded Student submission records', () => {
  it.each(['assessed', 'released'])('shows completion for %s without any academic score and gates comments by deliberate release', async status => {
    const secret = 'Unreleased instructor comment'
    const submissions = submissionTransport({ getSubmission: vi.fn().mockResolvedValue({ data: submissionRecord({ gradingMode: 'COMPLETION', completionState: 'COMPLETE', status, gradeStatus: 'ungraded', feedback: secret, finalScore: 0, totalPoints: 0 }) }) })
    renderWithClass(<StudentSubmissionDetail api={activityTransport()} submissions={submissions} />, { entry: `/student/activity/${activityId}/submissions/${submissionId}?classId=${classId}`, path: '/student/activity/:activityId/submissions/:submissionId' })
    expect(await screen.findByRole('heading', { name: 'Complete · Ungraded' })).toBeInTheDocument()
    expect(screen.queryByText(/0 \/ 0|0%|Numeric scores/)).not.toBeInTheDocument()
    if (status === 'released') expect(screen.getByText(secret)).toBeInTheDocument()
    else { expect(screen.queryByText(secret)).not.toBeInTheDocument(); expect(screen.getByText('Feedback not released')).toBeInTheDocument() }
  })
})
