import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { createRepositoryService } from './repository.service.js'
import type { RepositoryRepository } from './repository.repository.js'

const student = { id: '11111111-1111-4111-8111-111111111111', fullName: 'Synthetic Student', email: 'student@example.test', role: 'STUDENT' as const, status: 'ACTIVE' as const }

describe('repository provisioning capability boundary', () => {
  it('rejects both creation paths before persistence when provisioning is disabled', async () => {
    const createClassProject = vi.fn()
    const createPersonal = vi.fn()
    const service = createRepositoryService({ repository: { createClassProject, createPersonal } as unknown as RepositoryRepository, logger: pino({ level: 'silent' }), provisioningEnabled: false })
    await expect(service.createClassProject(student, '22222222-2222-4222-8222-222222222222', { teamName: 'Team', repositoryName: 'repo', description: null })).rejects.toMatchObject({ statusCode: 503, code: 'REPOSITORY_PROVISIONING_UNAVAILABLE' })
    await expect(service.createPersonal(student, { repositoryName: 'private-repo', description: null })).rejects.toMatchObject({ statusCode: 503, code: 'REPOSITORY_PROVISIONING_UNAVAILABLE' })
    expect(createClassProject).not.toHaveBeenCalled()
    expect(createPersonal).not.toHaveBeenCalled()
  })
})
