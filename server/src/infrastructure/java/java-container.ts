import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { JavaInfrastructureError } from './java-infrastructure-error.js'
const exec = promisify(execFile)
export interface JavaContainerConfig { executable: string; image: string }
export function pinnedJavaImage(image: string) { return /^(?:[a-z0-9][a-z0-9./:_-]*@)?sha256:[a-f0-9]{64}$/.test(image) }
export function containerArguments(input: { name: string; directory: string; uid: number; gid: number; image: string; compiler: boolean; args: string[]; timeoutMs: number }) {
  if (!pinnedJavaImage(input.image) || !path.isAbsolute(input.directory) || /[,\n\r]/.test(input.directory) || input.uid <= 0 || !/^origin-java-\d+-[a-f0-9-]{36}$/.test(input.name)) throw new JavaInfrastructureError('JAVA_CONTAINER_CONFIGURATION_INVALID')
  const args = input.args.map(arg => arg.startsWith(input.directory + path.sep) ? '/work/' + path.relative(input.directory, arg).split(path.sep).join('/') : arg)
  return ['create', '--name', input.name, '--label', 'origin.managed=java', '--label', `origin.worker=${process.pid}`, '--interactive', '--init', '--network=none', '--log-driver=none', '--cgroupns=private', '--ipc=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--security-opt=apparmor=docker-default', '--pids-limit=64', '--memory=256m', '--memory-swap=256m', '--cpus=1', '--ulimit=nofile=128:128', '--ulimit=fsize=16777216:16777216', '--ulimit=core=0:0', '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=32m,mode=1777', '--mount', `type=bind,src=${input.directory},dst=/work${input.compiler ? '' : ',readonly'}`, '--workdir=/work', '--user', `${input.uid}:${input.gid}`, '--env=HOME=/tmp', '--env=LANG=C.UTF-8', input.image, 'timeout', '--signal=KILL', `${Math.ceil(input.timeoutMs / 1000) + 2}s`, input.compiler ? 'javac' : 'java', ...(input.compiler ? ['-J-Xmx128m', '-J-XX:ActiveProcessorCount=1', '-proc:none'] : []), ...args]
}
export async function createContainerProcess(config: JavaContainerConfig, input: { executable: string; args: string[]; cwd: string; timeoutMs: number }) {
  if (process.platform !== 'linux' || !path.isAbsolute(config.executable) || !['java', 'javac'].includes(path.basename(input.executable))) throw new JavaInfrastructureError('JAVA_CONTAINER_CONFIGURATION_INVALID')
  const directory = await realpath(input.cwd)
  if (directory !== path.resolve(input.cwd)) throw new JavaInfrastructureError('JAVA_TEMP_DIRECTORY_INVALID')
  const name = `origin-java-${process.pid}-${randomUUID()}`
  const command = (args: string[]) => exec(config.executable, args, { timeout: 15000, maxBuffer: 65536, env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' } })
  const remove = async () => { await command(['rm', '--force', name]) }
  try { await command(containerArguments({ name, directory, uid: process.getuid!(), gid: process.getgid!(), image: config.image, compiler: path.basename(input.executable) === 'javac', args: input.args, timeoutMs: input.timeoutMs })) }
  catch { await remove().catch(() => undefined); throw new JavaInfrastructureError('JAVA_CONTAINER_UNAVAILABLE') }
  return {
    executable: config.executable, args: ['start', '--attach', '--interactive', name], remove,
    async finish(interrupted: boolean) {
      let failure: JavaInfrastructureError | null = null
      try {
        if (!interrupted) {
          const { stdout } = await command(['inspect', '--format', '{{json .State}}', name])
          const state = JSON.parse(stdout)
          if (state.Running || state.Error || !state.StartedAt || state.StartedAt.startsWith('0001')) throw new Error('Container did not complete normally')
        }
      } catch { failure = new JavaInfrastructureError('JAVA_CONTAINER_UNAVAILABLE') }
      try { await remove() } catch { failure = new JavaInfrastructureError('JAVA_CONTAINER_CLEANUP_FAILED') }
      if (failure) throw failure
    },
  }
}
export async function verifyJavaContainerHost(config: JavaContainerConfig) {
  if (process.platform !== 'linux' || !pinnedJavaImage(config.image) || !path.isAbsolute(config.executable)) throw new JavaInfrastructureError('JAVA_CONTAINER_CONFIGURATION_INVALID')
  try {
    const { stdout } = await exec(config.executable, ['info', '--format', '{{json .}}'], { timeout: 15000, maxBuffer: 100000 })
    const info = JSON.parse(stdout)
    if (info.OSType !== 'linux' || info.CgroupVersion !== '2' || !info.SecurityOptions?.some((item: string) => item.includes('seccomp')) || !info.SecurityOptions?.some((item: string) => item.includes('apparmor'))) throw new Error('Required isolation unavailable')
    await exec(config.executable, ['image', 'inspect', config.image], { timeout: 15000, maxBuffer: 100000 })
  } catch { throw new JavaInfrastructureError('JAVA_CONTAINER_ISOLATION_UNAVAILABLE') }
}
