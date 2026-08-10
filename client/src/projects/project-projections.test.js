import { describe, expect, it } from 'vitest'
import { monitoringProjection, projectTaskProjection, teamSummaryProjection } from './project-projections.js'

describe('project projections', () => {
  it('allowlists project-task fields and drops unsupported academic configuration', () => {
    const projected = projectTaskProjection({
      id: 'task-1', classId: 'class-1', title: 'Project', instructions: 'Build it', dueDate: '2026-09-01T00:00:00.000Z', dueState: 'OPEN',
      maxTeamSize: 4, status: 'PUBLISHED', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
      createdBy: { userId: 'instructor-1', fullName: 'Synthetic Instructor', email: 'private@example.test' },
      rubric: { secret: true }, attachment: { path: 'C:/private' }, similarityThreshold: 90,
    })
    expect(projected).toMatchObject({ id: 'task-1', classId: 'class-1', status: 'PUBLISHED' })
    expect(projected.createdBy).toEqual({ userId: 'instructor-1', fullName: 'Synthetic Instructor' })
    expect(projected).not.toHaveProperty('rubric')
    expect(projected).not.toHaveProperty('attachment')
    expect(projected.createdBy).not.toHaveProperty('email')
  })

  it('keeps team and monitoring summaries bounded', () => {
    expect(teamSummaryProjection({ teamId: 'team-1', name: 'Team', status: 'ACTIVE', lead: { userId: 's1', fullName: 'Student', email: 'hidden' }, activeMemberCount: 2, repository: { repositoryId: 'r1', repositoryName: 'repo', status: 'ACTIVE', reviewStatus: 'WORKING', storagePath: 'hidden' } })).toEqual({
      teamId: 'team-1', name: 'Team', status: 'ACTIVE', lead: { userId: 's1', fullName: 'Student' }, activeMemberCount: 2,
      repository: { repositoryId: 'r1', repositoryName: 'repo', status: 'ACTIVE', reviewStatus: 'WORKING' },
    })
    expect(monitoringProjection({ projectTaskId: 'task-1', teamCount: 2, repositoryCount: 2, activeMemberCount: 4, pendingInvitationCount: 1, repositoriesByReviewStatus: { WORKING: 2 }, rawMembers: ['hidden'] })).not.toHaveProperty('rawMembers')
  })
})
