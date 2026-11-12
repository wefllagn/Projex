import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { AuthContext } from '../auth/auth-context.js'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import { routeCatalog } from '../data/projexData.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import InstructorRoutePage from '../pages/InstructorPages.jsx'
import StudentRoutePage from '../pages/StudentPages.jsx'
import ClassProvider from './ClassProvider.jsx'

const primary = { userId: 'primary', fullName: 'Ada Reyes' }

function makeClass(id, className, status) {
  return { id, className, status, section: 'CS 2A', instructor: primary, createdAt: '2026-08-01T00:00:00Z' }
}

function classClient(records) {
  let classes = records
  return {
    get: vi.fn(async (path) => {
      const url = new URL(path, 'https://origin.test')
      if (url.pathname === '/classes') {
        const status = url.searchParams.get('status')
        const page = Number(url.searchParams.get('page'))
        const pageSize = Number(url.searchParams.get('pageSize'))
        const matches = classes.filter((record) => record.status === status)
        return {
          data: matches.slice((page - 1) * pageSize, page * pageSize),
          pagination: { page, pageSize, totalItems: matches.length, hasNextPage: page * pageSize < matches.length },
        }
      }
      if (path.endsWith('/staff')) return { data: { primary, coInstructors: [] } }
      if (path.startsWith('/class-invitations') || path.startsWith('/repositories')) {
        return { data: [], pagination: { totalItems: 0 } }
      }
      const record = classes.find((item) => path === `/classes/${item.id}`)
      if (record) return { data: record }
      throw new ApiError({ status: 404, code: 'CLASS_NOT_FOUND' })
    }),
    post: vi.fn(async (path) => {
      const [, , id, action] = path.split('/')
      const record = classes.find((item) => item.id === id)
      if (!record || !['archive', 'restore'].includes(action)) throw new Error('Unexpected class action')
      const updated = { ...record, status: action === 'archive' ? 'ARCHIVED' : 'ACTIVE' }
      classes = classes.map((item) => item.id === id ? updated : item)
      return { data: updated }
    }),
  }
}

function renderWorkspace(client, entry, role, id = primary.userId) {
  const auth = { status: 'authenticated', user: { id, role, status: 'ACTIVE', fullName: 'Ada Reyes' } }
  const result = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          {routeCatalog.filter((item) => ['student', 'instructor'].includes(item.id)).map((item) => {
            const Page = item.id === 'student' ? StudentRoutePage : InstructorRoutePage
            return (
              <Route key={item.id} path={item.path} element={
                <ProtectedRoute role={item.id.toUpperCase()}>
                  <ClassProvider client={client}><DashboardLayout role={item} /></ClassProvider>
                </ProtectedRoute>
              }>
                <Route index element={<Page pagePath="dashboard" />} />
                {item.routes.map(({ path }) => <Route key={path} path={path} element={<Page pagePath={path} />} />)}
              </Route>
            )
          })}
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return within(result.container.querySelector('#origin-main') ?? result.container)
}

function classQuery(status, page) {
  return `/classes?status=${status}&page=${page}&pageSize=100`
}

