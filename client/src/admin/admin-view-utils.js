export function formatDate(value, fallback = 'Not recorded') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString()
}

export function humanize(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase())
}

export function pageNumber(searchParams) {
  const value = Number(searchParams.get('page') || 1)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
}
