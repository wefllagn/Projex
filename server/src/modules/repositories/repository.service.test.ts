import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { createRepositoryService } from './repository.service.js'
import type { GitTransportAccess } from '../git-transport/git-transport.types.js'
import type { RepositoryRecord } from './repository.types.js'
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

// Metadata reads reuse the authorizer used by credential issuance and transport.
describe('repository Git capability projection', () => {
  const record: RepositoryRecord = {
    id: 'repository', ownerId: student.id, repositoryType: 'PERSONAL', repositoryName: 'QA', slug: 'qa',
    projectTaskId: null, classId: null, activityId: null, teamId: null, description: null,
    defaultBranch: 'main', visibility: 'PRIVATE', status: 'ACTIVE', storageStatus: 'READY', reviewStatus: 'WORKING',
    createdAt: new Date(), updatedAt: new Date(), readyForReviewAt: null, approvedAt: null, archivedAt: null,
    owner: { id: student.id, fullName: student.fullName }, projectTask: null, class: null, activity: null, team: null,
  }
  const gitAccess: GitTransportAccess = {
    repositoryId: record.id, repositoryType: 'PERSONAL', ownerId: student.id, status: 'ACTIVE', storageStatus: 'READY',
    storagePath: 'never-projected.git', defaultBranch: 'main', reviewStatus: 'WORKING', user: student,
    repositoryMember: { memberRole: 'OWNER', status: 'ACTIVE' }, teamMember: null, projectTask: null,
    classWorkspace: null, activityWorkspace: null, teamLeadStudentId: null,
  }
  it.each([
    ['contributor', gitAccess, { read: true, write: true, canUpdateMain: true }],
    ['viewer', { ...gitAccess, repositoryMember: { memberRole: 'VIEWER', status: 'ACTIVE' } }, { read: true, write: false, canUpdateMain: false }],
    ['removed', { ...gitAccess, repositoryMember: { memberRole: 'OWNER', status: 'REMOVED' } }, { read: false, write: false, canUpdateMain: false }],
    ['unavailable', null, { read: false, write: false, canUpdateMain: false }],
  ] as const)('projects current %s authority without issuing or exposing storage', async (_label, current, expected) => {
    const repository = { findAccess: vi.fn().mockResolvedValue({ repository: record, repositoryMembership: { id: 'member', status: 'ACTIVE', memberRole: 'OWNER' }, classMembership: null }) } as unknown as RepositoryRepository
    const accessRepository = { findAccess: vi.fn().mockResolvedValue(current) }
    const service = createRepositoryService({ repository, accessRepository, logger: pino({ level: 'silent' }) })
    const result = await service.get(student, record.id)
    expect(result.gitPermissions).toEqual(expected)
    expect(accessRepository.findAccess).toHaveBeenCalledExactlyOnceWith(record.id, student.id)
    expect(JSON.stringify(result)).not.toContain('never-projected')
  })
})
