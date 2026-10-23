import { describe, expect, it } from 'vitest'
import { DEFAULT_GRADING_CONFIGURATION, weightedPreview } from './weighted-grading.js'
import { activityPayload, testCasePayload, validateActivityForm } from './activity-utils.js'

describe('rubric-first authoring contract', () => {
  it('previews the exact default and weighted point maxima', () => {
    const result = weightedPreview(50, DEFAULT_GRADING_CONFIGURATION, [{ importance: 'NORMAL' }, { importance: 'HIGH' }, { importance: 'VERY_HIGH' }])
    expect(result.maxima).toEqual([35, 7.5, 5, 2.5])
    expect(result.testPoints).toEqual([5.83, 11.67, 17.5])
    expect(result.testPoints.reduce((sum, value) => sum + Math.round(value * 100), 0)).toBe(3500)
  })
  it('sends importance instead of editable or cached test points', () => {
    expect(testCasePayload([{ name: ' Visible ', inputData: '1', expectedOutput: '2', isHidden: false, points: 999, importance: 'HIGH' }], 'GRADED', DEFAULT_GRADING_CONFIGURATION)).toEqual([{ name: 'Visible', inputData: '1', expectedOutput: '2', isHidden: false, importance: 'HIGH' }])
  })
  it('keeps old authoring payloads and rejects an invalid new allocation before save', () => {
    const form = { title: 'A', instructions: 'B', starterCode: 'class Main {}', maxAttempts: 1, totalPoints: 100, dueDate: '2031-01-01', entryClassName: 'Main', creditPolicy: 'LATEST', gradingMode: 'GRADED', gradingConfiguration: { version: 1, percentages: { correctness: 60, readability: 15, organization: 10, documentation: 5 } } }
    expect(validateActivityForm(form).gradingConfiguration).toMatch(/total 100%/)
    expect(activityPayload(form)).toHaveProperty('gradingConfiguration.version', 1)
    expect(activityPayload(form)).not.toHaveProperty('rubricCriteria')
    expect(testCasePayload([{ name: 'Old', inputData: '', expectedOutput: '1', isHidden: false, points: '80' }])[0].points).toBe(80)
    expect(activityPayload({ ...form, gradingMode: 'COMPLETION' })).toMatchObject({ totalPoints: null, gradingConfiguration: DEFAULT_GRADING_CONFIGURATION })
  })
})
