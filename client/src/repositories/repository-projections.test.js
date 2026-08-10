import { describe, expect, it } from 'vitest'
import {
  instructorRepositoryFeedbackProjection,
  instructorRepositoryMemberProjection,
  repositoryCatalogProjection,
  repositoryInvitationProjection,
  repositoryProjection,
  studentRepositoryFeedbackProjection,
  studentRepositoryMemberProjection,
} from './repository-projections.js'

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

  it('keeps student membership projections separate from instructor details', () => {
    const member = { memberId: 'member-1', userId: 'student-2', fullName: 'Safe Student', memberRole: 'MEMBER', teamRole: 'MEMBER', membershipStatus: 'ACTIVE', updatedAt: '2026-08-02T00:00:00.000Z', userStatus: 'SUSPENDED', joinedAt: '2026-08-01T00:00:00.000Z', removedAt: null, lastActivatedAt: '2026-08-01T00:00:00.000Z', email: 'private@example.test' }
    const student = studentRepositoryMemberProjection(member)
    expect(student).toEqual(expect.objectContaining({ memberId: 'member-1', membershipStatus: 'ACTIVE', updatedAt: member.updatedAt }))
    for (const field of ['userStatus', 'joinedAt', 'removedAt', 'lastActivatedAt', 'email']) expect(student).not.toHaveProperty(field)
    expect(instructorRepositoryMemberProjection(member)).toMatchObject({ userStatus: 'SUSPENDED', joinedAt: member.joinedAt })
  })

  it('allowlists invitation fields and rejects draft feedback from the student adapter', () => {
    const invitation = repositoryInvitationProjection({ invitationId: 'invite-1', repositoryId: 'repo-1', projectTaskId: 'task-1', invitee: { userId: 'student-2', fullName: 'Invitee', email: 'hidden' }, invitedBy: { userId: 'student-1', fullName: 'Owner' }, status: 'PENDING', expiresAt: '2026-08-20T00:00:00.000Z', resolutionReason: 'private' })
    expect(invitation.invitee).toEqual({ userId: 'student-2', fullName: 'Invitee' })
    expect(invitation).not.toHaveProperty('resolutionReason')
    const draft = { feedbackId: 'feedback-1', repositoryId: 'repo-1', feedbackText: 'Draft text', status: 'DRAFT', author: { userId: 'instructor-1', fullName: 'Instructor' }, updatedAt: '2026-08-02T00:00:00.000Z' }
    expect(studentRepositoryFeedbackProjection(draft)).toBeNull()
    expect(instructorRepositoryFeedbackProjection(draft)).toMatchObject({ feedbackText: 'Draft text', status: 'DRAFT' })
  })
})
