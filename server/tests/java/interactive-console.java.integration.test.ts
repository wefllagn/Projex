import { mkdtemp, readdir, rm, mkdir, utimes } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Writable } from 'node:stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createJavaRunner, cleanupAbandonedConsoleDirectories } from '../../src/infrastructure/java/java-runner.js'

let root: string
beforeAll(async () => { root = await mkdtemp(path.join(os.tmpdir(), 'projex-interactive-java-')) })
afterAll(async () => { await rm(root, { recursive: true, force: true }) })
function runner(outputLimitBytes = 16384) {
  return createJavaRunner({ javaExecutable: 'java', javacExecutable: 'javac', release: 17, jobRoot: root,
    compileTimeoutMs: 10000, testTimeoutMs: 1000, outputLimitBytes, memoryLimitMb: 64 })
}
const source = (body: string) => `public class Main { public static void main(String[] args) throws Exception { ${body} } }`
async function run(body: string, onOutput?: (text: string, stdin: Writable, abort: AbortController) => void, timeoutMs = 2000, limit = 16384) {
  const abort = new AbortController()
  let stdin: Writable
  let text = ''
  const phases: string[] = []
  const result = await runner(limit).executeInteractive({ entryClassName: 'Main', sourceCode: source(body) }, {
    signal: abort.signal, timeoutMs,
    onPhase: async (phase) => { phases.push(phase) },
    onStart: (pipe) => { stdin = pipe },
    onOutput: (_channel, chunk) => { text += chunk; if (stdin) onOutput?.(text, stdin, abort) },
  })
  expect(await readdir(root)).toEqual([])
  return { ...result, text, phases }
}
describe('real interactive Java process', () => {
  it('runs without stdin and streams both stdout and stderr', async () => {
    const result = await run('System.out.println("Hello, Origin!"); System.err.print("note");')
    expect(result.execution?.exitCode).toBe(0)
    expect(result.text).toContain('Hello, Origin!')
    expect(result.text).toContain('note')
    expect(result.phases).toEqual(['COMPILING', 'RUNNING'])
  })
  it('shows non-newline Scanner prompts before supplying each input to the same process', async () => {
    let sentName = false, sentAge = false
    const result = await run('java.util.Scanner s=new java.util.Scanner(System.in); System.out.print("Enter your name: "); String n=s.nextLine(); System.out.print("Enter your age: "); int a=s.nextInt(); System.out.println("Hello, "+n+"!\\nAge: "+a);', (text, stdin) => {
      if (text.includes('Enter your name: ') && !sentName) { sentName = true; stdin.write('Julius\n') }
      if (text.includes('Enter your age: ') && !sentAge) { sentAge = true; stdin.write('23\n') }
    })
    expect(sentName && sentAge).toBe(true)
    expect(result.execution?.stdout.replaceAll('\r\n', '\n')).toBe('Enter your name: Enter your age: Hello, Julius!\nAge: 23\n')
    expect(result.execution?.exitCode).toBe(0)
  })
  it('preserves blank lines, Unicode and significant whitespace over multiple loop inputs and EOF', async () => {
    let sent = false
    const result = await run('java.util.Scanner s=new java.util.Scanner(System.in); System.out.print("Ready:"); while(s.hasNextLine()) System.out.println("["+s.nextLine()+"]");', (text, stdin) => {
      if (text.includes('Ready:') && !sent) { sent = true; stdin.end('  José  \n\n last \n') }
    })
    expect(result.execution?.stdout.replaceAll('\r\n', '\n')).toBe('Ready:[  José  ]\n[]\n[ last ]\n')
    expect(result.execution?.exitCode).toBe(0)
  })
  it('allows EOF without input', async () => {
    const result = await run('System.out.print("Waiting:"); System.out.println(System.in.read());', (_text, stdin) => stdin.end())
    expect(result.execution?.stdout.replaceAll('\r\n', '\n')).toBe('Waiting:-1\n')
  })
  it('surfaces compiler rejection without starting a runtime', async () => {
    const result = await run('this is not java;')
    expect(result.compilation.exitCode).not.toBe(0)
    expect(result.execution).toBeNull()
    expect(result.text).toContain('error')
    expect(result.text).not.toContain(root)
  })
  it('captures real runtime exceptions and a nonzero exit code', async () => {
    const result = await run('throw new IllegalStateException("test-failure");')
    expect(result.execution?.exitCode).not.toBe(0)
    expect(result.text).toContain('test-failure')
  })
  it('terminates infinite loops at the hard runtime limit', async () => {
    const result = await run('while(true) {}', undefined, 300)
    expect(result.execution?.timedOut).toBe(true)
  })
  it('stops a waiting process rather than merely stopping output polling', async () => {
    const result = await run('System.out.print("Waiting:"); System.in.read();', (_text, _stdin, abort) => abort.abort())
    expect(result.execution?.exitCode).toBe(process.platform === 'win32' ? 1 : null)
    expect(result.execution?.timedOut).toBe(false)
  })
  it('bounds runaway output', async () => {
    const result = await run('while(true) System.out.print("xxxxxxxxxxxxxxxx");', undefined, 2000, 1024)
    expect(result.execution?.outputLimited).toBe(true)
    expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(1024)
  })
  it('kills Java when its worker is abruptly killed and reaps only stale console directories', async () => {
    const isolated = await mkdtemp(path.join(os.tmpdir(), 'projex-console-interruption-'))
    const runnerPath = pathToFileURL(path.resolve('src/infrastructure/java/java-runner.ts')).href
    const script = `import {createJavaRunner} from ${JSON.stringify(runnerPath)};
      const r=createJavaRunner({javaExecutable:'java',javacExecutable:'javac',release:17,jobRoot:${JSON.stringify(isolated)},compileTimeoutMs:10000,testTimeoutMs:1000,outputLimitBytes:4096,memoryLimitMb:64});
      await r.executeInteractive({entryClassName:'Main',sourceCode:'public class Main { public static void main(String[] a) throws Exception {System.out.println(ProcessHandle.current().pid());System.in.read();} }'},
      {signal:new AbortController().signal,onPhase:async()=>{},onOutput:(_c,t)=>process.stdout.write(t)});`
    const worker = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { stdio:['ignore','pipe','pipe'] })
    let output = '', errors = ''
    worker.stdout.on('data',(b) => { output += String(b) })
    worker.stderr.on('data',(b) => { errors += String(b) })
    try {
      for(let i=0;i<150 && !/\d+/.test(output);i++) await delay(100)
      expect(errors).toBe('')
      const pid = Number(output.trim())
      expect(pid).toBeGreaterThan(0)
      worker.kill('SIGKILL')
      let alive = true
      for(let i=0;i<40;i++) {
        try { process.kill(pid,0) } catch { alive=false;break }
        await delay(100)
      }
      expect(alive).toBe(false)
      for(const name of await readdir(isolated)) await utimes(path.join(isolated,name),new Date(0),new Date(0))
      await mkdir(path.join(isolated,'console-active'))
      await mkdir(path.join(isolated,'unrelated'))
      await cleanupAbandonedConsoleDirectories(isolated)
      expect((await readdir(isolated)).sort()).toEqual(['console-active','unrelated'])
    } finally { worker.kill('SIGKILL'); await rm(isolated,{recursive:true,force:true}) }
  })

})
