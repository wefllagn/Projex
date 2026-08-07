import { describe, expect, it } from 'vitest'
import { readCookie, readCsrfToken } from './csrf.js'

describe('CSRF cookie handling', () => {
  it('reads and decodes the approved readable CSRF cookie', () => {
    expect(readCsrfToken('theme=dark; projex_csrf=test%2Dtoken; other=value')).toBe('test-token')
  })

  it('returns null for missing or malformed cookies', () => {
    expect(readCsrfToken('other=value')).toBeNull()
    expect(readCookie('projex_csrf', 'projex_csrf=%E0%A4%A')).toBeNull()
  })
})
