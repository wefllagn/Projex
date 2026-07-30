import pino from 'pino'
import { describe, expect, it } from 'vitest'
import { createPasswordService } from '../auth/auth.password.js'
import { createTokenService } from '../auth/auth.tokens.js'
import type { AccountSetupRepository } from './account-setup.repository.js'
import { createAccountSetupService } from './account-setup.service.js'

const rawToken = 'raw-setup-token-value-that-is-long-enough-1234567890'
const validProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Pending Student',
  email: 'pending@slu.edu',
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
}

function createHarness(result: typeof validProfile | null = validProfile) {
  let captured:
    | { tokenHash: string; passwordHash: string; completedAt: Date }
    | undefined
  const repository: AccountSetupRepository = {
    async completeSetup(input) {
      captured = input
      return result
    },
  }
  const passwordService = createPasswordService()
  const tokenService = createTokenService('b'.repeat(64), 15)
  const service = createAccountSetupService({
    repository,
    passwordService,
    tokenService,
    logger: pino({ level: 'silent' }),
    now: () => new Date('2026-07-30T05:00:00.000Z'),
  })
  return { service, passwordService, tokenService, getCaptured: () => captured }
}

describe('account setup', () => {
  it('activates a valid setup token using only its hash and an Argon2id password hash', async () => {
    const { service, passwordService, tokenService, getCaptured } = createHarness()
    await service.complete(rawToken, 'ValidPassword1!')
    const captured = getCaptured()!
    expect(captured.tokenHash).toBe(tokenService.hashOpaqueToken(rawToken))
    expect(captured.tokenHash).not.toContain(rawToken)
    expect(captured.passwordHash).not.toContain('ValidPassword1!')
    expect(await passwordService.verify(captured.passwordHash, 'ValidPassword1!')).toBe(true)
  })

  it.each(['expired', 'used', 'invalidated'])(
    'rejects an %s setup token with a generic safe error',
    async () => {
      const { service } = createHarness(null)
      await expect(service.complete(rawToken, 'ValidPassword1!')).rejects.toMatchObject({
        code: 'SETUP_TOKEN_INVALID',
        message: 'The account setup link is invalid or expired.',
      })
    },
  )

  it.each([
    'short1!A',
    'alllowercase1!',
    'ALLUPPERCASE1!',
    'NoNumberHere!',
    'NoSpecialCharacter1',
  ])('enforces the password policy without storing %s', async (invalidPassword) => {
    const { service, getCaptured } = createHarness()
    await expect(service.complete(rawToken, invalidPassword)).rejects.toMatchObject({
      code: 'PASSWORD_POLICY_VIOLATION',
    })
    expect(getCaptured()).toBeUndefined()
  })

  it('completes setup without creating an authenticated session', async () => {
    const { service } = createHarness()
    await expect(service.complete(rawToken, 'ValidPassword1!')).resolves.toBeUndefined()
  })
})
