export const MAX_SOURCE_CHARACTERS = 100_000
// Match the standard backend's UTF-8 byte budget; allow an optional file BOM.
export const MAX_SOURCE_BYTES = 100_000 + 3

// A conservative import precheck, not a Java parser. javac remains authoritative.
function declarations(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g, ' ')
  let depth = 0
  let topLevel = ''
  for (const character of code) {
    if (character === '{') { depth++; topLevel += ' '; continue }
    if (character === '}') { depth = Math.max(0, depth - 1); topLevel += ' '; continue }
    if (!depth) topLevel += character
  }
  return topLevel
}

export async function readJavaFile(files, entryClassName) {
  if (files.length !== 1) throw new Error('Choose exactly one Java file.')
  const file = files[0]
  if (file.name !== `${entryClassName}.java`) throw new Error(`Choose ${entryClassName}.java (the filename is case-sensitive).`)
  if (file.size > MAX_SOURCE_BYTES) throw new Error('The file is too large. UTF-8 source is limited to 100,000 bytes (plus an optional file BOM).')
  let source
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read UTF-8 source. Save the file as UTF-8 and try again.')
  }
  if (!source.trim() || source.includes('\0')) throw new Error('Choose a non-empty Java text file without null bytes.')
  if (source.length > MAX_SOURCE_CHARACTERS) throw new Error('Source is limited to 100,000 characters.')
  const normalized = source.replace(/\r\n?/g, '\n')
  if (new TextEncoder().encode(normalized).length > 100_000) throw new Error('UTF-8 source is limited to 100,000 bytes. Reduce the file size and try again.')
  const code = declarations(source)
  if (/\bpackage\s+/.test(code)) throw new Error('Remove the package declaration: this activity runs an unqualified entry class.')
  const classes = [...code.matchAll(/\bpublic\s+(?:(?:final|abstract|strictfp|sealed|non-sealed)\s+)*class\s+([\w$]+)/g)]
  if (classes.length !== 1 || classes[0][1] !== entryClassName) throw new Error(`Expected one public entry class named ${entryClassName}. Use an ordinary class declaration; compilation checks the complete Java syntax.`)
  return normalized
}

export function editJavaSelection(source, start, end, key, shift = false) {
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

export function compilerLines(output, entryClassName, source) {
  const total = source.split('\n').length
  return [...new Set(String(output ?? '').split(/\r?\n/).flatMap((text) => {
    const match = text.match(/^([\w$]+)\.java:(\d+):(?:\s|$)/)
    const line = Number(match?.[2])
    return match?.[1] === entryClassName && Number.isSafeInteger(line) && line > 0 && line <= total ? [line] : []
  }))]
}

export function focusJavaLine(editor, line) {
  if (!editor) return
  const lines = editor.value.split('\n')
  const start = lines.slice(0, line - 1).reduce((length, text) => length + text.length + 1, 0)
  editor.focus()
  editor.setSelectionRange(start, start + lines[line - 1].length)
  editor.scrollTop = Math.max(0, (line - 2) * parseFloat(getComputedStyle(editor).lineHeight))
  editor.scrollLeft = 0
  editor.dispatchEvent(new Event('scroll', { bubbles: true }))
}
