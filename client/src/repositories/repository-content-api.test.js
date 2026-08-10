import { describe, expect, it, vi } from 'vitest'
import { createRepositoryContentApi } from './repository-content-api.js'

describe('repository content API', () => {
  it('maps inspection and credential operations to the existing contracts', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
    }
    const publicUrl = vi.fn((path) => `http://localhost:3000/api/v1${path}`)
    const api = createRepositoryContentApi(client, publicUrl)

    await api.listCommits('repo-1', { branchName: 'feature/a', page: 2, limit: 20 })
    await api.getTree('repo-1', { branchName: 'feature/a', path: 'src/main' })
    await api.getDiff('repo-1', { baseCommitId: 'a'.repeat(40), targetCommitId: 'b'.repeat(40) })
    await api.issueCredential('repo-1', ['READ', 'WRITE'])
    await api.revokeCredential('credential-1')

    expect(client.get).toHaveBeenCalledWith('/repositories/repo-1/source/commits?branchName=feature%2Fa&page=2&limit=20', undefined)
    expect(client.get).toHaveBeenCalledWith('/repositories/repo-1/source/tree?branchName=feature%2Fa&path=src%2Fmain', undefined)
    expect(client.get).toHaveBeenCalledWith(`/repositories/repo-1/source/diff?baseCommitId=${'a'.repeat(40)}&targetCommitId=${'b'.repeat(40)}`, undefined)
    expect(client.post).toHaveBeenCalledWith('/repositories/repo-1/git-credentials', { operations: ['READ', 'WRITE'] }, undefined)
    expect(client.post).toHaveBeenCalledWith('/git-credentials/credential-1/revoke', {}, undefined)
    expect(api.getTransportUrl('repo/unsafe')).toBe('http://localhost:3000/api/v1/git/repositories/repo%2Funsafe')
  })
})