describe('Archived Classes', () => {
  it.each(['Student', 'Instructor'])('uses separate paginated lists in the %s workspace', async (role) => {
    const records = ['ACTIVE', 'ARCHIVED'].flatMap((status) =>
      Array.from({ length: 101 }, (_, index) => makeClass(
        `${status}-${index + 1}`, `${status === 'ACTIVE' ? 'Current' : 'Past'} section ${index + 1}`, status,
      )),
    )
    records.push(makeClass('prepared', 'Unassigned section', 'PREPARED'))
    const client = classClient(records)
    const base = `/${role.toLowerCase()}`
    const page = renderWorkspace(client, base, role.toUpperCase())
    const user = userEvent.setup()
    const navigation = within(screen.getByRole('navigation', { name: `${role} navigation` }))

    expect(await page.findByRole('heading', { name: 'Current section 100' })).toBeInTheDocument()
    expect(page.queryByRole('heading', { name: /Past section|Unassigned section/ })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: /Past section|Unassigned section/ })).not.toBeInTheDocument()
    await user.click(navigation.getByRole('button', { name: 'Load more' }))
    expect(await navigation.findByRole('link', { name: /^Current section 101 ·/ })).toBeInTheDocument()
    expect(await page.findByRole('heading', { name: 'Current section 101' })).toBeInTheDocument()

    const archiveLink = navigation.getByRole('link', { name: 'Archived Classes' })
    expect(archiveLink).toHaveAttribute('href', `${base}/archived-classes`)
    await user.click(archiveLink)
    expect(archiveLink).toHaveAttribute('aria-current', 'page')
    expect(await page.findByRole('heading', { name: 'Past section 100' })).toBeInTheDocument()
    expect(page.queryByRole('heading', { name: /Current section|Unassigned section/ })).not.toBeInTheDocument()
    await user.click(page.getByRole('button', { name: 'Load more classes' }))
    expect(await page.findByRole('link', { name: /^Past section 101 / })).toHaveAttribute('href', `${base}/classes?classId=ARCHIVED-101`)
    expect(navigation.queryByRole('link', { name: /^Past section 101 ·/ })).not.toBeInTheDocument()
    const queries = client.get.mock.calls.map(([path]) => path).filter((path) => path.startsWith('/classes?'))
    expect(queries).toEqual([classQuery('ACTIVE', 1), classQuery('ACTIVE', 2), classQuery('ARCHIVED', 1), classQuery('ARCHIVED', 2)])
  }, 15_000)

  it('moves a class between the two catalogs through the existing primary instructor controls', async () => {
    const client = classClient([makeClass('logic', 'Discrete Structures', 'ACTIVE')])
    const page = renderWorkspace(client, '/instructor/class-info?classId=logic', 'INSTRUCTOR')
    const user = userEvent.setup()
    const navigation = within(screen.getByRole('navigation', { name: 'Instructor navigation' }))

    await user.click(await page.findByRole('button', { name: 'Archive class' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await page.findByRole('button', { name: 'Restore class' })).toBeInTheDocument()
    expect(page.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: /^Discrete Structures ·/ })).not.toBeInTheDocument()

    await user.click(navigation.getByRole('link', { name: 'Archived Classes' }))
    await user.click(await page.findByRole('link', { name: /^Discrete Structures / }))
    expect(await page.findByText('This class is read-only.')).toBeInTheDocument()
    await user.click(page.getByRole('link', { name: 'Class Info' }))
    await user.click(await page.findByRole('button', { name: 'Restore class' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await navigation.findByRole('link', { name: /^Discrete Structures ·/ })).toBeInTheDocument()
    await user.click(navigation.getByRole('link', { name: 'Archived Classes' }))
    expect(await page.findByText('You have no archived classes.')).toBeInTheDocument()
    await user.click(navigation.getByRole('link', { name: 'Home' }))
    expect(await page.findByRole('heading', { name: 'Discrete Structures' })).toBeInTheDocument()
    expect(client.post.mock.calls.map(([path]) => path)).toEqual(['/classes/logic/archive', '/classes/logic/restore'])
  })

  it.each([
    ['STUDENT', '/student/classes?classId=logic'],
    ['INSTRUCTOR', '/instructor/class-info?classId=logic'],
  ])('keeps the %s archived deep link accessible without primary restoration controls', async (role, path) => {
    const client = classClient([makeClass('logic', 'Discrete Structures', 'ARCHIVED')])
    const page = renderWorkspace(client, path, role, 'non-primary')
    expect(await page.findByRole('heading', { level: 1, name: 'Discrete Structures' })).toBeInTheDocument()
    expect(client.get).toHaveBeenCalledWith('/classes/logic', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(page.queryByRole('button', { name: /Restore class|Edit details/i })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /Student navigation|Instructor navigation/ })).not.toHaveTextContent('Discrete Structures')
    expect(client.post).not.toHaveBeenCalled()
  })

  it('uses the existing not-found state for a class outside the authorized catalog', async () => {
    const client = classClient([])
    const page = renderWorkspace(client, '/student/classes?classId=outside-scope', 'STUDENT')
    expect(await page.findByText('Not found', { exact: true })).toBeInTheDocument()
  })

  it.each(['STUDENT', 'INSTRUCTOR'])('opens an authorized PREPARED class for %s with no assigned instructor', async (role) => {
    const prepared = { ...makeClass('prepared', 'Unassigned section', 'PREPARED'), instructor: null }
    const client = classClient([prepared])
    const base = `/${role.toLowerCase()}`
    const page = renderWorkspace(client, `${base}/classes?classId=prepared`, role, 'authorized-member')

    expect(await page.findByRole('heading', { level: 1, name: prepared.className })).toBeInTheDocument()
    expect(page.getByText('Not assigned', { exact: true })).toBeInTheDocument()
    expect(page.getAllByText('Prepared', { exact: true })).toHaveLength(2)
    expect(client.get).toHaveBeenCalledWith('/classes/prepared', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.getByRole('navigation', { name: /Student navigation|Instructor navigation/ })).not.toHaveTextContent(prepared.className)
    expect(page.queryByRole('button', { name: /Restore class/i })).not.toBeInTheDocument()
  })

  it('keeps the repository archive on the existing Student route', async () => {
    const client = classClient([])
    const page = renderWorkspace(client, '/student/archive', 'STUDENT')
    expect(await page.findByRole('heading', { name: 'Archived Repositories' })).toBeInTheDocument()
    expect(client.get.mock.calls.some(([path]) => path === classQuery('ARCHIVED', 1))).toBe(false)
  })

  it('redirects a student away from the instructor archive', async () => {
    const client = classClient([makeClass('logic', 'Discrete Structures', 'ACTIVE')])
    const page = renderWorkspace(client, '/instructor/archived-classes', 'STUDENT')
    expect(await page.findByRole('heading', { name: 'Discrete Structures' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Student navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Instructor navigation' })).not.toBeInTheDocument()
    expect(client.get.mock.calls.some(([path]) => path === classQuery('ARCHIVED', 1))).toBe(false)
  })
})
