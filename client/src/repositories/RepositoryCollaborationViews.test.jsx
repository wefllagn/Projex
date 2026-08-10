import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import {
  RepositoryCollaborationPanel,
  RepositoryLifecyclePanel,
  StudentInvitationInbox,
} from './RepositoryCollaborationViews.jsx'

const project = {
  id: 'task-1', classId: 'class-1', title: 'Real Project', status: 'PUBLISHED', dueState: 'OPEN',
  dueDate: '2026-12-01T00:00:00.000Z', maxTeamSize: 4,
}
const repository = {
  id: 'repo-1', projectTaskId: 'task-1', teamId: 'team-1', repositoryType: 'CLASS_PROJECT',
  repositoryName: 'real-team-repo', slug: 'real-team-repo', description: null, defaultBranch: 'main',
  visibility: 'CLASS_ONLY', status: 'ACTIVE', storageStatus: 'READY', reviewStatus: 'WORKING',
  owner: { userId: 'student-1', fullName: 'Student Owner' }, createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z', readyForReviewAt: null, approvedAt: null, archivedAt: null,
}
const ownerMember = { memberId: 'owner-member', userId: 'student-1', fullName: 'Student Owner', memberRole: 'OWNER', teamRole: 'LEAD', membershipStatus: 'ACTIVE', updatedAt: '2026-08-01T00:00:00.000Z' }
const teammate = { memberId: 'member-2', userId: 'student-2', fullName: 'Safe Teammate', memberRole: 'MEMBER', teamRole: 'MEMBER', membershipStatus: 'ACTIVE', updatedAt: '2026-08-01T00:00:00.000Z', userStatus: 'SUSPENDED', joinedAt: '2026-08-01T00:00:00.000Z' }
const invitation = { invitationId: 'invite-1', repositoryId: 'repo-1', projectTaskId: 'task-1', invitee: { userId: 'student-3', fullName: 'Invited Student' }, invitedBy: { userId: 'student-1', fullName: 'Student Owner' }, status: 'PENDING', createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-20T00:00:00.000Z' }
const releasedFeedback = { feedbackId: 'feedback-released', repositoryId: 'repo-1', feedbackText: 'Released guidance.', status: 'RELEASED', author: { userId: 'instructor-1', fullName: 'Instructor' }, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z', releasedAt: '2026-08-02T00:00:00.000Z' }
const draftFeedback = { ...releasedFeedback, feedbackId: 'feedback-draft', feedbackText: 'Instructor-only draft.', status: 'DRAFT', releasedAt: null }

function baseApi(overrides = {}) {
  return {
    listMembers: vi.fn().mockResolvedValue({ data: [ownerMember, teammate] }),
    listFeedback: vi.fn().mockResolvedValue({ data: [releasedFeedback] }),
    listRepositoryInvitations: vi.fn().mockResolvedValue({ data: [invitation] }),
    ...overrides,
  }
}

describe('Phase 10C.2 repository collaboration', () => {
  it('shows received invitations in the repository experience and adopts accept/decline responses', async () => {
    const secondInvitation = { ...invitation, invitationId: 'invite-2', invitee: { userId: 'student-4', fullName: 'Second Student' } }
    const api = {
      listReceivedInvitations: vi.fn().mockResolvedValue({ data: [invitation, secondInvitation] }),
      getRepository: vi.fn().mockResolvedValue({ data: repository }),
      acceptInvitation: vi.fn().mockResolvedValue({ data: { ...invitation, status: 'ACCEPTED', acceptedAt: '2026-08-03T00:00:00.000Z' } }),
      declineInvitation: vi.fn().mockResolvedValue({ data: { ...secondInvitation, status: 'DECLINED', declinedAt: '2026-08-03T00:00:00.000Z' } }),
    }
    render(<MemoryRouter><StudentInvitationInbox api={api} /></MemoryRouter>)
    expect(await screen.findAllByText('real-team-repo')).toHaveLength(2)
    expect(screen.getAllByText('Student Owner', { exact: false })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    await waitFor(() => expect(api.acceptInvitation).toHaveBeenCalledWith('invite-1'))
    expect(await screen.findByText('Accepted')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(api.declineInvitation).toHaveBeenCalledWith('invite-2'))
    expect(await screen.findByText('Declined')).toBeInTheDocument()
  })

  it('uses the safe class roster, userId invitations, owner-safe members, version chaining, and ready-for-review', async () => {
    const removed = { ...teammate, membershipStatus: 'REMOVED', updatedAt: '2026-08-03T00:00:00.000Z' }
    const reactivated = { ...teammate, updatedAt: '2026-08-04T00:00:00.000Z' }
    const api = baseApi({
      createInvitation: vi.fn().mockResolvedValue({ data: { ...invitation, invitationId: 'invite-2', invitee: { userId: 'student-4', fullName: 'Roster Candidate' } } }),
      transitionMember: vi.fn().mockResolvedValueOnce({ data: removed }).mockResolvedValueOnce({ data: reactivated }),
      readyForReview: vi.fn().mockResolvedValue({ data: { ...repository, reviewStatus: 'READY_FOR_REVIEW', updatedAt: '2026-08-05T00:00:00.000Z' } }),
    })
    const classApi = { listMembers: vi.fn()
      .mockResolvedValueOnce({ data: [{ userId: 'student-4', fullName: 'Roster Candidate', email: 'must-not-render@example.test' }], pagination: { page: 1, hasNextPage: true } })
      .mockResolvedValueOnce({ data: [{ userId: 'student-5', fullName: 'Second Page Candidate', email: 'also-hidden@example.test' }], pagination: { page: 2, hasNextPage: false } }) }
    const onRepositoryChange = vi.fn()
    render(<RepositoryCollaborationPanel role="student" owner repository={repository} project={project} api={api} classApi={classApi} onRepositoryChange={onRepositoryChange} onReloadRepository={vi.fn()} />)
    expect(await screen.findByText('Safe Teammate')).toBeInTheDocument()
    expect(screen.queryByText('SUSPENDED')).not.toBeInTheDocument()
    expect(screen.queryByText('must-not-render@example.test')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i, hidden: false, exact: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choose Classmate' }))
    await screen.findByLabelText('Classmate')
    fireEvent.click(screen.getByRole('button', { name: 'Load more classmates' }))
    expect(await screen.findByRole('option', { name: 'Second Page Candidate' })).toBeInTheDocument()
    expect(classApi.listMembers).toHaveBeenNthCalledWith(2, 'class-1', { page: 2, pageSize: 100 })
    fireEvent.change(screen.getByLabelText('Classmate'), { target: { value: 'student-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))
    await waitFor(() => expect(api.createInvitation).toHaveBeenCalledWith('repo-1', { inviteeUserId: 'student-5' }))
    expect(screen.queryByText('must-not-render@example.test')).not.toBeInTheDocument()
    expect(screen.queryByText('also-hidden@example.test')).not.toBeInTheDocument()
    expect(screen.queryByText('Instructor-only draft.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(api.transitionMember).toHaveBeenNthCalledWith(1, 'repo-1', 'member-2', { action: 'REMOVE', expectedUpdatedAt: teammate.updatedAt }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))
    await waitFor(() => expect(api.transitionMember).toHaveBeenNthCalledWith(2, 'repo-1', 'member-2', { action: 'REACTIVATE', expectedUpdatedAt: removed.updatedAt }))

    fireEvent.click(screen.getByRole('button', { name: 'Mark Ready for Review' }))
    await waitFor(() => expect(api.readyForReview).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: repository.updatedAt }))
    expect(onRepositoryChange).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: 'READY_FOR_REVIEW', updatedAt: '2026-08-05T00:00:00.000Z' }))
  })

  it('resubmits a changes-requested repository using the current repository version', async () => {
    const changesRequested = { ...repository, reviewStatus: 'CHANGES_REQUESTED', updatedAt: '2026-08-06T00:00:00.000Z' }
    const api = baseApi({
      listFeedback: vi.fn().mockResolvedValue({ data: [releasedFeedback, draftFeedback] }),
      readyForReview: vi.fn().mockResolvedValue({ data: { ...changesRequested, reviewStatus: 'READY_FOR_REVIEW', updatedAt: '2026-08-07T00:00:00.000Z' } }),
    })
    render(<RepositoryCollaborationPanel role="student" owner repository={changesRequested} project={project} api={api} classApi={null} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    expect(await screen.findByText('Released guidance.')).toBeInTheDocument()
    expect(screen.queryByText('Instructor-only draft.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resubmit Repository' }))
    await waitFor(() => expect(api.readyForReview).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: changesRequested.updatedAt }))
  })

  it('creates and then updates a feedback draft using the returned feedback version', async () => {
    const createdDraft = { ...draftFeedback, updatedAt: '2026-08-08T00:00:00.000Z' }
    const updatedDraft = { ...createdDraft, feedbackText: 'Revised draft.', updatedAt: '2026-08-09T00:00:00.000Z' }
    const api = baseApi({
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
      listFeedback: vi.fn().mockResolvedValue({ data: [] }),
      createFeedbackDraft: vi.fn().mockResolvedValue({ data: createdDraft }),
      updateFeedbackDraft: vi.fn().mockResolvedValue({ data: updatedDraft }),
    })
    render(<RepositoryCollaborationPanel role="instructor" owner={false} repository={repository} project={project} api={api} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    const textarea = await screen.findByLabelText('Feedback draft')
    fireEvent.change(textarea, { target: { value: draftFeedback.feedbackText } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
    await waitFor(() => expect(api.createFeedbackDraft).toHaveBeenCalledWith('repo-1', { feedbackText: draftFeedback.feedbackText }))
    fireEvent.change(textarea, { target: { value: updatedDraft.feedbackText } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    await waitFor(() => expect(api.updateFeedbackDraft).toHaveBeenCalledWith('feedback-draft', {
      expectedUpdatedAt: createdDraft.updatedAt,
      feedbackText: updatedDraft.feedbackText,
    }))
  })

  it('keeps draft feedback instructor-only and couples request changes to the current versions', async () => {
    const readyRepository = { ...repository, reviewStatus: 'READY_FOR_REVIEW' }
    const draft = { ...releasedFeedback, feedbackId: 'draft-1', feedbackText: 'Current draft.', status: 'DRAFT', releasedAt: null }
    const api = baseApi({
      listMembers: vi.fn().mockResolvedValue({ data: [{ ...ownerMember, userStatus: 'ACTIVE', joinedAt: ownerMember.updatedAt, lastActivatedAt: ownerMember.updatedAt }] }),
      listFeedback: vi.fn().mockResolvedValue({ data: [draft] }),
      requestChanges: vi.fn().mockResolvedValue({ data: { ...readyRepository, reviewStatus: 'CHANGES_REQUESTED', updatedAt: '2026-08-03T00:00:00.000Z' } }),
    })
    const onRepositoryChange = vi.fn()
    render(<RepositoryCollaborationPanel role="instructor" owner={false} repository={readyRepository} project={project} api={api} onRepositoryChange={onRepositoryChange} onReloadRepository={vi.fn()} />)
    expect(await screen.findByDisplayValue('Current draft.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }))
    await waitFor(() => expect(api.requestChanges).toHaveBeenCalledWith('repo-1', {
      expectedUpdatedAt: readyRepository.updatedAt,
      feedbackId: 'draft-1',
      expectedFeedbackUpdatedAt: draft.updatedAt,
    }))
    expect(onRepositoryChange).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: 'CHANGES_REQUESTED' }))
  })

  it('approves ready work before cutoff without requiring feedback release', async () => {
    const readyRepository = { ...repository, reviewStatus: 'READY_FOR_REVIEW' }
    const api = baseApi({
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
      listFeedback: vi.fn().mockResolvedValue({ data: [] }),
      approveRepository: vi.fn().mockResolvedValue({ data: { ...readyRepository, reviewStatus: 'APPROVED', updatedAt: '2026-08-03T00:00:00.000Z' } }),
    })
    render(<RepositoryCollaborationPanel role="instructor" owner={false} repository={readyRepository} project={project} api={api} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Repository' }))
    await waitFor(() => expect(api.approveRepository).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: readyRepository.updatedAt }))
  })

  it('allows reasoned instructor corrections and approval while CLOSED, but not request changes', async () => {
    const closedProject = { ...project, status: 'CLOSED', dueState: 'CLOSED' }
    const readyRepository = { ...repository, reviewStatus: 'READY_FOR_REVIEW' }
    const draft = { ...releasedFeedback, feedbackId: 'draft-1', feedbackText: 'Optional release.', status: 'DRAFT', releasedAt: null }
    const api = baseApi({
      listMembers: vi.fn().mockResolvedValue({ data: [{ ...ownerMember, userStatus: 'ACTIVE', joinedAt: ownerMember.updatedAt, lastActivatedAt: ownerMember.updatedAt }, { ...teammate, userStatus: 'ACTIVE', lastActivatedAt: teammate.updatedAt }] }),
      listFeedback: vi.fn().mockResolvedValue({ data: [draft] }),
      transitionMember: vi.fn().mockResolvedValue({ data: { ...teammate, membershipStatus: 'REMOVED', userStatus: 'ACTIVE', updatedAt: '2026-08-03T00:00:00.000Z' } }),
      revokeInvitation: vi.fn().mockResolvedValue({ data: { ...invitation, status: 'REVOKED', revokedAt: '2026-08-03T00:00:00.000Z' } }),
      approveRepository: vi.fn().mockResolvedValue({ data: { ...readyRepository, reviewStatus: 'APPROVED', updatedAt: '2026-08-04T00:00:00.000Z' } }),
    })
    render(<RepositoryCollaborationPanel role="instructor" owner={false} repository={readyRepository} project={closedProject} api={api} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    expect(await screen.findByText(/approval remains available/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Corrective reason'), { target: { value: 'Correct team membership after cutoff.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(api.transitionMember).toHaveBeenCalledWith('repo-1', 'member-2', expect.objectContaining({ reason: 'Correct team membership after cutoff.' })))
    fireEvent.change(screen.getByLabelText('Corrective invitation reason'), { target: { value: 'Resolve an obsolete pending invitation.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(api.revokeInvitation).toHaveBeenCalledWith('invite-1', { reason: 'Resolve an obsolete pending invitation.' }))
    fireEvent.click(screen.getByLabelText('Release selected draft on approval'))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Repository' }))
    await waitFor(() => expect(api.approveRepository).toHaveBeenCalledWith('repo-1', expect.objectContaining({ feedbackId: 'draft-1', expectedFeedbackUpdatedAt: draft.updatedAt })))
  })

  it('preserves unsent feedback after a stale conflict and uses authoritative lifecycle versions', async () => {
    const draft = { ...releasedFeedback, feedbackId: 'draft-1', feedbackText: 'Server draft.', status: 'DRAFT', releasedAt: null }
    const api = baseApi({
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
      listFeedback: vi.fn().mockResolvedValue({ data: [draft] }),
      updateFeedbackDraft: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'STALE_REPOSITORY_VERSION', message: 'Changed.' })),
      archiveRepository: vi.fn().mockResolvedValue({ data: { ...repository, status: 'ARCHIVED', archivedAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' } }),
    })
    render(<RepositoryCollaborationPanel role="instructor" owner={false} repository={repository} project={project} api={api} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    const textarea = await screen.findByLabelText('Feedback draft')
    fireEvent.change(textarea, { target: { value: 'Unsent local revision.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(await screen.findByText(/unsent text remains/i)).toBeInTheDocument()
    expect(textarea).toHaveValue('Unsent local revision.')

    const lifecycleChange = vi.fn()
    render(<RepositoryLifecyclePanel role="instructor" owner={false} repository={repository} api={api} onRepositoryChange={lifecycleChange} onReloadRepository={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Archive Repository' }))
    await waitFor(() => expect(api.archiveRepository).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: repository.updatedAt }))
    expect(lifecycleChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'ARCHIVED', updatedAt: '2026-08-04T00:00:00.000Z' }))
  })

  it('restores an archived personal repository only for its student owner', async () => {
    const archivedPersonal = { ...repository, repositoryType: 'PERSONAL', projectTaskId: null, teamId: null, visibility: 'PRIVATE', status: 'ARCHIVED', archivedAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' }
    const restored = { ...archivedPersonal, status: 'ACTIVE', archivedAt: null, updatedAt: '2026-08-10T00:00:00.000Z' }
    const api = { restoreRepository: vi.fn().mockResolvedValue({ data: restored }) }
    const onRepositoryChange = vi.fn()
    render(<RepositoryLifecyclePanel role="student" owner repository={archivedPersonal} api={api} onRepositoryChange={onRepositoryChange} onReloadRepository={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Restore Repository' }))
    await waitFor(() => expect(api.restoreRepository).toHaveBeenCalledWith('repo-1', { expectedUpdatedAt: archivedPersonal.updatedAt }))
    expect(onRepositoryChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE', updatedAt: restored.updatedAt }))
  })

  it('shows a safe backend archive-blocker error without fabricating success', async () => {
    const api = { archiveRepository: vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'REPOSITORY_ARCHIVE_BLOCKED', message: 'Resolve active review work before archiving.' })) }
    render(<RepositoryLifecyclePanel role="instructor" owner={false} repository={repository} api={api} onRepositoryChange={vi.fn()} onReloadRepository={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Archive Repository' }))
    expect(await screen.findByText('Resolve active review work before archiving.')).toBeInTheDocument()
  })
})
