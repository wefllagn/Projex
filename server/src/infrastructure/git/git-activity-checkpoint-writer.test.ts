import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GitInfrastructureError } from './git-errors.js'
import { createGitActivityCheckpointWriter } from './git-activity-checkpoint-writer.js'

const input = {
  repositoryId: '11111111-1111-4111-8111-111111111111',
  checkpointId: '22222222-2222-4222-8222-222222222222',
  storagePath: 'repositories/11/11/repository.git',
  studentId: '33333333-3333-4333-8333-333333333333',
  sourceCode: 'public class Main {}',
  entryFilePath: 'Main.java',
  defaultBranch: 'main',
  expectedHeadCommitHash: null,
}

describe('Git Activity checkpoint writer', () => {
  it('creates only the fixed entry-file commit and pushes main after the final authorization callback', async () => {
    const beforePush = vi.fn().mockResolvedValue(undefined)
    const commitHash = 'a'.repeat(40)
    const run = vi.fn(async (args: readonly string[]) => {
      if (args[0] === 'rev-parse' && args[1] === '--verify') throw new GitInfrastructureError('GIT_COMMAND_FAILED')
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') return { stdout: `${commitHash}\n`, stderr: '' }
      return { stdout: '', stderr: '' }
    })
    const writer = createGitActivityCheckpointWriter({
      git: { run },
      resolveRepository: vi.fn().mockResolvedValue('C:\\managed\\repository.git'),
    })

    await expect(writer.write({ ...input, beforePush })).resolves.toEqual({ commitHash })
    expect(beforePush).toHaveBeenCalledOnce()
    expect(run).toHaveBeenCalledWith(['add', '--', 'Main.java'], expect.any(String))
    const commitCall = run.mock.calls.find(([args]) => args.includes('commit'))
    expect(commitCall?.[0]).toEqual(expect.arrayContaining(['user.name=Projex Student', 'commit', '-m']))
    expect(commitCall?.[0].at(-1)).toContain(`Projex-Checkpoint-Id: ${input.checkpointId}`)
    expect(run).toHaveBeenCalledWith(['push', 'origin', 'HEAD:refs/heads/main'], expect.any(String))
  })

  it('recovers a job whose exact checkpoint commit was pushed before database completion', async () => {
    const commitHash = 'b'.repeat(40)
    const run = vi.fn(async (args: readonly string[]) => {
      if (args[0] === 'clone') {
        await writeFile(path.join(args[3]!, 'Main.java'), input.sourceCode, 'utf8')
      }
      if (args[0] === 'rev-parse' && args[1] === '--verify') return { stdout: `${commitHash}\n`, stderr: '' }
      if (args[0] === 'log') return { stdout: `Save browser checkpoint\n\nProjex-Checkpoint-Id: ${input.checkpointId}\n`, stderr: '' }
      return { stdout: '', stderr: '' }
    })
    const writer = createGitActivityCheckpointWriter({
      git: { run },
      resolveRepository: vi.fn().mockResolvedValue('C:\\managed\\repository.git'),
    })

    await expect(writer.write(input)).resolves.toEqual({ commitHash })
    expect(run.mock.calls.some(([args]) => args[0] === 'push')).toBe(false)
  })
})
