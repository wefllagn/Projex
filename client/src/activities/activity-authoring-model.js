import { ApiError } from '../api/api-client.js'
import { DEFAULT_GRADING_CONFIGURATION } from './weighted-grading.js'
import { toDateTimeLocal, validateActivityForm, validateTestCases } from './activity-utils.js'

export const EMPTY_FORM = {
  gradingMode: 'GRADED',
  gradingPeriod: '',
  gradingConfiguration: DEFAULT_GRADING_CONFIGURATION,
  rubricCriteria: [],
  topicId: '',
  title: '',
  instructions: '',
  dueDate: '',
  entryClassName: 'Main',
  starterCode: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  maxAttempts: '1',
  creditPolicy: 'LATEST',
  totalPoints: '100',
}

export function contextMismatchError() {
  return new ApiError({ status: 404, code: 'ACTIVITY_NOT_FOUND', message: 'The activity is not available in the selected class.' })
}

export function formFromActivity(activity) {
  return {
    gradingMode: activity.gradingMode ?? 'GRADED',
    gradingPeriod: activity.gradingPeriod ?? '',
    gradingConfiguration: activity.gradingConfiguration ?? null,
    rubricCriteria: activity.rubricCriteria ?? null,
    topicId: activity.topicId ?? '',
    title: activity.title,
    instructions: activity.instructions,
    dueDate: toDateTimeLocal(activity.dueDate),
    entryClassName: activity.entryClassName,
    starterCode: activity.starterCode,
    maxAttempts: String(activity.maxAttempts),
    creditPolicy: activity.creditPolicy ?? 'LATEST',
    totalPoints: activity.totalPoints === null ? '' : String(activity.totalPoints),
  }
}

export function rowsFromResponse(testCases) {
  return testCases.map((testCase) => ({
    id: testCase.id,
    name: testCase.name,
    inputData: testCase.inputData ?? '',
    expectedOutput: testCase.expectedOutput,
    isHidden: Boolean(testCase.isHidden),
    importance: testCase.importance ?? 'NORMAL',
    points: String(testCase.points),
  }))
}

export function validateAuthoringStep(form, step, tests = []) {
  const all = validateActivityForm(form)
  if (step === 0) {
    const errors = Object.fromEntries(Object.entries(all).filter(([key]) => !['entryClassName', 'starterCode'].includes(key)))
    if (form.gradingConfiguration && form.gradingMode !== 'COMPLETION' && !form.gradingPeriod) errors.gradingPeriod = 'Choose Prelim, Midterm or Final.'
    return errors
  }
  if (step === 1) return Object.fromEntries(Object.entries(all).filter(([key]) => ['entryClassName', 'starterCode'].includes(key)))
  const errors = validateTestCases(tests, form.totalPoints, form.gradingMode, form.gradingConfiguration)
  if (!tests.length) errors.unshift('Add at least one test case.')
  if (!tests.some(row => !row.isHidden)) errors.push('Add at least one visible test case.')
  return errors.length ? { tests: errors.join(' ') } : {}
}

export function createActivityRequestId(cryptoApi = globalThis.crypto) {
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  if (!cryptoApi?.getRandomValues) return null
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
