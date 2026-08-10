import { describe, expect, it } from 'vitest'
import { repositoryCatalogProjection, repositoryProjection } from './repository-projections.js'

const raw = {
  id: 'repo-1', projectTaskId: 'task-1', teamId: 'team-1', repositoryType: 'CLASS_PROJECT', repositoryName: 'repo', slug: 'repo', description: 'description', defaultBranch: 'main', visibility: 'CLASS_ONLY', status: 'ACTIVE', storageStatus: 'PENDING', reviewStatus: 'WORKING',
  owner: { userId: 'student-1', fullName: 'Synthetic Student', email: 'private@example.test' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
  storagePath: 'C:/private/repository.git', credentialSecret: 'hidden', members: [{ email: 'hidden' }], feedback: 'hidden',
}

describe('repository projections', () => {
  it('allowlists safe metadata and drops storage, credential, membership, and review content', () => {
    const projected = repositoryProjection(raw)
    expect(projected).toMatchObject({ id: 'repo-1', projectTaskId: 'task-1', storageStatus: 'PENDING' })
    expect(projected.owner).toEqual({ userId: 'student-1', fullName: 'Synthetic Student' })
    for (const field of ['storagePath', 'credentialSecret', 'members', 'feedback']) expect(projected).not.toHaveProperty(field)
  })

  it('keeps catalog state smaller than detail state', () => {
    const projected = repositoryCatalogProjection(raw)
    expect(projected).not.toHaveProperty('slug')
    expect(projected).not.toHaveProperty('defaultBranch')
    expect(projected).not.toHaveProperty('visibility')
    expect(projected).not.toHaveProperty('teamId')
  })
})
