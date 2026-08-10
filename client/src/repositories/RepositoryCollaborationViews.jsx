import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { formatProjectDate } from '../projects/project-projections.js'
import {
  formatRepositoryLabel,
  instructorRepositoryFeedbackProjection,
  instructorRepositoryMemberProjection,
  repositoryInvitationProjection,
  repositoryProjection,
  studentRepositoryFeedbackProjection,
  studentRepositoryMemberProjection,
} from './repository-projections.js'

function contextError(message = 'The returned collaboration record does not match this repository.') {
  return new ApiError({ status: 404, code: 'REPOSITORY_NOT_FOUND', message })
}

function invitationMatches(invitation, repositoryId) {
  return invitation.invitationId && invitation.repositoryId === repositoryId
}

function feedbackMatches(feedback, repositoryId) {
  return feedback?.feedbackId && feedback.repositoryId === repositoryId
}

function invitationLabel(invitation) {
  return formatRepositoryLabel(invitation.status)
}

export function StudentInvitationInbox({ api }) {
  const [state, setState] = useState({ status: 'loading', invitations: [], repositories: {}, error: null })
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const response = await api.listReceivedInvitations({ signal })
      const invitations = response.data.map(repositoryInvitationProjection)
      if (invitations.some((item) => !item.invitationId || !item.repositoryId || !item.projectTaskId)) throw contextError('A repository invitation returned an invalid identity.')
      const repositoryIds = [...new Set(invitations.map((item) => item.repositoryId))]
      const details = await Promise.allSettled(repositoryIds.map((id) => api.getRepository(id, { signal })))
      if (signal?.aborted) return
      const repositories = {}
      details.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const repository = repositoryProjection(result.value.data)
        if (repository.id !== repositoryIds[index]) throw contextError('An invitation repository returned a mismatched identity.')
        repositories[repository.id] = repository
      })
      setState({ status: 'ready', invitations, repositories, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ status: 'error', invitations: [], repositories: {}, error })
    }
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const act = async (invitation, action) => {
    setBusyId(invitation.invitationId); setActionError(null)
    try {
      const response = await api[action](invitation.invitationId)
      const updated = repositoryInvitationProjection(response.data)
      if (updated.invitationId !== invitation.invitationId || updated.repositoryId !== invitation.repositoryId) throw contextError('The invitation response did not match the selected invitation.')
      setState((current) => ({ ...current, invitations: current.invitations.map((item) => item.invitationId === updated.invitationId ? updated : item) }))
    } catch (error) { setActionError(error) } finally { setBusyId(null) }
  }

  if (state.status === 'loading') return <RequestState kind="loading" compact message="Loading repository invitations." />
  if (state.status === 'error') return <RequestState kind="unavailable" compact error={state.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  if (state.invitations.length === 0) return null
  return (
    <section className="student-global-panel repository-invitation-inbox">
      <div className="student-side-card-heading"><div><p>Team Invitations</p><h2>Repository invitations</h2></div><span>{state.invitations.filter((item) => item.status === 'PENDING').length} pending</span></div>
      <div className="repository-invitation-list">
        {state.invitations.map((invitation) => {
          const repository = state.repositories[invitation.repositoryId]
          return (
            <article key={invitation.invitationId}>
              <div><strong>{repository?.repositoryName || 'Repository record unavailable'}</strong><span>Invited by {invitation.invitedBy.fullName || 'an authorized team owner'}</span><small>Expires {formatProjectDate(invitation.expiresAt)}</small></div>
              <em>{invitationLabel(invitation)}</em>
              <div className="repository-inline-actions">
                {repository && <NavLink className="student-outline-action" to={`/student/repositories/${repository.id}`}>View</NavLink>}
                {invitation.status === 'PENDING' && <><button type="button" className="student-primary-action" disabled={busyId === invitation.invitationId} onClick={() => act(invitation, 'acceptInvitation')}>Accept</button><button type="button" className="student-outline-action" disabled={busyId === invitation.invitationId} onClick={() => act(invitation, 'declineInvitation')}>Decline</button></>}
              </div>
            </article>
          )
        })}
      </div>
      {actionError && <p className="activity-action-error">{describeApiError(actionError)}</p>}
    </section>
  )
}

