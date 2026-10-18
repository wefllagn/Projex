import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminCourseCatalog from './AdminCourseCatalog.jsx'

const course = { id: 'course-1', courseNumber: 'IT 112', courseName: 'Programming 1' }
const response = (items = [course], totalItems = items.length) => ({ data: { items, totalItems, page: 1, pageSize: 20 } })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const renderCatalog = (api, path = '/admin/academic/courses') => render(<MemoryRouter initialEntries={[path]}><AdminCourseCatalog api={api} /></MemoryRouter>)

describe('Admin Course catalog', () => {
  it('uses URL filters and reaches records beyond the first page', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue(response([course], 101)) }
    const user = userEvent.setup()
    renderCatalog(api, '/admin/academic/courses?search=IT&page=5')
    expect(await screen.findByText('Page 5 of 6 · 101 Courses')).toBeInTheDocument()
    expect(api.listCourses).toHaveBeenLastCalledWith({ search: 'IT', page: 5, pageSize: 20 }, expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Next', exact: true }))
    expect(await screen.findByText('Page 6 of 6 · 101 Courses')).toBeInTheDocument()
    expect(api.listCourses).toHaveBeenLastCalledWith({ search: 'IT', page: 6, pageSize: 20 }, expect.any(Object))
    expect(screen.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  })

  it('shows loading and retryable failure without inventing an empty catalog', async () => {
    const pending = deferred()
    const api = { listCourses: vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(response()) }
    const user = userEvent.setup()
    renderCatalog(api)
    expect(screen.getByText('Loading Course catalog.')).toBeInTheDocument()
    await act(async () => pending.resolve(Promise.reject(new Error('read failed'))))
    expect(await screen.findByRole('button', { name: 'Retry Course catalog' })).toBeInTheDocument()
    expect(screen.queryByText('No Courses on this page.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry Course catalog' }))
    expect(await screen.findByText('Programming 1')).toBeInTheDocument()
  })

  it('resets search to page one, ignores obsolete results, and refreshes identical filters', async () => {
    const pending = deferred()
    const api = { listCourses: vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(response([{ ...course, courseName: 'Current result' }])) }
    const user = userEvent.setup()
    renderCatalog(api, '/admin/academic/courses?page=3')
    await user.type(screen.getByLabelText('Find Course'), 'IT')
    await user.click(screen.getByRole('button', { name: 'Search Courses' }))
    expect(await screen.findByText('Current result')).toBeInTheDocument()
    await act(async () => pending.resolve(response([{ ...course, courseName: 'Obsolete result' }])))
    expect(screen.queryByText('Obsolete result')).not.toBeInTheDocument()
    expect(api.listCourses).toHaveBeenLastCalledWith({ search: 'IT', page: 1, pageSize: 20 }, expect.any(Object))
    const count = api.listCourses.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Search Courses' }))
    await waitFor(() => expect(api.listCourses.mock.calls.length).toBeGreaterThan(count))
    expect(await screen.findByText('Current result')).toBeInTheDocument()
  })

  it('edits via the existing contract and locks edit switching until save finishes', async () => {
    const pending = deferred()
    const api = { listCourses: vi.fn().mockResolvedValue(response()), updateCourse: vi.fn().mockReturnValue(pending.promise) }
    const user = userEvent.setup()
    renderCatalog(api)
    await user.click(await screen.findByRole('button', { name: 'Edit IT 112' }))
    await user.clear(screen.getByLabelText('Course Name'))
    await user.type(screen.getByLabelText('Course Name'), 'Programming fundamentals')
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(api.updateCourse).toHaveBeenCalledWith('course-1', { courseNumber: 'IT 112', courseName: 'Programming fundamentals' })
    expect(screen.getByRole('button', { name: 'Cancel edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit IT 112' })).toBeDisabled()
    await act(async () => pending.resolve({ data: course }))
    expect(await screen.findByText('Course saved.')).toBeInTheDocument()
  })

  it('previews CSV without writes and confirms only the reviewed fingerprint', async () => {
    const csv = 'courseNumber,courseName\nIT 120,Programming 2'
    const api = {
      listCourses: vi.fn().mockResolvedValue(response()),
      previewCourseCsv: vi.fn().mockResolvedValue({ data: { valid: true, count: 1, fingerprint: 'reviewed-file', rows: [{ row: 2, courseNumber: 'IT 120', courseName: 'Programming 2' }] } }),
      confirmCourseCsv: vi.fn().mockResolvedValue({ data: { imported: 1 } }),
    }
    const user = userEvent.setup()
    renderCatalog(api)
    const file = new File([csv], 'courses.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', { value: async () => csv })
    await user.upload(screen.getByLabelText('Course CSV'), file)
    await user.click(screen.getByRole('button', { name: 'Preview import' }))
    expect(await screen.findByText('1 rows · Ready to confirm')).toBeInTheDocument()
    expect(api.confirmCourseCsv).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirm import' }))
    expect(api.confirmCourseCsv).toHaveBeenCalledWith(csv, 'reviewed-file')
    expect(await screen.findByText('1 Courses imported.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument()
  })
})
