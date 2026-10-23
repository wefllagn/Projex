import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'

const percentage = z.number().finite().min(0).max(100).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'Use at most two decimal places.')
export const gradingConfigurationSchema = z.object({
  version: z.literal(1),
  percentages: z.object({ correctness: percentage.refine(value => value > 0, 'Correctness must be positive.'), readability: percentage, organization: percentage, documentation: percentage }).strict(),
}).strict().refine(value => Object.values(value.percentages).reduce((sum, item) => sum + Math.round(item * 100), 0) === 10000, 'The four allocations must total 100%.')
export type GradingConfiguration = z.infer<typeof gradingConfigurationSchema>
export const testImportanceSchema = z.enum(['NORMAL', 'HIGH', 'VERY_HIGH'])
export type TestImportance = z.infer<typeof testImportanceSchema>
export const DEFAULT_GRADING_CONFIGURATION: GradingConfiguration = { version: 1, percentages: { correctness: 70, readability: 15, organization: 10, documentation: 5 } }
export const IMPORTANCE_WEIGHTS: Record<TestImportance, number> = { NORMAL: 1, HIGH: 2, VERY_HIGH: 3 }
const criteria = [
  { key: 'readability', id: '00000000-0000-4000-8000-000000000002', name: 'Readability' },
  { key: 'organization', id: '00000000-0000-4000-8000-000000000003', name: 'Organization' },
  { key: 'documentation', id: '00000000-0000-4000-8000-000000000004', name: 'Documentation' },
] as const

function invalid(message: string): never {
  throw new AppError({ statusCode: 400, code: 'INVALID_GRADING_ALLOCATION', message })
}

/** Largest remainder allocation in integer cents. Ties follow stable input order. */
export function distributePoints(total: number, weights: readonly number[]): number[] {
  const budget = Math.round(total * 100)
  if (!Number.isFinite(total) || budget < 0 || Math.abs(total * 100 - budget) > 1e-8 || weights.some(weight => !Number.isInteger(weight) || weight < 0)) invalid('Use valid point totals and importance levels.')
  const sum = weights.reduce((value, weight) => value + weight, 0)
  if (!sum) return weights.map(() => 0)
  const cents = weights.map(weight => Math.floor(budget * weight / sum))
  const order = weights.map((weight, index) => ({ index, remainder: budget * weight % sum })).sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  const remaining = budget - cents.reduce((value, item) => value + item, 0)
  for (const item of order.slice(0, remaining)) cents[item.index]! += 1
  if (weights.some((weight, index) => weight > 0 && cents[index] === 0)) invalid('Increase the Activity points or allocation: every positive criterion and test must receive at least 0.01 point.')
  return cents.map(value => value / 100)
}

export function configuredAllocation(total: number, value: unknown) {
  const configuration = gradingConfigurationSchema.parse(value)
  const p = configuration.percentages
  const maxima = distributePoints(total, [p.correctness, p.readability, p.organization, p.documentation].map(item => Math.round(item * 100)))
  return {
    configuration,
    correctnessMaximum: maxima[0]!,
    rubricCriteria: criteria.flatMap((criterion, index) => maxima[index + 1]! > 0 ? [{ id: criterion.id, name: criterion.name, maximumPoints: maxima[index + 1]! }] : []),
  }
}

export function configuredTestPoints(total: number, configuration: unknown, tests: readonly { importance?: string | null }[]) {
  const allocation = configuredAllocation(total, configuration)
  return distributePoints(allocation.correctnessMaximum, tests.map(test => IMPORTANCE_WEIGHTS[testImportanceSchema.parse(test.importance ?? 'NORMAL')]))
}
