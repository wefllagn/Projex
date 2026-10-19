import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CODE_RUN_TEST_NAME, codeRunSourceHash, isCodeRunRecord } from './code-run.js'

describe('debug execution identity', () => {
  it('does not reinterpret a visible test even when its name matches the debug marker', () => {
    const sourceCode = 'public class Main {}'
    const cases = [{ testNameSnapshot: CODE_RUN_TEST_NAME }]
    const sourceHash = createHash('sha256').update(sourceCode, 'utf8').digest('hex')
    expect(isCodeRunRecord({ sourceCode, sourceHash, cases })).toBe(false)
    expect(isCodeRunRecord({ sourceCode, sourceHash: codeRunSourceHash(sourceCode), cases })).toBe(true)
    expect(isCodeRunRecord({ sourceCode, sourceHash: codeRunSourceHash(sourceCode), cases: [] })).toBe(false)
  })
})
