export function formatOutputWhitespace(value) {
  const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (normalized.length === 0) return '(empty output)'
  return normalized
    .replaceAll(' ', '·')
    .replaceAll('\t', '→')
    .replaceAll('\n', '↵\n')
}
