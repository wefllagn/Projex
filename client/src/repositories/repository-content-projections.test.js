import { describe, expect, it } from 'vitest'
import {
  credentialProjection,
  fileProjection,
  repositoryGitSummaryProjection,
  treeProjection,
} from './repository-content-projections.js'

const commitId = 'a'.repeat(40)

describe('repository content projections', () => {
  it('fails closed on repository identity mismatch and drops operational extras', () => {
    expect(() => repositoryGitSummaryProjection({
      repositoryId: 'wrong-repo', repositoryStatus: 'ACTIVE', storageStatus: 'READY', empty: true,
      defaultBranch: 'main', branchCount: 0, commitCount: 0, latestCommit: null,
    }, 'repo-1')).toThrow(/invalid repository response/i)

    const projected = credentialProjection({
      credentialId: 'credential-1', repositoryId: 'repo-1', operations: ['READ'],
      createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-01T00:15:00.000Z',
      lastUsedAt: null, revokedAt: null, secretHash: 'must-not-pass', storagePath: 'must-not-pass',
    })
    expect(projected).not.toHaveProperty('secretHash')
    expect(projected).not.toHaveProperty('storagePath')
  })

  it('allowlists safe tree and UTF-8 file fields', () => {
    expect(treeProjection({ commitId, path: '', entries: [{ name: 'src', path: 'src', entryType: 'tree', objectId: commitId, sizeBytes: null, storagePath: 'private' }] })).toEqual({
      commitId, path: '', entries: [{ name: 'src', path: 'src', entryType: 'tree', objectId: commitId, sizeBytes: null }],
    })
    expect(fileProjection({ commitId, path: 'README.md', sizeBytes: 4, encoding: 'utf-8', content: 'test', rawOutput: 'private' })).toEqual({
      commitId, path: 'README.md', sizeBytes: 4, encoding: 'utf-8', content: 'test',
    })
    expect(() => fileProjection({ commitId, path: 'image.png', sizeBytes: 4, encoding: 'base64', content: 'AAAA' })).toThrow()
  })
})
