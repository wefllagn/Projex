import { describe, expect, it } from 'vitest'
import { configuredAllocation, configuredTestPoints, DEFAULT_GRADING_CONFIGURATION, distributePoints, gradingConfigurationSchema } from './weighted-grading.js'

describe('versioned rubric-first allocation', () => {
  it('converts four default percentages for arbitrary Activity maxima', () => {
    const result = configuredAllocation(50, DEFAULT_GRADING_CONFIGURATION)
    expect(result.correctnessMaximum).toBe(35)
    expect(result.rubricCriteria.map(row => [row.name, row.maximumPoints])).toEqual([['Readability', 7.5], ['Organization', 5], ['Documentation', 2.5]])
  })
  it('distributes Normal/High/Normal weights inside Correctness and defaults importance to Normal', () => {
    expect(configuredTestPoints(100, DEFAULT_GRADING_CONFIGURATION, [{}, { importance: 'HIGH' }, {}])).toEqual([17.5, 35, 17.5])
    expect(configuredTestPoints(100, DEFAULT_GRADING_CONFIGURATION, [{ importance: 'NORMAL' }, { importance: 'HIGH' }, { importance: 'VERY_HIGH' }])).toEqual([11.67, 23.33, 35])
  })
  it('keeps cents exact and ties deterministic over uneven divisions', () => {
    expect(distributePoints(0.7, [1, 1, 1])).toEqual([0.24, 0.23, 0.23])
    for (let cents = 50; cents < 1000; cents += 7) {
      const values = distributePoints(cents / 100, [1, 2, 3, 1, 2])
      expect(values.reduce((sum, value) => sum + Math.round(value * 100), 0)).toBe(cents)
    }
  })
  it('allows a zero-weight manual criterion without creating an editable zero-point award', () => {
    const result = configuredAllocation(100, { version: 1, percentages: { correctness: 80, readability: 15, organization: 5, documentation: 0 } })
    expect(result.correctnessMaximum).toBe(80)
    expect(result.rubricCriteria.map(row => row.name)).toEqual(['Readability', 'Organization'])
  })
  it('rejects invalid totals, unsupported versions, precision loss and zero-point weighted tests', () => {
    expect(gradingConfigurationSchema.safeParse({ version: 2, percentages: DEFAULT_GRADING_CONFIGURATION.percentages }).success).toBe(false)
    expect(gradingConfigurationSchema.safeParse({ version: 1, percentages: { ...DEFAULT_GRADING_CONFIGURATION.percentages, correctness: 60 } }).success).toBe(false)
    expect(() => configuredTestPoints(0.04, DEFAULT_GRADING_CONFIGURATION, [{}, {}, {}, {}])).toThrow(/at least 0.01/)
    expect(() => distributePoints(0.001, [1])).toThrow()
  })
})
