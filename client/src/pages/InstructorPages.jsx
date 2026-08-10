import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial, firstName } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'
import { InstructorActivityEditor, InstructorActivityList } from '../activities/InstructorActivityViews.jsx'
import {
  InstructorActivityMonitorRedirect,
  InstructorSubmissionQueue,
  InstructorSubmissionReview,
} from '../submissions/InstructorSubmissionViews.jsx'

function getProjectStatusClass(status) {
  if (status === 'Approved for Presentation') return 'is-approved'
  if (status === 'Revision') return 'is-revision'
  if (status === 'Missing Repository') return 'is-missing-repository'
  return undefined
}

function getContributionClass(contribution) {
  if (contribution === 'Balanced') return 'is-balanced'
  if (contribution === 'Uneven') return 'is-uneven'
  if (contribution === 'Missing') return 'is-contribution-missing'
  return undefined
}

const reviewQueueClasses = [
  {
    title: 'IT 112 - Computer Programming 1',
    section: 'BSIT 2A',
    count: '18',
    signal: 'Activities, submissions, and repository reviews pending',
    pending: '12 pending',
    secondary: '3 repo checks',
    tone: 'blue',
  },
  {
    title: 'CS 111 - Introduction to Computing',
    section: 'BSIT 2A',
    count: '9',
    signal: 'Near-deadline activities and late submissions',
    pending: '4 pending',
    secondary: '2 late',
    tone: 'green',
  },
  {
    title: 'IT 123 - Platform Technologies',
    section: 'BSIT 2A',
    count: '6',
    signal: 'Repository readiness and contribution watches',
    pending: '2 pending',
    secondary: '1 flagged',
    tone: 'purple',
  },
]

const groupProjects = [
  {
    title: 'Prelim Group Project 1 Specifications',
    due: 'Aug 27, 2026, 10:30 AM',
    status: 'Published',
    repositories: '9 / 11',
    ready: '5 teams created / 8 expected teams',
    atRisk: '2 teams',
  },
  {
    title: 'Prelim Group Project 2 Specifications',
    due: 'Sep 24, 2026, 10:30 AM',
    status: 'Published',
    repositories: '0 / 11',
    ready: '0 teams created / 8 expected teams',
    atRisk: 'Not started',
  },
  {
    title: 'Midterm Group Project 1 Specifications',
    due: 'Oct 20, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    ready: '0 teams created / 8 expected teams',
    atRisk: 'Not open',
  },
  {
    title: 'Final Group Project Proposal',
    due: 'Dec 5, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    ready: '0 teams created / 8 expected teams',
    atRisk: 'Not open',
  },
]

const projectTeams = [
  {
    team: 'Team 01',
    repo: 'prelim-group-project-1-team-01',
    representative: 'Julius Teodoro',
    lastCommit: 'Aug 26, 2026, 8:14 PM',
    contribution: 'Balanced',
    status: 'Approved for Presentation',
  },
  {
    team: 'Team 02',
    repo: 'prelim-group-project-1-team-02',
    representative: 'Marco Rivera',
    lastCommit: 'Aug 26, 2026, 5:30 PM',
    contribution: 'Uneven',
    status: 'Revision',
  },
  {
    team: 'Team 03',
    repo: 'prelim-group-project-1-team-03',
    representative: 'Alyssa Mendoza',
    lastCommit: 'Aug 27, 2026, 9:20 AM',
    contribution: 'Balanced',
    status: 'Approved for Presentation',
  },
  {
    team: 'Team 04',
    repo: 'No repository yet',
    representative: 'Pending team setup',
    lastCommit: 'No activity',
    contribution: 'Missing',
    status: 'Missing Repository',
  },
]

