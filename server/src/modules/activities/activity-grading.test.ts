import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { awardedRubricPoints, rubricAllocationValid, rubricCriteriaSchema, rubricScoresSchema } from './activity-grading.js'

describe('Instructor rubric point contracts', () => {
  const criteria = [{ id: randomUUID(), name: 'Readability', maximumPoints: 10 }, { id: randomUUID(), name: 'Documentation', maximumPoints: 5 }]
  it('preserves legacy absence and validates exact allocation including fractional points', () => {
    expect(rubricAllocationValid(null, 20)).toBe(true)
    expect(rubricAllocationValid([], 20)).toBe(false)
    expect(rubricAllocationValid([], 0)).toBe(true)
    expect(rubricAllocationValid(criteria, 15)).toBe(true)
    expect(rubricAllocationValid(criteria, 14)).toBe(false)
    expect(rubricAllocationValid([{ id: randomUUID(), name: 'One', maximumPoints: 0.1 }, { id: randomUUID(), name: 'Two', maximumPoints: 0.2 }], 0.3)).toBe(true)
  })
  it('rejects invalid criteria and incomplete, duplicate, unknown or out-of-bounds scores', () => {
    expect(rubricCriteriaSchema.safeParse([criteria[0], criteria[0]]).success).toBe(false)
    expect(rubricCriteriaSchema.safeParse([{ ...criteria[0], name: ' ' }]).success).toBe(false)
    expect(rubricScoresSchema.safeParse([{ criterionId: criteria[0]!.id, points: 1.234 }]).success).toBe(false)
    const scores = [{ criterionId: criteria[0]!.id, points: 8 }, { criterionId: criteria[1]!.id, points: 4 }]
    expect(awardedRubricPoints(criteria, scores)).toBe(12)
    expect(awardedRubricPoints(criteria, scores.slice(0, 1))).toBeNull()
    expect(awardedRubricPoints(criteria, [scores[0]!, scores[0]!])).toBeNull()
    expect(awardedRubricPoints(criteria, [{ ...scores[0]!, criterionId: randomUUID() }, scores[1]!])).toBeNull()
    expect(awardedRubricPoints(criteria, [{ ...scores[0]!, points: 11 }, scores[1]!])).toBeNull()
  })
})
