import { describe, expect, it, vi } from 'vitest'
import { createTemporaryTestCaseId } from './temporary-test-case-id.js'

describe('temporary test-case IDs', () => {
  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000001')
    const getRandomValues = vi.fn()

    expect(createTemporaryTestCaseId({ randomUUID, getRandomValues })).toBe(
      'temporary-test-case:00000000-0000-4000-8000-000000000001',
    )
    expect(randomUUID).toHaveBeenCalledOnce()
    expect(getRandomValues).not.toHaveBeenCalled()
  })

  it('uses insecure-context-compatible random bytes when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((bytes) => {
      bytes.forEach((_, index) => { bytes[index] = index })
      return bytes
    })

    const id = createTemporaryTestCaseId({ getRandomValues })

    expect(getRandomValues).toHaveBeenCalledOnce()
    expect(id).toMatch(/^temporary-test-case:000102030405060708090a0b0c0d0e0f:[0-9a-z]+$/)
  })

  it('keeps UI-row IDs unique across repeated fallback generation', () => {
    const cryptoWithoutRandomUUID = {
      getRandomValues(bytes) {
        bytes.fill(7)
        return bytes
      },
    }

    const ids = Array.from({ length: 1_000 }, () => createTemporaryTestCaseId(cryptoWithoutRandomUUID))

    expect(new Set(ids)).toHaveLength(ids.length)
  })

  it('keeps UI-row IDs unique when Web Crypto is entirely unavailable', () => {
    const ids = Array.from({ length: 1_000 }, () => createTemporaryTestCaseId(null))

    expect(new Set(ids)).toHaveLength(ids.length)
  })
})
