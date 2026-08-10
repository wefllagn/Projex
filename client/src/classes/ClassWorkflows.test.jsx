import { render, screen, waitFor } from '@testing-library/react'
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
      get: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }),
      post: vi.fn().mockResolvedValue({ data: { created: true, class: classRecord } }),
      patch: vi.fn(),
    }
    const user = userEvent.setup()
    renderWorkflow({ client, entry: '/student/join-class', page: <StudentRoutePage pagePath="join-class" /> })

    await user.click(screen.getByRole('button', { name: 'Join Class by Code' }))
    await user.type(screen.getByLabelText('Class code'), secretInput)
    await user.click(screen.getByRole('button', { name: 'Join Class' }))

    expect(await screen.findByText('Programming Fundamentals · BSIT 1A')).toBeInTheDocument()
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
  it('creates a class with only supported fields and no browser-generated code', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }),
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

    await user.type(screen.getByLabelText('Course name'), 'Programming Fundamentals')
    await user.type(screen.getByLabelText('Section'), 'BSIT 1A')
    await user.type(screen.getByLabelText('Semester'), 'First Semester')
    await user.type(screen.getByLabelText('School year'), '2026-2027')
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create Class' }))

    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/classes', {
      className: 'Programming Fundamentals',
      section: 'BSIT 1A',
      semester: 'First Semester',
      schoolYear: '2026-2027',
    }, undefined))
    expect(onCreated).toHaveBeenCalledWith(classRecord)
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
      get: vi.fn((path) => path.startsWith('/classes?')
        ? Promise.resolve({ data: [classRecord], pagination })
        : Promise.resolve({ data: [activeMember], pagination: { ...pagination, pageSize: 50 } })),
      post: vi.fn(),
      patch: vi.fn().mockResolvedValue({ data: { ...activeMember, membershipStatus: 'REMOVED', removedAt: '2026-08-02T00:00:00.000Z' } }),
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWorkflow({ client, entry: `/instructor/people?classId=${classId}`, page: <InstructorRoutePage pagePath="people" />, role: 'INSTRUCTOR' })

    expect(await screen.findByText('Roster Student')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(client.patch).toHaveBeenCalledWith(
      `/classes/${classId}/members/member-1`,
      { status: 'REMOVED' },
      undefined,
    ))
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
  })
})
