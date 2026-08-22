import { describe, expect, it } from 'vitest'
import { areJavaOutputsEquivalent, normalizeJavaOutput } from './java-output-comparison.js'

describe('Java output comparison', () => {
  it.each([
    ['same output', '5', '5'],
    ['actual has one terminal LF', '5', '5\n'],
    ['expected has one terminal LF', '5\n', '5'],
    ['expected has one terminal CRLF', '5\r\n', '5'],
    ['CRLF and LF are equivalent', 'hello\r\nworld', 'hello\nworld'],
    ['matching multiline output', 'hello\nworld\n', 'hello\nworld\n'],
  ])('accepts %s', (_label, expected, actual) => {
    expect(areJavaOutputsEquivalent(expected, actual)).toBe(true)
  })

  it.each([
    ['empty output and a blank line', '', '\n'],
    ['a blank line and empty output', '\n', ''],
    ['multiple additional terminal newlines', '5', '5\n\n'],
    ['expected trailing space', '5 ', '5'],
    ['actual trailing space', '5', '5 '],
    ['leading space', ' 5', '5'],
    ['internal blank line', 'hello\n\nworld', 'hello\nworld'],
    ['internal spacing', 'hello  world', 'hello world'],
    ['per-line trailing space', 'hello \nworld', 'hello\nworld'],
    ['one terminal LF versus two', '5\n', '5\n\n'],
  ])('rejects %s', (_label, expected, actual) => {
    expect(areJavaOutputsEquivalent(expected, actual)).toBe(false)
  })

  it('normalizes CRLF and CR without changing other whitespace', () => {
    expect(normalizeJavaOutput(' a\r\nb \rc')).toBe(' a\nb \nc')
  })
})