const repositoryFiles = [
  { name: 'src', type: 'folder', commit: 'Add menu validation', updated: '12 minutes ago' },
  { name: 'docs', type: 'folder', commit: 'Link project notes', updated: '1 hour ago' },
  { name: 'tests', type: 'folder', commit: 'Add sample scenario tests', updated: '2 hours ago' },
  { name: 'README.md', type: 'file', commit: 'Update run instructions', updated: '22 minutes ago' },
  { name: 'PROJECT_SPECIFICATIONS.md', type: 'file', commit: 'Pin official requirements', updated: 'yesterday' },
  { name: '.gitignore', type: 'file', commit: 'Initial commit', updated: 'Aug 25, 2026' },
  { name: 'pom.xml', type: 'file', commit: 'Configure Java project', updated: 'Aug 25, 2026' },
]

const repositoryCollaborators = [
  { name: 'Julius Teodoro', role: 'Team Lead' },
  { name: 'Alyssa Mendoza', role: 'Collaborator' },
  { name: 'Marco Rivera', role: 'Collaborator' },
  { name: 'Daniel Reyes', role: 'Collaborator' },
]

const contributionRows = [
  { name: 'Julius Teodoro', commits: '12', lines: '+420 / -88', tasks: '5 completed', activity: 'Active', balance: '45%' },
  { name: 'Alyssa Mendoza', commits: '8', lines: '+260 / -41', tasks: '3 completed', activity: 'Active', balance: '30%' },
  { name: 'Marco Rivera', commits: '4', lines: '+92 / -20', tasks: '1 completed', activity: 'Needs watch', balance: '15%' },
  { name: 'Daniel Reyes', commits: '2', lines: '+54 / -8', tasks: '1 completed', activity: 'Low activity', balance: '10%' },
]

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

            <RequestState kind="unavailable" compact title="Review queue integration pending" message="Cross-class activity and repository review queues will be connected in Phase 10B and 10C." />
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

