import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createJavaRunner } from '../../src/infrastructure/java/java-runner.js'

let testRoot: string
let source: string
beforeAll(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), 'projex-i2-checkout-'))
  source = await readFile(new URL('./fixtures/AlingNenaStore.java', import.meta.url), 'utf8')
})
afterAll(async () => {
  if (testRoot && path.resolve(testRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) {
    await rm(testRoot, { recursive: true, force: true })
  }
})

const samples = [
  ['notebook\n4\n12.50\n20\n100.00\n', ['50.00', '10.00', '40.00', '60.00']],
  ['pencil\n3\n2.25\n0\n10.00\n', ['6.75', '0.00', '6.75', '3.25']],
  ['folder\n2\n15.00\n10\n27.00\n', ['30.00', '3.00', '27.00', '0.00']],
  ['eraser\n1\n8.00\n25\n10.00\n', ['8.00', '2.00', '6.00', '4.00']],
  ['paper\n5\n2.00\n100\n0.00\n', ['10.00', '10.00', '0.00', '0.00']],
] as const
const labels = ['Total Purchase Amount', 'Total Discount', 'Amount To Be Paid', 'Change']
const cases = samples.map(([input, amounts], i) => ({
  id: `synthetic-${i}`,
  input,
  expectedOutput: amounts.map((amount, n) => `${labels[n]}: ${amount}`).join('\n'),
}))
function execute(sourceCode: string, testCases = cases) {
  return createJavaRunner({
    javaExecutable: 'java', javacExecutable: 'javac', release: 17,
    jobRoot: testRoot, compileTimeoutMs: 10_000, testTimeoutMs: 1_000,
    outputLimitBytes: 16_384, memoryLimitMb: 64,
  }).execute({ entryClassName: 'AlingNenaStore', sourceCode, cases: testCases })
}

describe('I2.1 adapted checkout through the existing Java runner', () => {
  it('accepts five independently calculated cases and an optional final newline', async () => {
    const result = await execute(source)
    expect(result.compileStatus).toBe('SUCCESS')
    expect(result.runtimeStatus).toBe('PASSED')
    expect(result.cases.map((item) => item.status)).toEqual(Array(5).fill('PASSED'))
    expect(await readdir(testRoot)).toEqual([])
  })
  it('rejects wrong arithmetic and extra prompt output', async () => {
    expect((await execute(source.replace('cash - due', 'cash - gross'), cases.slice(0, 1))).runtimeStatus).toBe('FAILED')
    expect((await execute(source.replace('String product', 'System.out.print("Product: "); String product'), cases.slice(0, 1))).runtimeStatus).toBe('FAILED')
  })
  it('reports a compiler error using the activity-specific filename without a host path', async () => {
    const result = await execute(source.replace('double gross = quantity * price;', 'double gross = quantity * price'), cases.slice(0, 1))
    expect(result.compileStatus).toBe('STUDENT_ERROR')
    expect(result.compilerOutput).toContain('AlingNenaStore.java:')
    expect(result.compilerOutput).not.toContain(testRoot)
  })
  it('confirms packaged source cannot be launched by the unqualified entry contract', async () => {
    const result = await execute(`package exercises.prelim;\n${source}`, cases.slice(0, 1))
    expect(result.compileStatus).toBe('SUCCESS')
    expect(result.runtimeStatus).toBe('ERROR')
  })
  it('distinguishes runtime failure from wrong output and cleans its temporary files', async () => {
    const result = await execute(source.replace('int quantity = input.nextInt();', 'int quantity = input.nextInt() / Integer.parseInt("0");'), cases.slice(0, 1))
    expect(result.compileStatus).toBe('SUCCESS')
    expect(result.runtimeStatus).toBe('ERROR')
    expect(await readdir(testRoot)).toEqual([])
  })
})
