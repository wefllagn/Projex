import { createHash } from 'node:crypto'

export const CODE_RUN_TEST_NAME = '__PROJEX_RUN_CODE__'

// Domain separation prevents an instructor-authored test with the same name
// from being treated as a debug run. Both values are server-owned.
export function codeRunSourceHash(sourceCode: string): string {
  return createHash('sha256').update('projex:code-run:v1\0').update(sourceCode, 'utf8').digest('hex')
}

export function isCodeRunRecord(record: {
  sourceCode: string
  sourceHash: string
  cases: readonly { testNameSnapshot: string }[]
}): boolean {
  return record.cases.length === 1
    && record.cases[0]?.testNameSnapshot === CODE_RUN_TEST_NAME
    && record.sourceHash === codeRunSourceHash(record.sourceCode)
}
