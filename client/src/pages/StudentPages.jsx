import ClassIdentityBadge from '../classes/ClassIdentityBadge.jsx'
import GroupBrowserEditor from '../repositories/GroupBrowserEditor.jsx'
import ClassCardGrid from '../classes/ClassCardGrid.jsx'
import ClassOverviewCard from '../classes/ClassOverviewCard.jsx'
import StudentWorkOverview from '../activities/StudentWorkOverview.jsx'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import AccountMenu from '../components/AccountMenu.jsx'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, useSearchParams } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classOfferingLabel } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { WorkHubList } from '../work-hub/WorkHubViews.jsx'
import { StudentClassInvitationPanel } from '../classes/ClassInvitationViews.jsx'
import { StudentNotificationMenu } from '../classes/StudentInvitationNotifications.jsx'
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

function ClassHeader({ activeTab }) {
  const { selectedClass } = useClasses()
  const tabs = [
    { label: 'Overview', path: '/student/classes', key: 'stream' },
    { label: 'Activities', path: '/student/activity', key: 'assignments' },
    { label: 'People', path: '/student/people', key: 'people' },
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
              {selectedClass && <span>{selectedClass.instructor.fullName}</span>}
              {selectedClass?.status === 'ARCHIVED' && <span>Archived</span>}
            </div>
          </div>
        </div>

        <div className="student-user-area">
          <StudentNotificationMenu />
          <AccountMenu />
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
              <ProjexIcon name={tab.key === 'assignments' ? 'activity' : tab.key === 'people' ? 'people' : 'preview'} />
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
    ? ''
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

function StudentClassCards({ classes }) {
  return <ClassCardGrid classes={classes} role="student" />
}

function HomeDashboardPage() {
  const { api, upsertClass, classes, error, pagination, status, loadMore } = useClasses()
  const [params, setParams] = useSearchParams()
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinNotice, setJoinNotice] = useState('')
  const closeJoin = () => {
    setJoinOpen(false)
    if (params.has('join')) { const next = new URLSearchParams(params); next.delete('join'); setParams(next, { replace: true }) }
  }
  return <div className="student-home-page">
    <header className="student-home-topbar"><div /><div className="student-user-area"><StudentNotificationMenu /><AccountMenu /></div></header>
    <main className="student-home-content">
      <section className="student-home-classes student-home-classes-panel academic-home-classes">
        <div className="student-home-section-heading"><h1>Classes</h1><button type="button" className="student-primary-action" onClick={() => setJoinOpen(true)}><ProjexIcon name="join" />Join Class</button></div>
        {joinNotice && <p role="status" className="student-joined-state">{joinNotice}</p>}
        {status === 'loading' && <RequestState kind="loading" compact message="Loading your classes." />}
        {status === 'error' && <RequestState kind="unavailable" compact error={error} />}
        {status === 'ready' && classes.length === 0 && <RequestState kind="empty" compact message="Join a class to see it here." />}
        <StudentClassCards classes={classes} />
        {pagination?.hasNextPage && <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>}
      </section>
    </main>
    {(joinOpen || params.get('join') === 'code') && <JoinClassModal onClose={closeJoin} onJoin={async code => {
      const response = await api.joinClass(code)
      upsertClass(response.data.class)
      setJoinNotice(`Joined ${response.data.class.className}.`)
      closeJoin()
    }} />}
  </div>
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
          <ClassOverviewCard classRecord={selectedClass} />
        )}
      </StudentClassPage>
    )
  }

  return (
    <StudentGlobalPage title="My Classes" eyebrow="Class Membership">
      {status === 'loading' && <RequestState kind="loading" message="Loading your authorized classes." />}
      {status === 'error' && <RequestState kind="unavailable" error={error} />}
      {status === 'ready' && classes.length === 0 && <RequestState kind="empty" message="Join a class using an instructor-provided code." />}
      {status === 'ready' && classes.length > 0 && <StudentClassCards classes={classes} />}
      {pagination?.hasNextPage && (
        <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>
      )}
    </StudentGlobalPage>
  )
}

function AssignmentSubTabs({ active }) {
  const { selectedClass } = useClasses()
  return (
    <div className="student-segmented-tabs" aria-label="Activities and projects">
      <NavLink to={classHref('/student/activity', selectedClass?.id)} className={active === 'activities' ? 'is-active' : undefined}>
        <ProjexIcon name="activity" />
        Activities
      </NavLink>
      <NavLink to={classHref('/student/projects', selectedClass?.id)} className={active === 'projects' ? 'is-active' : undefined}>
        <ProjexIcon name="project" />
        Group Projects
      </NavLink>
    </div>
  )
}

