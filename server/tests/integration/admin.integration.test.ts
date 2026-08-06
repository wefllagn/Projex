import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaAdminRepository } from '../../src/modules/admin/admin.repository.js'
import { createAdminService } from '../../src/modules/admin/admin.service.js'
import { createPrismaUserProvisioningRepository } from '../../src/modules/users/user-provisioning.repository.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const now = new Date('2031-01-10T08:00:00.000Z')
const reason = 'Confirmed administrative security response.'

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

async function createSession(userId: string, suffix: string) {
  return prisma.refreshSession.create({
    data: {
      userId,
      familyId: `10000000-0000-4000-8000-00000000000${suffix}`,
      tokenHash: `refresh-${suffix}`,
      csrfTokenHash: `csrf-${suffix}`,
      expiresAt: new Date(now.getTime() + 60_000),
      userAgent: 'sensitive browser detail',
      ipAddress: '192.0.2.10',
    },
  })
}

describe('Phase 9A PostgreSQL administration foundation', () => {
  it('projects safe account state and revokes active sessions idempotently with one audit event', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const student = await createActiveUser(prisma, 'STUDENT')
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const classRecord = await createActiveClass(prisma, instructor.id)
    await createActiveMembership(prisma, classRecord.id, student.id)
    await createSession(student.id, '1')
    const service = createAdminService({
      repository: createPrismaAdminRepository(prisma),
      now: () => now,
    })

    const summary = await service.accountSummary(admin, student.id)
    expect(summary).toMatchObject({
      userId: student.id,
      universityEmail: student.email,
      sessions: { active: 1, revoked: 0, expired: 0 },
      memberships: [{ class: { classId: classRecord.id } }],
    })
    expect(JSON.stringify(summary)).not.toContain('sensitive browser detail')
    expect(JSON.stringify(summary)).not.toContain('192.0.2.10')
    expect(JSON.stringify(summary)).not.toMatch(/tokenHash|csrfTokenHash|passwordHash/i)

    const first = await service.revokeUserSessions(
      admin,
      student.id,
      { reason },
      '20000000-0000-4000-8000-000000000001',
    )
    const second = await service.revokeUserSessions(
      admin,
      student.id,
      { reason },
      '20000000-0000-4000-8000-000000000002',
    )
    expect(first.revokedSessionCount).toBe(1)
    expect(second.revokedSessionCount).toBe(0)
    expect(await prisma.refreshSession.count({ where: { revokedAt: { not: null } } })).toBe(1)
    const audits = await prisma.adminAuditEvent.findMany()
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      actorAdminId: admin.id,
      action: 'USER_SESSIONS_REVOKED',
      targetId: student.id,
      reason,
      metadataJson: { revokedSessionCount: 1 },
    })
  })

  it('rolls session revocation back when audit persistence fails', async () => {
    const admin = await createActiveUser(prisma, 'ADMIN')
    const student = await createActiveUser(prisma, 'STUDENT')
    await createSession(student.id, '2')
    const repository = createPrismaAdminRepository(prisma, async () => {
      throw new Error('injected audit failure')
    })
    await expect(
      repository.revokeUserSessions({
        actorAdminId: admin.id,
        targetUserId: student.id,
        reason,
        requestId: '20000000-0000-4000-8000-000000000003',
        now,
      }),
    ).rejects.toThrow('injected audit failure')
    expect(await prisma.refreshSession.count({ where: { revokedAt: null } })).toBe(1)
    expect(await prisma.adminAuditEvent.count()).toBe(0)
  })

  it('serializes concurrent administrator status changes so one active admin remains', async () => {
    const first = await createActiveUser(prisma, 'ADMIN', 'First Admin')
    const second = await createActiveUser(prisma, 'ADMIN', 'Second Admin')
    const repository = createPrismaUserProvisioningRepository(prisma)
    const [firstResult, secondResult] = await Promise.all([
      repository.updateStatus({
        userId: second.id,
        status: 'SUSPENDED',
        expectedUpdatedAt: second.updatedAt,
        changedAt: now,
        adminAudit: {
          actorAdminId: first.id,
          requestId: '20000000-0000-4000-8000-000000000004',
          reason,
        },
      }),
      repository.updateStatus({
        userId: first.id,
        status: 'SUSPENDED',
        expectedUpdatedAt: first.updatedAt,
        changedAt: now,
        adminAudit: {
          actorAdminId: second.id,
          requestId: '20000000-0000-4000-8000-000000000005',
          reason,
        },
      }),
    ])
    expect([firstResult.kind, secondResult.kind].sort()).toEqual(
      ['last_active_admin', 'updated'].sort(),
    )
    expect(
      await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
    ).toBe(1)
    expect(await prisma.adminAuditEvent.count()).toBe(1)
  })

  it('rejects stale status versions without changing the user or writing audit data', async () => {
    const actor = await createActiveUser(prisma, 'ADMIN')
    await createActiveUser(prisma, 'ADMIN')
    const target = await createActiveUser(prisma, 'STUDENT')
    const repository = createPrismaUserProvisioningRepository(prisma)
    const result = await repository.updateStatus({
      userId: target.id,
      status: 'SUSPENDED',
      expectedUpdatedAt: new Date(target.updatedAt.getTime() - 1),
      changedAt: now,
      adminAudit: {
        actorAdminId: actor.id,
        requestId: '20000000-0000-4000-8000-000000000006',
        reason,
      },
    })
    expect(result).toEqual({ kind: 'stale' })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).status).toBe('ACTIVE')
    expect(await prisma.adminAuditEvent.count()).toBe(0)
  })
})
