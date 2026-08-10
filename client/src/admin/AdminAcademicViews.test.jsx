import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import {
  AdminAcademicHomePage,
  AdminAcademicListPage,
  AdminClassCreatePage,
  AdminClassDetailPage,
  AdminClassListPage,
} from './AdminAcademicViews.jsx'

const classRecord = {
  id: 'class-1', className: 'Java Programming', section: 'BSIT 2A', semester: 'First Semester', schoolYear: '2030-2031', status: 'ACTIVE',
  createdAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z', archivedAt: null,
  instructor: { userId: 'instructor-1', fullName: 'Synthetic Instructor' },
}

const academicClass = {
  ...classRecord,
  instructor: { id: 'instructor-1', fullName: 'Synthetic Instructor', email: 'instructor@slu.edu.ph' },
  membershipCounts: { ACTIVE: 2, REMOVED: 1 },
}

const member = {
  memberId: 'member-1', userId: 'student-1', fullName: 'Synthetic Student', email: 'student@slu.edu.ph', userStatus: 'ACTIVE', membershipStatus: 'ACTIVE',
  joinedAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z', removedAt: null, lastActivatedAt: '2030-01-01T00:00:00.000Z',
}

const pagination = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

function renderAt(element, path, route = '*') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /><Route path="*" element={<output data-testid="location">navigated</output>} /></Routes></MemoryRouter>)
}