function MemberList({ role, owner, members, open, corrective, busyId, reasons, setReasons, onTransition }) {
  return (
    <section className="student-repo-card repository-collaboration-card">
      <div className="student-side-card-heading"><h2>Team Members</h2><span>{members.filter((item) => item.membershipStatus !== 'REMOVED').length} active</span></div>
      <div className="repository-member-list">
        {members.map((member) => {
          const mayOwnerManage = role === 'student' && owner && open && member.memberRole !== 'OWNER' && member.updatedAt
          const mayInstructorManage = role === 'instructor' && corrective && member.memberRole !== 'OWNER' && member.updatedAt
          const action = member.membershipStatus === 'REMOVED' ? 'REACTIVATE' : 'REMOVE'
          return (
            <article key={member.memberId}>
              <div><strong>{member.fullName}</strong><span>{formatRepositoryLabel(member.teamRole || member.memberRole)}</span>{role === 'instructor' && <small>{formatRepositoryLabel(member.membershipStatus)} · {formatRepositoryLabel(member.userStatus)}</small>}</div>
              {(mayOwnerManage || mayInstructorManage) && <div className="repository-member-action">{mayInstructorManage && <label>Corrective reason<input value={reasons[member.memberId] || ''} maxLength={2000} onChange={(event) => setReasons((current) => ({ ...current, [member.memberId]: event.target.value }))} /></label>}<button type="button" className="student-outline-action" disabled={busyId === member.memberId || (mayInstructorManage && !reasons[member.memberId]?.trim())} onClick={() => onTransition(member, action, mayInstructorManage ? reasons[member.memberId].trim() : undefined)}>{busyId === member.memberId ? 'Saving…' : formatRepositoryLabel(action)}</button></div>}
            </article>
          )
        })}
      </div>
      {members.length === 0 && <RequestState kind="empty" compact message="No authorized repository members are available." />}
      {owner && <p className="activity-lifecycle-note">The repository owner and team lead cannot be removed. Ownership transfer is not supported.</p>}
    </section>
  )
}

function InvitationManager({ role, owner, open, corrective, repository, project, invitations, members, classApi, api, onInvitations, onError }) {
  const [candidateState, setCandidateState] = useState({ status: 'idle', items: [], pagination: null })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reason, setReason] = useState('')

  const loadCandidates = async (page = 1) => {
    if (!project?.classId || !classApi) return
    setCandidateState((current) => ({ ...current, status: 'loading' }))
    try {
      const response = await classApi.listMembers(project.classId, { page, pageSize: 100 })
      const existing = new Set(members.filter((item) => item.membershipStatus !== 'REMOVED').map((item) => item.userId))
      const items = response.data
        .filter((item) => typeof item.userId === 'string' && typeof item.fullName === 'string' && !existing.has(item.userId) && item.userId !== repository.owner.userId)
        .map((item) => ({ userId: item.userId, fullName: item.fullName }))
      setCandidateState((current) => ({ status: 'ready', items: page === 1 ? items : [...current.items, ...items], pagination: response.pagination }))
    } catch (error) { setCandidateState({ status: 'error', items: [], pagination: null }); onError(error) }
  }

  const invite = async () => {
    if (!selectedUserId) return
    setBusyId('create'); onError(null)
    try {
      const response = await api.createInvitation(repository.id, { inviteeUserId: selectedUserId })
      const invitation = repositoryInvitationProjection(response.data)
      if (!invitationMatches(invitation, repository.id)) throw contextError()
      onInvitations((current) => [...current, invitation])
      setSelectedUserId('')
    } catch (error) { onError(error) } finally { setBusyId(null) }
  }

  const revoke = async (invitation) => {
    setBusyId(invitation.invitationId); onError(null)
    try {
      const response = await api.revokeInvitation(invitation.invitationId, role === 'instructor' ? { reason: reason.trim() } : {})
      const updated = repositoryInvitationProjection(response.data)
      if (updated.invitationId !== invitation.invitationId || !invitationMatches(updated, repository.id)) throw contextError()
      onInvitations((current) => current.map((item) => item.invitationId === updated.invitationId ? updated : item))
      setReason('')
    } catch (error) { onError(error) } finally { setBusyId(null) }
  }

  return (
    <section className="student-repo-card repository-collaboration-card">
      <div className="student-side-card-heading"><h2>Invitations</h2><span>{invitations.filter((item) => item.status === 'PENDING').length} pending</span></div>
      {owner && open && <div className="repository-invite-controls">{candidateState.status === 'idle' && <button type="button" className="student-outline-action" onClick={() => loadCandidates()}>Choose Classmate</button>}{candidateState.status === 'loading' && <span>Loading student-safe roster…</span>}{candidateState.status === 'ready' && <><label>Classmate<select aria-label="Classmate" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}><option value="">Select by name</option>{candidateState.items.map((item) => <option key={item.userId} value={item.userId}>{item.fullName}</option>)}</select></label><button type="button" className="student-primary-action" disabled={!selectedUserId || busyId === 'create'} onClick={invite}>Send Invitation</button>{candidateState.pagination?.hasNextPage && <button type="button" className="student-outline-action" onClick={() => loadCandidates(candidateState.pagination.page + 1)}>Load more classmates</button>}</> }</div>}
      {role === 'instructor' && corrective && invitations.some((item) => item.status === 'PENDING') && <label className="repository-corrective-reason">Corrective invitation reason<input value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} /></label>}
      <div className="repository-invitation-list repository-invitation-list--compact">
        {invitations.map((invitation) => <article key={invitation.invitationId}><div><strong>{invitation.invitee.fullName}</strong><small>Expires {formatProjectDate(invitation.expiresAt)}</small></div><em>{invitationLabel(invitation)}</em>{invitation.status === 'PENDING' && ((owner && open) || (role === 'instructor' && corrective)) && <button type="button" className="student-outline-action" disabled={busyId === invitation.invitationId || (role === 'instructor' && !reason.trim())} onClick={() => revoke(invitation)}>Revoke</button>}</article>)}
      </div>
      {invitations.length === 0 && <p>No repository invitations have been created.</p>}
    </section>
  )
}

