import { describe, expect, it } from 'vitest'
import {
  activityPayload,
  activityUpdatePayload,
  publicationRequirements,
  sumTestCasePoints,
  testCasePayload,
  validateActivityForm,
  validateTestCases,
} from './activity-utils.js'

const form = {
  title: 'Loops',
  instructions: 'Solve the exercise.',
  dueDate: '2099-09-03T17:00',
  entryClassName: 'Main',
  starterCode: 'public class Main {}',
  maxAttempts: '2',
  creditPolicy: 'LATEST',
  totalPoints: '100',
}

describe('activity form contracts', () => {
  it('uses automatic allocation publication rules without legacy manual point instructions', () => {
    const activity = { status: 'DRAFT', dueDate: '2099-01-01', totalPoints: 100, gradingMode: 'GRADED', gradingPeriod: 'PRELIM', rubricCriteria: [], gradingConfiguration: { version: 1, percentages: { correctness: 70, readability: 15, organization: 10, documentation: 5 } } }
    expect(publicationRequirements(activity, [])).toEqual(['Add at least one test case.', 'Add at least one visible test case.'])
    expect(publicationRequirements(activity, [{ isHidden: false, importance: 'HIGH' }])).toEqual([])
  })

  it('sums decimal test weights without rejecting an exact allocation', () => {
    const cases = [0.1, 0.2].map((points, i) => ({ name: `Case ${i}`, inputData: '', expectedOutput: '', points: String(points), isHidden: false }))
    expect(sumTestCasePoints(cases)).toBe(0.3)
    expect(validateTestCases(cases, 0.3)).toEqual([])
    expect(publicationRequirements({ status: 'DRAFT', dueDate: '2099-01-01', totalPoints: 0.3, gradingPeriod: 'PRELIM', rubricCriteria: [] }, cases)).toEqual([])
  })

  it('drops hidden rubric values when changing a draft to Ungraded', () => {
    const ungraded = { ...form, gradingMode: 'COMPLETION', totalPoints: '', rubricCriteria: [{ id: 'draft', name: '', maximumPoints: '' }] }
    expect(validateActivityForm(ungraded)).toEqual({})
    expect(activityPayload(ungraded)).toMatchObject({ gradingMode: 'COMPLETION', totalPoints: null, rubricCriteria: [] })
  })

  it('validates backend bounds and creates the supported draft payload', () => {
    expect(validateActivityForm(form)).toEqual({})
    expect(validateActivityForm({ ...form, totalPoints: '1.1' })).toEqual({})
    expect(validateTestCases([{ name: 'Fractional case', inputData: '', expectedOutput: '', points: '0.29' }], 1.1)).toEqual([])
    expect(activityPayload(form, 'DRAFT')).toEqual(expect.objectContaining({
      title: 'Loops', language: 'JAVA', entryClassName: 'Main', maxAttempts: 2, creditPolicy: 'LATEST', totalPoints: 100,
    }))
    expect(validateActivityForm({ ...form, entryClassName: 'not valid', maxAttempts: '4' })).toEqual(expect.objectContaining({
      entryClassName: expect.any(String), maxAttempts: expect.any(String),
    }))
  })

  it('omits frozen scoring and source fields from published updates', () => {
    const current = { ...activityPayload(form, 'DRAFT'), dueDate: new Date(form.dueDate).toISOString(), status: 'PUBLISHED' }
    const payload = activityUpdatePayload({ ...form, title: 'Updated loops' }, current)
    expect(payload).toEqual({ title: 'Updated loops' })
    expect(payload).not.toHaveProperty('starterCode')
    expect(payload).not.toHaveProperty('totalPoints')
    expect(payload).not.toHaveProperty('creditPolicy')
  })

  it('validates test-case limits and publication requirements', () => {
    const visible = { name: 'Sample', inputData: '', expectedOutput: 'OK', isHidden: false, points: '40' }
    expect(validateTestCases([visible], 100)).toEqual([])
    expect(testCasePayload([visible])).toEqual([{ name: 'Sample', inputData: null, expectedOutput: 'OK', isHidden: false, points: 40 }])
    expect(publicationRequirements({ status: 'DRAFT', dueDate: '2099-01-01', totalPoints: 100 }, [visible])).toEqual([])
    expect(publicationRequirements({ status: 'DRAFT', dueDate: '2000-01-01', totalPoints: 100 }, [{ ...visible, isHidden: true }])).toEqual(expect.arrayContaining([
      'The deadline must be in the future.', 'Add at least one visible test case.',
    ]))
  })
})
