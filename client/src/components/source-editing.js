export function editSourceSelection(source, start, end, key, shift = false) {
  const lineStart = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1
  if (key === 'Enter') {
    const before = source.slice(lineStart, start)
    const indent = before.match(/^[\t ]*/)[0] + (before.trimEnd().endsWith('{') ? '    ' : '')
    const insert = `\n${indent}`
    return { value: source.slice(0, start) + insert + source.slice(end), start: start + insert.length, end: start + insert.length }
  }
  if (key !== 'Tab') return null
  if (start === end && !shift) {
    const insert = ' '.repeat(4 - (source.slice(lineStart, start).replace(/\t/g, '    ').length % 4))
    return { value: source.slice(0, start) + insert + source.slice(end), start: start + insert.length, end: start + insert.length }
  }
  const last = end > start && source[end - 1] === '\n' ? end - 1 : end
  const lineEnd = source.indexOf('\n', last)
  const stop = lineEnd < 0 ? source.length : lineEnd
  const lines = source.slice(lineStart, stop).split('\n')
  const changes = lines.map((line) => shift ? -(line.match(/^(?:\t| {1,4})/)?.[0].length ?? 0) : 4)
  const value = source.slice(0, lineStart) + lines.map((line, i) => shift ? line.slice(-changes[i]) : `    ${line}`).join('\n') + source.slice(stop)
  return { value, start: Math.max(lineStart, start + changes[0]), end: Math.max(lineStart, end + changes.reduce((a, b) => a + b, 0)) }
}

