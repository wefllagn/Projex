import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { CreateClassModal } from '../layouts/DashboardLayout.jsx'
import { InstructorRoutePage } from '../pages/InstructorPages.jsx'
import { StudentRoutePage } from '../pages/StudentPages.jsx'
import ClassProvider from './ClassProvider.jsx'

const classId = '00000000-0000-4000-8000-000000000001'
const classRecord = {
  id: classId,
  className: 'Programming Fundamentals',
  section: 'BSIT 1A',
  semester: 'First Semester',
  schoolYear: '2026-2027',
  status: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  archivedAt: null,
  instructor: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}
const pagination = {
  page: 1,
  pageSize: 100,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}
const auth = {
  status: 'authenticated',
  user: {
    id: 'user-1',
    fullName: 'Synthetic User',
    email: 'current.user@example.edu',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
  logout: vi.fn(),
}

function renderWorkflow({ client, entry, page, role = 'STUDENT' }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={{ ...auth, user: { ...auth.user, role } }}>
        <ClassProvider client={client}>{page}</ClassProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('student class workflows', () => {
  it('joins through the server without retaining or redisplaying the entered code', async () => {
    const secretInput = 'ZXCV-BNMP-QA'
    const client = {
      get: vi.fn((path) => Promise.resolve(path.startsWith('/courses') ? { data: { items: [] } } : { data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })),
      post: vi.fn().mockResolvedValue({ data: { created: true, class: classRecord } }),
      patch: vi.fn(),
    }
    const user = userEvent.setup()
    renderWorkflow({ client, entry: '/student', page: <StudentRoutePage pagePath="dashboard" /> })

    expect(screen.queryByRole('link', { name: 'To-do' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Class Invitations' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Join Class', exact: true }))
    await user.type(screen.getByLabelText('Class code'), secretInput)
    await user.click(within(screen.getByRole('dialog', { name: 'Join Class' })).getByRole('button', { name: 'Join Class', exact: true }))

    expect(await screen.findByText('Joined Programming Fundamentals.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Programming Fundamentals/ })).toHaveAttribute('href', `/student/classes?classId=${classId}`)
    expect(client.post).toHaveBeenCalledWith('/classes/join', { classCode: secretInput }, undefined)
    expect(screen.queryByText(secretInput)).not.toBeInTheDocument()
  })

  it('renders only the student-safe roster projection', async () => {
    const sensitiveEmail = 'another.student.private@example.edu'
    const client = {
      get: vi.fn((path) => {
        if (path.startsWith('/classes?')) return Promise.resolve({ data: [classRecord], pagination })
        if (path.includes('/members')) {
          return Promise.resolve({
            data: [{ userId: 'student-2', fullName: 'Safe Classmate', email: sensitiveEmail, userStatus: 'ACTIVE' }],
            pagination: { ...pagination, pageSize: 50 },
          })
        }
        throw new Error(`Unexpected path ${path}`)
      }),
      post: vi.fn(),
      patch: vi.fn(),
    }
    renderWorkflow({ client, entry: `/student/people?classId=${classId}`, page: <StudentRoutePage pagePath="people" /> })

    expect(await screen.findByText('Safe Classmate')).toBeInTheDocument()
    expect(screen.queryByText(sensitiveEmail)).not.toBeInTheDocument()
    expect(screen.queryByText(/join code/i)).not.toBeInTheDocument()
  })
})

describe('instructor class workflows', () => {
  it('requires a nonblank Class Code before creating a Class', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [], pagination }), post: vi.fn(), patch: vi.fn() }
    const user = userEvent.setup()
    renderWorkflow({ client, entry: '/instructor', page: <CreateClassModal onClose={vi.fn()} onCreated={vi.fn()} />, role: 'INSTRUCTOR' })
    await user.type(screen.getByLabelText('Class Name'), 'Programming')
    await user.selectOptions(screen.getByLabelText('Program'), 'COMPUTER_SCIENCE')
    await user.selectOptions(screen.getByLabelText('Semester / Term'), 'First Semester')
    await user.selectOptions(screen.getByLabelText('Academic year'), '2026-2027')
    await user.click(screen.getByRole('button', { name: 'Create Class' }))
    expect(screen.getByLabelText('Class Code')).toBeInvalid()
    expect(client.post).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Class Code'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create Class' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a Class Code.')
    expect(client.post).not.toHaveBeenCalled()
  })
  it('keeps self-service Class inputs after a failed save without a Course or approval requirement', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [], pagination }), post: vi.fn().mockRejectedValue(new Error('private failure')), patch: vi.fn() }
    const onCreated = vi.fn()
    const user = userEvent.setup()
    renderWorkflow({ client, entry: '/instructor', page: <CreateClassModal onClose={vi.fn()} onCreated={onCreated} />, role: 'INSTRUCTOR' })
    await user.type(screen.getByLabelText('Class Name'), 'Retained Class')
    await user.type(screen.getByLabelText('Class Code'), '9123A')
    await user.selectOptions(screen.getByLabelText('Program'), 'INFORMATION_TECHNOLOGY')
    await user.selectOptions(screen.getByLabelText('Semester / Term'), 'Short Term')
    await user.selectOptions(screen.getByLabelText('Academic year'), '2026-2027')
    await user.click(screen.getByRole('button', { name: 'Create Class' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again')
    expect(screen.getByLabelText('Class Name')).toHaveValue('Retained Class')
    expect(screen.getByLabelText('Class Code')).toHaveValue('9123A')
    expect(screen.getByLabelText('Semester / Term')).toHaveValue('Short Term')
    expect(screen.getByLabelText('Academic year')).toHaveValue('2026-2027')
    expect(screen.queryByLabelText(/Course/)).not.toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('creates a class with only supported fields and no browser-generated code', async () => {
    const client = {
      get: vi.fn((path) => Promise.resolve(path.startsWith('/courses') ? { data: { items: [] } } : { data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })),
      post: vi.fn().mockResolvedValue({ data: classRecord }),
      patch: vi.fn(),
    }
    const onCreated = vi.fn()
    const user = userEvent.setup()
    renderWorkflow({
      client,
      entry: '/instructor',
      page: <CreateClassModal onClose={vi.fn()} onCreated={onCreated} />,
      role: 'INSTRUCTOR',
    })

    await user.type(screen.getByLabelText('Class Name'), 'Programming Fundamentals')
    await user.type(screen.getByLabelText('Class Code'), 'BSIT 1A')
    await user.selectOptions(screen.getByLabelText('Program'), 'INFORMATION_TECHNOLOGY')
    await user.selectOptions(screen.getByLabelText('Semester / Term'), 'First Semester')
    await user.selectOptions(screen.getByLabelText('Academic year'), '2026-2027')
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create Class' }))

    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/classes', {
      className: 'Programming Fundamentals',
      program: 'INFORMATION_TECHNOLOGY',
      section: 'BSIT 1A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    }, undefined))
    expect(onCreated).toHaveBeenCalledWith(classRecord)
  })

  it('optionally validates registered students and creates the class with invitation emails atomically', async () => {
    const invitedStudent = {
      fullName: 'Synthetic Invitee',
      universityEmail: 'invitee@slu.edu.ph',
    }
    const client = {
      get: vi.fn((path) => Promise.resolve(path.startsWith('/courses') ? { data: { items: [] } } : { data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })),
      post: vi.fn((path) => {
        if (path === '/class-invitations/lookup') {
          return Promise.resolve({ data: { eligibility: 'ELIGIBLE', student: invitedStudent } })
        }
        if (path === '/classes') return Promise.resolve({ data: { ...classRecord, invitationsCreated: 1 } })
        throw new Error(`Unexpected path ${path}`)
      }),
      patch: vi.fn(),
    }
    const user = userEvent.setup()
    renderWorkflow({
      client,
      entry: '/instructor',
      page: <CreateClassModal onClose={vi.fn()} onCreated={vi.fn()} />,
      role: 'INSTRUCTOR',
    })

    await user.click(screen.getByText('Invite Students (optional)'))
    expect(screen.getByText(/the class and all invitations will not be created/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Class Name'), 'Programming Fundamentals')
    await user.type(screen.getByLabelText('Class Code'), 'BSIT 1A')
    await user.selectOptions(screen.getByLabelText('Program'), 'INFORMATION_TECHNOLOGY')
    await user.selectOptions(screen.getByLabelText('Semester / Term'), 'First Semester')
    await user.selectOptions(screen.getByLabelText('Academic year'), '2026-2027')
    await user.type(screen.getByLabelText('University email'), 'INVITEE@SLU.EDU.PH')
    await user.click(screen.getByRole('button', { name: '+ Add Student' }))
    expect(await screen.findByText('Synthetic Invitee added.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create Class' }))

    expect(client.post).toHaveBeenCalledWith('/class-invitations/lookup', {
      universityEmail: 'invitee@slu.edu.ph',
    }, undefined)
    expect(client.post).toHaveBeenCalledWith('/classes', {
      className: 'Programming Fundamentals',
      program: 'INFORMATION_TECHNOLOGY',
      section: 'BSIT 1A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
      invitationEmails: ['invitee@slu.edu.ph'],
    }, undefined)
  })

  it('loads and rotates a server-owned join code', async () => {
    const client = {
      get: vi.fn((path) => {
        if (path.startsWith('/classes?')) return Promise.resolve({ data: [classRecord], pagination })
        if (path.endsWith('/join-code')) {
          return Promise.resolve({ data: { classId, classCode: 'ABCD-EFGH-JK', active: true, changedAt: '2026-08-01T00:00:00.000Z' } })
        }
        throw new Error(`Unexpected path ${path}`)
      }),
      post: vi.fn().mockResolvedValue({ data: { classId, classCode: 'MNPQ-RSTU-VW', active: true, changedAt: '2026-08-02T00:00:00.000Z' } }),
      patch: vi.fn(),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWorkflow({ client, entry: `/instructor/class-code?classId=${classId}`, page: <InstructorRoutePage pagePath="class-code" />, role: 'INSTRUCTOR' })

    expect(await screen.findByText('ABCD-EFGH-JK')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rotate code' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('MNPQ-RSTU-VW')).toBeInTheDocument()
    expect(client.post).toHaveBeenCalledWith(`/classes/${classId}/join-code/rotate`, {}, undefined)
  })

  it('does not expose or copy an inactive previous join code', async () => {
    const inactiveCode = 'OLDX-CODE-YZ'
    const client = {
      get: vi.fn((path) => path.startsWith('/classes?')
        ? Promise.resolve({ data: [{ ...classRecord, status: 'ARCHIVED' }], pagination })
        : Promise.resolve({ data: { classId, classCode: inactiveCode, active: false, changedAt: '2026-08-03T00:00:00.000Z' } })),
      post: vi.fn(),
      patch: vi.fn(),
    }
    renderWorkflow({ client, entry: `/instructor/class-code?classId=${classId}`, page: <InstructorRoutePage pagePath="class-code" />, role: 'INSTRUCTOR' })

    expect(await screen.findByText('Join code inactive')).toBeInTheDocument()
    expect(screen.queryByText(inactiveCode)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate code' })).toBeDisabled()
  })

  it('removes a member through the backend and applies the authoritative response', async () => {
    const activeMember = {
      memberId: 'member-1',
      userId: 'student-1',
      fullName: 'Roster Student',
      email: 'roster.student@example.edu',
      userStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-08-01T00:00:00.000Z',
      removedAt: null,
      lastActivatedAt: '2026-08-01T00:00:00.000Z',
    }
    const client = {
      get: vi.fn((path) => {
        if (path.startsWith('/classes?')) return Promise.resolve({ data: [classRecord], pagination })
        if (path.includes('/members')) {
          return Promise.resolve({ data: [activeMember], pagination: { ...pagination, pageSize: 50 } })
        }
        if (path.includes('/invitations')) {
          return Promise.resolve({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
        }
        throw new Error(`Unexpected path ${path}`)
      }),
      post: vi.fn(),
      patch: vi.fn().mockResolvedValue({ data: { ...activeMember, membershipStatus: 'REMOVED', removedAt: '2026-08-02T00:00:00.000Z' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWorkflow({ client, entry: `/instructor/people?classId=${classId}`, page: <InstructorRoutePage pagePath="people" />, role: 'INSTRUCTOR' })

    expect(await screen.findByText('Roster Student')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(client.patch).toHaveBeenCalledWith(
      `/classes/${classId}/members/member-1`,
      { status: 'REMOVED' },
      undefined,
    ))
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
  })
})


describe('class overview presentation', () => {
  it.each(['STUDENT', 'INSTRUCTOR'])('keeps real %s class details without an unavailable stream panel', async role => {
    const client = { get: vi.fn().mockResolvedValue({ data: [classRecord], pagination }) }
    const prefix = role.toLowerCase()
    renderWorkflow({ client, entry: `/${prefix}/classes?classId=${classId}`, role,
      page: role === 'STUDENT' ? <StudentRoutePage pagePath="classes" /> : <InstructorRoutePage pagePath="classes" /> })
    expect(await screen.findByRole('heading', { name: classRecord.className, level: 2 })).toBeInTheDocument()
    const overview = screen.getByRole('heading', { name: classRecord.className, level: 2 }).closest('section')
    expect(within(overview).getByText('Primary Instructor')).toBeInTheDocument()
    expect(within(overview).getByText('Synthetic Instructor')).toBeInTheDocument()
    expect(within(overview).getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Class stream unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('Announcements and comments are not available yet.')).not.toBeInTheDocument()
    for (const name of ['Manage class', 'View roster', 'Join code']) expect(within(overview).queryByRole('link', { name })).not.toBeInTheDocument()
  })
})


it('shows Class Info as a summary and keeps editing/cancellation scoped to the Primary', async () => {
  const record = { ...classRecord, instructor: { ...classRecord.instructor, userId: auth.user.id } }
  const client = { get: vi.fn(path => Promise.resolve(path.endsWith('/staff') ? { data: { primary: record.instructor, coInstructors: [] } } : { data: [record], pagination })), patch: vi.fn() }
  const user = userEvent.setup()
  renderWorkflow({ client, entry: `/instructor/class-info?classId=${classId}`, role: 'INSTRUCTOR', page: <InstructorRoutePage pagePath="class-info" /> })
  await screen.findByRole('heading', { name: 'Class details' })
  expect(screen.queryByRole('textbox', { name: 'Class Name' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Edit details' }))
  expect(screen.getByRole('dialog', { name: 'Edit class details' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Class Name' })).toHaveValue(record.className)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(client.patch).not.toHaveBeenCalled()
})

it('keeps Instructor Home focused on the class catalog without fetching a review preview', async () => {
  const client = { get: vi.fn().mockResolvedValue({ data: [classRecord], pagination }) }
  renderWorkflow({ client, entry: '/instructor', role: 'INSTRUCTOR', page: <InstructorRoutePage pagePath="dashboard" /> })
  expect(await screen.findByRole('heading', { name: classRecord.className, level: 2 })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Classes', level: 1 })).toBeInTheDocument()
  expect(screen.queryByText('To Review')).not.toBeInTheDocument()
  expect(client.get.mock.calls.every(([path]) => path.startsWith('/classes?'))).toBe(true)
})

it('shows a date-only creation fact and archives only after explicit overlay confirmation', async () => {
  const record = { ...classRecord, instructor: { ...classRecord.instructor, userId: auth.user.id } }
  const client = {
    get: vi.fn(path => Promise.resolve(path.endsWith('/staff') ? { data: { primary: record.instructor, coInstructors: [] } } : { data: [record], pagination })),
    post: vi.fn().mockResolvedValue({ data: { ...record, status: 'ARCHIVED' } }),
  }
  const user = userEvent.setup()
  renderWorkflow({ client, entry: `/instructor/class-info?classId=${classId}`, role: 'INSTRUCTOR', page: <InstructorRoutePage pagePath="class-info" /> })
  const created = await screen.findByText('Date Created')
  expect(created.nextElementSibling).toHaveTextContent(new Date(record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))
  expect(created.nextElementSibling.textContent).not.toMatch(/\d+:\d+|AM|PM/)
  expect(screen.queryByText('Class settings')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Archive class', exact: true }))
  let dialog = screen.getByRole('dialog', { name: 'Archive class?' })
  expect(dialog).toHaveTextContent('You won’t be able to edit this class until it is restored. Existing work will be preserved.')
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(client.post).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Archive class', exact: true }))
  dialog = screen.getByRole('dialog', { name: 'Archive class?' })
  await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(client.post).toHaveBeenCalledExactlyOnceWith(`/classes/${classId}/archive`, {}, undefined))
  expect(await screen.findByRole('button', { name: 'Restore class' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument()
})

it('keeps Instructor People focused on the roster and opens invitations without writing on cancel', async () => {
  const record = { ...classRecord, instructor: { ...classRecord.instructor, userId: auth.user.id } }
  const client = {
    get: vi.fn(path => Promise.resolve(path.startsWith('/classes?') ? { data: [record], pagination } : { data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })),
    post: vi.fn(), patch: vi.fn(),
  }
  const user = userEvent.setup()
  renderWorkflow({ client, entry: `/instructor/people?classId=${classId}`, role: 'INSTRUCTOR', page: <InstructorRoutePage pagePath="people" /> })
  expect(await screen.findByText('No students yet')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'People', exact: true })).toBeInTheDocument()
  expect(screen.queryByText('Class Roster')).not.toBeInTheDocument()
  expect(screen.queryByText('membership records')).not.toBeInTheDocument()
  expect(screen.queryByText(/Review enrollment details/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Manage join code' })).toBeInTheDocument()
  expect(screen.queryByRole('textbox', { name: 'University email' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Invite students', exact: true }))
  const dialog = screen.getByRole('dialog', { name: 'Invite students' })
  expect(within(dialog).getByRole('textbox', { name: 'University email' })).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Close Invite students' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(client.post).not.toHaveBeenCalled()
  expect(client.patch).not.toHaveBeenCalled()
})

it('manages the join code in an on-demand People overlay and cancels changes without writing', async () => {
  const record = { ...classRecord, instructor: { ...classRecord.instructor, userId: auth.user.id } }
  const client = {
    get: vi.fn(path => Promise.resolve(path.startsWith('/classes?') ? { data: [record], pagination } : path.endsWith('/join-code') ? { data: { classId, classCode: 'ABCD-EFGH-JK', active: true, changedAt: record.createdAt } } : { data: [], pagination })),
    post: vi.fn(), patch: vi.fn(),
  }
  const user = userEvent.setup()
  renderWorkflow({ client, entry: `/instructor/people?classId=${classId}`, role: 'INSTRUCTOR', page: <InstructorRoutePage pagePath="people" /> })
  const trigger = await screen.findByRole('button', { name: 'Manage join code' })
  expect(client.get.mock.calls.some(([path]) => path.endsWith('/join-code'))).toBe(false)
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Manage join code' })
  expect(await within(dialog).findByText('ABCD-EFGH-JK')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Revoke code' }))
  const confirmation = screen.getByRole('dialog', { name: 'Change join code' })
  await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog', { name: 'Manage join code' })).toBeInTheDocument()
  expect(client.post).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(screen.getByRole('heading', { name: 'People', exact: true })).toBeInTheDocument()
})

it('rejects a Student-safe roster response in the Instructor People view without crashing or showing stale records', async () => {
  const client={ get:vi.fn(path=>Promise.resolve(path.includes('/members') ? {data:[{userId:'other',fullName:'Stale short projection'}],pagination} : {data:[classRecord],pagination})),post:vi.fn(),patch:vi.fn() }
  renderWorkflow({client,entry:`/instructor/people?classId=${classId}`,role:'INSTRUCTOR',page:<InstructorRoutePage pagePath="people" />})
  expect(await screen.findByRole('button',{name:'Try again'})).toBeInTheDocument()
  expect(screen.queryByText('Stale short projection')).not.toBeInTheDocument()
  expect(screen.queryByText(/toLowerCase|Unexpected Application Error|ROSTER_CONTEXT_CHANGED/)).not.toBeInTheDocument()
  expect(client.patch).not.toHaveBeenCalled()
})
