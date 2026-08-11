import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial, firstName } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { StudentActivityDetail, StudentActivityList } from '../activities/StudentActivityViews.jsx'
import {
  LegacySubmissionRoute,
  StudentProgrammingWorkspace,
  StudentSubmissionDetail,
  StudentSubmissionHistory,
} from '../submissions/StudentSubmissionViews.jsx'
import { StudentProjectDetail, StudentProjectList } from '../projects/ProjectViews.jsx'
import {
  RepositoryFoundationDetail,
  RepositorySelectionRequired,
  StudentRepositoryCatalog,
} from '../repositories/RepositoryFoundationViews.jsx'

function StudentNotificationMenu() {
  return (
    <div className="student-notification-menu">
      <button
        type="button"
        className="student-bell"
        aria-label="Notifications are deferred"
        title="Notifications are not available in this iteration."
        disabled
      >
        <span className="student-bell__shape" aria-hidden="true" />
      </button>
    </div>
  )
}

function StudentProfileMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  return (
    <div className="student-profile-menu">
      <button type="button" className="student-profile-trigger" onClick={() => setOpen(!open)}>
        <span className="student-user-avatar" aria-hidden="true" />
        <span className="student-user-name">
          <strong>{auth.user.fullName}</strong>
          <span>Student</span>
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
          <p>Privacy Policy · Terms of Service</p>
        </section>
      )}
    </div>
  )
}

