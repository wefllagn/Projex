export const ACTIVITY_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']

export function formatActivityStatus(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

export function formatActivityDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function activityClassMatches(activity, selectedClass) {
  return Boolean(activity && selectedClass && activity.classId === selectedClass.id)
}

export function validateActivityForm(form) {
  const errors = {}
  const title = form.title.trim()
  const instructions = form.instructions.trim()
  const starterCode = form.starterCode
  const maxAttempts = Number(form.maxAttempts)
  const totalPoints = Number(form.totalPoints)
  const dueDate = new Date(form.dueDate)

  if (!title || title.length > 200) errors.title = 'Enter a title of no more than 200 characters.'
  if (!instructions || instructions.length > 20_000) errors.instructions = 'Enter instructions of no more than 20,000 characters.'
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(form.entryClassName.trim())) errors.entryClassName = 'Enter a valid Java class name.'
  if (!starterCode.trim() || starterCode.length > 100_000) errors.starterCode = 'Enter starter source of no more than 100,000 characters.'
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) errors.maxAttempts = 'Choose between one and three attempts.'
  if (!['LATEST', 'HIGHEST'].includes(form.creditPolicy)) errors.creditPolicy = 'Choose how the credited result is selected.'
  if (!Number.isFinite(totalPoints) || totalPoints <= 0 || totalPoints > 1_000 || Math.round(totalPoints * 100) !== totalPoints * 100) errors.totalPoints = 'Enter 0.01 to 1,000 points with at most two decimals.'
  if (!form.dueDate || Number.isNaN(dueDate.getTime())) errors.dueDate = 'Choose a valid deadline.'

  return errors
}

export function activityPayload(form, status = 'DRAFT') {
  const common = {
    title: form.title.trim(),
    instructions: form.instructions.trim(),
    dueDate: new Date(form.dueDate).toISOString(),
    maxAttempts: Number(form.maxAttempts),
  }
  if (status === 'PUBLISHED') return common
  return {
    ...common,
    creditPolicy: form.creditPolicy,
    language: 'JAVA',
    entryClassName: form.entryClassName.trim(),
    starterCode: form.starterCode,
    totalPoints: Number(form.totalPoints),
  }
}

export function activityUpdatePayload(form, activity) {
  if (activity.status !== 'PUBLISHED') return activityPayload(form, activity.status)
  const candidate = activityPayload(form, 'PUBLISHED')
  const changed = {}
  if (candidate.title !== activity.title) changed.title = candidate.title
  if (candidate.instructions !== activity.instructions) changed.instructions = candidate.instructions
  if (new Date(candidate.dueDate).getTime() !== new Date(activity.dueDate).getTime()) changed.dueDate = candidate.dueDate
  if (candidate.maxAttempts !== activity.maxAttempts) changed.maxAttempts = candidate.maxAttempts
  return changed
}

export function validateTestCases(testCases, activityTotalPoints) {
  const errors = []
  if (testCases.length > 50) errors.push('An activity can contain at most 50 test cases.')
  testCases.forEach((testCase, index) => {
    const label = `Test case ${index + 1}`
    const points = Number(testCase.points)
    if (!testCase.name.trim() || testCase.name.trim().length > 200) errors.push(`${label} needs a name of no more than 200 characters.`)
    if (testCase.inputData.length > 32_000) errors.push(`${label} input exceeds 32,000 characters.`)
    if (testCase.expectedOutput.length > 32_000) errors.push(`${label} expected output exceeds 32,000 characters.`)
    if (!Number.isFinite(points) || points < 0 || points > 1_000 || Math.round(points * 100) !== points * 100) errors.push(`${label} points must be 0 to 1,000 with at most two decimals.`)
  })
  const points = testCases.reduce((sum, testCase) => sum + (Number(testCase.points) || 0), 0)
  if (points > Number(activityTotalPoints)) errors.push('Test-case points cannot exceed the activity total.')
  return errors
}

export function testCasePayload(testCases) {
  return testCases.map((testCase) => ({
    name: testCase.name.trim(),
    inputData: testCase.inputData === '' ? null : testCase.inputData,
    expectedOutput: testCase.expectedOutput,
    isHidden: Boolean(testCase.isHidden),
    points: Number(testCase.points),
  }))
}

export function publicationRequirements(activity, testCases) {
  const totalTestPoints = testCases.reduce((sum, testCase) => sum + Number(testCase.points || 0), 0)
  const reasons = []
  if (!activity || activity.status !== 'DRAFT') reasons.push('Only draft activities can be published.')
  if (activity && new Date(activity.dueDate).getTime() <= Date.now()) reasons.push('The deadline must be in the future.')
  if (testCases.length === 0) reasons.push('Add at least one test case.')
  if (!testCases.some((testCase) => !testCase.isHidden)) reasons.push('Add at least one visible test case.')
  if (totalTestPoints <= 0) reasons.push('Test cases must award a positive total number of points.')
  if (activity && totalTestPoints > Number(activity.totalPoints)) reasons.push('Test-case points cannot exceed the activity total.')
  return reasons
}
