import { describe, expect, it, vi } from 'vitest'
import type { DatabaseHealth } from '../../infrastructure/database/prisma.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { AdminOversightRepository } from './admin-oversight.repository.js'
import { createAdminOversightService } from './admin-oversight.service.js'

const admin: SafeUserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Admin User',
  email: 'admin@integration.test',
  role: 'ADMIN',
  status: 'ACTIVE',
}

describe('Phase 9B oversight service safety', () => {
  it('distinguishes database unavailability without claiming worker health', async () => {
    const repository = { queueObservations: vi.fn() } as unknown as AdminOversightRepository
    const databaseHealth: DatabaseHealth = { checkConnection: vi.fn(async () => { throw new Error('private database detail') }) }
    const service = createAdminOversightService({ repository, databaseHealth })
    const result = await service.health(admin)
    expect(result).toMatchObject({
      statusCode: 503,
      data: {
        api: { status: 'available' },
        database: { status: 'unavailable' },
        queues: { status: 'unavailable', source: 'database_unavailable' },
        workerHealth: { status: 'not_observed' },
      },
    })
    expect(JSON.stringify(result)).not.toContain('private database detail')
    expect(repository.queueObservations).not.toHaveBeenCalled()
  })
})