function FeedbackPanel({ role, repository, project, feedback, api, onFeedback, onRepository, onError, onRefresh, onReloadRepository }) {
  const drafts = feedback.filter((item) => item.status === 'DRAFT')
  const released = feedback.filter((item) => item.status === 'RELEASED')
  const initialDraft = drafts.at(-1) || null
  const [selectedId, setSelectedId] = useState(initialDraft?.feedbackId || '')
  const selected = drafts.find((item) => item.feedbackId === selectedId) || drafts.at(-1) || null
  const [text, setText] = useState(initialDraft?.feedbackText || '')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [releaseOnApprove, setReleaseOnApprove] = useState(false)
  const [notice, setNotice] = useState('')

  if (role !== 'instructor') {
    return <section className="student-repo-card repository-feedback-card"><h2>Released Feedback</h2>{released.length === 0 ? <p>No instructor feedback has been released.</p> : released.map((item) => <article key={item.feedbackId}><p>{item.feedbackText}</p><small>{item.author.fullName} · {formatProjectDate(item.releasedAt)}</small></article>)}</section>
  }

  const save = async () => {
    if (!text.trim()) return
    setBusy(true); onError(null); setNotice('')
    try {
      const response = selected
        ? await api.updateFeedbackDraft(selected.feedbackId, { expectedUpdatedAt: selected.updatedAt, feedbackText: text.trim() })
        : await api.createFeedbackDraft(repository.id, { feedbackText: text.trim() })
      const updated = instructorRepositoryFeedbackProjection(response.data)
      if (!feedbackMatches(updated, repository.id) || (selected && updated.feedbackId !== selected.feedbackId)) throw contextError()
      onFeedback((current) => selected ? current.map((item) => item.feedbackId === updated.feedbackId ? updated : item) : [...current, updated])
      setSelectedId(updated.feedbackId); setText(updated.feedbackText); setDirty(false); setNotice('Feedback draft saved.')
    } catch (error) {
      onError(error)
      if (error?.status === 409) {
        await onRefresh()
        setNotice('The feedback changed on the server. Your unsent text remains here; review the current draft and retry deliberately.')
      }
    } finally { setBusy(false) }
  }

  const review = async (action) => {
    setBusy(true); onError(null); setNotice('')
    try {
      const input = { expectedUpdatedAt: repository.updatedAt }
      if (action === 'requestChanges') {
        input.feedbackId = selected.feedbackId
        input.expectedFeedbackUpdatedAt = selected.updatedAt
      } else if (releaseOnApprove && selected) {
        input.feedbackId = selected.feedbackId
        input.expectedFeedbackUpdatedAt = selected.updatedAt
      }
      const response = await api[action](repository.id, input)
      const updated = repositoryProjection(response.data)
      if (updated.id !== repository.id) throw contextError()
      onRepository(updated)
      setDirty(false); setNotice(action === 'requestChanges' ? 'Changes requested and feedback released.' : 'Repository approved.')
    } catch (error) {
      onError(error)
      if (error?.status === 409) {
        await Promise.all([onReloadRepository(), onRefresh()])
        setNotice('The repository review changed on the server. Authoritative versions were reloaded; retry deliberately.')
      }
    } finally { setBusy(false) }
  }

  const open = project?.status === 'PUBLISHED' && project?.dueState === 'OPEN'
  const ready = repository.reviewStatus === 'READY_FOR_REVIEW' && repository.status === 'ACTIVE'
  const editable = repository.status === 'ACTIVE' && project?.status !== 'ARCHIVED'
  return (
    <section className="student-repo-card repository-feedback-card">
      <div className="student-side-card-heading"><h2>Instructor Review</h2><span>{formatRepositoryLabel(repository.reviewStatus)}</span></div>
      {drafts.length > 1 && <label>Draft<select value={selected?.feedbackId || ''} onChange={(event) => { const next = drafts.find((item) => item.feedbackId === event.target.value); setSelectedId(event.target.value); setText(next?.feedbackText || ''); setDirty(false) }}>{drafts.map((item, index) => <option key={item.feedbackId} value={item.feedbackId}>Draft {index + 1}</option>)}</select></label>}
      <label>Feedback draft<textarea value={text} maxLength={20000} disabled={!editable} onChange={(event) => { setText(event.target.value); setDirty(true) }} /></label>
      <button type="button" className="student-outline-action" disabled={!editable || busy || !text.trim() || (selected && !dirty)} onClick={save}>{selected ? 'Save Draft' : 'Create Draft'}</button>
      {ready && <div className="repository-review-actions"><button type="button" className="student-outline-action" disabled={busy || !open || !selected || dirty} onClick={() => review('requestChanges')}>Request Changes</button><label><input type="checkbox" checked={releaseOnApprove} disabled={!selected || dirty} onChange={(event) => setReleaseOnApprove(event.target.checked)} /> Release selected draft on approval</label><button type="button" className="student-primary-action" disabled={busy || (releaseOnApprove && (!selected || dirty))} onClick={() => review('approveRepository')}>Approve Repository</button></div>}
      {!open && ready && <p className="activity-lifecycle-note">The project is past cutoff or closed. Approval remains available, but requesting changes is not.</p>}
      {!editable && <p className="activity-lifecycle-note">Archived repository or project records are read-only.</p>}
      {released.length > 0 && <div className="repository-released-feedback"><h3>Released feedback</h3>{released.map((item) => <article key={item.feedbackId}><p>{item.feedbackText}</p><small>{item.author.fullName} · {formatProjectDate(item.releasedAt)}</small></article>)}</div>}
      {notice && <p className="activity-action-success">{notice}</p>}
    </section>
  )
}