function ClassHeader({ activeTab }) {
  const { selectedClass } = useClasses()
  const tabs = [
    { label: 'Overview', path: '/student/classes', key: 'stream' },
    { label: 'Assignments', path: '/student/activity', key: 'assignments' },
    { label: 'People', path: '/student/people', key: 'people' },
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
              {selectedClass && <span>{selectedClass.instructor.fullName}</span>}
              {selectedClass && <span>{selectedClass.status === 'ARCHIVED' ? 'Archived' : `${selectedClass.semester} · ${selectedClass.schoolYear}`}</span>}
            </div>
          </div>
        </div>

        <div className="student-user-area">
          <StudentNotificationMenu />
          <StudentProfileMenu />
        </div>
      </div>

      <div className="student-class-header__bottom">
        <nav className="student-class-tabs" aria-label="Class tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={classHref(tab.path, selectedClass?.id)}
              end={tab.key === 'stream'}
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

function StudentClassPage({ activeTab, children, wide = false, deferredLabel }) {
  const { requestedClassId, selectionError, selectionStatus } = useClasses()
  const previewLabel = deferredLabel === undefined
    ? (activeTab === 'assignments' ? 'Activity and project integration' : '')
    : deferredLabel
  let content = children

  if (!requestedClassId) {
    content = (
      <RequestState
        kind="empty"
        title="Choose a class"
        message="Select one of your authorized classes before opening this class workspace."
      />
    )
  } else if (selectionStatus === 'loading') {
    content = <RequestState kind="loading" message="Loading the selected class." />
  } else if (selectionStatus === 'error') {
    content = (
      <RequestState
        kind={selectionError?.status === 404 ? 'notFound' : selectionError?.status === 403 ? 'forbidden' : 'unavailable'}
        error={selectionError}
      />
    )
  }

  return (
    <div className="student-class-page">
      <ClassHeader activeTab={activeTab} />
      <section className={wide ? 'student-class-content student-class-content--wide' : 'student-class-content'}>
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

function HomeDashboardPage() {
  const auth = useAuth()
  const { classes, error, pagination, status } = useClasses()
  const stats = [
    { label: 'Joined Classes', value: pagination?.totalItems ?? classes.length, detail: 'authorized classes', tone: 'green' },
    { label: 'Active Classes', value: classes.filter((item) => item.status === 'ACTIVE').length, detail: pagination?.hasNextPage ? 'loaded classes' : 'classes', tone: 'blue' },
    { label: 'Archived Classes', value: classes.filter((item) => item.status === 'ARCHIVED').length, detail: pagination?.hasNextPage ? 'loaded classes' : 'read-only classes', tone: 'purple' },
  ]

  return (
    <div className="student-home-page">
      <header className="student-home-topbar">
        <div />
        <div className="student-user-area">
          <StudentNotificationMenu />
          <StudentProfileMenu />
        </div>
      </header>

      <main className="student-home-content">
        <section className="student-home-hero">
          <div className="student-home-mascot" aria-hidden="true">
            <img src="/assets/brand/projex-login-mascot.png" alt="" />
          </div>
          <div>
            <h1>Welcome back, {firstName(auth.user.fullName)}</h1>
            <p>Here are the classes currently available to your account.</p>
          </div>
        </section>

        <section className="student-home-stats" aria-label="Student overview">
          {stats.map((stat) => (
            <article className="student-dashboard-stat" key={stat.label}>
              <span className={`student-dashboard-stat-icon student-dashboard-stat-icon--${stat.tone}`} aria-hidden="true" />
              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="student-home-classes student-home-classes-panel">
          <div className="student-home-section-heading">
            <h2>My Classes</h2>
            <NavLink to="/student/classes">View all classes</NavLink>
          </div>

          {status === 'loading' && <RequestState kind="loading" compact message="Loading your classes." />}
          {status === 'error' && <RequestState kind="unavailable" compact error={error} />}
          {status === 'ready' && classes.length === 0 && <RequestState kind="empty" compact message="Join a class to see it here." />}
          <div className="student-home-class-grid">
            {classes.map((item) => (
              <NavLink to={classHref('/student/classes', item.id)} className="student-home-class-card" key={item.id}>
                <span className={`student-class-dot student-class-dot--${classInitial(item).toLowerCase()}`}>
                  {classInitial(item)}
                </span>
                <div>
                  <strong>{item.className}</strong>
                  <span>{item.section}</span>
                  <span>{item.instructor.fullName}</span>
                </div>
                <div className="student-home-class-schedule">
                  <span>{item.semester}</span>
                  <span>{item.schoolYear} · {item.status === 'ARCHIVED' ? 'Archived' : 'Active'}</span>
                </div>
                <span className="student-home-card-action" aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function StudentClassesPage() {
  const {
    classes,
    error,
    loadMore,
    pagination,
    requestedClassId,
    selectedClass,
    status,
  } = useClasses()

  if (requestedClassId) {
    return (
      <StudentClassPage activeTab="stream">
        {selectedClass && (
          <div className="class-overview-grid">
            <section className="student-global-panel class-overview-card">
              <span className="class-status-chip">{selectedClass.status}</span>
              <h2>{selectedClass.className}</h2>
              <p>{selectedClass.section} · {selectedClass.semester} · {selectedClass.schoolYear}</p>
              <p>Instructor: {selectedClass.instructor.fullName}</p>
              <small>{selectedClass.status === 'ARCHIVED' ? 'This class is read-only.' : 'Your membership grants access to this class.'}</small>
            </section>
            <RequestState
              kind="unavailable"
              compact
              title="Class stream deferred"
              message="Announcements and comments are recognized Projex features, but no approved backend contract exists yet."
            />
          </div>
        )}
      </StudentClassPage>
    )
  }

  return (
    <StudentGlobalPage title="My Classes" eyebrow="Class Membership">
      {status === 'loading' && <RequestState kind="loading" message="Loading your authorized classes." />}
      {status === 'error' && <RequestState kind="unavailable" error={error} />}
      {status === 'ready' && classes.length === 0 && <RequestState kind="empty" message="Join a class using an instructor-provided code." />}
      {status === 'ready' && classes.length > 0 && (
        <section className="student-home-class-grid class-catalog-grid">
          {classes.map((item) => {
            const initial = classInitial(item)
            return (
              <NavLink to={classHref('/student/classes', item.id)} className="student-home-class-card" key={item.id}>
                <span className={`student-class-dot student-class-dot--${initial.toLowerCase()}`}>{initial}</span>
                <div>
                  <strong>{item.className}</strong>
                  <span>{item.section}</span>
                  <span>{item.instructor.fullName}</span>
                </div>
                <div className="student-home-class-schedule">
                  <span>{item.semester} · {item.schoolYear}</span>
                  <span>{item.status === 'ARCHIVED' ? 'Archived · read-only' : 'Active'}</span>
                </div>
                <span className="student-home-card-action" aria-hidden="true" />
              </NavLink>
            )
          })}
        </section>
      )}
      {pagination?.hasNextPage && (
        <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>
      )}
    </StudentGlobalPage>
  )
}

function AssignmentSubTabs({ active }) {
  const { selectedClass } = useClasses()
  return (
    <div className="student-segmented-tabs" aria-label="Assignment type">
      <NavLink to={classHref('/student/activity', selectedClass?.id)} className={active === 'activities' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Activities
      </NavLink>
      <NavLink to={classHref('/student/projects', selectedClass?.id)} className={active === 'projects' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Group Projects
      </NavLink>
    </div>
  )
}

function ActivitiesPage() {
  return (
    <StudentClassPage activeTab="assignments" deferredLabel="">
      <div className="student-assignment-toolbar"><AssignmentSubTabs active="activities" /></div>
      <StudentActivityList />
    </StudentClassPage>
  )
}

function ActivityDetailPage() {
  return (
    <StudentClassPage activeTab="assignments" wide deferredLabel="">
      <StudentActivityDetail />
    </StudentClassPage>
  )
}

function SubmissionHistoryPage() {
  return (
    <StudentClassPage activeTab="assignments" wide deferredLabel="">
      <StudentSubmissionHistory />
    </StudentClassPage>
  )
}

function SubmissionDetailPage() {
  return (
    <StudentClassPage activeTab="assignments" wide deferredLabel="">
      <StudentSubmissionDetail />
    </StudentClassPage>
  )
}


function StudentGlobalPage({ title, eyebrow, action, children }) {
  return (
    <div className="student-global-page">
      <header className="student-home-topbar">
        <div />
        <div className="student-user-area">
          <StudentNotificationMenu count={4} />
          <StudentProfileMenu />
        </div>
      </header>

      <main className="student-global-content">
        <div className="student-global-heading">
          <div>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  )
}

function StudentTodoPage() {
  return (
    <StudentGlobalPage eyebrow="Student To-do" title="To-do">
      <section className="student-global-panel student-todo-board">
        <RequestState
          kind="unavailable"
          title="Consolidated to-do is not available"
          message="Projex does not currently provide an authoritative cross-class task list. Open a class to review its real activities and project requirements, or open your repository catalog for repository work."
        />
        <div className="student-submit-modal-actions">
          <NavLink className="student-primary-action" to="/student/classes">View my classes</NavLink>
          <NavLink className="student-outline-action" to="/student/repositories">View my repositories</NavLink>
        </div>
      </section>
    </StudentGlobalPage>
  )
}

function JoinClassModal({ onClose, onJoin }) {
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setJoining(true)
    setError(null)
    try {
      await onJoin(classCode)
    } catch (requestError) {
      setError(requestError)
      setJoining(false)
    }
  }

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-join-class-title">
      <form className="student-action-modal" onSubmit={submit}>
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close join class" />
        <p>Join Class</p>
        <h2 id="student-join-class-title">Enter class code</h2>
        <label className="student-single-field">
          Class code
          <input
            value={classCode}
            onChange={(event) => setClassCode(event.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            required
          />
        </label>
        {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="student-primary-action"
            disabled={joining || !classCode.trim()}
          >
            {joining ? 'Joining…' : 'Join Class'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StudentJoinClassPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [joinedClass, setJoinedClass] = useState(null)
  const { api, upsertClass } = useClasses()

  return (
    <StudentGlobalPage
      eyebrow="Class Membership"
      title="Join Class"
      action={(
        <button type="button" className="student-global-action" onClick={() => setModalOpen(true)}>
          <span aria-hidden="true">+</span>
          Join Class by Code
        </button>
      )}
    >
      <section className="student-global-panel">
        <div className="student-panel-heading">
          <h2>Join with a class code</h2>
          <span>Server verified</span>
        </div>
        <p>Enter the code supplied by your instructor. Projex does not save the code in this browser.</p>
        {joinedClass && (
          <div className="student-joined-state">
            <strong>Joined class</strong>
            <span>{joinedClass.className} · {joinedClass.section}</span>
            <NavLink to={classHref('/student/classes', joinedClass.id)}>Open class</NavLink>
          </div>
        )}
      </section>

      {modalOpen && (
        <JoinClassModal
          onClose={() => setModalOpen(false)}
          onJoin={async (code) => {
            const response = await api.joinClass(code)
            upsertClass(response.data.class)
            setJoinedClass(response.data.class)
            setModalOpen(false)
          }}
        />
      )}
    </StudentGlobalPage>
  )
}

function PersonRow({ person }) {
  const initials = person.fullName.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase()
  return (
    <li className="student-person-row">
      <span className="student-person-avatar">{initials}</span>
      <div>
        <strong>{person.fullName}</strong>
      </div>
    </li>
  )
}

function PeoplePage() {
  const { api, selectedClass, selectionStatus } = useClasses()
  const [roster, setRoster] = useState({ classId: null, status: 'loading', members: [], pagination: null, error: null })

  useEffect(() => {
    if (selectionStatus !== 'ready' || !selectedClass) return undefined
    const controller = new AbortController()
    api.listMembers(selectedClass.id, { page: 1, pageSize: 50 }, { signal: controller.signal })
      .then((response) => setRoster({
        classId: selectedClass.id,
        status: 'ready',
        members: response.data,
        pagination: response.pagination,
        error: null,
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setRoster({ classId: selectedClass.id, status: 'error', members: [], pagination: null, error })
        }
      })
    return () => controller.abort()
  }, [api, selectedClass, selectionStatus])

  const currentRoster = roster.classId === selectedClass?.id ? roster : { ...roster, status: 'loading', members: [] }
  const loadMore = async () => {
    if (!selectedClass || !currentRoster.pagination?.hasNextPage) return
    try {
      const response = await api.listMembers(selectedClass.id, {
        page: currentRoster.pagination.page + 1,
        pageSize: currentRoster.pagination.pageSize,
      })
      setRoster((current) => ({
        ...current,
        members: [...current.members, ...response.data],
        pagination: response.pagination,
      }))
    } catch (error) {
      setRoster((current) => ({ ...current, status: 'error', error }))
    }
  }

  return (
    <StudentClassPage activeTab="people">
      <div className="student-people-panel">
        <section>
          <h2>Instructor</h2>
          <ul className="student-people-list">
            {selectedClass && <PersonRow person={{ fullName: selectedClass.instructor.fullName }} />}
          </ul>
        </section>
        <section>
          <div className="student-people-heading">
            <h2>Classmates</h2>
            {currentRoster.pagination && <span>{currentRoster.pagination.totalItems} students</span>}
          </div>
          {selectionStatus === 'ready' && currentRoster.status === 'loading' && <RequestState kind="loading" compact message="Loading the class roster." />}
          {currentRoster.status === 'error' && <RequestState kind="unavailable" compact error={currentRoster.error} />}
          {currentRoster.status === 'ready' && currentRoster.members.length === 0 && <RequestState kind="empty" compact message="No active classmates are listed." />}
          <ul className="student-people-list">
            {currentRoster.members.map((person) => (
              <PersonRow key={person.userId} person={person} />
            ))}
          </ul>
          {currentRoster.pagination?.hasNextPage && (
            <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classmates</button>
          )}
        </section>
      </div>
    </StudentClassPage>
  )
}

function DeferredStudentPage({ title, message }) {
  return (
    <StudentGlobalPage title={title} eyebrow="Deferred Feature">
      <RequestState kind="unavailable" title={`${title} is deferred`} message={message} />
    </StudentGlobalPage>
  )
}

function ProjectListPage() {
  return <StudentClassPage activeTab="assignments"><StudentProjectList /></StudentClassPage>
}

function ProjectDetailPage() {
  return <StudentClassPage activeTab="assignments" wide><StudentProjectDetail /></StudentClassPage>
}

function RepositoryCatalogPage({ archived = false }) {
  return (
    <StudentGlobalPage title={archived ? 'Archived Repositories' : 'My Repositories'} eyebrow="Project Collaboration Mode">
      <StudentRepositoryCatalog archived={archived} />
    </StudentGlobalPage>
  )
}

export function StudentRoutePage({ pagePath }) {
  const pages = {
    dashboard: <HomeDashboardPage />,
    classes: <StudentClassesPage />,
    todo: <StudentTodoPage />,
    'join-class': <StudentJoinClassPage />,
    invitations: <DeferredStudentPage title="Class Invitations" message="Class invitation acceptance is not part of the current backend. Join an active class with an instructor-provided code instead." />,
    activity: <ActivitiesPage />,
    submissions: <DeferredStudentPage title="My Submissions" message="A global cross-class submission list still needs a bounded backend read contract. Open a real activity to view its official attempts." />,
    'activity/:activityId': <ActivityDetailPage />,
    'activity/:activityId/workspace': <StudentProgrammingWorkspace />,
    'activity/:activityId/submissions': <SubmissionHistoryPage />,
    'activity/:activityId/submissions/:submissionId': <SubmissionDetailPage />,
    'activity/:activityId/submission-record': <LegacySubmissionRoute />,
    'activity/:activityId/feedback': <LegacySubmissionRoute />,
    projects: <ProjectListPage />,
    'projects/:projectTaskId': <ProjectDetailPage />,
    'projects/:projectTaskId/repository': <StudentClassPage activeTab="assignments" wide><RepositorySelectionRequired /></StudentClassPage>,
    'projects/:projectTaskId/repositories/:repositoryId': <RepositoryFoundationDetail />,
    'projects/:projectTaskId/repositories/:repositoryId/contributions': <DeferredStudentPage title="Contribution Tracking" message="Verified contribution analytics require a separately approved identity and evidence contract." />,
    repositories: <RepositoryCatalogPage />,
    'repositories/:repositoryId': <RepositoryFoundationDetail />,
    analytics: <DeferredStudentPage title="Analytics" message="Canonical student analytics remain recognized but are not available in the core iteration." />,
    archive: <RepositoryCatalogPage archived />,
    people: <PeoplePage />,
    settings: <DeferredStudentPage title="Settings" message="Additional account settings are not available in this iteration." />,
  }

  return pages[pagePath] || <RequestState kind="notFound" />
}

export default StudentRoutePage

