import ClassIdentityBadge from '../classes/ClassIdentityBadge.jsx'
import AppDialog from '../components/AppDialog.jsx'
import AcademicEmptyState from '../components/AcademicEmptyState.jsx'
import ClassCardGrid from '../classes/ClassCardGrid.jsx'
import ClassOverviewCard from '../classes/ClassOverviewCard.jsx'
import AccountMenu from '../components/AccountMenu.jsx'
import useConfirmation from '../components/useConfirmation.jsx'
import ProgramField from '../classes/ProgramField.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classOfferingLabel } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { WorkHubList } from '../work-hub/WorkHubViews.jsx'
import { InstructorClassInvitationPanel } from '../classes/ClassInvitationViews.jsx'
import CsvInvitationPanel from '../classes/CsvInvitationPanel.jsx'
import AcademicFields from '../classes/AcademicFields.jsx'
import { ClassStaffPanel, StaffInvitationsPanel } from '../classes/ClassStaffPanel.jsx'
import { InstructorActivityEditor, InstructorActivityList } from '../activities/InstructorActivityViews.jsx'
import {
  InstructorActivityMonitorRedirect,
  InstructorSubmissionQueue,
  InstructorSubmissionReview,
} from '../submissions/InstructorSubmissionViews.jsx'
import {
  InstructorProjectDetail,
  InstructorProjectEditor,
  InstructorProjectList,
} from '../projects/ProjectViews.jsx'
import {
  RepositoryFoundationDetail,
  RepositorySelectionRequired,
} from '../repositories/RepositoryFoundationViews.jsx'

function InstructorUserArea() {
  return (
    <div className="student-user-area instructor-user-area">
      <AccountMenu />
    </div>
  )
}

