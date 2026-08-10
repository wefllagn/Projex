import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import ClassProvider from './ClassProvider.jsx'
import { useClasses } from './class-context.js'

const classRecord = {
  id: '00000000-0000-4000-8000-000000000001',
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

function Probe() {
  const classes = useClasses()
  return <div><span data-testid="catalog-status">{classes.status}</span><span data-testid="selection-status">{classes.selectionStatus}</span><span>{classes.selectedClass?.className}</span></div>
}

describe('ClassProvider', () => {
  it('loads the authorized catalog without selecting an arbitrary first class', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [classRecord], pagination }) }
    render(<MemoryRouter><ClassProvider client={client}><Probe /></ClassProvider></MemoryRouter>)

    expect(await screen.findByTestId('catalog-status')).toHaveTextContent('ready')
    expect(screen.getByTestId('selection-status')).toHaveTextContent('none')
    expect(screen.queryByText(classRecord.className)).not.toBeInTheDocument()
  })

  it('derives selection from the classId URL parameter', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: [classRecord], pagination }) }
    render(
      <MemoryRouter initialEntries={[`/student/classes?classId=${classRecord.id}`]}>
        <ClassProvider client={client}><Probe /></ClassProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(classRecord.className)).toBeInTheDocument()
    expect(screen.getByTestId('selection-status')).toHaveTextContent('ready')
  })

  it('resolves inaccessible selections through the backend and fails safely', async () => {
    const client = {
      get: vi.fn((path) => path.startsWith('/classes?')
        ? Promise.resolve({ data: [], pagination: { ...pagination, totalItems: 0, totalPages: 0 } })
        : Promise.reject(new ApiError({ status: 404, code: 'CLASS_NOT_FOUND' }))),
    }
    render(
      <MemoryRouter initialEntries={['/student/classes?classId=00000000-0000-4000-8000-000000000099']}>
        <ClassProvider client={client}><Probe /></ClassProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('selection-status')).toHaveTextContent('error'))
    expect(client.get).toHaveBeenCalledWith('/classes/00000000-0000-4000-8000-000000000099', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
})