export function RepositoryCollaborationPanel({ role, owner, repository, project, api, classApi, onRepositoryChange, onReloadRepository }) {
  const [state, setState] = useState({ identity: null, status: 'loading', members: [], invitations: [], feedback: [], error: null })
  const [busyMemberId, setBusyMemberId] = useState(null)
  const [reasons, setReasons] = useState({})
  const [actionError, setActionError] = useState(null)
  const open = Boolean(project?.status === 'PUBLISHED' && project?.dueState === 'OPEN' && repository.status === 'ACTIVE')
  const corrective = Boolean(role === 'instructor' && repository.status === 'ACTIVE' && project && !open && ['PUBLISHED', 'CLOSED'].includes(project.status))

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const requests = [api.listMembers(repository.id, { signal }), api.listFeedback(repository.id, { signal })]
      if (owner || role === 'instructor') requests.push(api.listRepositoryInvitations(repository.id, { signal }))
      const [memberResponse, feedbackResponse, invitationResponse] = await Promise.all(requests)
      const members = memberResponse.data.map(role === 'instructor' ? instructorRepositoryMemberProjection : studentRepositoryMemberProjection)
      const feedback = feedbackResponse.data.map(role === 'instructor' ? instructorRepositoryFeedbackProjection : studentRepositoryFeedbackProjection).filter(Boolean)
      const invitations = invitationResponse ? invitationResponse.data.map(repositoryInvitationProjection) : []
      if (invitations.some((item) => !invitationMatches(item, repository.id)) || feedback.some((item) => !feedbackMatches(item, repository.id))) throw contextError()
      setState({ identity: repository.id, status: 'ready', members, invitations, feedback, error: null })
    } catch (error) {
      if (error?.name !== 'AbortError') setState({ identity: repository.id, status: 'error', members: [], invitations: [], feedback: [], error })
    }
  }, [api, owner, repository.id, role])

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load({ signal: controller.signal }))
    return () => controller.abort()
  }, [load])

  const current = state.identity === repository.id ? state : { ...state, status: 'loading', members: [], invitations: [], feedback: [] }
  const transitionMember = async (member, action, reason) => {
    setBusyMemberId(member.memberId); setActionError(null)
    try {
      const response = await api.transitionMember(repository.id, member.memberId, { action, expectedUpdatedAt: member.updatedAt, ...(reason ? { reason } : {}) })
      const updated = (role === 'instructor' ? instructorRepositoryMemberProjection : studentRepositoryMemberProjection)(response.data)
      if (updated.memberId !== member.memberId) throw contextError('The member response did not match the selected member.')
      setState((value) => ({ ...value, members: value.members.map((item) => item.memberId === updated.memberId ? updated : item) }))
      setReasons((value) => ({ ...value, [member.memberId]: '' }))
    } catch (error) {
      setActionError(error)
      if (error?.status === 409) await load()
    } finally { setBusyMemberId(null) }
  }

  const submitForReview = async () => {
    setActionError(null)
    try {
      const response = await api.readyForReview(repository.id, { expectedUpdatedAt: repository.updatedAt })
      const updated = repositoryProjection(response.data)
      if (updated.id !== repository.id) throw contextError()
      onRepositoryChange(updated)
    } catch (error) {
      setActionError(error)
      if (error?.status === 409) await onReloadRepository()
    }
  }

  if (current.status === 'loading') return <RequestState kind="loading" compact message="Loading collaboration and review records." />
  if (current.status === 'error') return <RequestState kind="unavailable" compact error={current.error} action={<button type="button" className="student-outline-action" onClick={() => load()}>Try again</button>} />
  const maySubmit = role === 'student' && owner && open && ['WORKING', 'CHANGES_REQUESTED'].includes(repository.reviewStatus)
  return (
    <div className="repository-collaboration-stack">
      <MemberList role={role} owner={owner} members={current.members} open={open} corrective={corrective} busyId={busyMemberId} reasons={reasons} setReasons={setReasons} onTransition={transitionMember} />
      {repository.repositoryType === 'CLASS_PROJECT' && (owner || role === 'instructor') && <InvitationManager role={role} owner={owner} open={open} corrective={corrective} repository={repository} project={project} invitations={current.invitations} members={current.members} classApi={classApi} api={api} onInvitations={(updater) => setState((value) => ({ ...value, invitations: updater(value.invitations) }))} onError={setActionError} />}
      {maySubmit && <section className="student-repo-card repository-review-submit"><h2>{repository.reviewStatus === 'CHANGES_REQUESTED' ? 'Resubmit for Review' : 'Submit for Review'}</h2><p>This submits the current repository metadata for instructor review. It does not fabricate Git activity.</p><button type="button" className="student-primary-action" onClick={submitForReview}>{repository.reviewStatus === 'CHANGES_REQUESTED' ? 'Resubmit Repository' : 'Mark Ready for Review'}</button></section>}
      {repository.repositoryType === 'CLASS_PROJECT' && <FeedbackPanel role={role} repository={repository} project={project} feedback={current.feedback} api={api} onFeedback={(updater) => setState((value) => ({ ...value, feedback: updater(value.feedback) }))} onRepository={(updated) => { onRepositoryChange(updated); load() }} onError={setActionError} onRefresh={load} onReloadRepository={onReloadRepository} />}
      {actionError && <p className="activity-action-error">{describeApiError(actionError)}</p>}
    </div>
  )
}

