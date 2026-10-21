import { describe, expect, it } from 'vitest'
import { toRepositoryProjection, type RepositoryRecord } from './repository.types.js'

// Projection test deliberately supplies extra storage/source fields; only the
// public metadata allowlist may reach the catalog.
const base = {
  id: 'r', classId: null, activityId: 'a', projectTaskId: null, repositoryType: 'ACTIVITY_WORKSPACE', visibility: 'PRIVATE',
  owner: { id: 's', fullName: 'Student' }, class: null, projectTask: null,
  activity: { id: 'a', title: 'Loops', class: { id: 'c', className: 'Programming' } },
  managedPath: 'PRIVATE_HOST_PATH', sourceCode: 'PRIVATE_SOURCE',
} as unknown as RepositoryRecord

describe('repository catalog context projection', () => {
  it('derives Activity context without changing the nullable direct class foreign key', () => {
    const dto = toRepositoryProjection(base)
    expect(dto).toMatchObject({ classId: null, contextClassId: 'c', className: 'Programming', activityTitle: 'Loops', projectTitle: null })
    expect(JSON.stringify(dto)).not.toMatch(/PRIVATE_HOST_PATH|PRIVATE_SOURCE/)
  })
  it('keeps Personal repositories independent and derives Project context from its authorized task', () => {
    expect(toRepositoryProjection({ ...base, activity: null })).toMatchObject({ contextClassId: null, className: null, activityTitle: null })
    expect(toRepositoryProjection({ ...base, activity: null, projectTask: { title: 'Library', class: { id: 'project-class', className: 'Capstone' } } } as RepositoryRecord)).toMatchObject({ contextClassId: 'project-class', className: 'Capstone', projectTitle: 'Library' })
  })
  it('continues rejecting unsupported public visibility', () => {
    expect(() => toRepositoryProjection({ ...base, visibility: 'PUBLIC' })).toThrow('PUBLIC repositories are unavailable.')
  })
})
