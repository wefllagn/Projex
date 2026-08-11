export function formatDate(value, fallback = 'Not recorded') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString()
}

export function humanize(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
}

export function pageNumber(searchParams) {
  const value = Number(searchParams.get('page') || 1)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
}

export function formatByteCount(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 'Not measured'
  const bytes = BigInt(value)
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  let unit = 0
  let divisor = 1n
  while (unit < units.length - 1 && bytes >= divisor * 1024n) {
    divisor *= 1024n
    unit += 1
  }
  if (unit === 0) return `${bytes.toString()} bytes`
  const whole = bytes / divisor
  const fraction = ((bytes % divisor) * 10n) / divisor
  return `${whole.toString()}${fraction ? `.${fraction.toString()}` : ''} ${units[unit]}`
}
