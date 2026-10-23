// Parse unified diff structure, not arbitrary substrings in source code.
export function unifiedDiffLines(patch) {
  let oldLeft = 0; let newLeft = 0
  return (patch.match(/[^\n]*\n|[^\n]+$/g) || []).map((text) => {
    const line = text.replace(/\r?\n$/, '')
    let kind = 'context'
    const hunk = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@(?:.*)$/.exec(line)
    if (line.startsWith('diff --git ')) { oldLeft = 0; newLeft = 0; kind = 'file' }
    else if (hunk) { oldLeft = Number(hunk[1] ?? 1); newLeft = Number(hunk[2] ?? 1); kind = 'hunk' }
    else if (oldLeft > 0 || newLeft > 0) {
      if (line.startsWith('+') && newLeft > 0) { newLeft -= 1; kind = 'added' }
      else if (line.startsWith('-') && oldLeft > 0) { oldLeft -= 1; kind = 'removed' }
      else if (line.startsWith(' ') && oldLeft > 0 && newLeft > 0) { oldLeft -= 1; newLeft -= 1 }
      else if (!line.startsWith('\\ No newline')) { oldLeft = 0; newLeft = 0 }
    } else if (/^(?:index |--- |\+\+\+ |new file mode |deleted file mode |rename from |rename to |similarity index |Binary files )/.test(line)) kind = 'file'
    return { text, kind }
  })
}
