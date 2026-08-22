import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial, firstName } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { InstructorClassInvitationPanel } from '../classes/ClassInvitationViews.jsx'
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

function InstructorProfileMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  return (
    <div className="student-profile-menu">
      <button type="button" className="student-profile-trigger" onClick={() => setOpen(!open)}>
        <span className="student-user-avatar" aria-hidden="true" />
        <span className="student-user-name">
          <strong>{auth.user.fullName}</strong>
          <span>Instructor</span>
        </span>
        <span className="student-dropdown" aria-hidden="true" />
      </button>

      {open && (
        <section className="student-profile-dropdown">
          <button type="button" className="student-profile-close" onClick={() => setOpen(false)} aria-label="Close profile menu" />
          <strong>{auth.user.email}</strong>
          <span>Managed by slu.edu.ph</span>
          <div className="student-profile-photo">
            <span className="student-user-avatar" aria-hidden="true" />
          </div>
          <h2>Hi, {auth.user.fullName.toUpperCase()}!</h2>
          <button type="button" className="student-manage-account">Manage your projex account</button>
          <div className="student-profile-menu-list">
            <button type="button">Profile</button>
            <button type="button">Settings</button>
            <button
              type="button"
              onClick={async () => {
                setOpen(false)
                await auth.logout()
                navigate('/', { replace: true })
              }}
            >
              Sign out
            </button>
          </div>
          <p>Privacy Policy - Terms of Service</p>
        </section>
      )}
    </div>
  )
}

function InstructorUserArea() {
  return (
    <div className="student-user-area instructor-user-area">
      <button
        type="button"
        className="student-bell"
        aria-label="Notifications are deferred"
        title="Notifications are not available in this iteration."
        disabled
      >
        <span className="student-bell__shape" aria-hidden="true" />
      </button>
      <InstructorProfileMenu />
    </div>
  )
}

