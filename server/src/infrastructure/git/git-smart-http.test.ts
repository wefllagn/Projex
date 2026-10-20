import { constants } from 'node:fs'
import { access, chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGitSmartHttpBackend } from './git-smart-http.js'

vi.mock('./git-command-runner.js', () => ({
  createGitCommandRunner: () => ({ detectVersion: vi.fn().mockResolvedValue({ raw: 'fixture' }) }),
  createSanitizedGitEnvironment: vi.fn(),
}))
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true }) })
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'projex-hook-permissions-'))
  roots.push(root)
  const script = path.join(root, 'hook.js')
  await writeFile(script, '// Node reads this script\n', { mode: 0o600 })
  const backend = (hookScript = script) => createGitSmartHttpBackend({
    executable: process.execPath, gitExecutable: process.execPath, storageRoot: root, hookScript,
    limits: { requestBytes: 1024, responseBytes: 1024, timeoutMs: 1000, maxConcurrent: 1,
      maxBranches: 10, maxRefUpdates: 10, maxNewCommits: 10, blobLimitBytes: 1024, repositoryLimitBytes: 4096 },
  })
  return { root, script, backend }
}
describe('Smart HTTP hook filesystem permissions', () => {
  it('reads a plain compiled Node script and creates executable wrappers', async () => {
    const { root, script, backend } = await fixture()
    await expect(backend().initialize()).resolves.toBeUndefined()
    for (const name of ['pre-receive', 'post-receive']) {
      const hook = path.join(root, 'transport', 'hooks', name)
      await expect(access(hook, constants.X_OK)).resolves.toBeUndefined()
      expect(await readFile(hook, 'utf8')).toContain(`"${script.replaceAll('\\', '/')}" ${name}`)
    }
  })
  it('continues to reject a linked compiled hook script', async () => {
    const { root, script, backend } = await fixture()
    const link = path.join(root, 'linked.js')
    await symlink(script, link)
    await expect(backend(link).initialize()).rejects.toMatchObject({ code: 'GIT_HOOK_RUNTIME_UNAVAILABLE' })
  })
  it('rejects a missing compiled hook script', async () => {
    const { root, backend } = await fixture()
    await expect(backend(path.join(root, 'missing.js')).initialize()).rejects.toMatchObject({ code: 'GIT_HOOK_RUNTIME_UNAVAILABLE' })
  })
  it.skipIf(process.platform === 'win32')('fails closed for a non-executable existing wrapper', async () => {
    const { root, backend } = await fixture()
    await backend().initialize()
    await chmod(path.join(root, 'transport', 'hooks', 'pre-receive'), 0o600)
    await expect(backend().initialize()).rejects.toMatchObject({ code: 'GIT_TRANSPORT_HOOK_INVALID' })
  })
})
