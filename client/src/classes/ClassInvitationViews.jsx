import useAutomaticRefresh from '../components/useAutomaticRefresh.js'
import useConfirmation from '../components/useConfirmation.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import RequestState from '../components/RequestState.jsx'
import { useClasses } from './class-context.js'

function InvitationIdentity({ invitation }) {
  return (
    <div>
      <strong>{invitation.class.className}</strong>
      <span>{invitation.class.section}</span>
      <small>Instructor: {invitation.class.instructor.fullName}</small>
    </div>
  )
}

export function StudentClassInvitationPanel({ preview = false, autoRefresh = false, onPendingChange, onBusyChange, onActionSettled }) {
  const [confirm, confirmation] = useConfirmation()
  const { api, upsertClass } = useClasses()
  const pageSize = preview ? 3 : 100
  const [state, setState] = useState({
    status: 'loading',
    invitations: [],
    pagination: null,
    error: null,
  })
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const generation = useRef({ value: 0 })
  const reading = useRef(false)

  const load = useCallback(async (page = 1, signal) => {
    const ticket = ++generation.current.value
    reading.current = true
    try {
      const response = await api.listMyClassInvitations({ page, pageSize }, signal ? { signal } : undefined)
      if (signal?.aborted || ticket !== generation.current.value) return
      setState(current => ({ status: 'ready', invitations: page === 1 ? response.data : [...current.invitations, ...response.data], pagination: response.pagination, error: null }))
    } finally { if (ticket === generation.current.value) reading.current = false }
  }, [api, pageSize])

  useEffect(() => {
    const controller = new AbortController()
    const sequence = generation.current
    load(1, controller.signal).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError') setState({ status: 'error', invitations: [], pagination: null, error })
    })
    return () => { controller.abort(); sequence.value++; reading.current = false }
  }, [load])
  useEffect(() => { if (state.status === 'ready' && state.pagination) onPendingChange?.(state.pagination.totalItems) }, [state.status, state.pagination, onPendingChange])
  useEffect(() => { onBusyChange?.(busyId !== null) }, [busyId, onBusyChange])
  useAutomaticRefresh(() => {
    if (reading.current) return
    load(1).catch(error => setState(current => ({ ...current, status: 'error', error })))
  }, { enabled: autoRefresh && busyId === null && state.status !== 'loading' && (state.pagination?.page ?? 1) === 1 })

  const removeInvitation = (invitationId) => {
    generation.current.value++; reading.current = false
    setState((current) => ({
      ...current,
      invitations: current.invitations.filter(
        (invitation) => invitation.invitationId !== invitationId,
      ),
      pagination: current.pagination
        ? {
            ...current.pagination,
            totalItems: Math.max(0, current.pagination.totalItems - 1),
          }
        : current.pagination,
    }))
  }

  const accept = async (invitation) => {
    generation.current.value++; reading.current = false
    setBusyId(invitation.invitationId)
    setNotice('')
    try {
      const response = await api.acceptClassInvitation(invitation.invitationId)
      upsertClass(response.data.class)
      if (preview) await load(1)
      else removeInvitation(invitation.invitationId)
      setNotice(`Joined ${response.data.class.className}.`)
    } catch (error) {
      setNotice(describeApiError(error))
    } finally {
      setBusyId(null)
      onActionSettled?.()
    }
  }

  const decline = async (invitation) => {
    if (!await confirm(`Decline invitation to ${invitation.class.className}?`, 'Decline invitation')) return
    generation.current.value++; reading.current = false
    setBusyId(invitation.invitationId)
    setNotice('')
    try {
      await api.declineClassInvitation(invitation.invitationId)
      if (preview) await load(1)
      else removeInvitation(invitation.invitationId)
      setNotice(`Invitation to ${invitation.class.className} declined.`)
    } catch (error) {
      setNotice(describeApiError(error))
    } finally {
      setBusyId(null)
      onActionSettled?.()
    }
  }

  if (preview && state.status === 'ready' && state.invitations.length === 0) {
    return null
  }

  return (
    <section className={preview ? 'student-home-classes student-home-classes-panel class-invitation-panel' : 'student-global-panel class-invitation-panel'}>
      <div className="student-home-section-heading">
        <h2>Class Invitations</h2>
        {state.pagination && <span>{state.pagination.totalItems} pending</span>}
      </div>
      {notice && <p className="student-joined-state" role="status">{notice}</p>}
      {state.status === 'loading' && <RequestState kind="loading" compact message="Loading class invitations." />}
      {state.status === 'error' && <RequestState kind="unavailable" compact error={state.error} action={<button type="button" className="student-outline-action" onClick={() => load(1).catch(error => setState(current => ({ ...current, status: 'error', error })))}>Try again</button>} />}
      {!preview && state.status === 'ready' && state.invitations.length === 0 && (
        <RequestState kind="empty" compact message="You have no pending class invitations." />
      )}
      <div className="student-invitation-list">
        {state.invitations.map((invitation) => (
          <article className="student-invitation-card" key={invitation.invitationId}>
            <span className="student-class-dot" aria-hidden="true">
              {invitation.class.className.charAt(0).toUpperCase()}
            </span>
            <InvitationIdentity invitation={invitation} />
            <em>Pending</em>
            <div className="student-invitation-actions">
              <button
                type="button"
                className="student-outline-action"
                disabled={busyId !== null}
                onClick={() => decline(invitation)}
              >
                Decline
              </button>
              <button
                type="button"
                className="student-primary-action"
                disabled={busyId !== null}
                onClick={() => accept(invitation)}
              >
                {busyId === invitation.invitationId ? 'Working…' : 'Join Class'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {preview && (state.pagination?.totalItems ?? 0) > 3 && (
        <NavLink className="class-invitation-view-all" to="/student/invitations">
          View all {state.pagination.totalItems} invitations
        </NavLink>
      )}
      {!preview && state.pagination?.hasNextPage && (
        <button
          type="button"
          className="student-outline-action class-load-more"
          onClick={() => load(state.pagination.page + 1)}
        >
          Load more invitations
        </button>
      )}
      {confirmation}
    </section>
  )
}

export function InstructorClassInvitationPanel({ embedded = false, onBusyChange } = {}) {
  const { api, selectedClass } = useClasses()
  const [email, setEmail] = useState('')
  const [lookup, setLookup] = useState({ status: 'idle', data: null, error: null })
  const [list, setList] = useState({ status: 'loading', invitations: [], pagination: null, error: null })
  const [busy, setBusy] = useState(false)
  const classId = selectedClass?.id
  useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])

  const load = useCallback(async (page = 1, signal) => {
    if (!classId || selectedClass?.status !== 'ACTIVE') return
    const response = await api.listClassInvitations(
      classId,
      { page, pageSize: 100 },
      signal ? { signal } : undefined,
    )
    setList((current) => ({
      status: 'ready',
      invitations: page === 1
        ? response.data
        : [...current.invitations, ...response.data],
      pagination: response.pagination,
      error: null,
    }))
  }, [api, classId, selectedClass?.status])

  useEffect(() => {
    if (!classId || selectedClass?.status !== 'ACTIVE') return undefined
    const controller = new AbortController()
    api.listClassInvitations(
      classId,
      { page: 1, pageSize: 100 },
      { signal: controller.signal },
    )
      .then((response) => setList({
        status: 'ready',
        invitations: response.data,
        pagination: response.pagination,
        error: null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setList({ status: 'error', invitations: [], pagination: null, error })
        }
      })
    return () => controller.abort()
  }, [api, classId, selectedClass?.status])

  useEffect(() => {
    const normalized = email.trim().toLowerCase()
    if (!classId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return undefined
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(async () => {
      setLookup({ status: 'loading', data: null, error: null })
      try {
        const response = await api.lookupInvitationStudent(normalized, classId, { signal: controller.signal })
        if (active) setLookup({ status: 'ready', data: response.data, error: null })
      } catch (error) {
        if (active && error.name !== 'AbortError') setLookup({ status: 'error', data: null, error })
      }
    }, 450)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [api, classId, email])

  const sendInvitation = async () => {
    if (!classId || lookup.data?.eligibility !== 'ELIGIBLE') return
    setBusy(true)
    try {
      await api.createClassInvitation(classId, email)
      setEmail('')
      setLookup({ status: 'sent', data: null, error: null })
      await load(1)
    } catch (error) {
      setLookup({ status: 'error', data: null, error })
    } finally {
      setBusy(false)
    }
  }

  if (!selectedClass) return null
  if (selectedClass.status !== 'ACTIVE') {
    return <RequestState kind="unavailable" compact message="Archived classes cannot create or respond to invitations." />
  }

  const eligibilityMessage = lookup.data?.eligibility === 'NOT_FOUND'
    ? 'No registered active Student found.'
    : lookup.data?.eligibility === 'ALREADY_MEMBER'
      ? 'This Student is already an active member.'
      : lookup.data?.eligibility === 'ALREADY_PENDING'
        ? 'An invitation is already pending.'
        : lookup.data?.eligibility === 'ELIGIBLE'
          ? `${lookup.data.student.fullName} found.${lookup.data.willReactivate ? ' Acceptance will reactivate the removed membership.' : ''}`
          : ''

  return (
    <section className="instructor-invitation-panel">
      {!embedded && <div className="student-panel-heading">
        <div>
          <h2>Invite Students</h2>
          <p>Invite an existing registered Student using their university email.</p>
        </div>
        {list.pagination && <span>{list.pagination.totalItems} pending</span>}
      </div>}
      <form className="class-invitation-lookup" onSubmit={event => { event.preventDefault(); if (!busy) sendInvitation() }}>
        <label>
          University email
          <input
            type="email"
            value={email}
            disabled={busy}
            onChange={(event) => {
              setEmail(event.target.value)
              setLookup({ status: 'idle', data: null, error: null })
            }}
            placeholder="2216146@slu.edu.ph"
            autoComplete="off"
            required
          />
        </label>
        <button
          type="button"
          className="student-primary-action"
          disabled={busy || lookup.data?.eligibility !== 'ELIGIBLE'}
          onClick={sendInvitation}
        >
          Invite
        </button>
      </form>
      {lookup.status === 'loading' && <p role="status">Checking Student…</p>}
      {eligibilityMessage && <p className="instructor-people-action-status" role="status">{eligibilityMessage}</p>}
      {lookup.status === 'sent' && <p className="instructor-people-action-status" role="status">Invitation created.</p>}
      {lookup.status === 'error' && <p className="class-form-error" role="alert">{describeApiError(lookup.error)}</p>}
      {list.status === 'loading' && <RequestState kind="loading" compact message="Loading pending invitations." />}
      {list.status === 'error' && <RequestState kind="unavailable" compact error={list.error} />}
      {list.status === 'ready' && list.invitations.length === 0 && (embedded ? <p className="academic-invite-empty">No pending invitations.</p> : <RequestState kind="empty" compact message="No invitations are currently pending." />)}
      {list.invitations.length > 0 && (
        <div className="instructor-data-table instructor-invitation-table" role="table" aria-label="Pending invitations">
          <div className="instructor-table-row instructor-table-row--head" role="row">
            <span>Student</span>
            <span>University email</span>
            <span>Invited</span>
            <span>Status</span>
          </div>
          {list.invitations.map((invitation) => (
            <div className="instructor-table-row" role="row" key={invitation.invitationId}>
              <strong>{invitation.invitee.fullName}</strong>
              <span>{invitation.invitee.universityEmail}</span>
              <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
              <em>Pending</em>
            </div>
          ))}
        </div>
      )}
      {list.pagination?.hasNextPage && (
        <button
          type="button"
          className="student-outline-action class-load-more"
          onClick={() => load(list.pagination.page + 1)}
        >
          Load more invitations
        </button>
      )}
    </section>
  )
}
