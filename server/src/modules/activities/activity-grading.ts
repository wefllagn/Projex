import { z } from 'zod'

export const gradingPeriodSchema = z.enum(['PRELIM', 'MIDTERM', 'FINAL'])
const points = z.number().finite().min(0).max(1000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'Use at most two decimal places.')
export const rubricCriteriaSchema = z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100), maximumPoints: points.refine(value => value > 0, 'Criterion points must be positive.') }).strict()).max(20).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, 'Criterion identifiers must be unique.')
export const rubricScoresSchema = z.array(z.object({ criterionId: z.uuid(), points }).strict()).max(20)
export type RubricCriterion = z.infer<typeof rubricCriteriaSchema>
export type RubricScore = z.infer<typeof rubricScoresSchema>
export function criteriaFrom(value: unknown): RubricCriterion {
  if (value === null || value === undefined) return []
  return rubricCriteriaSchema.parse(value)
}
export function rubricAllocationValid(value: unknown, instructorMaximum: number): boolean {
  if (value === null || value === undefined) return true
  const parsed = rubricCriteriaSchema.safeParse(value)
  return parsed.success && Math.round(parsed.data.reduce((sum, row) => sum + row.maximumPoints, 0) * 100) === Math.round(instructorMaximum * 100)
}
export function awardedRubricPoints(criteria: RubricCriterion, values: RubricScore | undefined): number | null {
  if (!values || values.length !== criteria.length || new Set(values.map(row => row.criterionId)).size !== values.length) return null
  let total = 0
  for (const criterion of criteria) {
    const score = values.find(row => row.criterionId === criterion.id)
    if (!score || score.points < 0 || score.points > criterion.maximumPoints) return null
    total += score.points
  }
  return Math.round(total * 100) / 100
}
