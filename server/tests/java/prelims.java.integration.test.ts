import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'
import { prelimReferences } from './fixtures/prelims.js'

let root: string
beforeAll(async () => { root = await mkdtemp(path.join(os.tmpdir(), 'projex-i2-prelims-')) })
afterAll(async () => {
  if (root && path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('projex-i2-prelims-')) {
    await rm(root, { recursive: true, force: true })
  }
})

describe('proposed adapted Programming 1 contracts through real Java 17 compilation', () => {
  it.each(prelimReferences)('exercise $exercise / $entryClassName matches independent literal output fixtures', async (reference) => {
    const result = await createJavaRunner({
      javaExecutable: 'java', javacExecutable: 'javac', release: 17,
      jobRoot: root, compileTimeoutMs: 10_000, testTimeoutMs: 2_000,
      outputLimitBytes: 16_384, memoryLimitMb: 64,
    }).execute({
      sourceCode: reference.sourceCode,
      entryClassName: reference.entryClassName,
      cases: reference.cases.map((item, index) => ({ ...item, id: `case-${index}` })),
    })
    expect(result.compileStatus).toBe('SUCCESS')
    expect(result.cases.map((item) => item.status)).toEqual(reference.cases.map(() => 'PASSED'))
    expect(await readdir(root)).toEqual([])
  })
})
