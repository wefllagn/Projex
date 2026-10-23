import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminOfficialMetadataPanel, AdminTeachingStaffPanel } from './AdminClassFoundationPanels.jsx'

const record = { classId: 'class-1', status: 'ACTIVE', updatedAt: '2030-01-01T00:00:00.000Z' }
const courses = { data: { items: [{ id: 'course-1', courseNumber: 'IT 112', courseName: 'Programming 1' }] } }
const impact = (id = record.classId) => ({ data: { class: { id, updatedAt: record.updatedAt }, history: { memberships: 1 } } })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

describe('Admin foundation read safety', () => {
  it('selects the existing Course when its options arrive asynchronously', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue(courses), getOfficialMetadataImpact: vi.fn().mockResolvedValue(impact()) }
    render(<AdminOfficialMetadataPanel classRecord={{ ...record, courseId: 'course-1' }} api={api} onSaved={vi.fn()} />)
    await screen.findByRole('option', { name: 'IT 112 — Programming 1' })
    expect(screen.getByLabelText('Course')).toHaveValue('course-1')
  })

  it('does not adopt a newer impact version while retaining older Class form values', async () => {
    const newer = impact()
    newer.data.class.updatedAt = '2030-01-02T00:00:00.000Z'
    const api = { listCourses: vi.fn().mockResolvedValue(courses), getOfficialMetadataImpact: vi.fn().mockResolvedValue(newer) }
    const onSaved = vi.fn()
    render(<AdminOfficialMetadataPanel classRecord={record} api={api} onSaved={onSaved} />)
    expect(await screen.findByRole('button', { name: 'Retry offering context' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save official metadata' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Retry offering context' }))
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('fails closed on mismatched history and provides a deliberate retry', async () => {
    const api = { listCourses: vi.fn().mockResolvedValue(courses), getOfficialMetadataImpact: vi.fn().mockResolvedValueOnce(impact('other-class')).mockResolvedValue(impact()) }
    const user = userEvent.setup()
    render(<AdminOfficialMetadataPanel classRecord={record} api={api} onSaved={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Retry offering context' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save official metadata' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retry offering context' }))
    expect(await screen.findByText(/Existing records: memberships 1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save official metadata' })).toBeEnabled()
    expect(screen.getByRole('checkbox')).toBeRequired()
  })

  it('does not refetch history on Course search and discards late Course responses', async () => {
    const stale = deferred()
    const api = { listCourses: vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValue(courses), getOfficialMetadataImpact: vi.fn().mockResolvedValue(impact()) }
    const user = userEvent.setup()
    render(<AdminOfficialMetadataPanel classRecord={record} api={api} onSaved={vi.fn()} />)
    await user.type(screen.getByLabelText('Find Course'), 'IT')
    expect(await screen.findByRole('option', { name: 'IT 112 — Programming 1' })).toBeInTheDocument()
    await act(async () => stale.resolve({ data: { items: [{ id: 'old', courseNumber: 'OLD', courseName: 'Old response' }] } }))
    expect(screen.queryByRole('option', { name: /Old response/ })).not.toBeInTheDocument()
    expect(api.getOfficialMetadataImpact).toHaveBeenCalledTimes(1)
  })

  it('clears the prior Class impact immediately on navigation and ignores its late result', async () => {
    const late = deferred()
    const api = { listCourses: vi.fn().mockResolvedValue(courses), getOfficialMetadataImpact: vi.fn().mockReturnValueOnce(late.promise).mockResolvedValue(impact('class-2')) }
    const view = render(<AdminOfficialMetadataPanel classRecord={record} api={api} onSaved={vi.fn()} />)
    view.rerender(<AdminOfficialMetadataPanel classRecord={{ ...record, classId: 'class-2' }} api={api} onSaved={vi.fn()} />)
    expect(await screen.findByText(/Existing records: memberships 1/)).toBeInTheDocument()
    await act(async () => late.resolve({ data: { class: impact().data.class, history: { memberships: 999 } } }))
    expect(screen.queryByText(/memberships 999/)).not.toBeInTheDocument()
  })

  it('never presents failed staff reads as an unassigned Primary and requires retry', async () => {
    const api = { listClassStaff: vi.fn().mockRejectedValueOnce(new Error('read failed')).mockResolvedValue({ data: { primary: { id: 'primary', fullName: 'Current Primary' }, coInstructors: [] } }) }
    const user = userEvent.setup()
    render(<AdminTeachingStaffPanel classRecord={record} api={api} onSaved={vi.fn()} />)
    expect(screen.getByText('Loading teaching staff…')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Retry teaching staff' }))
    expect(screen.queryByText(/Primary: Unassigned/)).not.toBeInTheDocument()
    expect(await screen.findByText(/Primary: Current Primary/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign Primary' })).toBeDisabled()
  })
})
