import { useCallback, useEffect, useRef, useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import { formatProjectDate } from '../projects/project-projections.js'
import { formatRepositoryLabel, repositoryInvitationProjection } from './repository-projections.js'
import { GroupDialog } from './GroupDialog.jsx'
import { ProjexIcon } from '../design/ProjexIcon.jsx'

function pendingInvitation(item) { return item.status === 'PENDING' && Date.parse(item.expiresAt) > Date.now() }

function InviteMemberDialog({ repository, project, members, invitations, classApi, api, onRefresh, onClose, onSuccess }) {
  const [roster, setRoster] = useState({ status: 'loading', items: [], pagination: null })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const alive = useRef(true)
  const request = useRef(null)
  const lock = useRef(false)
  const classId = project?.classId
  const load = useCallback(async (page = 1) => {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setRoster((current) => ({ ...current, status: 'loading' })); setError(null)
    try {
      if (!classId || !classApi) throw new Error('Class roster unavailable.')
      const response = await classApi.listMembers(classId, { page, pageSize: 100 }, { signal: controller.signal })
      const items = response.data.filter((item) => typeof item.userId === 'string' && typeof item.fullName === 'string').map(({ userId, fullName }) => ({ userId, fullName }))
      if (!controller.signal.aborted && alive.current) setRoster((current) => ({ status: 'ready', items: [...new Map([...(page === 1 ? [] : current.items), ...items].map((item) => [item.userId, item])).values()], pagination: response.pagination }))
    } catch (failure) { if (!controller.signal.aborted && alive.current) { setRoster((current) => ({ ...current, status: 'error' })); setError(failure) } }
  }, [classApi, classId])
  useEffect(() => {
    alive.current = true
    // This component is mounted only for one explicit modal opening.
    Promise.resolve().then(() => { if (alive.current) load() })
    return () => { alive.current = false; request.current?.abort() }
  }, [load])
  const excluded = new Set([repository.owner.userId, ...members.filter((item) => item.membershipStatus !== 'REMOVED').map((item) => item.userId), ...invitations.filter(pendingInvitation).map((item) => item.invitee.userId)])
  const candidates = roster.items.filter((item) => !excluded.has(item.userId))
  const displayed = candidates.filter((item) => item.fullName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const send = async (event) => {
    event.preventDefault()
    if (lock.current || !candidates.some((item) => item.userId === selected)) return
    lock.current = true; setBusy(true); setError(null)
    try {
      const response = await api.createInvitation(repository.id, { inviteeUserId: selected })
      const result = repositoryInvitationProjection(response.data)
      if (!result.invitationId || result.repositoryId !== repository.id || result.projectTaskId !== repository.projectTaskId || result.invitee.userId !== selected) throw new Error('Invitation response did not match this group.')
      await onRefresh()
      if (alive.current) { onSuccess('Invitation sent.'); onClose() }
    } catch (failure) { await onRefresh(); if (alive.current) { setError(failure); setSelected('') } }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <GroupDialog title="Invite Member" busy={busy} onClose={onClose}><form onSubmit={send}>
    <label>Search loaded classmates<input name="classmateSearch" autoComplete="off" maxLength={200} value={search} onChange={(event) => { setSearch(event.target.value); setSelected('') }} /></label>
    <p className="group-help">Eligibility and available places are checked when you invite.</p>
    <div className="group-candidate-list" role="group" aria-label="Loaded classmates">{displayed.map((item) => <label key={item.userId}><input type="radio" name="invitee" value={item.userId} disabled={busy} checked={selected === item.userId} onChange={() => setSelected(item.userId)} /><span>{item.fullName}</span></label>)}</div>
    {roster.status === 'loading' && <p role="status">Loading classmates…</p>}
    {roster.status === 'ready' && !displayed.length && <p>No matching classmates in the loaded results.</p>}
    {roster.status === 'error' && <button type="button" onClick={() => load(roster.pagination?.hasNextPage ? roster.pagination.page + 1 : 1)}>Retry classmates</button>}
    {roster.pagination?.hasNextPage && <button type="button" disabled={busy || roster.status === 'loading'} onClick={() => load(roster.pagination.page + 1)}>Load more classmates</button>}
    {error && <p role="alert" className="activity-action-error">{describeApiError(error)}</p>}
    <footer><button type="button" className="student-outline-action" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="student-primary-action" disabled={busy || !selected}>{busy ? 'Inviting…' : 'Send Invitation'}</button></footer>
  </form></GroupDialog>
}

export function GroupMembersView({ role, owner, repository, project, members, invitations, permissions, teachingStaff = [], classApi, api, busyId, reasons, setReasons, onTransition, onRefresh, onInteractionChange }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  useEffect(() => { onInteractionChange?.(inviteOpen || !!confirmation); return () => onInteractionChange?.(false) }, [inviteOpen, confirmation, onInteractionChange])
  const [notice, setNotice] = useState('')
  const [reason, setReason] = useState('')
  const [revoking, setRevoking] = useState(null)
  const [error, setError] = useState(null)
  const active = members.filter((item) => item.membershipStatus !== 'REMOVED')
  const removed = members.filter((item) => item.membershipStatus === 'REMOVED')
  const pending = invitations.filter(pendingInvitation)
  const history = invitations.filter((item) => !pendingInvitation(item))
  const limit = project?.maxTeamSize
  const remaining = Number.isInteger(limit) ? Math.max(0, limit - active.length - pending.length) : null
  const invitationVisible = owner || role === 'instructor'
  const corrective = role === 'instructor' && permissions.canManageMembers
  const revoke = async (invitation) => {
    setRevoking(invitation.invitationId); setError(null)
    try {
      const response = await api.revokeInvitation(invitation.invitationId, role === 'instructor' ? { reason: reason.trim() } : {})
      if (response.data.invitationId !== invitation.invitationId || response.data.repositoryId !== repository.id) throw new Error('Invitation response did not match this group.')
      await onRefresh(); setReason(''); setNotice('Invitation revoked.')
    } catch (failure) { setError(failure); await onRefresh() }
    finally { setRevoking(null) }
  }
  const rows = (items) => items.map((member) => {
    const manageable = permissions.canManageMembers && member.memberRole !== 'OWNER' && member.updatedAt
    const action = member.membershipStatus === 'REMOVED' ? 'REACTIVATE' : 'REMOVE'
    return <li className="group-member-row" key={member.memberId}><span className="group-avatar" aria-hidden="true">{member.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{member.fullName}</strong><small>{member.membershipStatus === 'REMOVED' ? 'Removed' : 'Active'}{role === 'instructor' && member.userStatus ? ` · ${formatRepositoryLabel(member.userStatus)}` : ''}</small></div><span className="group-role">{member.memberRole === 'OWNER' ? 'Maintainer' : 'Developer'}</span>{manageable && <div className="group-member-action">{corrective && <label>Corrective reason<input maxLength={2000} value={reasons[member.memberId] || ''} onChange={(event) => setReasons((current) => ({ ...current, [member.memberId]: event.target.value }))} /></label>}<button type="button" disabled={busyId === member.memberId || (corrective && !reasons[member.memberId]?.trim())} onClick={() => action === 'REMOVE' ? setConfirmation({ member, action, reason: corrective ? reasons[member.memberId].trim() : undefined }) : onTransition(member, action, corrective ? reasons[member.memberId].trim() : undefined)}>{busyId === member.memberId ? 'Saving…' : formatRepositoryLabel(action)}</button></div>}</li>
  })
  return <section className="group-members"><header><h2>Members</h2>{permissions.canInviteMembers && <button type="button" className="student-primary-action" disabled={remaining === 0} onClick={() => setInviteOpen(true)}><ProjexIcon name="invitation" size={16} /> Invite Member</button>}</header>
    <div className="group-capacity" aria-label="Group capacity"><span>{active.length}{Number.isInteger(limit) ? `/${limit}` : ''} members</span>{invitationVisible && <><span title="Pending invitations reserve places">{pending.length} pending</span>{remaining !== null && <span>{remaining} {remaining === 1 ? 'slot' : 'slots'} available</span>}</>}</div>
    <ul className="group-member-list">{rows(active)}</ul>
    {removed.length > 0 && <details><summary>Removed members · {removed.length}</summary><ul className="group-member-list">{rows(removed)}</ul></details>}
    {teachingStaff.length > 0 && <section aria-label="Teaching staff"><h3>Teaching staff</h3><ul className="group-member-list">{teachingStaff.map((person) => <li className="group-member-row" key={person.userId}><div><strong>{person.fullName}</strong><small>{person.role === 'CO_INSTRUCTOR' ? 'Co-Instructor' : 'Instructor'}</small></div><span className="group-role">Git read-only</span></li>)}</ul></section>}
    {invitationVisible && <><h3>Pending invitations · {pending.length}</h3>{corrective && pending.length > 0 && <label>Corrective invitation reason<input maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
      <ul className="group-pending-list">{pending.map((invitation) => <li key={invitation.invitationId}><div><strong>{invitation.invitee.fullName}</strong><small>Expires {formatProjectDate(invitation.expiresAt)}</small></div>{(permissions.canInviteMembers || corrective) && <button type="button" disabled={!!revoking || (role === 'instructor' && !reason.trim())} onClick={() => setConfirmation({ invitation })}>Revoke</button>}</li>)}</ul>
      <details><summary>Invitation History · {history.length}</summary><ul className="group-pending-list">{history.map((invitation) => <li key={invitation.invitationId}><strong>{invitation.invitee.fullName}</strong><span>{formatRepositoryLabel(invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status)}</span></li>)}</ul></details>
    </>}
    {notice && <p role="status" className="activity-action-success">{notice}</p>}{error && <p role="alert" className="activity-action-error">{describeApiError(error)}</p>}
    {inviteOpen && permissions.canInviteMembers && <InviteMemberDialog repository={repository} project={project} members={members} invitations={invitations} api={api} classApi={classApi} onRefresh={onRefresh} onClose={() => setInviteOpen(false)} onSuccess={setNotice} />}
    {confirmation && <GroupDialog title={confirmation.member ? 'Remove Member' : 'Revoke Invitation'} busy={!!busyId || !!revoking} onClose={() => setConfirmation(null)}><p>{confirmation.member ? `Remove repository access for ${confirmation.member.fullName}? Existing work stays preserved.` : `Revoke the pending invitation for ${confirmation.invitation.invitee.fullName}?`}</p><footer><button type="button" disabled={!!busyId || !!revoking} onClick={() => setConfirmation(null)}>Cancel</button><button type="button" disabled={!!busyId || !!revoking} onClick={async () => { if (confirmation.member) await onTransition(confirmation.member, confirmation.action, confirmation.reason); else await revoke(confirmation.invitation); setConfirmation(null) }}>Confirm {confirmation.member ? 'Remove' : 'Revoke'}</button></footer></GroupDialog>}
  </section>
}
