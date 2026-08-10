import { describe, expect, it, vi } from 'vitest'
import { createRepositoryApi } from './repository-api.js'

describe('repository API', () => {
  it('maps foundation creation, list, detail, and metadata operations only', async () => {
    const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}), patch: vi.fn().mockResolvedValue({}) }
    const api = createRepositoryApi(client)
    await api.createClassProject('task-1', { teamName: 'Team', repositoryName: 'repo' })
    await api.createPersonal({ repositoryName: 'personal' })
    await api.listRepositories({ page: 1, pageSize: 20, status: 'ARCHIVED' })
    await api.getRepository('repo-1')
    await api.updateRepository('repo-1', { expectedUpdatedAt: 'version', description: null })
    expect(client.post).toHaveBeenNthCalledWith(1, '/project-tasks/task-1/repositories', { teamName: 'Team', repositoryName: 'repo' }, undefined)
    expect(client.post).toHaveBeenNthCalledWith(2, '/repositories/personal', { repositoryName: 'personal' }, undefined)
    expect(client.get).toHaveBeenNthCalledWith(1, '/repositories?page=1&pageSize=20&status=ARCHIVED', undefined)
    expect(client.get).toHaveBeenNthCalledWith(2, '/repositories/repo-1', undefined)
    expect(client.patch).toHaveBeenCalledWith('/repositories/repo-1', { expectedUpdatedAt: 'version', description: null }, undefined)
    expect(api).not.toHaveProperty('readyForReview')
    expect(api).not.toHaveProperty('issueCredential')
  })
})
