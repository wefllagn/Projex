export const DEFAULT_GRADING_CONFIGURATION = { version: 1, percentages: { correctness: 70, readability: 15, organization: 10, documentation: 5 } }
export const BUILTIN_CRITERIA = [['correctness', 'Correctness'], ['readability', 'Readability'], ['organization', 'Organization'], ['documentation', 'Documentation']]
export const IMPORTANCE_OPTIONS = [['NORMAL', 'Normal'], ['HIGH', 'High'], ['VERY_HIGH', 'Very High']]

function distribute(total, weights) {
  const budget = Math.round(total * 100), sum = weights.reduce((value, weight) => value + weight, 0)
  if (!sum) return []
  const cents = weights.map(weight => Math.floor(budget * weight / sum))
  const remainder = budget - cents.reduce((value, item) => value + item, 0)
  const order = weights.map((weight, index) => ({ index, remainder: budget * weight % sum })).sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const item of order.slice(0, remainder)) cents[item.index] += 1
  if (weights.some((weight, index) => weight > 0 && cents[index] === 0)) throw new Error('Increase the points or allocation so every positive criterion and test receives at least 0.01 point.')
  return cents.map(value => value / 100)
}
export function configurationPayload(value) {
  return { version: 1, percentages: Object.fromEntries(BUILTIN_CRITERIA.map(([key]) => [key, Number(value.percentages[key])])) }
}
export function weightedPreview(total, configuration, tests = []) {
  try {
    const weights = BUILTIN_CRITERIA.map(([key]) => Number(configuration.percentages[key]))
    if (weights.some(value => !Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) || weights[0] <= 0 || weights.reduce((sum, value) => sum + Math.round(value * 100), 0) !== 10000) throw new Error('The four allocations must total 100%, with positive Correctness. Use at most two decimal places.')
    if (!Number.isFinite(Number(total)) || Number(total) <= 0) throw new Error('Enter the total Activity points to calculate the allocation.')
    const maxima = distribute(Number(total), weights.map(value => Math.round(value * 100)))
    const importance = tests.map(test => ({ NORMAL: 1, HIGH: 2, VERY_HIGH: 3 })[test.importance ?? 'NORMAL'])
    if (importance.some(value => !value)) throw new Error('Choose Normal, High or Very High for each test case.')
    return { maxima, testPoints: distribute(maxima[0], importance), error: null }
  } catch (error) { return { maxima: [], testPoints: [], error: error.message } }
}
