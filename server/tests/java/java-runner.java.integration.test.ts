import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'

let testRoot: string

beforeAll(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), 'projex-java-test-'))
})

afterAll(async () => {
  const resolvedTemp = path.resolve(os.tmpdir())
  const resolvedRoot = path.resolve(testRoot)
  if (resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`)) {
    await rm(resolvedRoot, { recursive: true, force: true })
  }
})

function runner(outputLimitBytes = 16_384, timeoutMs = 1_000) {
  return createJavaRunner({
    javaExecutable: 'java',
    javacExecutable: 'javac',
    release: 17,
    jobRoot: testRoot,
    compileTimeoutMs: 10_000,
    testTimeoutMs: timeoutMs,
    outputLimitBytes,
    memoryLimitMb: 64,
  })
}

describe('controlled local Java runner', () => {
  it('compiles once and evaluates deterministic stdin/stdout cases', async () => {
    const result = await runner().execute({
      entryClassName: 'Main',
      sourceCode:
        'public class Main { public static void main(String[] args) { java.util.Scanner s = new java.util.Scanner(System.in); System.out.println(s.nextInt() * 2); } }',
      cases: [
        { id: 'visible', input: '2\n', expectedOutput: '4\n', maximumPoints: 30 },
        { id: 'hidden', input: '-2\n', expectedOutput: '-4\n', maximumPoints: 40 },
      ],
    })
    expect(result).toMatchObject({
      compileStatus: 'SUCCESS',
      runtimeStatus: 'PASSED',
    })
    expect(result.cases.map((testCase) => testCase.automatedPoints)).toEqual([
      30,
      40,
    ])
    expect(await readdir(testRoot)).toEqual([])
  })

  it('treats compiler rejection as a student-code assessment outcome', async () => {
    const result = await runner().execute({
      entryClassName: 'Main',
      sourceCode: 'public class Main { this is not valid Java }',
      cases: [{ id: 'visible', input: '', expectedOutput: '' }],
    })
    expect(result).toMatchObject({
      compileStatus: 'STUDENT_ERROR',
      runtimeStatus: 'NOT_RUN',
    })
    expect(result.compilerOutput).not.toContain(testRoot)
    expect(await readdir(testRoot)).toEqual([])
  })

  it('bounds student-code time and output without retaining temporary files', async () => {
    const timedOut = await runner(16_384, 300).execute({
      entryClassName: 'Main',
      sourceCode:
        'public class Main { public static void main(String[] args) { while (true) { } } }',
      cases: [{ id: 'timeout', input: '', expectedOutput: '' }],
    })
    expect(timedOut.runtimeStatus).toBe('TIMEOUT')

    const overflow = await runner(1_024, 2_000).execute({
      entryClassName: 'Main',
      sourceCode:
        'public class Main { public static void main(String[] args) { while (true) { System.out.print("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"); } } }',
      cases: [{ id: 'overflow', input: '', expectedOutput: '' }],
    })
    expect(overflow.runtimeStatus).toBe('OUTPUT_LIMIT')
    expect(await readdir(testRoot)).toEqual([])
  })

  it('classifies an unavailable Java toolchain as infrastructure failure', async () => {
    const unavailable = createJavaRunner({
      javaExecutable: 'java',
      javacExecutable: 'projex-missing-javac-executable',
      release: 17,
      jobRoot: testRoot,
      compileTimeoutMs: 1_000,
      testTimeoutMs: 1_000,
      outputLimitBytes: 16_384,
      memoryLimitMb: 64,
    })

    await expect(
      unavailable.execute({
        entryClassName: 'Main',
        sourceCode:
          'public class Main { public static void main(String[] args) {} }',
        cases: [{ id: 'visible', input: '', expectedOutput: '' }],
      }),
    ).rejects.toMatchObject({ code: 'JAVA_RUNTIME_UNAVAILABLE' })
    expect(await readdir(testRoot)).toEqual([])
  })
})
