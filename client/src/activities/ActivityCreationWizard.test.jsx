import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.js'
import { activityDraftKey, writeActivityDraft } from '../auth/private-session-drafts.js'
import ActivityCreationWizard from './ActivityCreationWizard.jsx'
import { formFromActivity } from './activity-authoring-model.js'
import { DEFAULT_GRADING_CONFIGURATION } from './weighted-grading.js'
const cls = { id: 'class-a', status: 'ACTIVE' }
const record = { id: 'draft-a', classId: cls.id, title: 'Scanner exercise', instructions: 'Read and add two integers.', dueDate: '2099-01-01T09:00:00Z', starterCode: 'public class Main {}', entryClassName: 'Main', totalPoints: 100, maxAttempts: 2, creditPolicy: 'LATEST', gradingMode: 'GRADED', gradingPeriod: 'PRELIM', gradingConfiguration: DEFAULT_GRADING_CONFIGURATION, status: 'DRAFT', updatedAt: '2026-10-24T01:00:00Z', createdAt: '2026-10-24T01:00:00Z' }
const cases = [{ id: 'case-a', name: 'Visible', inputData: '2 3', expectedOutput: '5', isHidden: false, importance: 'NORMAL', points: '70' }]
const api = () => ({ listTopics: vi.fn().mockResolvedValue({ data: { topics: [], version: 0, hasNextPage: false } }), updateActivity: vi.fn().mockImplementation((_id, body) => Promise.resolve({ data: { ...record, ...body, updatedAt: '2026-10-24T02:00:00Z' } })), listTestCases: vi.fn().mockResolvedValue({ data: cases }), getActivity: vi.fn().mockResolvedValue({ data: record }), transition: vi.fn().mockResolvedValue({ data: { ...record, status: 'PUBLISHED' } }) })
function view(client, initialActivity = record, initialCases = cases, onPublished = vi.fn()) {
 return <MemoryRouter><AuthContext.Provider value={{ user: { id: 'teacher-a', role: 'INSTRUCTOR' } }}><Routes><Route path="/" element={<ActivityCreationWizard api={client} initialActivity={initialActivity} initialCases={initialCases} selectedClass={cls} onPublished={onPublished} />} /><Route path="/instructor/activity/:id/settings" element={<p>Canonical draft opened</p>} /></Routes></AuthContext.Provider></MemoryRouter>
}
afterEach(() => sessionStorage.clear())
describe('guided Activity creation', () => {
 it('keeps validation on Details and focuses the first invalid control', async () => {
  const client = api(), user = userEvent.setup(); render(view(client, null, []))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('textbox', { name: /^Activity title/ })).toHaveFocus()
  expect(screen.queryByText(/Add at least one test case/)).not.toBeInTheDocument()
 })
 it('delays readiness until Publishing, saves tests with the latest version, and releases into free navigation', async () => {
  const client = api(), published = vi.fn(), user = userEvent.setup()
  client.replaceTestCases = vi.fn().mockResolvedValue({ data: { activityUpdatedAt: '2026-10-24T03:00:00Z', testCases: cases.map(row => ({ ...row, importance: 'HIGH' })) } })
  render(view(client, record, cases, published))
  expect(screen.queryByText('Before publishing')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save activity' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText(/Java Starter is the initial code/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.selectOptions(screen.getByRole('combobox', { name: /^Importance/ }), 'HIGH')
  expect(screen.queryByRole('button', { name: 'Save test cases' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('region', { name: 'Publication summary' })).toBeInTheDocument()
  expect(client.replaceTestCases.mock.calls[0][1]).toMatchObject({ expectedUpdatedAt: record.updatedAt, testCases: [{ importance: 'HIGH' }] })
  expect(client.replaceTestCases.mock.calls[0][1].testCases[0]).not.toHaveProperty('points')
  await user.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(screen.getByText(/Draft saved. You can return/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true })); await user.click(screen.getByRole('button', { name: 'Confirm publish' }))
  expect(client.transition).toHaveBeenCalledWith(record.id, 'publish', { expectedUpdatedAt: '2026-10-24T03:00:00Z' })
  expect(published).toHaveBeenCalledOnce()
 })
 it('recovers unsaved test input and the current step after a refresh', async () => {
  const client = api(), user = userEvent.setup(), first = render(view(client))
  await user.click(screen.getByRole('button', { name: 'Next' })); await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.clear(screen.getByLabelText('Input')); await user.type(screen.getByLabelText('Input'), 'Unsaved input')
  first.unmount(); render(view(client))
  expect(screen.getByRole('heading', { name: 'Step 3: Test cases' })).toBeInTheDocument()
  expect(screen.getByLabelText('Input')).toHaveValue('Unsaved input')
  expect(client.updateActivity).not.toHaveBeenCalled()
 })
 it('blocks a stale recovered draft until the saved version is explicitly loaded', async () => {
  writeActivityDraft(activityDraftKey('teacher-a', cls.id, record.id), { expectedUpdatedAt: '2026-10-23T01:00:00Z', creationId: 'request-a', form: { ...formFromActivity(record), title: 'Local edit' }, tests: cases, step: 0, formDirty: true, testsDirty: false })
  const client = api(), user = userEvent.setup();render(view(client))
  expect(screen.getByLabelText('Activity title')).toHaveValue('Local edit')
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Load latest saved draft' }))
  expect(await screen.findByDisplayValue(record.title)).toBeInTheDocument()
  expect(client.updateActivity).not.toHaveBeenCalled()
 })
 it('uses one stable request id for double clicks and a lost creation response retry', async () => {
  const client = api(), user = userEvent.setup();let fail
  client.createActivity = vi.fn().mockImplementationOnce(() => new Promise((_resolve,reject) => { fail = reject })).mockImplementation((_classId, body) => Promise.resolve({ data: { ...record, ...body, id: body.creationRequestId } }))
  render(view(client, null, []))
  await user.type(screen.getByLabelText('Activity title'), record.title); await user.type(screen.getByLabelText('Instructions'), record.instructions)
  fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: '2099-01-01T09:00' } })
  await user.selectOptions(screen.getByRole('combobox', { name: 'Grading period' }), 'PRELIM')
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(client.createActivity).toHaveBeenCalledOnce())
  fail(new Error('network unavailable'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Canonical draft opened')).toBeInTheDocument()
  expect(client.createActivity.mock.calls[0][1].creationRequestId).toBe(client.createActivity.mock.calls[1][1].creationRequestId)
 })
})
