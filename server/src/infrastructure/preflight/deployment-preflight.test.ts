import { describe, expect, it, vi } from 'vitest'
import { runDeploymentPreflight } from './deployment-preflight.js'

const passing = () => ({ database: vi.fn().mockResolvedValue(undefined), migrations: vi.fn().mockResolvedValue(undefined), git: vi.fn().mockResolvedValue(undefined), java: vi.fn().mockResolvedValue(undefined) })

describe('deployment preflight classification', () => {
  it('accepts unavailable optional runtimes only when disabled', async () => {
    const checks = passing()
    checks.git.mockRejectedValue(new Error('sensitive git host path'))
    checks.java.mockRejectedValue(new Error('sensitive Java executable'))
    const results = await runDeploymentPreflight({ gitEnabled: false, javaEnabled: false, checks })
    expect(results).toContainEqual({ check: 'git-runtime', status: 'DISABLED', code: 'GIT_DISABLED' })
    expect(results).toContainEqual({ check: 'java-runtime', status: 'DISABLED', code: 'JAVA_DISABLED' })
    expect(checks.git).not.toHaveBeenCalled()
    expect(checks.java).not.toHaveBeenCalled()
  })

  it('blocks unavailable database and does not claim migration readiness', async () => {
    const checks = passing()
    checks.database.mockRejectedValue(new Error('private database URL'))
    const results = await runDeploymentPreflight({ gitEnabled: false, javaEnabled: false, checks })
    expect(results[0]).toEqual({ check: 'database', status: 'BLOCKING', code: 'DATABASE_UNAVAILABLE' })
    expect(results.some((item) => item.check === 'migrations')).toBe(false)
    expect(checks.migrations).not.toHaveBeenCalled()
  })

  it('blocks each enabled runtime without emitting underlying sensitive errors', async () => {
    const checks = passing()
    checks.git.mockRejectedValue(new Error('C:/private/git-storage'))
    checks.java.mockRejectedValue(new Error('private executable output'))
    const results = await runDeploymentPreflight({ gitEnabled: true, javaEnabled: true, checks })
    expect(results).toContainEqual({ check: 'git-runtime', status: 'BLOCKING', code: 'GIT_RUNTIME_NOT_READY' })
    expect(results).toContainEqual({ check: 'java-runtime', status: 'BLOCKING', code: 'JAVA_RUNTIME_NOT_READY' })
    expect(JSON.stringify(results)).not.toMatch(/private|storage|executable output/i)
  })
})
