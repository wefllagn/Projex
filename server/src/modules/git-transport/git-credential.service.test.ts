import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { SafeUserProfile } from '../auth/auth.types.js'
import { createGitCredentialService } from './git-credential.service.js'
import type { GitTransportRepository } from './git-transport.repository.js'

const caller = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Synthetic Student',
  email: 'synthetic@integration.test',
  role: 'STUDENT',
  status: 'ACTIVE',
} satisfies SafeUserProfile

describe('Git credential issuance availability', () => {
  it('rejects before repository access or persistence when Smart HTTP is disabled', async () => {
    const repository = {
      findAccess: vi.fn(),
      createCredential: vi.fn(),
    } as unknown as GitTransportRepository
    const service = createGitCredentialService({
      issuanceEnabled: false,
      repository,
      logger: pino({ level: 'silent' }),
      credentialTtlMinutes: 15,
    })

    await expect(service.issue(caller, '22222222-2222-4222-8222-222222222222', ['READ']))
      .rejects.toMatchObject({ statusCode: 404, code: 'GIT_SMART_HTTP_UNAVAILABLE' })
    expect(repository.findAccess).not.toHaveBeenCalled()
    expect(repository.createCredential).not.toHaveBeenCalled()
  })
})