describe('Phase 10D.2 admin academic views', () => {
  it('offers only the approved class and read-only academic areas', () => {
    renderAt(<AdminAcademicHomePage />, '/admin/academic')
    expect(screen.getByRole('link', { name: /classes/i })).toHaveAttribute('href', '/admin/academic/classes')
    expect(screen.getByRole('link', { name: /programming activities/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /grade|release|view source/i })).not.toBeInTheDocument()
  })

  it('uses URL-owned class filters and server pagination without mock fallback', async () => {
    const api = { listAcademicClasses: vi.fn().mockResolvedValue({ data: [academicClass], pagination }) }
    renderAt(<AdminClassListPage api={api} />, '/admin/academic/classes?page=1&status=ACTIVE&sortBy=className&sortOrder=asc')
    expect(await screen.findByText('Java Programming')).toBeInTheDocument()
    expect(api.listAcademicClasses).toHaveBeenCalledWith(expect.objectContaining({ page: 1, status: 'ACTIVE', sortBy: 'className', sortOrder: 'asc' }), expect.any(Object))
    expect(screen.queryByText('12 active courses')).not.toBeInTheDocument()
  })

  it('creates a class only with a selected ACTIVE instructor from the real directory', async () => {
    const api = {
      listUsers: vi.fn().mockResolvedValue({ data: [{ id: 'instructor-1', fullName: 'Synthetic Instructor', email: 'instructor@slu.edu.ph', role: 'INSTRUCTOR', status: 'ACTIVE' }], pagination }),
      createClass: vi.fn().mockResolvedValue({ data: classRecord }),
    }
    const user = userEvent.setup()
    renderAt(<AdminClassCreatePage api={api} />, '/admin/academic/classes/new', '/admin/academic/classes/new')
    await user.click(screen.getByRole('button', { name: 'Search instructors' }))
    await user.click(await screen.findByRole('radio'))
    await user.type(screen.getByLabelText('Class name'), 'Java Programming')
    await user.type(screen.getByLabelText('Section'), 'BSIT 2A')
    await user.type(screen.getByLabelText('Semester'), 'First Semester')
    await user.type(screen.getByLabelText('School year'), '2030-2031')
    await user.click(screen.getByRole('button', { name: 'Create class' }))
    expect(api.createClass).toHaveBeenCalledWith(expect.objectContaining({ instructorId: 'instructor-1', className: 'Java Programming' }))
  })

  it('fails closed when class detail does not match the route identity', async () => {
    const api = { getClass: vi.fn().mockResolvedValue({ data: { ...classRecord, id: 'other-class' } }), listClassMembers: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }) }
    renderAt(<AdminClassDetailPage api={api} />, '/admin/academic/classes/class-1', '/admin/academic/classes/:classId')
    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText('Java Programming')).not.toBeInTheDocument()
  })

  it('reveals a join code deliberately and hides it after real revocation', async () => {
    const api = {
      getClass: vi.fn().mockResolvedValue({ data: classRecord }), listClassMembers: vi.fn().mockResolvedValue({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } }),
      getJoinCode: vi.fn().mockResolvedValue({ data: { classId: 'class-1', classCode: 'ABCDE-23456', active: true, changedAt: '2030-01-02T00:00:00.000Z' } }),
      revokeJoinCode: vi.fn().mockResolvedValue({ data: { classId: 'class-1', classCode: 'ABCDE-23456', active: false, changedAt: '2030-01-03T00:00:00.000Z' } }),
    }
    const user = userEvent.setup()
    renderAt(<AdminClassDetailPage api={api} />, '/admin/academic/classes/class-1', '/admin/academic/classes/:classId')
    await screen.findByText('Java Programming')
    expect(screen.queryByText('ABCDE-23456')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reveal join code' }))
    expect(await screen.findByText('ABCDE-23456')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoke code' }))
    await user.type(within(screen.getByRole('dialog')).getByLabelText('Reason'), 'Approved code revocation.')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(api.revokeJoinCode).toHaveBeenCalled())
    expect(screen.queryByText('ABCDE-23456')).not.toBeInTheDocument()
    expect(await screen.findByText(/previous code is not usable/i)).toBeInTheDocument()
  })

  it('uses the roster version, refetches on stale conflict, preserves the reason, and requires retry', async () => {
    const refreshed = { ...member, updatedAt: '2030-01-03T00:00:00.000Z' }
    const api = {
      getClass: vi.fn().mockResolvedValue({ data: classRecord }),
      listClassMembers: vi.fn().mockResolvedValueOnce({ data: [member], pagination }).mockResolvedValue({ data: [refreshed], pagination }),
      updateClassMember: vi.fn().mockRejectedValueOnce(new ApiError({ status: 409, code: 'STALE_CLASS_MEMBER_VERSION', message: 'The class membership changed.' })).mockResolvedValue({ data: { ...refreshed, membershipStatus: 'REMOVED', removedAt: '2030-01-04T00:00:00.000Z', updatedAt: '2030-01-04T00:00:00.000Z' } }),
    }
    const user = userEvent.setup()
    renderAt(<AdminClassDetailPage api={api} />, '/admin/academic/classes/class-1', '/admin/academic/classes/:classId')
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Reason'), 'Approved roster correction.')
    await user.click(within(dialog).getByRole('button', { name: 'Remove member' }))
    expect(await within(dialog).findByText(/roster was refreshed/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Reason')).toHaveValue('Approved roster correction.')
    expect(api.updateClassMember).toHaveBeenNthCalledWith(1, 'class-1', 'member-1', expect.objectContaining({ expectedUpdatedAt: '2030-01-02T00:00:00.000Z' }))
    await user.click(within(dialog).getByRole('button', { name: 'Remove member' }))
    expect(api.updateClassMember).toHaveBeenNthCalledWith(2, 'class-1', 'member-1', expect.objectContaining({ expectedUpdatedAt: '2030-01-03T00:00:00.000Z' }))
    expect(await screen.findByText('Removed')).toBeInTheDocument()
  })

  it('keeps non-released scores hidden in read-only submission oversight', async () => {
    const base = { id: 'submission-1', attemptNumber: 1, isLate: false, submittedAt: '2030-01-01T00:00:00.000Z', student: { id: 'student-1', fullName: 'Synthetic Student', email: 'student@slu.edu.ph' }, activity: { id: 'activity-1', title: 'Loops', status: 'PUBLISHED', class: { id: 'class-1', className: 'Java', section: 'A', semester: 'First', schoolYear: '2030', status: 'ACTIVE' } } }
    const api = { listAcademicSubmissions: vi.fn().mockResolvedValue({ data: [{ ...base, submissionStatus: 'ASSESSED', releasedScore: 99 }, { ...base, id: 'submission-2', submissionStatus: 'RELEASED', releasedScore: 88 }], pagination: { ...pagination, totalItems: 2 } }) }
    renderAt(<AdminAcademicListPage kind="submissions" api={api} />, '/admin/academic/submissions')
    expect(await screen.findByText('88 points')).toBeInTheDocument()
    expect(screen.getByText('Not released')).toBeInTheDocument()
    expect(screen.queryByText('99 points')).not.toBeInTheDocument()
  })
})
