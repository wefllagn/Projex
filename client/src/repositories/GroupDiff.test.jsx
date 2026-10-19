import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GroupDiff } from './GroupDiff.jsx'
import { unifiedDiffLines } from './unified-diff.js'

describe('Group unified diff', () => {
  it('preserves exact text and line endings, escaped HTML and signs', () => {
    const patch = 'diff --git a/a b/a\r\n--- a/a\r\n+++ b/a\r\n@@ -1 +1 @@\r\n-<script>old</script>\r\n+<img src=x onerror=bad()>\r\n'
    const { container } = render(<GroupDiff patch={patch} />)
    expect(screen.getByLabelText('Commit diff').textContent).toBe(patch)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelectorAll('.group-diff-line--added')).toHaveLength(1)
    expect(container.querySelectorAll('.group-diff-line--removed')).toHaveLength(1)
  })
  it('distinguishes file headers from header-like source inside valid hunks', () => {
    const lines = unifiedDiffLines('--- a/a\n+++ b/a\n@@ -1,2 +1,2 @@\n--- source\n+++ source\n context\n+not a hunk\n')
    expect(lines.map((line) => line.kind)).toEqual(['file', 'file', 'hunk', 'removed', 'added', 'context', 'context'])
  })
  it('handles zero-count hunks, multiple files and no-newline markers', () => {
    const lines = unifiedDiffLines('@@ -0,0 +1 @@\n+first\n\\ No newline at end of file\ndiff --git a/b b/b\n@@ -1 +0,0 @@\n-last')
    expect(lines.map((line) => line.kind)).toEqual(['hunk', 'added', 'context', 'file', 'hunk', 'removed'])
    expect(lines.map((line) => line.text).join('').endsWith('-last')).toBe(true)
  })
})
