export function submissionStatusLabel(record, format = value => String(value).replaceAll('_', ' ')) {
  if (record.gradingMode !== 'COMPLETION') return format(record.status)
  const feedback = ['queued', 'assessing'].includes(record.status) ? 'Code feedback pending' : ['assessment_failed', 'failed_resolved'].includes(record.status) ? 'Code feedback unavailable' : 'Code feedback available'
  return `Complete · ${feedback}`
}
