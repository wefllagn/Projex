import { describe, expect, it } from 'vitest'
import { assertHostedGitService } from './hosted-service.js'
describe('hosted Git service confinement', () => {
  it('rejects a relative storage root before inspecting or running Git', async () => {
    await expect(assertHostedGitService('.git-storage')).rejects.toThrow('HOSTED_SERVICE_ISOLATION_REQUIRED')
  })
})