export function ReviewQueuesPage() {
  const [selectedClass, setSelectedClass] = useState(null)
  const [queueFilter, setQueueFilter] = useState('activities')
  const activityQueueRows = [
    {
      title: 'Prelim Programming Exercise 2 LAB',
      due: 'Aug 30, 2026, 11:59 PM',
      status: 'Published',
      reviewState: '14 submissions need grading',
      actionPath: '/instructor/activity/act-loops-01/submissions',
    },
    {
      title: 'Loop Patterns and Input Validation',
      due: 'Sep 3, 2026, 5:00 PM',
      status: 'Near deadline',
      reviewState: '12 active submissions',
      actionPath: '/instructor/activity/act-loops-01/monitor',
    },
    {
      title: 'Student Grade Analyzer',
      due: 'Sep 10, 2026, 10:30 AM',
      status: 'For Review',
      reviewState: '6 failed visible test summaries',
      actionPath: '/instructor/submission-review',
    },
  ]
  const projectQueueRows = [
    {
      title: 'Prelim Group Project 1 Specifications',
      due: 'Aug 27, 2026, 10:30 AM',
      status: 'Ready for review',
      reviewState: '4 repositories ready',
      actionPath: '/instructor/projects/prelim-group-project-1',
    },
    {
      title: 'prelim-group-project-1-team-03',
      due: 'Aug 27, 2026, 10:30 AM',
      status: 'Repository review',
      reviewState: 'Instructor review pending',
      actionPath: '/instructor/projects/prelim-group-project-1/repository',
    },
    {
      title: 'prelim-group-project-1-team-02',
      due: 'Aug 27, 2026, 10:30 AM',
      status: 'For Review',
      reviewState: 'Contribution balance needs check',
      actionPath: '/instructor/projects/prelim-group-project-1/repository',
    },
  ]
  const visibleQueueRows = queueFilter === 'activities' ? activityQueueRows : projectQueueRows

  return (
    <div className="instructor-home-page">
      <header className="student-home-topbar instructor-dashboard-topbar">
        <InstructorUserArea count={6} />
      </header>

      <main className="student-home-content instructor-home-content">
        <section className="instructor-review-hero">
          <span className="instructor-review-hero-icon" aria-hidden="true" />
          <div>
            <h1>Review Queues</h1>
            <p>Check pending class submissions, repository reviews, and activities that need your attention.</p>
          </div>
        </section>

        <section className="instructor-review-panel">
          <div className="instructor-review-panel-heading">
            <span className="instructor-review-panel-icon" aria-hidden="true" />
            <div>
              <h2>Choose a Class</h2>
              <p>Select a class to open its review queue.</p>
            </div>
          </div>

          <div className="instructor-review-class-grid">
            {reviewQueueClasses.map((item) => {
              const isSelected = selectedClass?.title === item.title

              return (
                <div className={`instructor-review-class-block instructor-review-class-block--${item.tone}`} key={item.title}>
                  <button
                    type="button"
                    className={isSelected ? 'instructor-review-class-card is-active' : 'instructor-review-class-card'}
                    onClick={() => setSelectedClass(isSelected ? null : item)}
                  >
                    <span className={`instructor-class-avatar instructor-class-avatar--${item.title.charAt(0).toLowerCase()}`}>
                      {item.title.charAt(0)}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.section}</span>
                      <span>{item.signal}</span>
                    </div>
                    <em>{item.pending}</em>
                    <em className="is-muted">{item.secondary}</em>
                    <span className={isSelected ? 'student-home-card-action is-open' : 'student-home-card-action'} aria-hidden="true" />
                  </button>

                  {isSelected && (
                    <section className="instructor-inline-review-table" aria-label={`${item.title} review queue`}>
                      <div className="instructor-inline-review-heading">
                        <div>
                          <h3>{item.title} review queue</h3>
                          <span>{item.section}</span>
                        </div>
                        <div className="student-segmented-tabs" role="tablist" aria-label="Review queue type">
                          <button
                            type="button"
                            className={queueFilter === 'activities' ? 'is-active' : undefined}
                            onClick={() => setQueueFilter('activities')}
                          >
                            <span className="instructor-filter-icon instructor-filter-icon--activities" aria-hidden="true" />
                            Activities
                          </button>
                          <button
                            type="button"
                            className={queueFilter === 'projects' ? 'is-active' : undefined}
                            onClick={() => setQueueFilter('projects')}
                          >
                            <span className="instructor-filter-icon instructor-filter-icon--projects" aria-hidden="true" />
                            Group Projects
                          </button>
                        </div>
                      </div>

                      <div className="instructor-data-table" role="table" aria-label={`${item.title} ${queueFilter} reviews`}>
                        <div className="instructor-table-row instructor-table-row--head instructor-review-queue-row" role="row">
                          <span>Title</span>
                          <span>Due Date</span>
                          <span>Status</span>
                          <span>Review State</span>
                          <span>Action</span>
                        </div>
                        {visibleQueueRows.map((row) => (
                          <div className="instructor-table-row instructor-review-queue-row" role="row" key={row.title}>
                            <strong>{row.title}</strong>
                            <span>{row.due}</span>
                            <em className={`instructor-review-status instructor-review-status--${row.status.toLowerCase().replaceAll(' ', '-')}`}>{row.status}</em>
                            <span>{row.reviewState}</span>
                            <div>
                              <NavLink to={row.actionPath}>Review</NavLink>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function InstructorProjectsPage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="projects" />
          <div className="instructor-controls-row">
            <NavLink to="/instructor/projects/new" className="student-primary-action instructor-create-action">Create Project Requirement</NavLink>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Group Projects</p>
          <h2>Project requirements management</h2>
          <span>Publish requirements, monitor repositories, and review presentation readiness with hardcoded prototype data.</span>
        </section>

        <div className="instructor-data-table" role="table" aria-label="Group projects">
          <div className="instructor-table-row instructor-table-row--head instructor-project-row" role="row">
            <span>Project Requirement</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Repositories</span>
            <span>Teams</span>
            <span>At-risk Teams</span>
            <span>Actions</span>
          </div>
          {groupProjects.map((project) => (
            <div className="instructor-table-row instructor-project-row" role="row" key={project.title}>
              <strong>{project.title}</strong>
              <span>{project.due}</span>
              <em>{project.status}</em>
              <span>{project.repositories}</span>
              <span>{project.ready}</span>
              <span>{project.atRisk}</span>
              <div>
                <NavLink to="/instructor/projects/prelim-group-project-1">View</NavLink>
                <NavLink to="/instructor/projects/new">Configure</NavLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function CreateProjectRequirementPage() {
  const [status, setStatus] = useState('Project requirement draft not saved.')
  const [maxGroupSize, setMaxGroupSize] = useState('4')

  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel instructor-form-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="projects" />
          <NavLink to="/instructor/projects" className="student-outline-action">Back to projects</NavLink>
        </div>

        <section className="instructor-page-heading">
          <p>Create Project Requirement</p>
          <h2>Publish group project specifications</h2>
          <span>Team repository requirement setup for IT 112 - BSIT 2A.</span>
        </section>

        <div className="instructor-form-grid">
          <label>
            Project title
            <input defaultValue="Prelim Group Project 1 Specifications" />
          </label>
          <label>
            Maximum group size / maximum repository collaborators
            <div className="instructor-attempt-control instructor-group-size-control" role="group" aria-label="Maximum group size">
              {['4', '5', '6', '7', '8'].map((size) => (
                <button
                  type="button"
                  className={maxGroupSize === size ? 'is-active' : undefined}
                  onClick={() => setMaxGroupSize(size)}
                  key={size}
                >
                  {size}
                </button>
              ))}
            </div>
          </label>
          <label>
            Deadline
            <input defaultValue="2026-08-27 10:30" />
          </label>
          <label>
            Repository type
            <span className="instructor-fixed-value">Team repository</span>
          </label>
        </div>
        <p className="instructor-field-note">
          Team repositories can have up to {maxGroupSize} collaborators for this requirement.
        </p>

        <label className="instructor-wide-field">
          Project specifications / instructions
          <textarea defaultValue="Create a Java-based preliminary group project. Keep source code, documentation, tests, and implementation notes in the linked team repository. Mark the repository ready when all deliverables are complete." />
        </label>

        <section className="instructor-upload-placeholder">
          <span className="student-pdf-icon">PDF</span>
          <div>
            <strong>Project specifications PDF placeholder</strong>
            <p>Prelim Group Project 1 Specifications.pdf can be attached for the class.</p>
          </div>
          <button type="button">Choose PDF</button>
        </section>

        <div className="instructor-form-grid">
          <label>
            Required deliverables
            <textarea defaultValue={'README.md\nsrc folder\ntests folder\nPROJECT_SPECIFICATIONS.md\nFinal demo notes'} />
          </label>
          <label>
            Rubric
            <textarea defaultValue={'Correctness - 40\nRepository organization - 20\nContribution balance - 20\nDocumentation - 20'} />
          </label>
        </div>

        <div className="instructor-settings-grid">
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Contribution tracking enabled</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Similarity review enabled</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Archive requirement enabled</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Instructor approval required before preservation</span>
          </label>
        </div>

        <div className="instructor-form-actions">
          <button type="button" className="student-outline-action" onClick={() => setStatus('Project requirement draft saved locally.')}>
            Save Draft
          </button>
          <button type="button" className="student-primary-action" onClick={() => setStatus('Project requirement marked as published in local prototype state.')}>
            Publish Project
          </button>
          <p>{status}</p>
        </div>
      </div>
    </InstructorClassPage>
  )
}

function ProjectMonitoringPage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="projects" />
          <div className="instructor-controls-row">
            <NavLink to="/instructor/projects" className="student-outline-action">Back to group projects</NavLink>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Project Requirement Monitoring</p>
          <h2>Prelim Group Project 1 Specifications</h2>
          <span>Due Aug 27, 2026, 10:30 AM - repositories created 3 / 4</span>
        </section>

        <section className="instructor-upload-placeholder">
          <span className="student-pdf-icon">PDF</span>
          <div>
            <strong>Official specifications attached</strong>
            <p>Prelim Group Project 1 Specifications.pdf - group size rule: 4 students per team.</p>
          </div>
          <button type="button">View specs</button>
        </section>

        <div className="instructor-stat-grid instructor-monitor-grid">
          <article className="instructor-stat-card">
            <span>Repository progress</span>
            <strong>3 / 4</strong>
            <p>Listed teams with repositories</p>
          </article>
          <article className="instructor-stat-card">
            <span>Ready for presentation</span>
            <strong>2</strong>
            <p>Teams approved below</p>
          </article>
          <article className="instructor-stat-card">
            <span>At-risk teams</span>
            <strong>2</strong>
            <p>Revision, missing repository, or uneven contribution</p>
          </article>
        </div>

        <div className="instructor-data-table" role="table" aria-label="Project teams">
          <div className="instructor-table-row instructor-table-row--head instructor-team-row">
            <span>Team</span>
            <span>Repository</span>
            <span>Team Representative</span>
            <span>Last Commit</span>
            <span>Contribution</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {projectTeams.map((team) => (
            <div className="instructor-table-row instructor-team-row" key={team.team}>
              <strong>{team.team}</strong>
              <span>{team.repo}</span>
              <span>{team.representative}</span>
              <span>{team.lastCommit}</span>
              <em className={getContributionClass(team.contribution)}>{team.contribution}</em>
              <em className={getProjectStatusClass(team.status)}>{team.status}</em>
              <div>
                <NavLink to="/instructor/projects/prelim-group-project-1/repository">Review</NavLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function ContributionReviewPanel() {
  return (
    <section className="instructor-repo-panel">
      <div className="instructor-section-title">
        <h3>Contribution Summary</h3>
        <span>Instructor review</span>
      </div>
      <div className="instructor-contribution-list">
        {contributionRows.map((row) => (
          <article key={row.name}>
            <strong>{row.name}</strong>
            <span>{row.commits} commits</span>
            <span>{row.lines}</span>
            <span>{row.tasks}</span>
            <em>{row.balance}</em>
            <p>{row.activity}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function AddReviewModal({ onClose }) {
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-review-title">
      <section className="instructor-action-modal instructor-add-review-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close add review" />
        <p>Repository Review</p>
        <h2 id="add-review-title">Add Review</h2>
        <label className="instructor-wide-field">
          Notes
          <textarea defaultValue="Repository structure is clear. Review the README setup steps and confirm the final presentation branch before marking the team ready." />
        </label>
        <section className="instructor-upload-placeholder">
          <span className="student-pdf-icon">PDF</span>
          <div>
            <strong>Import PDF for notes</strong>
            <p>Attach an annotated review note or rubric export for this team.</p>
          </div>
          <button type="button">Import PDF</button>
        </section>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Return for Revision</button>
          <button type="button" className="student-primary-action" onClick={onClose}>Approve for Presentation</button>
        </div>
      </section>
    </div>
  )
}

function InviteCollaboratorModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-collaborator-title">
      <section className="instructor-action-modal instructor-invite-collaborator-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close invite collaborator" />
        <p>Collaborator Invite</p>
        <h2 id="invite-collaborator-title">Invite collaborator by email</h2>
        <label className="instructor-wide-field">
          Email address
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@slu.edu.ph"
          />
        </label>
        {status && <span className="instructor-modal-status">{status}</span>}
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Close</button>
          <button
            type="button"
            className="student-primary-action"
            onClick={() => setStatus(email ? `Invitation queued for ${email}` : 'Enter an email address first.')}
          >
            Send Invite
          </button>
        </div>
      </section>
    </div>
  )
}

function InstructorRepositoryReviewPage() {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [repoMenuOpen, setRepoMenuOpen] = useState(false)
  const [codeMenuOpen, setCodeMenuOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const branches = ['main', 'presentation-ready', 'revision-notes']

  return (
    <div className="instructor-repository-page">
      <header className="student-repository-topbar">
        <div className="student-repository-breadcrumb">
          <NavLink to="/instructor/classes">IT 112</NavLink>
          <NavLink to="/instructor/projects/prelim-group-project-1">Prelim Group Project 1</NavLink>
          <strong>prelim-group-project-1-team-03</strong>
        </div>
        <InstructorUserArea count={4} />
      </header>

      <main className="student-repository-content instructor-repository-content">
        <section className="student-repository-hero">
          <span className="student-repo-mark" aria-hidden="true" />
          <div>
            <h1>prelim-group-project-1-team-03</h1>
            <span className="student-repo-state">Instructor Review Mode</span>
          </div>
        </section>

        <div className="student-repository-toolbar">
          <div className="instructor-repo-dropdown">
            <button type="button" className="instructor-branch-button" onClick={() => setBranchOpen((current) => !current)}>
              <span className="instructor-branch-icon" aria-hidden="true" />
              {selectedBranch}
              <span className="instructor-caret" aria-hidden="true" />
            </button>
            {branchOpen && (
              <div className="instructor-repo-menu instructor-branch-menu" aria-label="Repository branches">
                <strong>Select Git revision</strong>
                <label>
                  <span>Search</span>
                  <input placeholder="Search by Git revision" />
                </label>
                <span className="instructor-menu-group-label">Selected</span>
                {branches.map((branch) => (
                  <button
                    type="button"
                    className={selectedBranch === branch ? 'is-active' : undefined}
                    onClick={() => {
                      setSelectedBranch(branch)
                      setBranchOpen(false)
                    }}
                    key={branch}
                  >
                    {branch}
                    {branch === 'main' && (
                      <>
                        <em>default</em>
                        <em>protected</em>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span>Linked to IT 112</span>
          <span>Team repository</span>
          <span>Ready for Review</span>
          <div className="instructor-repo-toolbar-spacer" />
          <div className="instructor-repo-dropdown">
            <button type="button" className="instructor-repo-icon-button" onClick={() => setRepoMenuOpen((current) => !current)}>+</button>
            {repoMenuOpen && (
              <div className="instructor-repo-menu instructor-repo-menu--right" aria-label="Repository actions">
                <span className="instructor-menu-group-label">This directory</span>
                <button type="button">New file</button>
                <button type="button">Upload file</button>
                <button type="button">New directory</button>
                <span className="instructor-menu-divider" />
                <span className="instructor-menu-group-label">This repository</span>
                <button type="button">New branch</button>
                <button type="button">New tag</button>
              </div>
            )}
          </div>
          <button type="button">Find file</button>
          <div className="instructor-repo-dropdown">
            <button type="button" className="student-repo-code-button" onClick={() => setCodeMenuOpen((current) => !current)}>
              Code
              <span className="instructor-caret" aria-hidden="true" />
            </button>
            {codeMenuOpen && (
              <div className="instructor-repo-menu instructor-repo-menu--right" aria-label="Code options">
                <button type="button">Copy clone URL</button>
                <button type="button">Download ZIP</button>
                <button type="button">Open in IDE</button>
              </div>
            )}
          </div>
          <button type="button">History</button>
        </div>

        <div className="student-repository-grid">
          <section className="student-repo-main-column">
            <article className="student-repo-commit-card">
              <span className="student-user-avatar" aria-hidden="true" />
              <div>
                <strong>Alyssa Mendoza committed 12 minutes ago</strong>
                <span>Add menu validation and update README instructions</span>
              </div>
              <code>8f41ac2</code>
              <button type="button">View commit</button>
            </article>

            <section className="student-repo-card">
              <div className="student-repo-file-head">
                <span>Name</span>
                <span>Last commit</span>
                <span>Last update</span>
              </div>
              {repositoryFiles.map((file) => (
                <div className="student-repo-file-row" key={file.name}>
                  <span className={`student-repo-file-icon student-repo-file-icon--${file.type}`} aria-hidden="true" />
                  <strong>{file.name}</strong>
                  <span>{file.commit}</span>
                  <span>{file.updated}</span>
                </div>
              ))}
            </section>

            <section className="student-repo-card student-readme-card">
              <div className="student-repo-card-title">
                <h2>README.md</h2>
                <span>Preview</span>
              </div>
              <h3>Prelim Group Project 1</h3>
              <p>
                Java project for the preliminary group requirement. The repository includes
                source code, tests, documentation, and linked official specifications.
              </p>
              <ol>
                <li>Open the project in IntelliJ IDEA</li>
                <li>Run the Java entry point</li>
                <li>Review test scenarios under tests</li>
              </ol>
            </section>
          </section>

          <aside className="student-repo-side-column">
            <section className="student-repo-card">
              <h2>Project Information</h2>
              <ul className="student-repo-info-list">
                <li>Ready for review</li>
                <li>12 commits</li>
                <li>4 collaborators</li>
                <li>Official specs linked</li>
                <li>Created on Aug 25, 2026</li>
              </ul>
            </section>

            <section className="student-repo-card instructor-collaborators-card">
              <div className="instructor-side-card-heading">
                <h2>Collaborators</h2>
                <button type="button" onClick={() => setInviteOpen(true)}>Invite</button>
              </div>
              <ul className="student-collaborator-list">
                {repositoryCollaborators.map((member) => (
                  <li key={member.name}>
                    <span className="student-person-avatar">{member.name.charAt(0)}</span>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.role}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="student-repo-card instructor-review-actions">
              <h2>Instructor Review Panel</h2>
              <p>Review repository completeness, contribution balance, and readiness for presentation.</p>
              <button type="button" className="student-primary-action" onClick={() => setReviewOpen(true)}>Add Review</button>
            </section>
          </aside>

          <section className="student-repo-card student-spec-card">
            <h2>Pinned Official Project Specifications</h2>
            <p>This repository is linked to the official project requirement.</p>
            <div className="student-attachment student-attachment--wide">
              <span className="student-pdf-icon">PDF</span>
              <div>
                <strong>Prelim Group Project 1 Specifications.pdf</strong>
                <span>324 KB</span>
              </div>
              <span className="student-document-preview" aria-hidden="true" />
            </div>
          </section>

          <ContributionReviewPanel />
        </div>
      </main>
      {reviewOpen && <AddReviewModal onClose={() => setReviewOpen(false)} />}
      {inviteOpen && <InviteCollaboratorModal onClose={() => setInviteOpen(false)} />}
    </div>
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

function DeferredInstructorPage({ title, message }) {
  return (
    <div className="student-global-page">
      <header className="student-home-topbar"><InstructorUserArea /></header>
      <main className="student-global-content"><div className="student-global-heading"><div><p>Deferred Feature</p><h1>{title}</h1></div></div><RequestState kind="unavailable" title={`${title} is deferred`} message={message} /></main>
    </div>
  )
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
    projects: <InstructorProjectsPage />,
    'projects/new': <CreateProjectRequirementPage />,
    'projects/prelim-group-project-1': <ProjectMonitoringPage />,
    'projects/prelim-group-project-1/repository': <InstructorRepositoryReviewPage />,
    'projects/repo-campus-nav/contributions': <InstructorRepositoryReviewPage />,
    'projects/repo-campus-nav/similarity': <InstructorRepositoryReviewPage />,
    'projects/repo-campus-nav/archive': <InstructorRepositoryReviewPage />,
    people: <InstructorPeoplePage />,
    roster: <InstructorPeoplePage />,
    'class-info': <InstructorClassInfoPage />,
    'class-code': <InstructorClassCodePage />,
    'invite-students': <DeferredInstructorPage title="Invite Students" message="Invite-by-email is not part of the current backend. Share the active server-owned join code through an appropriate external channel." />,
    analytics: <DeferredInstructorPage title="Analytics" message="Canonical instructor analytics remain recognized but are not available in the core iteration." />,
    'students/stu-alyssa': <DeferredInstructorPage title="Student Profile" message="A consolidated cross-class student profile is not available in the current backend." />,
  }

  return pages[pagePath] || <RequestState kind="notFound" />
}

export default InstructorRoutePage
