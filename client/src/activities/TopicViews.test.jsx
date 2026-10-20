import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GroupedClasswork, TopicSelector } from './TopicViews.jsx'
import { useState } from 'react'
const classId = 'class-one'
const pagination = { totalPages: 1, hasNextPage: false, hasPreviousPage: false }
const topics = [{ id: 'first', name: 'Fundamentals', position: 0 }, { id: 'second', name: 'Midterms', position: 1 }]
const activity = { id: 'one', classId, title: 'First task', instructions: 'DO NOT SHOW LONG INSTRUCTIONS', status: 'PUBLISHED', dueDate: '2099-01-01', totalPoints: 100, submissionCount: 3 }
function apiFixture() {
  return { listTopics: vi.fn().mockResolvedValue({ data: { topics, version: 3, page: 1, hasNextPage: false } }), listActivities: vi.fn((_classId, query) => Promise.resolve({ data: query.topicId === 'first' ? [activity] : [], pagination })), changeTopic: vi.fn().mockResolvedValue({ data: { version: 4, createdId: 'new' } }) }
}
describe('Classwork topic organization', () => {
  it('shows empty Instructor Topics, No topic last, concise rows and keyboard collapse', async () => {
    const user = userEvent.setup(), api = apiFixture()
    render(<MemoryRouter><GroupedClasswork classId={classId} instructor api={api} /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: 'First task' })).toBeInTheDocument()
    expect(screen.queryByText(activity.instructions)).not.toBeInTheDocument()
    expect(screen.getByText(/3 submissions/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'First task' })).toHaveTextContent('3 submissions')
    expect(screen.getByRole('link', { name: 'First task' })).toHaveAttribute('href', '/instructor/activity/one/settings?classId=class-one')
    expect(screen.queryByRole('link', { name: 'Submissions', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter activities by status' })).toHaveValue('')
    expect(screen.getAllByRole('heading', { level: 3 }).map(node => node.textContent)).toEqual(['Fundamentals', 'Midterms', 'No topic'])
    const heading = screen.getByRole('button', { name: 'Fundamentals' }); heading.focus(); await user.keyboard('{Enter}')
    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'First task' })).not.toBeInTheDocument()
    expect(api.changeTopic).not.toHaveBeenCalled()
  })
  it('hides empty Student sections and has no management controls', async () => {
    const api = apiFixture()
    render(<MemoryRouter><GroupedClasswork classId={classId} api={api} /></MemoryRouter>)
    await screen.findByRole('link', { name: 'First task' })
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Midterms' })).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'No topic' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Topic' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'First task' })).toHaveAttribute('href', '/student/activity/one?classId=class-one')
  })
  it('confirms removal and uses the displayed organization version; cancellation writes nothing', async () => {
    const user = userEvent.setup(), api = apiFixture()
    render(<MemoryRouter><GroupedClasswork classId={classId} instructor api={api} /></MemoryRouter>)
    await user.click((await screen.findAllByRole('button', { name: 'Remove' }))[0])
    expect(screen.getByRole('dialog')).toHaveTextContent('Submissions and Git work will be preserved')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.changeTopic).not.toHaveBeenCalled()
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    await user.click(screen.getByRole('button', { name: 'Remove Topic' }))
    expect(api.changeTopic).toHaveBeenCalledWith(classId, expect.objectContaining({ action: 'remove', topicId: 'first', expectedVersion: 3 }))
  })
  it('supports keyboard reorder with persisted version and class identity', async () => {
    const user = userEvent.setup(), api = apiFixture()
    render(<MemoryRouter><GroupedClasswork classId={classId} instructor api={api} /></MemoryRouter>)
    const move = await screen.findByRole('button', { name: 'Move Midterms up' }); move.focus(); await user.keyboard('{Enter}')
    expect(api.changeTopic).toHaveBeenCalledWith(classId, { action: 'up', topicId: 'second', expectedVersion: 3 })
  })
  it('pages within each topic, never groups an incomplete global Activity page', async () => {
    const api = apiFixture(), user = userEvent.setup()
    api.listActivities.mockImplementation((_class, query) => Promise.resolve({ data: query.topicId === 'first' ? [{ ...activity, title: query.page === 1 ? 'First task' : 'Older task' }] : [], pagination: query.topicId === 'first' ? { totalPages: 2, hasNextPage: query.page === 1, hasPreviousPage: query.page === 2 } : pagination }))
    render(<MemoryRouter><GroupedClasswork classId={classId} instructor api={api} /></MemoryRouter>)
    await screen.findByText('First task')
    await user.click(within(screen.getByRole('navigation', { name: 'Fundamentals activity pages' })).getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Older task')).toBeInTheDocument()
    expect(api.listActivities).toHaveBeenCalledWith(classId, { topicId: 'first', page: 2, pageSize: 20 }, expect.any(Object))
  })
  it('creates a Topic without clearing other controlled draft input and restores focus after cancel', async () => {
    const api = apiFixture(), user = userEvent.setup(), submitActivity = vi.fn(event => event.preventDefault())
    function Draft() { const [topic, setTopic] = useState(''); return <form onSubmit={submitActivity}><label>Draft title<input defaultValue="Retained draft" /></label><TopicSelector classId={classId} value={topic} onChange={setTopic} api={api} /></form> }
    render(<Draft />)
    await user.selectOptions(screen.getByLabelText('Topic'), '__create')
    await user.type(screen.getByLabelText('Topic name'), 'Java Fundamentals')
    await user.click(screen.getByRole('button', { name: 'Create Topic' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(submitActivity).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Draft title')).toHaveValue('Retained draft')
    expect(screen.getByLabelText('Topic')).toHaveValue('new')
    expect(api.changeTopic).toHaveBeenCalledWith(classId, { action: 'create', name: 'Java Fundamentals', expectedVersion: 3 })
  })
})
