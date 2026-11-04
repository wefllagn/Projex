import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassContext } from '../classes/class-context.js'
import StudentPracticeWorkspace from './StudentPracticeWorkspace.jsx'

const activityId = '00000000-0000-4000-8000-000000000010', classId = '00000000-0000-4000-8000-000000000001'
const initial = { activityId, classId, workspaceId: 'practice-1', title: 'Loops', instructions: 'Write a loop.', entryClassName: 'Main', starterCode: 'class Main {}', sourceCode: 'class Main {}', head: 'a'.repeat(40), ready: true, canStartOver: false }
function setup(overrides = {}, value = initial) {
  const api = { enter: vi.fn().mockResolvedValue({ data: {} }), get: vi.fn().mockResolvedValue({ data: value }), save: vi.fn().mockResolvedValue({ data: { id: 'save-1', status: 'PENDING' } }), getSave: vi.fn().mockResolvedValue({ data: { id: 'save-1', status: 'SUCCEEDED', head: 'b'.repeat(40) } }), ...overrides }
  const router = createMemoryRouter([{ path: '/student/activity/:activityId/practice', element: <ClassContext.Provider value={{ selectedClass: { id: classId }, selectionStatus: 'ready' }}><StudentPracticeWorkspace api={api} /></ClassContext.Provider> }, { path: '/student/activity/:activityId', element: <p>Activity detail</p> }], { initialEntries: [`/student/activity/${activityId}/practice`] })
  return { api, router, ...render(<RouterProvider router={router} />) }
}
afterEach(cleanup)
describe('activity-level Practice Again workspace', () => {
  it('completes reset without a late read and permits immediate navigation without discarding a draft', async () => {
    const value = { ...initial, sourceCode: 'class Main { int saved = 1; }', canStartOver: true }
    const { api } = setup({}, value)
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    expect(screen.getByRole('heading', { name: 'Loops · Practice Again' })).toBeVisible()
    api.get.mockRejectedValue(new Error('Network unavailable after initial load'))
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await screen.findByText('Practice restored to the starter code.')
    expect(editor).toHaveValue(initial.starterCode)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Start Over' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Back to activity' }))
    expect(await screen.findByText('Activity detail')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
  it('opens the starter workspace without official submission controls or Git jargon', async () => {
    const { api } = setup()
    expect(await screen.findByRole('textbox', { name: 'Java source code' })).toHaveValue(initial.starterCode)
    expect(screen.getByText('Your official submissions and grades won’t change.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Over' })).not.toBeInTheDocument()
    expect(api.enter).toHaveBeenCalledTimes(1)
  })
  it('returns to saved practice and confirms Start Over; cancelling keeps the source', async () => {
    const value = { ...initial, sourceCode: 'class Main { int saved = 1; }', canStartOver: true }
    const { api } = setup({}, value)
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    expect(editor).toHaveValue(value.sourceCode)
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    expect(await screen.findByRole('dialog', { name: 'Start Over' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.save).not.toHaveBeenCalled()
    expect(editor).toHaveValue(value.sourceCode)
  })
  it('keeps edits made while a save is waiting and uses the confirmed commit as the next base', async () => {
    let finish
    const { api } = setup({ getSave: vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve })) })
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    fireEvent.change(editor, { target: { value: 'class Main { int first = 1; }' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    fireEvent.change(editor, { target: { value: 'class Main { int second = 2; }' } })
    await waitFor(() => expect(finish).toBeTypeOf('function'), { timeout: 3000 })
    await act(async () => finish({ data: { id: 'save-1', status: 'SUCCEEDED', head: 'b'.repeat(40) } }))
    expect(editor).toHaveValue('class Main { int second = 2; }')
    expect(screen.getByText('Practice saved.')).toBeVisible()
    expect(screen.getByText('Newer edits are unsaved.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2))
    expect(api.save.mock.calls[1][1]).toMatchObject({ sourceCode: 'class Main { int second = 2; }', expectedHead: 'b'.repeat(40) })
  })
  it('retries an uncertain save with exactly the same source and key', async () => {
    const { api } = setup({ save: vi.fn().mockRejectedValueOnce({ code: 'NETWORK_ERROR' }).mockResolvedValue({ data: { id: 'save-1', status: 'PENDING' } }) })
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    fireEvent.change(editor, { target: { value: 'class Main { int before = 1; }' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }))
    const retry = await screen.findByRole('button', { name: 'Retry save' })
    fireEvent.change(editor, { target: { value: 'class Main { int after = 2; }' } })
    fireEvent.click(retry)
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2))
    expect(api.save.mock.calls[1][1]).toEqual(api.save.mock.calls[0][1])
    expect(editor).toHaveValue('class Main { int after = 2; }')
  })
  it('preserves the draft on a stale save and supports cancelling reload and navigation', async () => {
    const { api } = setup({ getSave: vi.fn().mockResolvedValue({ data: { id: 'save-1', status: 'CONFLICTED' } }) })
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    fireEvent.change(editor, { target: { value: 'class Main { int draft = 1; }' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save practice' }))
    expect(await screen.findByText(/saved practice changed elsewhere/)).toBeVisible()
    expect(editor).toHaveValue('class Main { int draft = 1; }')
    fireEvent.click(screen.getByRole('button', { name: 'Reload saved practice' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(api.get).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('link', { name: 'Back to activity' }))
    expect(await screen.findByRole('alertdialog', { name: 'Leave practice?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Keep practicing' }))
    expect(editor).toHaveValue('class Main { int draft = 1; }')
  })
  it('never overwrites new typing when Start Over completes', async () => {
    let finish
    const value = { ...initial, sourceCode: 'class Main { int saved = 1; }', canStartOver: true }
    const { api } = setup({ getSave: vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve })) }, value)
    const editor = await screen.findByRole('textbox', { name: 'Java source code' })
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0][1]).not.toHaveProperty('sourceCode')
    fireEvent.change(editor, { target: { value: 'class Main { int newDraft = 2; }' } })
    api.get.mockResolvedValue({ data: { ...initial, head: 'b'.repeat(40) } })
    await waitFor(() => expect(finish).toBeTypeOf('function'), { timeout: 3000 })
    await act(async () => finish({ data: { id: 'save-1', status: 'SUCCEEDED', head: 'b'.repeat(40) } }))
    await waitFor(() => expect(screen.getByText('Practice restored to the starter code.')).toBeVisible())
    expect(editor).toHaveValue('class Main { int newDraft = 2; }')
  })
})
