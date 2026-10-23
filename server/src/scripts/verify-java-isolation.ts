import 'dotenv/config'
import { loadEnv } from '../config/env.js'
import { createJavaRunner } from '../infrastructure/java/java-runner.js'
import { verifyJavaContainerHost } from '../infrastructure/java/java-container.js'
import { verifyJavaContainerBoundaries } from '../infrastructure/java/java-isolation-verifier.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)
async function main() {
  const env = loadEnv()
  if (env.javaExecutionMode !== 'container') throw new Error('CONTAINER_MODE_REQUIRED')
  const container = { executable: env.javaDockerExecutable, image: env.javaDockerImage }
  await verifyJavaContainerHost(container)
  const runner = createJavaRunner({ container, javaExecutable: 'java', javacExecutable: 'javac', release: 17, jobRoot: env.javaJobRoot, compileTimeoutMs: env.javaCompileTimeoutMs, testTimeoutMs: env.javaTestTimeoutMs, outputLimitBytes: env.javaOutputLimitBytes, memoryLimitMb: env.javaMemoryLimitMb })
  const checks = await verifyJavaContainerBoundaries(runner, true)
  let output = ''
  const controller = new AbortController()
  const result = await runner.executeInteractive({ entryClassName: 'Main', sourceCode: 'import java.util.Scanner; class Main { public static void main(String[] args) { Scanner s=new Scanner(System.in); System.out.println(s.nextInt()+s.nextInt()); } }' }, { signal: controller.signal, onPhase: async () => undefined, onStart: stdin => stdin.end('8 5\n'), onOutput: (_channel, text) => { output += text } })
  if (result.execution?.exitCode !== 0 || !output.includes('13')) throw new Error('INTERACTIVE_SCANNER_FAILED')
  const { stdout } = await exec(container.executable, ['ps', '--all', '--filter', `label=origin.worker=${process.pid}`, '--format', '{{.ID}}'], { timeout: 15000 })
  if (stdout.trim()) throw new Error('CONTAINER_CLEANUP_FAILED')
  console.log(JSON.stringify({ checks: [...checks, { check: 'interactive-scanner', status: 'PASS' }, { check: 'container-cleanup', status: 'PASS' }], image: container.image, platform: process.platform, verifiedAt: new Date().toISOString() }, null, 2))
}
main().catch(error => { console.error(JSON.stringify({ status: 'BLOCKING', code: /^[A-Z_]+$/.test(error?.message || '') ? error.message : 'JAVA_ISOLATION_VERIFICATION_FAILED' })); process.exitCode = 1 })
