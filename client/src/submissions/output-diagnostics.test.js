import { describe, expect, it } from 'vitest'
import { formatOutputWhitespace } from './output-diagnostics.js'

describe('visible output diagnostics', () => {
  it('shows spaces, tabs, and normalized line endings explicitly', () => {
    expect(formatOutputWhitespace('  5\t\r\n')).toBe('··5→↵\n')
  })

  it('distinguishes empty output from a blank line', () => {
    expect(formatOutputWhitespace('')).toBe('(empty output)')
    expect(formatOutputWhitespace('\n')).toBe('↵\n')
  })
})