function InstructorClassHeader({ activeTab }) {
  const { selectedClass } = useClasses()
  const tabs = [
    { label: 'Overview', path: '/instructor/classes', key: 'stream' },
    { label: 'Activities', path: '/instructor/activity', key: 'assignments' },
    { label: 'People', path: '/instructor/people', key: 'people' },
    { label: 'Class Info', path: '/instructor/class-info', key: 'info' },
  ]

  return (
    <header className="student-class-header">
      <div className="student-class-header__top">
        <div className="student-course-title">
          <ClassIdentityBadge className="student-course-avatar" classRecord={selectedClass} />
          <div>
            <h1>{selectedClass?.className || 'Select a class'}</h1>
            <div className="student-course-meta">
              {selectedClass && <span>{classOfferingLabel(selectedClass)}</span>}
              {selectedClass && <span>{selectedClass.status === 'ARCHIVED' ? 'Archived' : 'Active'}</span>}
            </div>
          </div>
        </div>
        <InstructorUserArea />
      </div>

      <div className="student-class-header__bottom">
        <nav className="student-class-tabs" aria-label="Instructor class tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={classHref(tab.path, selectedClass?.id)}
              className={activeTab === tab.key ? 'is-active' : undefined}
            >
              <ProjexIcon name={{ stream: 'preview', assignments: 'activity', people: 'people', info: 'classes' }[tab.key]} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

function InstructorClassPage({ activeTab, children, deferredLabel }) {
  const { requestedClassId, selectionError, selectionStatus } = useClasses()
  const previewLabel = deferredLabel === undefined
    ? ''
    : deferredLabel
  let content = children
  if (!requestedClassId) {
    content = <RequestState kind="empty" title="Choose a class" message="Select one of your owned classes before opening this workspace." />
  } else if (selectionStatus === 'loading') {
    content = <RequestState kind="loading" message="Loading the selected class." />
  } else if (selectionStatus === 'error') {
    content = <RequestState kind={selectionError?.status === 404 ? 'notFound' : 'unavailable'} error={selectionError} />
  }
  return (
    <div className="student-class-page">
      <InstructorClassHeader activeTab={activeTab} />
      <section className="student-class-content instructor-class-content">
        {selectionStatus === 'ready' && previewLabel && (
          <div className="class-deferred-banner" role="note">
            <strong>{previewLabel} remains a prototype preview.</strong>
            <span>The records below are not attached to the selected class and will be integrated in its approved later milestone.</span>
          </div>
        )}
        {content}
      </section>
    </div>
  )
}

function InstructorDashboard() {
  const { classes, error, pagination, status, loadMore } = useClasses()
  return <div className="instructor-home-page">
    <header className="student-home-topbar instructor-dashboard-topbar"><InstructorUserArea /></header>
    <main className="student-home-content instructor-home-content">
      <div className="academic-classes-heading"><h1>Classes</h1></div>
      {status === 'loading' && <RequestState kind="loading" compact message="Loading your classes." />}
      {status === 'error' && <RequestState kind="unavailable" compact error={error} />}
      {status === 'ready' && classes.length === 0 && <RequestState kind="empty" compact message="Create a class from the sidebar to begin." />}
      <ClassCardGrid classes={classes} role="instructor" />
      {pagination?.hasNextPage && <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>}
    </main>
  </div>
}

function InstructorClassesPage() {
  const { classes, error, loadMore, pagination, requestedClassId, selectedClass, status } = useClasses()
  if (requestedClassId) {
    return (
      <InstructorClassPage activeTab="stream">
        {selectedClass && (
          <ClassOverviewCard classRecord={selectedClass} />
        )}
      </InstructorClassPage>
    )
  }

  return (
    <div className="student-global-page">
      <header className="student-home-topbar"><InstructorUserArea /></header>
      <main className="student-global-content">
        <div className="student-global-heading"><div><p>Class Management</p><h1>Your Classes</h1></div></div>
        {status === 'loading' && <RequestState kind="loading" message="Loading your owned classes." />}
        {status === 'error' && <RequestState kind="unavailable" error={error} />}
        {status === 'ready' && classes.length === 0 && <RequestState kind="empty" message="Create a class from the sidebar to begin." />}
        <StaffInvitationsPanel />
        <ClassCardGrid classes={classes} role="instructor" />
        {pagination?.hasNextPage && <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>}
      </main>
    </div>
  )
}

function AssignmentSubTabs({ active }) {
  const { selectedClass } = useClasses()
  return (
    <div className="student-segmented-tabs" aria-label="Instructor activities and projects">
      <NavLink to={classHref('/instructor/activity', selectedClass?.id)} className={active === 'activities' ? 'is-active' : undefined}>
        <ProjexIcon name="activity" />
        Activities
      </NavLink>
      <NavLink to={classHref('/instructor/projects', selectedClass?.id)} className={active === 'projects' ? 'is-active' : undefined}>
        <ProjexIcon name="project" />
        Group Projects
      </NavLink>
    </div>
  )
}

function InstructorActivitiesPage() {
  return (
    <InstructorClassPage activeTab="assignments" deferredLabel="">
      <AssignmentSubTabs active="activities" />
      <InstructorActivityList />
    </InstructorClassPage>
  )
}

function CreateActivityPage({ mode = 'create' }) {
  return (
    <InstructorClassPage activeTab="assignments" deferredLabel="">
      <AssignmentSubTabs active="activities" /><InstructorActivityEditor mode={mode} />
    </InstructorClassPage>
  )
}

function InstructorPeoplePage() {
  const [confirm, confirmation] = useConfirmation()
  const { api, selectedClass, selectionStatus } = useClasses()
  const { user, revalidate } = useAuth()
  const [rosterState, setRosterState] = useState({ classId: null, status: 'loading', members: [], pagination: null, error: null })
  const [mutatingMemberId, setMutatingMemberId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [managingCode, setManagingCode] = useState(false)

  const detailedRoster = useCallback(response => {
    if (!Array.isArray(response.data) || response.data.some(member => !member?.memberId || typeof member.userStatus !== 'string' || typeof member.membershipStatus !== 'string')) {
      void revalidate?.()
      throw new ApiError({ code: 'ROSTER_CONTEXT_CHANGED' })
    }
    return response.data
  }, [revalidate])

  const loadRoster = useCallback(async (classId, page = 1, signal) => {
    const response = await api.listMembers(classId, { page, pageSize: 50 }, { signal })
    const members = detailedRoster(response)
    setRosterState((current) => ({
      classId,
      status: 'ready',
      members: page === 1 ? members : [...current.members, ...members],
      pagination: response.pagination,
      error: null,
    }))
  }, [api, detailedRoster])

  useEffect(() => {
    if (selectionStatus !== 'ready' || !selectedClass) return undefined
    const controller = new AbortController()
    api.listMembers(selectedClass.id, { page: 1, pageSize: 50 }, { signal: controller.signal })
      .then((response) => setRosterState({
        classId: selectedClass.id,
        status: 'ready',
        members: detailedRoster(response),
        pagination: response.pagination,
        error: null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setRosterState({ classId: selectedClass.id, status: 'error', members: [], pagination: null, error })
        }
      })
    return () => controller.abort()
  }, [api, detailedRoster, selectedClass, selectionStatus])

  const roster = rosterState.classId === selectedClass?.id
    ? rosterState
    : { ...rosterState, status: 'loading', members: [] }

  const transitionMember = async (member) => {
    if (!selectedClass || selectedClass.status === 'ARCHIVED') return
    const nextStatus = member.membershipStatus === 'ACTIVE' ? 'REMOVED' : 'ACTIVE'
    const verb = nextStatus === 'REMOVED' ? 'remove' : 'reactivate'
    if (!await confirm(`Are you sure you want to ${verb} ${member.fullName}?`, 'Change enrollment')) return
    setMutatingMemberId(member.memberId)
    setActionError(null)
    try {
      const response = await api.updateMember(selectedClass.id, member.memberId, { status: nextStatus })
      setRosterState((current) => ({
        ...current,
        members: current.members.map((item) => item.memberId === response.data.memberId ? response.data : item),
      }))
    } catch (error) {
      setActionError(error)
      if (error?.status === 409) await loadRoster(selectedClass.id)
    } finally {
      setMutatingMemberId(null)
    }
  }

  const loadNextPage = async () => {
    if (!selectedClass || !roster.pagination?.hasNextPage) return
    try {
      await loadRoster(selectedClass.id, roster.pagination.page + 1)
    } catch (error) {
      setRosterState((current) => ({ ...current, status: 'error', error }))
    }
  }

  return (
    <InstructorClassPage activeTab="people">
      {confirmation}
      <div className="student-people-panel instructor-people-panel academic-people-panel academic-classwork-panel">
        <header className="academic-people-toolbar">
          <h2><ProjexIcon name="people" />People</h2>
          <div className="academic-people-actions">
            {selectedClass?.instructor?.userId === user.id && <button type="button" className="student-outline-action" onClick={() => setManagingCode(true)}>Manage join code</button>}
            {selectedClass?.status === 'ACTIVE' && <>
              <CsvInvitationPanel key={selectedClass.id} api={api} classId={selectedClass.id} />
              <button type="button" className="student-primary-action" onClick={() => setInviting(true)}><ProjexIcon name="people" />Invite students</button>
            </>}
          </div>
        </header>
        {managingCode && <InstructorClassCodePage overlay onClose={() => setManagingCode(false)} />}
        {inviting && selectedClass?.status === 'ACTIVE' && <AppDialog title="Invite students" className="academic-people-invite-dialog" busy={inviteBusy} onClose={() => setInviting(false)}><InstructorClassInvitationPanel embedded onBusyChange={setInviteBusy} /></AppDialog>}
        {selectedClass?.status === 'ARCHIVED' && <p className="instructor-people-action-status">Archived classes are read-only.</p>}
        {actionError && <p className="class-form-error" role="alert">{describeApiError(actionError)}</p>}
        {selectionStatus === 'ready' && roster.status === 'loading' && <RequestState kind="loading" compact message="Loading the detailed roster." />}
        {roster.status === 'error' && <RequestState kind="unavailable" compact error={roster.error} action={<button type="button" className="student-outline-action" onClick={() => loadRoster(selectedClass.id).catch(error => setRosterState(current => ({ ...current, status: 'error', members: [], error })))}>Try again</button>} />}

        {roster.status === 'ready' && roster.members.length === 0 && <AcademicEmptyState icon="people" title="No students yet" description="Students will appear here after joining." />}
        {roster.members.length > 0 && <div className="instructor-data-table instructor-people-table academic-roster-table" role="table" aria-label="Class roster">
          <div className="instructor-table-row instructor-table-row--head" role="row">
            <span>Student</span>
            <span>University email</span>
            <span>Account</span>
            <span>Membership</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {roster.members.map((student) => (
            <div className="instructor-table-row" role="row" key={student.memberId}>
              <div className="instructor-roster-student">
                <span aria-hidden="true">{(student.fullName || 'Student').split(' ').map((part) => part.charAt(0)).join('').slice(0, 2)}</span>
                <strong>{student.fullName}</strong>
              </div>
              <span data-label="University email">{student.email}</span>
              <em data-label="Account" className="academic-member-status">{(typeof student.userStatus === 'string' ? student.userStatus.toLowerCase().replaceAll('_', ' ') : 'Not available')}</em>
              <em data-label="Membership" className={`academic-member-status ${student.membershipStatus === 'ACTIVE' ? 'is-approved' : 'is-revision'}`}>{(typeof student.membershipStatus === 'string' ? student.membershipStatus.toLowerCase() : 'Not available')}</em>
              <span data-label="Joined">{new Date(student.joinedAt).toLocaleDateString()}</span>
              <div>
                <button
                  type="button"
                  className={student.membershipStatus === 'ACTIVE' ? 'instructor-remove-student' : undefined}
                  disabled={selectedClass?.status === 'ARCHIVED' || mutatingMemberId === student.memberId || !student.memberId || !['ACTIVE', 'REMOVED'].includes(student.membershipStatus)}
                  onClick={() => transitionMember(student)}
                >
                  {mutatingMemberId === student.memberId ? 'Saving…' : student.membershipStatus === 'ACTIVE' ? 'Remove' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </div>}
        {roster.pagination?.hasNextPage && (
          <button type="button" className="student-outline-action class-load-more" onClick={loadNextPage}>Load more members</button>
        )}
      </div>
    </InstructorClassPage>
  )
}

function ClassInfoForm({ classRecord }) {
  const [confirm, confirmation] = useConfirmation()
  const { api, upsertClass } = useClasses()
  const { user } = useAuth()
  const isPrimary = classRecord.instructor?.userId === user.id
  const official = Boolean(classRecord.officialClassCode)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    className: classRecord.className,
    program: classRecord.program ?? '',
    section: classRecord.section ?? '',
    semester: classRecord.semester ?? '',
    schoolYear: classRecord.schoolYear ?? '',
    schedule: classRecord.schedule ?? '',
    room: classRecord.room ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage('')
    try {
      const response = await api.updateClass(classRecord.id, official
        ? { ...(form.program ? { program: form.program } : {}), schedule: form.schedule || null, room: form.room || null }
        : { ...(form.program ? { program: form.program } : {}), className: form.className, section: form.section || null, ...(form.semester !== (classRecord.semester ?? '') ? { semester: form.semester } : {}), ...(form.schoolYear !== (classRecord.schoolYear ?? '') ? { schoolYear: form.schoolYear } : {}), schedule: form.schedule || null, room: form.room || null })
      upsertClass(response.data)
      setMessage('Class information updated.')
      setEditing(false)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setSaving(false)
    }
  }

  const changeLifecycle = async () => {
    const archive = classRecord.status === 'ACTIVE'
    const question = archive
      ? `Archive ${classRecord.className}? You won’t be able to edit this class until it is restored. Existing work will be preserved.`
      : `Restore ${classRecord.className}?`
    if (!await confirm(question, archive ? 'Archive class?' : 'Restore class?')) return
    setSaving(true)
    setError(null)
    setMessage('')
    try {
      const response = archive
        ? await api.archiveClass(classRecord.id)
        : await api.restoreClass(classRecord.id)
      upsertClass(response.data)
      setMessage(archive
        ? 'Class archived. Its join code is now inactive.'
        : 'Class restored. Rotate the join code before accepting new joins.')
    } catch (requestError) {
      setError(requestError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="student-people-panel instructor-info-panel">
      {confirmation}
      <div className="academic-class-info-heading"><div><h2>Class details</h2><p>{classRecord.className}</p></div>{isPrimary && classRecord.status === 'ACTIVE' && <button type="button" className="student-outline-action" onClick={() => setEditing(true)}><ProjexIcon name="draft" />Edit details</button>}</div>
      <dl className="academic-class-info-facts">
        <div><dt>Class Code</dt><dd>{classRecord.officialClassCode || classRecord.section || '—'}</dd></div>
        <div><dt>Term</dt><dd>{classRecord.semester || classRecord.academicPeriod || '—'} · {classRecord.schoolYear || '—'}</dd></div>
        <div><dt>Program</dt><dd>{classRecord.program ? classRecord.program.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, value => value.toUpperCase()) : '—'}</dd></div>
        <div><dt>Schedule</dt><dd>{classRecord.schedule || '—'}</dd></div>
        <div><dt>Room</dt><dd>{classRecord.room || '—'}</dd></div>
        <div><dt>Status</dt><dd>{classRecord.status === 'ACTIVE' ? 'Active' : 'Archived'}</dd></div>
        <div><dt>Date Created</dt><dd>{new Date(classRecord.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
      </dl>
      {official && <p className="academic-dialog-hint">Contact Admin to correct catalog details.</p>}
      {editing && <AppDialog title="Edit class details" busy={saving} onClose={() => setEditing(false)}>
      <form className="instructor-form-grid class-info-form" onSubmit={save}>
        <label>Class Name<input value={form.className} onChange={updateField('className')} maxLength={200} required disabled={official || !isPrimary || classRecord.status !== 'ACTIVE'} /></label>
        {official ? <p>Official: {classRecord.courseName} · {classOfferingLabel(classRecord)}</p> : <>
          <label>Class Code<input value={form.section} onChange={updateField('section')} maxLength={100} required disabled={!isPrimary || classRecord.status !== 'ACTIVE'} /></label>
          <AcademicFields semester={form.semester} schoolYear={form.schoolYear} onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} legacy disabled={!isPrimary || classRecord.status !== 'ACTIVE'} />
        </>}
        <ProgramField value={form.program} onChange={value => setForm(old => ({ ...old, program: value }))} disabled={!isPrimary || classRecord.status !== 'ACTIVE'} />
        <label>Schedule Type<input value={form.schedule} onChange={updateField('schedule')} maxLength={200} disabled={!isPrimary || classRecord.status !== 'ACTIVE'} /></label>
        <label>Room<input value={form.room} onChange={updateField('room')} maxLength={100} disabled={!isPrimary || classRecord.status !== 'ACTIVE'} /></label>
        <div className="class-info-actions">
          {isPrimary ? <button type="submit" className="student-primary-action" disabled={saving || classRecord.status !== 'ACTIVE'}>{saving ? 'Saving…' : 'Save changes'}</button> : null}
          <button type="button" className="student-outline-action" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
        </div>
      </form>
      {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
      </AppDialog>}
      {isPrimary && <footer className="academic-class-info-footer"><button type="button" className="student-outline-action academic-archive-action" onClick={changeLifecycle} disabled={saving}><ProjexIcon name="archived" />{classRecord.status === 'ACTIVE' ? 'Archive class' : 'Restore class'}</button></footer>}
      {message && <p className="instructor-people-action-status" role="status">{message}</p>}
      {!editing && error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
    </div>
  )
}

function InstructorClassInfoPage() {
  const { selectedClass } = useClasses()
  return (
    <InstructorClassPage activeTab="info">
      {selectedClass && <div className="academic-class-info-layout">
        <ClassInfoForm key={selectedClass.id} classRecord={selectedClass} />
        <ClassStaffPanel key={`${selectedClass.id}-staff`} classRecord={selectedClass} />
      </div>}
    </InstructorClassPage>
  )
}

function InstructorClassCodePage({ overlay = false, onClose }) {
  const [confirm, confirmation] = useConfirmation()
  const { api, selectedClass, selectionStatus } = useClasses()
  const [codeState, setCodeState] = useState({ classId: null, status: 'loading', data: null, error: null })
  const [action, setAction] = useState('')

  useEffect(() => {
    if (selectionStatus !== 'ready' || !selectedClass) return undefined
    const controller = new AbortController()
    api.getJoinCode(selectedClass.id, { signal: controller.signal })
      .then((response) => setCodeState({ classId: selectedClass.id, status: 'ready', data: response.data, error: null }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setCodeState({ classId: selectedClass.id, status: 'error', data: null, error })
      })
    return () => controller.abort()
  }, [api, selectedClass, selectionStatus])

  const current = codeState.classId === selectedClass?.id ? codeState : { ...codeState, status: 'loading', data: null }
  const mutate = async (operation) => {
    if (!selectedClass || selectedClass.status === 'ARCHIVED') return
    const verb = operation === 'rotate' ? 'rotate' : 'revoke'
    if (!await confirm(`Are you sure you want to ${verb} this join code?`, 'Change join code')) return
    setAction(operation)
    try {
      const response = operation === 'rotate'
        ? await api.rotateJoinCode(selectedClass.id)
        : await api.revokeJoinCode(selectedClass.id)
      setCodeState({ classId: selectedClass.id, status: 'ready', data: response.data, error: null })
    } catch (error) {
      setCodeState({ classId: selectedClass.id, status: 'error', data: current.data, error })
    } finally {
      setAction('')
    }
  }

  const copy = async () => {
    if (!current.data?.active || !current.data.classCode || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(current.data.classCode)
      setAction('copied')
    } catch {
      setAction('copy-failed')
    }
  }

  const content = (
    <>
      {confirmation}
      <div className={overlay ? 'academic-join-code-content' : 'student-people-panel instructor-info-panel'}>
        {overlay ? <p className="academic-join-code-class">{selectedClass?.className}</p> : <section><h2>Class Join Code</h2><p>Join codes are generated and validated only by the Origin server.</p></section>}
        {selectionStatus === 'ready' && current.status === 'loading' && <RequestState kind="loading" compact message="Loading the join-code status." />}
        {current.status === 'error' && <RequestState kind="unavailable" compact error={current.error} />}
        {current.status === 'ready' && (
          <section className="instructor-generated-code">
            <span className={`academic-join-code-status${current.data.active ? '' : ' is-inactive'}`}>{current.data.active ? 'Active join code' : 'Join code inactive'}</span>
            {current.data.active ? (
              <div className="instructor-code-copy-row"><strong>{current.data.classCode}</strong><button type="button" onClick={copy}>Copy</button></div>
            ) : <p>No usable join code is available. Rotate the code to allow new joins.</p>}
            <small>Updated {new Date(current.data.changedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
            <div className="class-info-actions">
              <button type="button" className="student-primary-action" onClick={() => mutate('rotate')} disabled={action === 'rotate' || action === 'revoke' || selectedClass?.status === 'ARCHIVED'}>{action === 'rotate' ? 'Rotating…' : 'Rotate code'}</button>
              <button type="button" className="student-outline-action" onClick={() => mutate('revoke')} disabled={action === 'rotate' || action === 'revoke' || !current.data.active || selectedClass?.status === 'ARCHIVED'}>{action === 'revoke' ? 'Revoking…' : 'Revoke code'}</button>
            </div>
            {action === 'copied' && <em role="status">Copied</em>}
            {action === 'copy-failed' && <em role="status">Copy unavailable. Select and copy the code manually.</em>}
          </section>
        )}
      </div>
    </>
  )
  return overlay
    ? <AppDialog title="Manage join code" className="academic-join-code-dialog" busy={action === 'rotate' || action === 'revoke'} onClose={onClose}>{content}</AppDialog>
    : <InstructorClassPage activeTab="info">{content}</InstructorClassPage>
}

function InstructorInviteStudentsPage() {
  return (
    <InstructorClassPage activeTab="people">
      <InstructorClassInvitationPanel />
    </InstructorClassPage>
  )
}

function DeferredInstructorPage({ title, message }) {
  return (
    <div className="student-global-page">
      <header className="student-home-topbar"><InstructorUserArea /></header>
      <main className="student-global-content"><div className="student-global-heading"><div><p>Deferred Feature</p><h1>{title}</h1></div></div><RequestState kind="unavailable" title={`${title} is deferred`} message={message} /></main>
    </div>
  )
}

function InstructorReviewQueuePage() {
  const { classes, pagination, loadMore } = useClasses()
  return <div className="student-global-page"><header className="student-home-topbar"><InstructorUserArea /></header><main className="student-global-content"><div className="student-global-heading"><div><h1>To Review</h1></div></div><WorkHubList view="review" classes={classes} moreClasses={pagination?.hasNextPage} onMoreClasses={loadMore} /></main></div>
}

function InstructorProjectListPage() {
  return <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" /><InstructorProjectList /></InstructorClassPage>
}

function InstructorProjectDetailPage() {
  return <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" /><InstructorProjectDetail /></InstructorClassPage>
}

function InstructorProjectEditorPage({ mode }) {
  return <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" /><InstructorProjectEditor mode={mode} /></InstructorClassPage>
}

function InstructorProjectRepositoryPage() {
  const { requestedClassId } = useClasses()
  const repository = <RepositoryFoundationDetail role="instructor" />
  // Keep authorized deep links without a Class query working as before.
  return requestedClassId ? <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" />{repository}</InstructorClassPage> : repository
}

export function InstructorRoutePage({ pagePath }) {
  const pages = {
    dashboard: <InstructorDashboard />,
    classes: <InstructorClassesPage />,
    'review-queues': <InstructorReviewQueuePage />,
    activity: <InstructorActivitiesPage />,
    'activity/new': <CreateActivityPage mode="create" />,
    'activity/:activityId/settings': <CreateActivityPage mode="edit" />,
    'activity/:activityId/monitor': <InstructorActivityMonitorRedirect />,
    'activity/:activityId/submissions': <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="activities" /><InstructorSubmissionQueue /></InstructorClassPage>,
    'activity/:activityId/submissions/:submissionId': <InstructorClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="activities" /><InstructorSubmissionReview /></InstructorClassPage>,
    'submission-review': <DeferredInstructorPage title="Submission Review" message="Choose an activity and an accepted submission from its real queue. This legacy route has no submission identity and cannot select one safely." />,
    projects: <InstructorProjectListPage />,
    'projects/new': <InstructorProjectEditorPage mode="create" />,
    'projects/:projectTaskId': <InstructorProjectDetailPage />,
    'projects/:projectTaskId/settings': <InstructorProjectEditorPage mode="edit" />,
    'projects/:projectTaskId/repository': <InstructorClassPage activeTab="assignments"><RepositorySelectionRequired role="instructor" /></InstructorClassPage>,
    'projects/:projectTaskId/repositories/:repositoryId': <InstructorProjectRepositoryPage />,
    'projects/:projectTaskId/repositories/:repositoryId/contributions': <DeferredInstructorPage title="Contribution Review" message="Verified contribution analytics are not available without an approved identity and evidence contract." />,
    'projects/:projectTaskId/repositories/:repositoryId/similarity': <DeferredInstructorPage title="Project Similarity" message="Similarity analysis remains a deferred research and product decision." />,
    people: <InstructorPeoplePage />,
    roster: <InstructorPeoplePage />,
    'class-info': <InstructorClassInfoPage />,
    'class-code': <InstructorClassCodePage />,
    'invite-students': <InstructorInviteStudentsPage />,
    analytics: <DeferredInstructorPage title="Analytics" message="Canonical instructor analytics remain recognized but are not available in the core iteration." />,
    'students/stu-alyssa': <DeferredInstructorPage title="Student Profile" message="A consolidated cross-class student profile is not available in the current backend." />,
  }

  return pages[pagePath] || <RequestState kind="notFound" />
}

export default InstructorRoutePage