function ActivitiesPage() {
  const [params] = useSearchParams()
  return (
    <StudentClassPage activeTab="assignments" deferredLabel="">
      <AssignmentSubTabs active="activities" />
      {params.get('view') === 'work' ? <StudentWorkOverview /> : <StudentActivityList />}
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
      <AssignmentSubTabs active="activities" /><StudentSubmissionHistory />
    </StudentClassPage>
  )
}

function SubmissionDetailPage() {
  return (
    <StudentClassPage activeTab="assignments" wide deferredLabel="">
      <AssignmentSubTabs active="activities" /><StudentSubmissionDetail />
    </StudentClassPage>
  )
}


function StudentGlobalPage({ title, eyebrow, action, children }) {
  return (
    <div className="student-global-page">
      <header className="student-home-topbar">
        <div />
        <div className="student-user-area">
          <StudentNotificationMenu />
          <AccountMenu />
        </div>
      </header>

      <main className="student-global-content">
        <div className="student-global-heading">
          <div>
            {eyebrow && <p>{eyebrow}</p>}
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
  const { classes, pagination, loadMore } = useClasses()
  return (
    <StudentGlobalPage title="To-do">
      <WorkHubList view="todo" classes={classes} moreClasses={pagination?.hasNextPage} onMoreClasses={loadMore} />
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
    <AppDialog title="Join Class" onClose={onClose} busy={joining}>
      <form className="academic-join-form" onSubmit={submit}>
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
          <button type="button" className="student-outline-action" disabled={joining} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="student-primary-action"
            disabled={joining || !classCode.trim()}
          >
            {joining ? 'Joining…' : 'Join Class'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

function PersonRow({ person }) {
  const initials = person.fullName.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase()
  return (
    <li className="student-person-row">
      <span className="student-person-avatar" aria-hidden="true">{initials}</span>
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
      <div className="student-people-panel academic-people-panel academic-classwork-panel">
        <header className="academic-people-toolbar"><h2><ProjexIcon name="people" />People</h2></header>
        <section>
          <h3 className="academic-people-section-title">Instructor</h3>
          <ul className="student-people-list">
            {selectedClass && <PersonRow person={{ fullName: selectedClass.instructor.fullName }} />}
          </ul>
        </section>
        <section>
          <div className="student-people-heading">
            <h3 className="academic-people-section-title">Classmates</h3>
            {currentRoster.pagination && <span>{currentRoster.pagination.totalItems} {currentRoster.pagination.totalItems === 1 ? 'student' : 'students'}</span>}
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
  return <StudentClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" /><StudentProjectList /></StudentClassPage>
}

function ProjectDetailPage() {
  return <StudentClassPage activeTab="assignments" deferredLabel="" wide><StudentProjectDetail /></StudentClassPage>
}

function RepositoryCatalogPage({ archived = false }) {
  return (
    <StudentGlobalPage title={archived ? 'Archived Repositories' : 'My Repositories'}>
      <StudentRepositoryCatalog archived={archived} />
    </StudentGlobalPage>
  )
}

function ProjectRepositoryPage() {
  const { requestedClassId } = useClasses()
  const repository = <RepositoryFoundationDetail />
  return requestedClassId ? <StudentClassPage activeTab="assignments" deferredLabel=""><AssignmentSubTabs active="projects" />{repository}</StudentClassPage> : repository
}

export function StudentRoutePage({ pagePath }) {
  const pages = {
    dashboard: <HomeDashboardPage />,
    classes: <StudentClassesPage />,
    todo: <StudentTodoPage />,
    'join-class': <Navigate to="/student?join=code" replace />,
    invitations: (
      <StudentGlobalPage title="Class Invitations" eyebrow="Class Membership">
        <StudentClassInvitationPanel />
      </StudentGlobalPage>
    ),
    activity: <ActivitiesPage />,
    submissions: <Navigate to="/student/todo?tab=done" replace />,
    'activity/:activityId': <ActivityDetailPage />,
    'activity/:activityId/workspace': <StudentProgrammingWorkspace />,
    'activity/:activityId/submissions': <SubmissionHistoryPage />,
    'activity/:activityId/submissions/:submissionId': <SubmissionDetailPage />,
    'activity/:activityId/submission-record': <LegacySubmissionRoute />,
    'activity/:activityId/feedback': <LegacySubmissionRoute />,
    projects: <ProjectListPage />,
    'projects/:projectTaskId': <ProjectDetailPage />,
    'projects/:projectTaskId/repository': <StudentClassPage activeTab="assignments" wide><RepositorySelectionRequired /></StudentClassPage>,
    'projects/:projectTaskId/repositories/:repositoryId/editor': <GroupBrowserEditor />,
    'projects/:projectTaskId/repositories/:repositoryId': <ProjectRepositoryPage />,
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

