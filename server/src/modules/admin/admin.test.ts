import type { SafeUserProfile } from '../auth/auth.types.js'
import { describe, expect, it } from 'vitest'
import type {
  AdminAccountSummaryRecord,
  AdminRepository,
} from './admin.repository.js'
import { createAdminService } from './admin.service.js'

const now = new Date('2031-01-10T08:00:00.000Z')
const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Active Admin',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

function accountRecord(): AdminAccountSummaryRecord {
  return {
    user: {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Target Student',
      email: 'student@integration.test',
      role: 'STUDENT',
      status: 'SETUP_PENDING',
      createdAt: now,
      updatedAt: now,
      passwordChangedAt: null,
      lastLoginAt: null,
      accountSetupTokens: [
        {
          createdAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
          usedAt: null,
          invalidatedAt: null,
        },
      ],
      classMemberships: [],
    },
    sessions: { active: 1, revoked: 2, expired: 3 },
  }
}

class FakeAdminRepository implements AdminRepository {
  summary: AdminAccountSummaryRecord | null = accountRecord()
  revokeResult = {
    kind: 'revoked' as const,
    revokedSessionCount: 2,
    revokedAt: now,
  }
  revokeInput?: Parameters<AdminRepository['revokeUserSessions']>[0]

  async findAccountSummary() {
    return this.summary
  }

  async revokeUserSessions(
    input: Parameters<AdminRepository['revokeUserSessions']>[0],
  ) {
    this.revokeInput = input
    return this.revokeResult
  }
}

describe('Phase 9A admin account service', () => {
  it('returns only approved account, setup, session-count, and membership fields', async () => {
    const service = createAdminService({
      repository: new FakeAdminRepository(),
      now: () => now,
    })
    const result = await service.accountSummary(
      admin,
      '22222222-2222-4222-8222-222222222222',
    )
    expect(result).toMatchObject({
      role: 'STUDENT',
      status: 'SETUP_PENDING',
      accountSetup: { state: 'PENDING' },
      sessions: { active: 1, revoked: 2, expired: 3 },
    })
    expect(JSON.stringify(result)).not.toMatch(
      /passwordHash|tokenHash|csrf|cookie|ipAddress|userAgent|setupLink/i,
    )
  })

  it.each([
    { ...admin, role: 'INSTRUCTOR' as const },
    { ...admin, role: 'STUDENT' as const },
    { ...admin, status: 'SUSPENDED' as const },
  ])('denies non-active-admin callers', async (caller) => {
    const service = createAdminService({ repository: new FakeAdminRepository() })
    await expect(
      service.accountSummary(caller, '22222222-2222-4222-8222-222222222222'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('passes only the bounded reason and request identity into session revocation', async () => {
    const repository = new FakeAdminRepository()
    const service = createAdminService({ repository, now: () => now })
    await expect(
      service.revokeUserSessions(
        admin,
        '22222222-2222-4222-8222-222222222222',
        { reason: 'Confirmed account compromise response.' },
        '33333333-3333-4333-8333-333333333333',
      ),
    ).resolves.toMatchObject({ revokedSessionCount: 2 })
    expect(repository.revokeInput).toEqual({
      actorAdminId: admin.id,
      targetUserId: '22222222-2222-4222-8222-222222222222',
      reason: 'Confirmed account compromise response.',
      requestId: '33333333-3333-4333-8333-333333333333',
      now,
    })
  })
})
