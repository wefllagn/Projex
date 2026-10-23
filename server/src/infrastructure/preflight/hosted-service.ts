import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
/** Fail closed outside the packaged unprivileged, read-only systemd service. */
export async function assertHostedGitService(storageRoot: string) {
  if (process.platform !== 'linux' || !process.getuid || process.getuid() === 0 || !path.isAbsolute(storageRoot)) throw new Error('HOSTED_SERVICE_ISOLATION_REQUIRED')
  const [status, mounts, storage] = await Promise.all([readFile('/proc/self/status', 'utf8'), readFile('/proc/self/mountinfo', 'utf8'), stat(storageRoot)])
  const root = mounts.split('\n').map(line => line.split(' ')).find(fields => fields[4] === '/')
  if (!/^NoNewPrivs:\s+1$/m.test(status) || !/^CapEff:\s+0+$/m.test(status) || !root?.[5]?.split(',').includes('ro') || storage.uid !== process.getuid() || (storage.mode & 0o022) !== 0) throw new Error('HOSTED_SERVICE_ISOLATION_REQUIRED')
  let codeWritable = true
  try { await access(process.cwd(), constants.W_OK) } catch { codeWritable = false }
  if (codeWritable) throw new Error('HOSTED_SERVICE_ISOLATION_REQUIRED')
}