export function RepositoryLifecyclePanel({ role, owner, repository, api, onRepositoryChange, onReloadRepository }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const authorized = repository.repositoryType === 'PERSONAL' ? role === 'student' && owner : role === 'instructor'
  const action = repository.status === 'ARCHIVED' ? 'restoreRepository' : 'archiveRepository'
  const label = repository.status === 'ARCHIVED' ? 'Restore Repository' : 'Archive Repository'
  if (!authorized || !['ACTIVE', 'ARCHIVED'].includes(repository.status)) return null
  const mutate = async () => {
    setBusy(true); setError(null)
    try {
      const response = await api[action](repository.id, { expectedUpdatedAt: repository.updatedAt })
      const updated = repositoryProjection(response.data)
      if (updated.id !== repository.id) throw contextError()
      onRepositoryChange(updated)
    } catch (mutationError) {
      setError(mutationError)
      if (mutationError?.status === 409) await onReloadRepository()
    } finally { setBusy(false) }
  }
  return <section className="student-repo-card repository-lifecycle-card"><h2>Repository Lifecycle</h2><p>{repository.repositoryType === 'CLASS_PROJECT' ? 'Class-project archives require approved review work, resolved invitations, and synchronized membership.' : 'Archived personal repositories remain preserved and read-only until restored.'}</p><button type="button" className="student-outline-action" disabled={busy} onClick={mutate}>{busy ? 'Saving…' : label}</button>{error && <p className="activity-action-error">{describeApiError(error)}</p>}</section>
}