function InstructorClassHeader({ activeTab }) {
  const { selectedClass } = useClasses()
  const tabs = [
    { label: 'Overview', path: '/instructor/classes', key: 'stream' },
    { label: 'Assignments', path: '/instructor/activity', key: 'assignments' },
    { label: 'People', path: '/instructor/people', key: 'people' },
    { label: 'Class Info', path: '/instructor/class-info', key: 'info' },
  ]
  const initial = classInitial(selectedClass)

  return (
    <header className="student-class-header">
      <div className="student-class-header__top">
        <div className="student-course-title">
          <span className="student-course-avatar">{initial}</span>
          <div>
            <h1>{selectedClass?.className || 'Select a class'}</h1>
            <div className="student-course-meta">
              {selectedClass && <span>{selectedClass.section}</span>}
              {selectedClass && <span>{selectedClass.semester} · {selectedClass.schoolYear}</span>}
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
              <span className={`student-tab-icon student-tab-icon--${tab.key}`} aria-hidden="true" />
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
    ? (activeTab === 'assignments' ? 'Activity and project integration' : '')
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
  const auth = useAuth()
  const { classes, error, pagination, status } = useClasses()
  const stats = [
    { label: 'Owned Classes', value: pagination?.totalItems ?? classes.length, detail: 'authorized classes', tone: 'blue', icon: 'book' },
    { label: 'Active Classes', value: classes.filter((item) => item.status === 'ACTIVE').length, detail: pagination?.hasNextPage ? 'loaded classes' : 'classes', tone: 'green', icon: 'book' },
    { label: 'Archived Classes', value: classes.filter((item) => item.status === 'ARCHIVED').length, detail: pagination?.hasNextPage ? 'loaded classes' : 'read-only classes', tone: 'purple', icon: 'students' },
  ]
  return (
    <div className="instructor-home-page">
      <header className="student-home-topbar instructor-dashboard-topbar">
        <InstructorUserArea />
      </header>

      <main className="student-home-content instructor-home-content">
        <section className="instructor-dashboard-hero">
          <h1>Welcome back, {firstName(auth.user.fullName)}!</h1>
          <p>Here's an overview of the classes currently owned by your account.</p>
        </section>

        <section className="instructor-home-stat-grid" aria-label="Instructor dashboard summary">
          {stats.map((stat) => (
            <article className={`instructor-home-stat-card instructor-home-stat-card--${stat.tone}`} key={stat.label}>
              <span className={`instructor-home-stat-icon instructor-home-stat-icon--${stat.icon}`} aria-hidden="true" />
              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="instructor-home-dashboard-grid">
          <section className="instructor-home-panel instructor-home-classes-panel">
            <div className="instructor-home-panel-heading">
              <div>
                <span className="instructor-panel-icon instructor-panel-icon--classes" aria-hidden="true" />
                <h2>Your Classes</h2>
              </div>
              <NavLink to="/instructor/classes">View all classes</NavLink>
            </div>

            {status === 'loading' && <RequestState kind="loading" compact message="Loading your classes." />}
            {status === 'error' && <RequestState kind="unavailable" compact error={error} />}
            {status === 'ready' && classes.length === 0 && <RequestState kind="empty" compact message="Create a class to see it here." />}
            <div className="instructor-home-class-list">
              {classes.map((item) => (
                <NavLink to={classHref('/instructor/classes', item.id)} className="instructor-home-class-card" key={item.id}>
                  <span className={`instructor-class-avatar instructor-class-avatar--${classInitial(item).toLowerCase()}`}>
                    {classInitial(item)}
                  </span>
                  <div>
                    <strong>{item.className}</strong>
                    <span>{item.section}</span>
                    <span>{item.semester} · {item.schoolYear}</span>
                    <small>{item.status === 'ARCHIVED' ? 'Archived · read-only' : 'Active'}</small>
                  </div>
                  <span className="student-home-card-action" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </section>

          <section className="instructor-home-panel instructor-home-review-panel">
            <div className="instructor-home-panel-heading">
              <div>
                <span className="instructor-panel-icon instructor-panel-icon--reviews" aria-hidden="true" />
                <h2>Review Queue Preview</h2>
              </div>
              <NavLink to="/instructor/review-queues">View all</NavLink>
            </div>

            <RequestState kind="unavailable" compact title="Cross-class review queue unavailable" message="A bounded backend contract for a consolidated activity and repository review queue is not currently available. Open a selected class workflow instead." />
          </section>
        </section>
      </main>
    </div>
  )
}

function InstructorClassesPage() {
  const { classes, error, loadMore, pagination, requestedClassId, selectedClass, status } = useClasses()

  if (requestedClassId) {
    return (
      <InstructorClassPage activeTab="stream">
        {selectedClass && (
          <div className="class-overview-grid">
            <section className="student-global-panel class-overview-card">
              <span className="class-status-chip">{selectedClass.status}</span>
              <h2>{selectedClass.className}</h2>
              <p>{selectedClass.section} · {selectedClass.semester} · {selectedClass.schoolYear}</p>
              <p>Owner: {selectedClass.instructor.fullName}</p>
              <div className="class-overview-actions">
                <NavLink className="student-primary-action" to={classHref('/instructor/class-info', selectedClass.id)}>Manage class</NavLink>
                <NavLink className="student-outline-action" to={classHref('/instructor/people', selectedClass.id)}>View roster</NavLink>
                <NavLink className="student-outline-action" to={classHref('/instructor/class-code', selectedClass.id)}>Join code</NavLink>
              </div>
            </section>
            <RequestState kind="unavailable" compact title="Class stream deferred" message="Announcements and comments remain recognized, but no approved backend contract exists yet." />
          </div>
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
        <section className="instructor-home-class-list class-catalog-grid">
          {classes.map((item) => (
            <NavLink to={classHref('/instructor/classes', item.id)} className="instructor-home-class-card" key={item.id}>
              <span className={`instructor-class-avatar instructor-class-avatar--${classInitial(item).toLowerCase()}`}>{classInitial(item)}</span>
              <div><strong>{item.className}</strong><span>{item.section}</span><span>{item.semester} · {item.schoolYear}</span><small>{item.status}</small></div>
              <span className="student-home-card-action" aria-hidden="true" />
            </NavLink>
          ))}
        </section>
        {pagination?.hasNextPage && <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>}
      </main>
    </div>
  )
}

function AssignmentSubTabs({ active }) {
  const { selectedClass } = useClasses()
  return (
    <div className="student-segmented-tabs" aria-label="Instructor assignment type">
      <NavLink to={classHref('/instructor/activity', selectedClass?.id)} className={active === 'activities' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Activities
      </NavLink>
      <NavLink to={classHref('/instructor/projects', selectedClass?.id)} className={active === 'projects' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Group Projects
      </NavLink>
    </div>
  )
}

function InstructorActivitiesPage() {
  return (
    <InstructorClassPage activeTab="assignments" deferredLabel="">
      <div className="instructor-assignment-toolbar"><AssignmentSubTabs active="activities" /></div>
      <InstructorActivityList />
    </InstructorClassPage>
  )
}

function CreateActivityPage({ mode = 'create' }) {
  return (
    <InstructorClassPage activeTab="assignments" deferredLabel="">
      <InstructorActivityEditor mode={mode} />
    </InstructorClassPage>
  )
}

function InstructorPeoplePage() {
  const { api, selectedClass, selectionStatus } = useClasses()
  const [rosterState, setRosterState] = useState({ classId: null, status: 'loading', members: [], pagination: null, error: null })
  const [mutatingMemberId, setMutatingMemberId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const loadRoster = useCallback(async (classId, page = 1, signal) => {
    const response = await api.listMembers(classId, { page, pageSize: 50 }, { signal })
    setRosterState((current) => ({
      classId,
      status: 'ready',
      members: page === 1 ? response.data : [...current.members, ...response.data],
      pagination: response.pagination,
      error: null,
    }))
  }, [api])

  useEffect(() => {
    if (selectionStatus !== 'ready' || !selectedClass) return undefined
    const controller = new AbortController()
    api.listMembers(selectedClass.id, { page: 1, pageSize: 50 }, { signal: controller.signal })
      .then((response) => setRosterState({
        classId: selectedClass.id,
        status: 'ready',
        members: response.data,
        pagination: response.pagination,
        error: null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setRosterState({ classId: selectedClass.id, status: 'error', members: [], pagination: null, error })
        }
      })
    return () => controller.abort()
  }, [api, selectedClass, selectionStatus])

  const roster = rosterState.classId === selectedClass?.id
    ? rosterState
    : { ...rosterState, status: 'loading', members: [] }

  const transitionMember = async (member) => {
    if (!selectedClass || selectedClass.status === 'ARCHIVED') return
    const nextStatus = member.membershipStatus === 'ACTIVE' ? 'REMOVED' : 'ACTIVE'
    const verb = nextStatus === 'REMOVED' ? 'remove' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${verb} ${member.fullName}?`)) return
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
      <div className="student-people-panel instructor-people-panel">
        <section className="instructor-people-hero">
          <div className="instructor-people-hero-copy">
            <span className="instructor-people-icon" aria-hidden="true" />
            <h2>Class Roster</h2>
            <p>Review enrollment details and manage active or removed memberships.</p>
            <div className="instructor-people-summary-grid">
              <article>
                <strong>{roster.pagination?.totalItems ?? roster.members.length}</strong>
                <span>membership records</span>
              </article>
              <article>
                <strong>{roster.members.filter((member) => member.membershipStatus === 'ACTIVE').length}</strong>
                <span>active on this page</span>
              </article>
              <article>
                <strong>{roster.members.filter((member) => member.membershipStatus === 'REMOVED').length}</strong>
                <span>removed on this page</span>
              </article>
            </div>
          </div>
          <img src="/assets/brand/projex-login-mascot.png" alt="" aria-hidden="true" />
          <div className="instructor-people-actions">
            {selectedClass && <NavLink className="student-primary-action" to={classHref('/instructor/class-code', selectedClass.id)}>Manage join code</NavLink>}
          </div>
        </section>

        {selectedClass?.status === 'ARCHIVED' && <p className="instructor-people-action-status">Archived classes are read-only.</p>}
        <InstructorClassInvitationPanel />
        {actionError && <p className="class-form-error" role="alert">{describeApiError(actionError)}</p>}
        {selectionStatus === 'ready' && roster.status === 'loading' && <RequestState kind="loading" compact message="Loading the detailed roster." />}
        {roster.status === 'error' && <RequestState kind="unavailable" compact error={roster.error} />}

        <div className="instructor-data-table instructor-people-table" role="table" aria-label="Class roster">
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
                <span>{student.fullName.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2)}</span>
                <strong>{student.fullName}</strong>
              </div>
              <span>{student.email}</span>
              <em>{student.userStatus}</em>
              <em className={student.membershipStatus === 'ACTIVE' ? 'is-approved' : 'is-revision'}>{student.membershipStatus}</em>
              <span>{new Date(student.joinedAt).toLocaleDateString()}</span>
              <div>
                <button
                  type="button"
                  className={student.membershipStatus === 'ACTIVE' ? 'instructor-remove-student' : undefined}
                  disabled={selectedClass?.status === 'ARCHIVED' || mutatingMemberId === student.memberId}
                  onClick={() => transitionMember(student)}
                >
                  {mutatingMemberId === student.memberId ? 'Saving…' : student.membershipStatus === 'ACTIVE' ? 'Remove' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {roster.pagination?.hasNextPage && (
          <button type="button" className="student-outline-action class-load-more" onClick={loadNextPage}>Load more members</button>
        )}
      </div>
    </InstructorClassPage>
  )
}

function ClassInfoForm({ classRecord }) {
  const { api, upsertClass } = useClasses()
  const [form, setForm] = useState({
    className: classRecord.className,
    section: classRecord.section,
    semester: classRecord.semester,
    schoolYear: classRecord.schoolYear,
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
      const response = await api.updateClass(classRecord.id, form)
      upsertClass(response.data)
      setMessage('Class information updated.')
    } catch (requestError) {
      setError(requestError)
    } finally {
      setSaving(false)
    }
  }

  const changeLifecycle = async () => {
    const archive = classRecord.status === 'ACTIVE'
    if (!window.confirm(`${archive ? 'Archive' : 'Restore'} ${classRecord.className}?`)) return
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
      <section>
        <h2>Class Info</h2>
        <p>Manage the supported academic term metadata and lifecycle.</p>
      </section>
      <form className="instructor-form-grid class-info-form" onSubmit={save}>
        <label>Course name<input value={form.className} onChange={updateField('className')} maxLength={200} required disabled={classRecord.status === 'ARCHIVED'} /></label>
        <label>Section<input value={form.section} onChange={updateField('section')} maxLength={100} required disabled={classRecord.status === 'ARCHIVED'} /></label>
        <label>Semester<input value={form.semester} onChange={updateField('semester')} maxLength={100} required disabled={classRecord.status === 'ARCHIVED'} /></label>
        <label>School year<input value={form.schoolYear} onChange={updateField('schoolYear')} maxLength={20} required disabled={classRecord.status === 'ARCHIVED'} /></label>
        <div className="class-info-actions">
          <button type="submit" className="student-primary-action" disabled={saving || classRecord.status === 'ARCHIVED'}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="student-outline-action" onClick={changeLifecycle} disabled={saving}>{classRecord.status === 'ACTIVE' ? 'Archive class' : 'Restore class'}</button>
        </div>
      </form>
      <div className="instructor-info-list">
        <article><span>Instructor</span><strong>{classRecord.instructor.fullName}</strong></article>
        <article><span>Status</span><strong>{classRecord.status}</strong></article>
        <article><span>Created</span><strong>{new Date(classRecord.createdAt).toLocaleString()}</strong></article>
      </div>
      {message && <p className="instructor-people-action-status" role="status">{message}</p>}
      {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
    </div>
  )
}

function InstructorClassInfoPage() {
  const { selectedClass } = useClasses()
  return (
    <InstructorClassPage activeTab="info">
      {selectedClass && <ClassInfoForm key={selectedClass.id} classRecord={selectedClass} />}
    </InstructorClassPage>
  )
}

function InstructorClassCodePage() {
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
    if (!window.confirm(`Are you sure you want to ${verb} this join code?`)) return
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

  return (
    <InstructorClassPage activeTab="info">
      <div className="student-people-panel instructor-info-panel">
        <section><h2>Class Join Code</h2><p>Join codes are generated and validated only by the Projex server.</p></section>
        {selectionStatus === 'ready' && current.status === 'loading' && <RequestState kind="loading" compact message="Loading the join-code status." />}
        {current.status === 'error' && <RequestState kind="unavailable" compact error={current.error} />}
        {current.status === 'ready' && (
          <section className="instructor-generated-code">
            <span>{current.data.active ? 'Active join code' : 'Join code inactive'}</span>
            {current.data.active ? (
              <div className="instructor-code-copy-row"><strong>{current.data.classCode}</strong><button type="button" onClick={copy}>Copy</button></div>
            ) : <p>No usable join code is available. Rotate the code to allow new joins.</p>}
            <small>Changed {new Date(current.data.changedAt).toLocaleString()}</small>
            <div className="class-info-actions">
              <button type="button" className="student-primary-action" onClick={() => mutate('rotate')} disabled={action === 'rotate' || action === 'revoke' || selectedClass?.status === 'ARCHIVED'}>{action === 'rotate' ? 'Rotating…' : 'Rotate code'}</button>
              <button type="button" className="student-outline-action" onClick={() => mutate('revoke')} disabled={action === 'rotate' || action === 'revoke' || !current.data.active || selectedClass?.status === 'ARCHIVED'}>{action === 'revoke' ? 'Revoking…' : 'Revoke code'}</button>
            </div>
            {action === 'copied' && <em>Copied</em>}
            {action === 'copy-failed' && <em>Copy unavailable. Select and copy the code manually.</em>}
          </section>
        )}
      </div>
    </InstructorClassPage>
  )
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

function InstructorProjectListPage() {
  return <InstructorClassPage activeTab="assignments"><InstructorProjectList /></InstructorClassPage>
}

function InstructorProjectDetailPage() {
  return <InstructorClassPage activeTab="assignments"><InstructorProjectDetail /></InstructorClassPage>
}

function InstructorProjectEditorPage({ mode }) {
  return <InstructorClassPage activeTab="assignments"><InstructorProjectEditor mode={mode} /></InstructorClassPage>
}

export function InstructorRoutePage({ pagePath }) {
  const pages = {
    dashboard: <InstructorDashboard />,
    classes: <InstructorClassesPage />,
    'review-queues': <DeferredInstructorPage title="Review Queues" message="A bounded cross-class activity and repository review-queue contract is not available. Open a selected class workflow instead." />,
    activity: <InstructorActivitiesPage />,
    'activity/new': <CreateActivityPage mode="create" />,
    'activity/:activityId/settings': <CreateActivityPage mode="edit" />,
    'activity/:activityId/monitor': <InstructorActivityMonitorRedirect />,
    'activity/:activityId/submissions': <InstructorClassPage activeTab="assignments" deferredLabel=""><InstructorSubmissionQueue /></InstructorClassPage>,
    'activity/:activityId/submissions/:submissionId': <InstructorClassPage activeTab="assignments" deferredLabel=""><InstructorSubmissionReview /></InstructorClassPage>,
    'submission-review': <DeferredInstructorPage title="Submission Review" message="Choose an activity and an accepted submission from its real queue. This legacy route has no submission identity and cannot select one safely." />,
    projects: <InstructorProjectListPage />,
    'projects/new': <InstructorProjectEditorPage mode="create" />,
    'projects/:projectTaskId': <InstructorProjectDetailPage />,
    'projects/:projectTaskId/settings': <InstructorProjectEditorPage mode="edit" />,
    'projects/:projectTaskId/repository': <InstructorClassPage activeTab="assignments"><RepositorySelectionRequired role="instructor" /></InstructorClassPage>,
    'projects/:projectTaskId/repositories/:repositoryId': <RepositoryFoundationDetail role="instructor" />,
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
