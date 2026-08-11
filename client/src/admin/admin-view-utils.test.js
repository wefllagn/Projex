import { describe, expect, it } from 'vitest'
import { formatByteCount, humanize } from './admin-view-utils.js'

describe('admin view formatting', () => {
  it('formats decimal storage strings without unsafe number conversion', () => {
    expect(formatByteCount('0')).toBe('0 bytes')
    expect(formatByteCount('1536')).toBe('1.5 KB')
    expect(formatByteCount('12345678901234567890')).toMatch(/TB$/)
    expect(formatByteCount('not-measured')).toBe('Not measured')
  })

  it('formats enum and camel-case administrative labels', () => {
    expect(humanize('REPOSITORY_PROVISIONED')).toBe('Repository provisioned')
    expect(humanize('previousStatus')).toBe('Previous status')
  })
})
