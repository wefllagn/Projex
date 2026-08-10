import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial, firstName } from '../classes/class-links.js'
import RequestState from '../components/RequestState.jsx'

const groupProjects = [
  {
    title: 'Final Group Project Proposal',
    due: 'Dec 5, 2026, 10:30 AM',
    dueValue: '2026-12-05T10:30:00',
    status: 'Upcoming',
  },
  {
    title: 'Midterm Group Project 1 Specifications',
    due: 'Oct 20, 2026, 10:30 AM',
    dueValue: '2026-10-20T10:30:00',
    status: 'Upcoming',
  },
  {
    title: 'Prelim Group Project 2 Specifications',
    due: 'Sep 24, 2026, 10:30 AM',
    dueValue: '2026-09-24T10:30:00',
    status: 'Upcoming',
  },
  {
    title: 'Prelim Group Project 1 Specifications',
    due: 'Aug 27, 2026, 10:30 AM',
    dueValue: '2026-08-27T10:30:00',
    status: 'Repository Needed',
    expanded: true,
    posted: 'Posted Aug 25, 2026',
  },
]

const repositoryInviteCandidates = [
  { name: 'Alyssa Mendoza', email: 'alyssa.mendoza@slu.edu.ph', avatar: 'A' },
  { name: 'Rafael Santos', email: 'rafael.santos@slu.edu.ph', avatar: 'R' },
  { name: 'Mica Dela Cruz', email: 'mica.delacruz@slu.edu.ph', avatar: 'M' },
  { name: 'Julius Teodoro', email: 'julius.teodoro@slu.edu.ph', avatar: 'JT' },
  { name: 'Carlo Reyes', email: 'carlo.reyes@slu.edu.ph', avatar: 'C' },
  { name: 'Daniel Mendoza', email: 'daniel.mendoza@slu.edu.ph', avatar: 'D' },
  { name: 'Nina Salvador', email: 'nina.salvador@slu.edu.ph', avatar: 'N' },
]

const feedbackResults = [
  { label: 'Top border of asterisks', status: 'Passed' },
  { label: 'Bottom border of asterisks', status: 'Passed' },
  { label: '"hello world" appears correctly', status: 'Passed' },
  { label: 'Required blank lines inside the box', status: 'Passed' },
  { label: 'Program exits successfully', status: 'Passed' },
]

const workspaceCode = `/*
 * Author: ( Last Name, First Name, Middle Initial )
 * Programming Date:
 * Activity Name and Number: Prelim Exercise Number 1
 */
// This source code should be saved in a file called Exercise1.java
package exercises.prelim;

import java.lang.*;

public class Exercise1 {
    public static void main(String[] args) {
        System.out.println("*******************************");
        System.out.println("*                             *");
        System.out.println("*         hello world         *");
        System.out.println("*                             *");
        System.out.println("*******************************");
        System.exit(0);
    }
}`

const workspaceObjectives = [
  'Create a Java source code/program using IntelliJ IDEA',
  'Compile a Java program into bytecode using IntelliJ IDEA',
  'Run a compiled Java program using IntelliJ IDEA',
  'Describe the structure of a Java program with a main method',
  'Apply the output statement System.out.println()',
  'Explain why Java is case-sensitive',
]

const workspaceActivities = [
  'Open/run IntelliJ IDEA and open the workspace folder',
  'Create a file named Exercise1.java and type the program',
  'Save, compile, and run the program; fix errors until there are none',
  'Modify the output from hello world in a box to a calling-card style output',
  'Back up the file in a personal device or online repository',
]

const repositoryFiles = [
  { name: 'src', type: 'folder', commit: 'Initial commit', updated: 'a few minutes ago' },
  { name: 'docs', type: 'folder', commit: 'Initial commit', updated: 'a few minutes ago' },
  { name: 'README.md', type: 'file', commit: 'Initial commit', updated: 'a few minutes ago' },
  { name: '.gitignore', type: 'file', commit: 'Initial commit', updated: 'a few minutes ago' },
]

const repositoryCollaborators = [
  { name: 'Julius Teodoro', role: 'Team Lead', marker: 'You' },
  { name: 'Alyssa Mendoza', role: 'Collaborator' },
  { name: 'Marco Rivera', role: 'Collaborator' },
  { name: 'Daniel Reyes', role: 'Collaborator' },
]

const repositoryCommits = [
  { id: '3a7f9c1', message: 'Initial commit', author: 'Julius Teodoro', time: 'a few minutes ago' },
  { id: '9b2e104', message: 'Add README project outline', author: 'Alyssa Mendoza', time: '12 minutes ago' },
  { id: '51dc83a', message: 'Create docs folder for requirements', author: 'Daniel Reyes', time: '18 minutes ago' },
]

const todoSections = [
  {
    id: 'no-due-date',
    label: 'No Due Date',
    tone: 'blue',
    items: [
      {
        title: 'Read Java Naming Conventions Guide',
        meta: 'No strict deadline',
        type: 'Reference',
        className: 'IT 112 - BSIT 2A',
        path: '/student/projects/prelim-group-project-1/repository',
      },
    ],
  },
  {
    id: 'this-week',
    label: 'This Week',
    tone: 'blue',
    items: [
      {
        title: 'Prelim Programming Exercise 1 LAB',
        meta: 'Due Jul 3, 2026, 5:00 PM',
        type: 'Activity',
        status: 'Not submitted',
        className: 'IT 112 - BSIT 2A',
        path: '/student/activity/act-loops-01',
      },
      {
        title: 'Prelim Group Project 1 Specifications',
        meta: 'Repository setup due Aug 27, 2026',
        type: 'Group Project',
        status: 'Repository setup required',
        className: 'IT 112 - BSIT 2A',
        path: '/student/projects/prelim-group-project-1',
      },
    ],
  },
  {
    id: 'next-week',
    label: 'Next Week',
    tone: 'green',
    items: [
      {
        title: 'Loop Patterns and Input Validation',
        meta: 'Due Jul 10, 2026, 10:30 AM',
        type: 'Activity',
        className: 'IT 112 - BSIT 2A',
        path: '/student/activity/act-loops-01',
      },
    ],
  },
  {
    id: 'later',
    label: 'Later',
    tone: 'purple',
    items: [
      {
        title: 'Team Repository Progress Check',
        meta: 'Upcoming in August',
        type: 'Upcoming',
        className: 'IT 112 - BSIT 2A',
        path: '/student/projects/prelim-group-project-1/repository',
      },
    ],
  },
]

const studentRepositoryGroups = [
  {
    id: 'it112',
    label: 'IT 112 - Computer Programming 1',
    section: 'BSIT 2A',
    repos: [
      {
        name: 'prelim-group-project-1-team-03',
        detail: 'Team repository - ready for class project setup',
        status: 'In Progress',
        updated: 'Updated a few minutes ago',
        path: '/student/projects/prelim-group-project-1/repository',
      },
      {
        name: 'hello-world-lab-julius',
        detail: 'Activity workspace backup',
        status: 'Submitted',
        updated: 'Updated Jun 30, 2026',
        path: '/student/projects/prelim-group-project-1/repository',
      },
    ],
  },
  {
    id: 'cs111',
    label: 'CS 111 - Introduction to Computing',
    section: 'BSIT 2A',
    repos: [
      {
        name: 'campus-nav-prototype',
        detail: 'Team repository - invited collaborator',
        status: 'Invitation Pending',
        updated: 'Updated Jun 26, 2026',
        path: '/student/projects/prelim-group-project-1/repository',
      },
    ],
  },
]

const personalRepositories = [
  {
    name: 'java-practice-julius',
    detail: 'Exercises, experiments, and review snippets',
    status: 'Active',
    updated: 'Updated yesterday',
    path: '/student/projects/prelim-group-project-1/repository',
  },
]

const availableProjectRepositories = [
  {
    name: 'prelim-group-project-1-team-01',
    members: 'Julius Teodoro, Rafael Santos, Mica Dela Cruz',
    slots: 1,
  },
  {
    name: 'prelim-group-project-1-team-03',
    members: 'Alyssa Mendoza, Marco Rivera, Daniel Reyes',
    slots: 1,
  },
  {
    name: 'prelim-group-project-1-team-05',
    members: 'Nina Salvador, Carlo Reyes',
    slots: 2,
  },
]

function sortByOption(items, option) {
  return [...items].sort((first, second) => {
    if (option === 'title') {
      return first.title.localeCompare(second.title)
    }

    if (option === 'status') {
      return (first.status || '').localeCompare(second.status || '')
    }

    return new Date(first.dueValue) - new Date(second.dueValue)
  })
}

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
  const previewLabel = deferredLabel || (activeTab === 'assignments' ? 'Activity and project integration' : '')
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

function ClassAwareLink({ to, ...props }) {
  const { selectedClass } = useClasses()
  return <NavLink to={classHref(to, selectedClass?.id)} {...props} />
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
  const [sortBy, setSortBy] = useState('due')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const assignmentRows = [
    {
      title: 'Prelim Programming Exercise 1 LAB',
      description: 'Write a Java program that performs basic input, output, and arithmetic operations.',
      posted: 'Posted Aug 25, 2022',
      due: 'Due Aug 27, 2022, 10:30 AM',
      dueValue: '2022-08-27T10:30:00',
      status: 'Not Submitted',
      type: 'Activity',
      action: 'View Details',
      path: '/student/activity/act-loops-01',
    },
    {
      title: 'Prelim Programming Exercise 2 LAB',
      description: 'Conditional statements and loops implementation in Java.',
      posted: 'Posted Aug 27, 2022',
      due: 'Due Aug 27, 2022, 11:59 PM',
      dueValue: '2022-08-27T23:59:00',
      status: 'Not Submitted',
      type: 'Activity',
      action: 'View Details',
      path: '/student/activity/act-loops-01',
    },
    {
      title: 'Prelim Programming Exercise 3 LAB',
      description: 'Arrays, methods, and string manipulation.',
      posted: 'Posted Aug 30, 2022',
      due: 'Due Sep 3, 2022, 10:30 AM',
      dueValue: '2022-09-03T10:30:00',
      status: 'Submitted',
      type: 'Activity',
      action: 'View Submission',
      path: '/student/activity/act-loops-01/submitted',
    },
    {
      title: 'Prelim Programming Exercise 4 LAB',
      description: 'File handling and exception handling.',
      posted: 'Posted Sep 2, 2022',
      due: 'Due Sep 3, 2022',
      dueValue: '2022-09-03T23:59:00',
      status: 'Submitted',
      type: 'Activity',
      action: 'View Submission',
      path: '/student/activity/act-loops-01/submitted',
    },
    {
      title: 'Prelim Programming Exercise 6 LAB',
      description: 'Basic object-oriented programming concepts.',
      posted: 'Posted Sep 7, 2022',
      due: 'Due Sep 10, 2022, 10:30 AM',
      dueValue: '2022-09-10T10:30:00',
      status: 'Submitted',
      type: 'Activity',
      action: 'View Submission',
      path: '/student/activity/act-loops-01/submitted',
    },
    {
      title: 'Prelim Group Project 1',
      description: 'Team project: Build a student information system.',
      posted: 'Posted Aug 24, 2022',
      due: 'Due Aug 27, 2022',
      dueValue: '2022-08-27T23:59:00',
      status: 'Submitted',
      type: 'Group Project',
      action: 'View Project',
      path: '/student/projects/prelim-group-project-1',
    },
  ]
  const assignmentStats = [
    { label: 'Total Assignments', value: '6', detail: 'All activities & projects', tone: 'blue' },
    { label: 'Pending', value: '2', detail: 'Awaiting your submission', tone: 'orange' },
    { label: 'Submitted', value: '3', detail: 'Completed & submitted', tone: 'green' },
    { label: 'Graded', value: '1', detail: 'Feedback available', tone: 'purple' },
  ]
  const filteredAssignments = assignmentRows.filter((item) => (
    assignmentFilter === 'all'
      || (assignmentFilter === 'activities' && item.type === 'Activity')
      || (assignmentFilter === 'projects' && item.type === 'Group Project')
  ))
  const sortedAssignments = sortByOption(filteredAssignments, sortBy)
  const tabCounts = {
    all: assignmentRows.length,
    activities: assignmentRows.filter((item) => item.type === 'Activity').length,
    projects: assignmentRows.filter((item) => item.type === 'Group Project').length,
  }

  return (
    <StudentClassPage activeTab="assignments">
      <div className="student-assignment-board">
        <section className="student-assignment-stats" aria-label="Assignment overview">
          {assignmentStats.map((stat) => (
            <article className="student-dashboard-stat student-assignment-stat" key={stat.label}>
              <span className={`student-dashboard-stat-icon student-dashboard-stat-icon--${stat.tone}`} aria-hidden="true" />
              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="student-assignment-panel student-assignment-panel--board">
          <div className="student-assignment-toolbar student-assignment-toolbar--board">
            <div className="student-assignment-filter-tabs" aria-label="Assignment type">
              <button
                type="button"
                className={assignmentFilter === 'all' ? 'is-active' : undefined}
                onClick={() => setAssignmentFilter('all')}
              >
                All ({tabCounts.all})
              </button>
              <button
                type="button"
                className={assignmentFilter === 'activities' ? 'is-active' : undefined}
                onClick={() => setAssignmentFilter('activities')}
              >
                Activities ({tabCounts.activities})
              </button>
              <button
                type="button"
                className={assignmentFilter === 'projects' ? 'is-active' : undefined}
                onClick={() => setAssignmentFilter('projects')}
              >
                Group Projects ({tabCounts.projects})
              </button>
            </div>
            <label className="student-sort-control">
              Sort by
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="due">Due date (soonest)</option>
                <option value="status">Status</option>
                <option value="title">Title</option>
              </select>
            </label>
          </div>

          <div className="student-assignment-list">
            {sortedAssignments.map((assignment) => {
              const itemType = assignment.type.toLowerCase().replace(/\s+/g, '-')
              const itemStatus = assignment.status.toLowerCase().replace(/\s+/g, '-')

              return (
                <article className={`student-assignment-row student-assignment-row--${itemType}`} key={assignment.title}>
                  <div className="student-assignment-type">
                    <span className={`student-todo-icon student-todo-icon--${itemType}`} aria-hidden="true" />
                    <strong>{assignment.type}</strong>
                  </div>
                  <div>
                    <h2>{assignment.title}</h2>
                    <p>{assignment.description}</p>
                    <small>{assignment.posted}</small>
                  </div>
                  <div className="student-assignment-due">
                    <span>{assignment.due}</span>
                    <em className={`student-assignment-status student-assignment-status--${itemStatus}`}>
                      {assignment.status}
                    </em>
                  </div>
                  <ClassAwareLink to={assignment.path} className={assignment.type === 'Group Project' ? 'student-assignment-action student-assignment-action--project' : 'student-assignment-action'}>
                    {assignment.action}
                  </ClassAwareLink>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </StudentClassPage>
  )
}

function ActivityDetailPage({ initialSubmitted = false, openFeedback = false }) {
  const submitted = initialSubmitted
  const [feedbackOpen, setFeedbackOpen] = useState(openFeedback)

  return (
    <StudentClassPage activeTab="assignments" wide>
      <div className="student-detail-layout student-project-detail-layout">
        <main className="student-activity-detail-card">
          <ClassAwareLink to="/student/activity" className="student-back-link">
            Back to Activities
          </ClassAwareLink>

          <article className="student-detail-card">
            <div className="student-detail-heading">
              <span className="student-detail-icon" aria-hidden="true" />
              <div>
                <h2>Prelim Programming Exercise 1 LAB</h2>
                <p>
                  <span>Mr. Rickon Morty</span>
                  <span>Jun 30, 2026</span>
                </p>
                <p className="student-detail-due">Due Jul 3, 2026, 5:00 PM</p>
              </div>
            </div>

            <div className="student-detail-divider" />

            <div className="student-detail-attachment-row">
              <div className="student-attachment student-attachment--wide">
                <span className="student-pdf-icon">PDF</span>
                <div>
                  <strong>Programming Exercise Instructions.pdf</strong>
                  <span>PDF</span>
                </div>
                <span className="student-document-preview" aria-hidden="true" />
              </div>
            </div>

            {submitted && (
              <>
                <div className="student-detail-divider" />
                <div className="student-submitted-inline">
                  <span className="student-success-check" aria-hidden="true" />
                  <strong>Submitted</strong>
                  <span>Final work recorded</span>
                  <span>Jun 30, 2026, 4:32 PM</span>
                </div>
              </>
            )}

            <div className="student-detail-divider" />

            <section className="student-comments-block">
              <h3>Class comments</h3>
              <button type="button" className="student-comment-button">
                Add comment
              </button>
            </section>
          </article>
        </main>

        <aside className="student-work-rail">
          <section className="student-work-card">
            <div className="student-work-card__header">
              <h2>Your work</h2>
              <span className={submitted ? 'student-work-status is-done' : 'student-work-status'}>
                {submitted ? 'Done' : 'To Do'}
              </span>
            </div>

            {submitted ? (
              <>
                <div className="student-score-row">
                  <span>Score</span>
                  <strong>5 / 5</strong>
                </div>
                <div className="student-work-submitted">
                  <span>Work submitted</span>
                  <strong>Jun 30, 2026, 4:32 PM</strong>
                  <div className="student-submitted-file">
                    <span className="student-file-icon" aria-hidden="true" />
                    <div>
                      <strong>Prelim Programming Exercise 1 LAB</strong>
                      <span>Submitted in-platform</span>
                    </div>
                    <span className="student-success-dot" aria-hidden="true" />
                  </div>
                </div>
                <button type="button" className="student-outline-action" disabled>
                  Submission locked
                </button>
                <button
                  type="button"
                  className="student-primary-action"
                  onClick={() => setFeedbackOpen(true)}
                >
                  View Feedback
                </button>
              </>
            ) : (
              <>
                <div className="student-empty-work">
                  <span className="student-file-icon" aria-hidden="true" />
                  <div>
                    <strong>No work submitted yet</strong>
                    <span>You can do this activity in the platform.</span>
                  </div>
                </div>
                <ClassAwareLink to="/student/activity/act-loops-01/workspace" className="student-primary-action">
                  Do Activity in Platform
                </ClassAwareLink>
                <button type="button" className="student-outline-action">
                  View Submission Guide
                </button>
              </>
            )}
          </section>

          <section className="student-work-card student-private-card">
            <h2>Private comments</h2>
            <button type="button" className="student-comment-button">
              Add private comment
            </button>
          </section>
        </aside>
      </div>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </StudentClassPage>
  )
}

function CodingWorkspacePage() {
  const [resultState, setResultState] = useState('idle')
  const [activeEditorTab, setActiveEditorTab] = useState('Exercise1.java')
  const [paneSizes, setPaneSizes] = useState({
    instructions: 360,
    explorer: 240,
    output: 470,
    tests: 190,
  })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const failed = resultState === 'error'
  const passed = resultState === 'success'
  const readmePreview = '# Prelim Programming Exercise 1\n\nWrite and run the Java hello world activity.'

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
  const startPaneResize = (pane, event) => {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startSizes = paneSizes

    const handleMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      setPaneSizes(() => {
        if (pane === 'instructions') {
          return { ...startSizes, instructions: clamp(startSizes.instructions + deltaX, 300, 620) }
        }

        if (pane === 'explorer') {
          return { ...startSizes, explorer: clamp(startSizes.explorer + deltaX, 150, 360) }
        }

        if (pane === 'output') {
          return { ...startSizes, output: clamp(startSizes.output - deltaX, 320, 760) }
        }

        return { ...startSizes, tests: clamp(startSizes.tests - deltaY, 170, 420) }
      })
    }

    const stopResize = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopResize)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopResize)
  }

  const runTests = () => {
    setResultState((current) => (current === 'success' ? 'error' : 'success'))
  }

  return (
    <div className="student-coding-page">
      <header className="student-coding-topbar">
        <nav className="student-coding-breadcrumb" aria-label="Coding workspace breadcrumb">
          <NavLink to="/student/classes">IT 112 - Computer Programming 1</NavLink>
          <span>Lab Activity 1</span>
          <strong>Exercise1.java</strong>
        </nav>
        <div className="student-coding-user">
          <StudentNotificationMenu count={2} />
          <StudentProfileMenu />
        </div>
      </header>

      <main
        className="student-coding-shell"
        style={{
          '--instruction-pane-width': `${paneSizes.instructions}px`,
          '--explorer-pane-width': `${paneSizes.explorer}px`,
          '--output-pane-width': `${paneSizes.output}px`,
          '--tests-pane-height': `${paneSizes.tests}px`,
        }}
      >
        <aside className="student-coding-instructions">
          <div className="student-coding-activity-title">
            <span>Lab Activity 1</span>
            <h1>Prelim Programming Exercise 1</h1>
            <p>Hello World in Java</p>
            <small>Due Aug 27, 2027, 10:30 AM</small>
            <strong>5/5 Points</strong>
          </div>

          <div className="student-coding-tabs">
            <button type="button" className="is-active">Instructions</button>
            <button type="button">Resources</button>
          </div>

          <section className="student-coding-scroll">
            <h2>Objectives</h2>
            <ol>
              {workspaceObjectives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>

            <h2>Activities</h2>
            <ol>
              {workspaceActivities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>

            <div className="student-coding-tip">
              <strong>Tip</strong>
              <p>Use System.out.println() to print each line and match the required output format.</p>
            </div>
          </section>

          <div className="student-autosave">
            <span className="student-success-dot" aria-hidden="true" />
            <strong>Auto-save</strong>
            <span>Saved a few seconds ago</span>
          </div>
        </aside>
        <div
          className="student-pane-resizer student-pane-resizer--instructions"
          onPointerDown={(event) => startPaneResize('instructions', event)}
          role="separator"
          aria-label="Resize activity instructions pane"
          tabIndex="0"
        />

        <section className="student-editor-area">
          <div className="student-editor-tabs">
            {['Exercise1.java', 'README.md'].map((tab) => (
              <button
                type="button"
                className={activeEditorTab === tab ? 'is-active' : undefined}
                onClick={() => setActiveEditorTab(tab)}
                key={tab}
              >
                {tab}
              </button>
            ))}
            <button type="button" className="student-editor-tab-add" aria-label="Add editor tab">+</button>
          </div>
          <div className="student-editor-workbench">
            <aside className="student-editor-explorer" aria-label="Project files">
              <strong>EXPLORER</strong>
              <span className="is-open">PRELIM-PROGRAMMING-EXERCISE-1</span>
              <span className="is-folder">src</span>
              <em className={activeEditorTab === 'Exercise1.java' ? 'is-file is-active' : 'is-file'}>Exercise1.java</em>
              <span className="is-folder">docs</span>
              <em className={activeEditorTab === 'README.md' ? 'is-file is-active' : 'is-file'}>README.md</em>
              <em className="is-file">.gitignore</em>
            </aside>
            <div
              className="student-pane-resizer student-pane-resizer--explorer"
              onPointerDown={(event) => startPaneResize('explorer', event)}
              role="separator"
              aria-label="Resize file explorer pane"
              tabIndex="0"
            />
            <pre className="student-code-editor">
              {activeEditorTab === 'Exercise1.java' ? workspaceCode : readmePreview}
            </pre>
          </div>
          <footer className="student-editor-status">
            <span>Line 13, Col 42</span>
            <span>Spaces: 4</span>
            <span>{activeEditorTab.endsWith('.java') ? 'Java' : 'Markdown'}</span>
          </footer>
        </section>
        <div
          className="student-pane-resizer student-pane-resizer--output"
          onPointerDown={(event) => startPaneResize('output', event)}
          role="separator"
          aria-label="Resize output pane"
          tabIndex="0"
        />

        <section className="student-output-area">
          <div className="student-output-header">
            <strong>Output</strong>
            <button type="button">Clear</button>
          </div>
          <pre className="student-output-panel">{`*******************************
*                             *
*         hello world         *
*                             *
*******************************

Process finished with exit code 0`}</pre>
          {failed && (
            <div className="student-result-details">
              <h2>Result Details</h2>
              <strong>Wrong Answer</strong>
              <span>Testcase 2</span>
              <h3>Your Input</h3>
              <p>(no input)</p>
              <h3>Expected Output</h3>
              <p>Hello World box output exactly as shown above</p>
              <h3>Your Output</h3>
              <p>hello world</p>
            </div>
          )}
        </section>
        <div
          className="student-pane-resizer student-pane-resizer--tests"
          onPointerDown={(event) => startPaneResize('tests', event)}
          role="separator"
          aria-label="Resize test results pane"
          tabIndex="0"
        />

        <section className="student-tests-area">
          <div className="student-tests-tabs">
            <button type="button" className="is-active">Sample Input Testcases</button>
            <button type="button">Custom Input Testcase</button>
            <span className={failed ? 'student-test-summary is-error' : 'student-test-summary'}>
              {failed ? '1 of 2 sample tests failed' : passed ? 'All sample tests passed' : 'Run tests to see result'}
            </span>
          </div>

          <div className="student-tests-table">
            <div className="student-tests-row student-tests-row--head">
              <span>#</span>
              <span>Input</span>
              <span>Expected Output</span>
              <span>Status</span>
            </div>
            <div className="student-tests-row">
              <span>1</span>
              <span>(no input)</span>
              <pre className="student-expected-output">{`*******************************
*                             *
*         hello world         *
*                             *
*******************************`}</pre>
              <strong className={failed ? 'is-failed' : passed ? 'is-passed' : undefined}>
                {failed ? 'Failed' : passed ? 'Passed' : 'Not run'}
              </strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="student-coding-actions">
        {failed && <span className="student-coding-failure">1 of 2 sample tests failed</span>}
        {passed && <span className="student-coding-success">All sample tests passed</span>}
        <button type="button" className="student-run-tests" onClick={runTests}>
          Run Code
        </button>
        <button type="button" className="student-submit-code" onClick={() => setConfirmOpen(true)}>
          Submit
        </button>
      </footer>

      {confirmOpen && (
        <SubmitConfirmationModal
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            navigate('/student/activity/act-loops-01/submission-record')
          }}
        />
      )}
    </div>
  )
}

function SubmitConfirmationModal({ onCancel, onConfirm }) {
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="submit-activity-title">
      <section className="student-submit-modal">
        <span className="student-submit-icon" aria-hidden="true" />
        <h2 id="submit-activity-title">Submit activity?</h2>
        <p>This will record your final work.</p>
        <p>You can submit only once.</p>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="student-primary-action" onClick={onConfirm}>
            Submit final
          </button>
        </div>
      </section>
    </div>
  )
}

function FeedbackModal({ onClose }) {
  return (
    <div className="student-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-feedback-title">
      <section className="student-feedback-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close feedback" />
        <p className="student-feedback-eyebrow">Automated Feedback</p>
        <h2 id="student-feedback-title">Prelim Programming Exercise 1 LAB</h2>

        <div className="student-feedback-score">
          <span className="student-success-check" aria-hidden="true" />
          <strong>Score: 5 / 5 (100%)</strong>
          <span>All expected outputs matched</span>
        </div>

        <p className="student-feedback-note">
          Scoring is based on predefined test cases. Each expected output matched by your code counts
          toward the final score.
        </p>

        <div className="student-feedback-results">
          <h3>Test Results (5 / 5 passed)</h3>
          {feedbackResults.map((result, index) => (
            <div className="student-feedback-result-row" key={result.label}>
              <span className="student-success-check" aria-hidden="true" />
              <strong>{index + 1}</strong>
              <span>{result.label}</span>
              <em>{result.status}</em>
            </div>
          ))}
        </div>

        <p className="student-hidden-note">
          Hidden test cases may also be used in other activities to check additional inputs and expected
          outputs. No hidden tests were used for this Hello World activity.
        </p>

        <div className="student-instructor-feedback">
          <strong>Instructor / System Feedback</strong>
          <p>Great job. Your submitted code matched all required expected outputs.</p>
        </div>

        <div className="student-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>
            Close
          </button>
          <button type="button" className="student-primary-action" onClick={onClose}>
            View Submission
          </button>
        </div>
      </section>
    </div>
  )
}

function GroupProjectsPage() {
  const [sortBy, setSortBy] = useState('due')
  const sortedProjects = sortByOption(groupProjects, sortBy)

  return (
    <StudentClassPage activeTab="assignments">
      <div className="student-assignment-panel student-assignment-panel--narrow">
        <div className="student-assignment-toolbar">
          <AssignmentSubTabs active="projects" />
          <label className="student-sort-control">
            Sort by
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="due">Due date</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
          </label>
        </div>
        <div className="student-list-table">
          <div className="student-list-header">
            <span>Project Requirements</span>
            <span>Due Date</span>
          </div>
          {sortedProjects.map((project) => (
            <article
              className={project.expanded ? 'student-activity-row is-expanded' : 'student-activity-row'}
              key={project.title}
            >
              <div className="student-row-summary">
                <span className="student-group-icon" aria-hidden="true" />
                {project.expanded ? (
                  <ClassAwareLink to="/student/projects/prelim-group-project-1" className="student-row-title-link">
                    {project.title}
                  </ClassAwareLink>
                ) : (
                  <strong>{project.title}</strong>
                )}
                <span>{project.due}</span>
                <button type="button" className="student-chevron" aria-label="Expand project" />
              </div>
              {project.expanded && (
                <div className="student-expanded-activity student-expanded-project">
                  <div>
                    <h2>{project.title}</h2>
                    <p>
                      <span>{project.posted}</span>
                      <span>Due {project.due}</span>
                    </p>
                    <div className="student-attachment student-attachment--wide">
                      <span className="student-pdf-icon">PDF</span>
                      <div>
                        <strong>Prelim Group Project 1 Specifications.pdf</strong>
                        <span>324 KB</span>
                      </div>
                      <span className="student-document-preview" aria-hidden="true" />
                    </div>
                    <ClassAwareLink to="/student/projects/prelim-group-project-1" className="student-text-link student-project-instructions-link">
                      View instructions
                    </ClassAwareLink>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </StudentClassPage>
  )
}

function JoinRepositoryModal({ onClose, onJoin }) {
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="join-repository-title">
      <section className="student-action-modal student-join-repo-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close join repository" />
        <p>Join Repository</p>
        <h2 id="join-repository-title">Available repositories</h2>
        <div className="student-available-repo-list">
          {availableProjectRepositories.map((repo) => (
            <article key={repo.name}>
              <div>
                <strong>{repo.name}</strong>
                <span>{repo.members}</span>
              </div>
              <em>{repo.slots} {repo.slots === 1 ? 'slot' : 'slots'} available</em>
              <button type="button" className="student-primary-action" onClick={() => onJoin(repo.name)}>
                Join
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function GroupProjectDetailPage() {
  const [createRepoOpen, setCreateRepoOpen] = useState(false)
  const [joinRepoOpen, setJoinRepoOpen] = useState(false)
  const [joinedRepository, setJoinedRepository] = useState('')

  return (
    <StudentClassPage activeTab="assignments" wide>
      <div className="student-detail-layout">
        <main className="student-activity-detail-card">
          <ClassAwareLink to="/student/projects" className="student-back-link">
            Back to Group Projects
          </ClassAwareLink>

          <article className="student-detail-card student-project-detail-card">
            <div className="student-detail-heading">
              <span className="student-detail-icon student-project-detail-icon" aria-hidden="true" />
              <div>
                <h2>Prelim Group Project 1 Specifications</h2>
                <p>
                  <span>Mr. Rickon Morty</span>
                  <span>Jun 30, 2026</span>
                </p>
                <p className="student-detail-due">Due Aug 27, 2026, 10:30 AM</p>
              </div>
            </div>

            <div className="student-detail-divider" />

            <div className="student-detail-attachment-row">
              <button type="button" className="student-attachment student-attachment--wide student-clickable-attachment">
                <span className="student-pdf-icon">PDF</span>
                <div>
                  <strong>Prelim Group Project 1 Specifications.pdf</strong>
                  <span>PDF · 1.2 MB</span>
                </div>
                <span className="student-document-preview" aria-hidden="true" />
              </button>
            </div>

            <div className="student-detail-divider" />

            <section className="student-project-instructions">
              <h3>Project requirement</h3>
              <p>
                Create a team repository for the preliminary group project. Keep source code,
                documentation, and requirement notes together so your instructor can review team progress.
              </p>
              <ul>
                <li>Set up the initial repository structure.</li>
                <li>Invite group members as collaborators.</li>
                <li>Keep the official specifications linked to the workspace.</li>
              </ul>
            </section>

            <div className="student-detail-divider" />

            <section className="student-comments-block">
              <h3>Class comments</h3>
              <button type="button" className="student-comment-button">
                Add comment
              </button>
            </section>
          </article>
        </main>

        <aside className="student-work-rail">
          <section className="student-work-card">
            <div className="student-work-card__header">
              <h2>Your team repository</h2>
              <span className={joinedRepository ? 'student-work-status is-done' : 'student-work-status'}>
                {joinedRepository ? 'Linked' : 'To Do'}
              </span>
            </div>
            {joinedRepository ? (
              <>
                <p className="student-repo-help">
                  You joined {joinedRepository}. Continue work in the linked team repository.
                </p>
                <ClassAwareLink to="/student/projects/prelim-group-project-1/repository" className="student-primary-action">
                  Open Repository
                </ClassAwareLink>
              </>
            ) : (
              <>
                <p className="student-repo-help">
                  No repository created yet. Create a team repository and invite your groupmates as
                  collaborators.
                </p>
                <button type="button" className="student-primary-action" onClick={() => setCreateRepoOpen(true)}>
                  Create Repository
                </button>
                <button
                  type="button"
                  className="student-outline-action"
                  onClick={() => setJoinRepoOpen(true)}
                >
                  Join Repository
                </button>
              </>
            )}
            <p className="student-repo-footnote">This repository will be linked to the class project requirement.</p>
          </section>

          <section className="student-work-card student-private-card">
            <h2>Private comments</h2>
            <button type="button" className="student-comment-button">
              Add private comment
            </button>
          </section>
        </aside>
      </div>
      {createRepoOpen && <CreateRepositoryModal onClose={() => setCreateRepoOpen(false)} />}
      {joinRepoOpen && (
        <JoinRepositoryModal
          onClose={() => setJoinRepoOpen(false)}
          onJoin={(repoName) => {
            setJoinedRepository(repoName)
            setJoinRepoOpen(false)
          }}
        />
      )}
    </StudentClassPage>
  )
}

function AddCollaboratorModal({ pendingCollaborators, onInvite, onClose }) {
  const [search, setSearch] = useState('')
  const [selectedClassmate, setSelectedClassmate] = useState(repositoryInviteCandidates[0].email)
  const visibleClassmates = repositoryInviteCandidates.filter((classmate) => (
    classmate.name.toLowerCase().includes(search.toLowerCase())
      || classmate.email.toLowerCase().includes(search.toLowerCase())
  ))

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-collaborator-title">
      <section className="student-action-modal student-collaborator-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close add collaborator" />
        <p>Add Collaborator</p>
        <h2 id="add-collaborator-title">Invite classmate to repository</h2>
        <label className="student-single-field">
          Search classmates
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
          />
        </label>
        <label className="student-single-field">
          Select classmate
          <select value={selectedClassmate} onChange={(event) => setSelectedClassmate(event.target.value)}>
            {visibleClassmates.map((classmate) => (
              <option value={classmate.email} key={classmate.email}>{classmate.name} - {classmate.email}</option>
            ))}
          </select>
        </label>
        <section className="student-pending-collaborators">
          <strong>Pending collaborators</strong>
          {pendingCollaborators.length ? (
            pendingCollaborators.map((collaborator) => (
              <span key={collaborator}>{collaborator}</span>
            ))
          ) : (
            <span>No pending collaborator invites yet.</span>
          )}
        </section>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Close</button>
          <button
            type="button"
            className="student-primary-action"
            onClick={() => onInvite(selectedClassmate)}
          >
            Send Invite
          </button>
        </div>
      </section>
    </div>
  )
}

function RepositoryWorkspacePage() {
  const [branchOpen, setBranchOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [repoMenuOpen, setRepoMenuOpen] = useState(false)
  const [codeMenuOpen, setCodeMenuOpen] = useState(false)
  const [collaboratorOpen, setCollaboratorOpen] = useState(false)
  const [pendingCollaborators, setPendingCollaborators] = useState([])
  const [readyForReview, setReadyForReview] = useState(false)
  const branches = ['main', 'project-setup', 'readme-updates']

  return (
    <div className="student-repository-page">
      <header className="student-repository-topbar">
        <div className="student-repository-breadcrumb">
          <NavLink to="/student/classes">IT 112 - Computer Programming 1</NavLink>
          <span>Prelim Group Project 1</span>
          <strong>prelim-group-project-1-team-03</strong>
        </div>
        <div className="student-user-area">
          <StudentNotificationMenu count={2} />
          <StudentProfileMenu />
        </div>
      </header>

      <main className="student-repository-content">
        <section className="student-repository-hero">
          <span className="student-repo-mark" aria-hidden="true" />
          <div>
            <h1>prelim-group-project-1-team-03</h1>
            <span className="student-repo-state">{readyForReview ? 'Ready for Review' : 'In Progress'}</span>
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
          <span>Instructor: Mr. Rickon Morty</span>
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
                <strong>Julius Teodoro committed a few minutes ago</strong>
                <span>Initial commit</span>
              </div>
              <code>3a7f9c1</code>
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
                This repository contains the source code, documentation, and resources for our
                preliminary group project.
              </p>
              <h4>Getting Started</h4>
              <ol>
                <li>Clone the repository</li>
                <li>Open the project in your IDE</li>
                <li>Run the application</li>
              </ol>
              <code>git clone https://projex.edu/repos/it112/prelim-group-project-1-team-03.git</code>
            </section>
          </section>

          <aside className="student-repo-side-column">
            <section className="student-repo-card">
              <h2>Project Information</h2>
              <ul className="student-repo-info-list">
                <li>{readyForReview ? 'Ready for review' : 'In progress'}</li>
                <li>1 commit</li>
                <li>1 branch</li>
                <li>0 tags</li>
                <li>1.2 MB project storage</li>
                <li>{4 + pendingCollaborators.length} collaborators</li>
                <li>Created on Aug 25, 2026</li>
              </ul>
            </section>

            <section className="student-repo-card">
              <div className="student-side-card-heading">
                <h2>Collaborators</h2>
                <button type="button" onClick={() => setCollaboratorOpen(true)}>Add Collaborator</button>
              </div>
              <ul className="student-collaborator-list">
                {repositoryCollaborators.map((member) => (
                  <li key={member.name}>
                    <span className="student-person-avatar">{member.name.charAt(0)}</span>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.role}</span>
                    </div>
                    {member.marker && <em>{member.marker}</em>}
                  </li>
                ))}
                {pendingCollaborators.map((email) => (
                  <li key={email}>
                    <span className="student-person-avatar">?</span>
                    <div>
                      <strong>{email}</strong>
                      <span>Invitation pending</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="student-repo-card">
              <h2>Submission Status</h2>
              <p className="student-repo-muted">
                {readyForReview
                  ? 'Repository has been marked ready for instructor review.'
                  : 'Not yet marked ready'}
              </p>
              <button
                type="button"
                className="student-primary-action"
                disabled={readyForReview}
                onClick={() => setReadyForReview(true)}
              >
                {readyForReview ? 'Ready for Review' : 'Mark Ready for Review'}
              </button>
              <p className="student-repo-muted">
                {readyForReview
                  ? 'Your instructor can now review this repository in the prototype.'
                  : 'Mark your repository as ready once your team has completed the requirements.'}
              </p>
            </section>
          </aside>

          <section className="student-repo-card student-spec-card">
            <h2>Project Specifications</h2>
            <p>This repository is linked to the official project specifications.</p>
            <div className="student-attachment student-attachment--wide">
              <span className="student-pdf-icon">PDF</span>
              <div>
                <strong>Prelim Group Project 1 Specifications.pdf</strong>
                <span>324 KB</span>
              </div>
              <span className="student-document-preview" aria-hidden="true" />
            </div>
            <button type="button" className="student-outline-action">View specifications</button>
            <span className="student-linked-status">Linked on Aug 25, 2026</span>
          </section>

          <section className="student-repo-card student-commit-list">
            <h2>Recent activity</h2>
            {repositoryCommits.map((commit) => (
              <div className="student-commit-row" key={commit.id}>
                <code>{commit.id}</code>
                <div>
                  <strong>{commit.message}</strong>
                  <span>{commit.author} · {commit.time}</span>
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
      {collaboratorOpen && (
        <AddCollaboratorModal
          pendingCollaborators={pendingCollaborators}
          onClose={() => setCollaboratorOpen(false)}
          onInvite={(email) => {
            setPendingCollaborators((current) => (
              current.includes(email) ? current : [...current, email]
            ))
          }}
        />
      )}
    </div>
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
  const [openSections, setOpenSections] = useState(() => (
    todoSections.reduce((current, section) => ({ ...current, [section.id]: true }), {})
  ))
  const [selectedClass, setSelectedClass] = useState('All Classes')

  const visibleSections = todoSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => selectedClass === 'All Classes' || item.className === selectedClass),
  }))

  return (
    <StudentGlobalPage
      eyebrow="Student To-do"
      title="To-do"
      action={(
        <label className="student-filter-select">
          <span>Class</span>
          <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
            <option>All Classes</option>
            <option>IT 112 - BSIT 2A</option>
            <option>CS 111 - BSIT 2A</option>
            <option>Personal Repositories</option>
          </select>
        </label>
      )}
    >
      <section className="student-global-panel student-todo-board">
        {visibleSections.map((section) => {
          const isOpen = openSections[section.id]

          return (
            <article className={`student-collapsible-section student-task-group student-task-group--${section.tone}`} key={section.id}>
              <button
                type="button"
                className={isOpen ? 'is-open' : undefined}
                onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))}
              >
                <span className="student-task-group-title">
                  <span className={`student-task-group-icon student-task-group-icon--${section.tone}`} aria-hidden="true" />
                  {section.label}
                </span>
                <em>{section.items.length}</em>
              </button>

              {isOpen && (
                <div className="student-todo-list">
                  {section.items.length ? (
                    section.items.map((item) => {
                      const itemType = item.type.toLowerCase().replace(/\s+/g, '-')

                      return (
                        <NavLink to={item.path} className={`student-todo-item student-todo-item--${itemType}`} key={item.title}>
                          <span className={`student-todo-icon student-todo-icon--${itemType}`} aria-hidden="true" />
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            <span className={`student-todo-type student-todo-type--${itemType}`}>
                              {item.type}
                            </span>
                            {item.meta}
                          </span>
                        </div>
                        {item.status && (
                          <em className={`student-todo-status student-todo-status--${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {item.status}
                          </em>
                        )}
                        <small>{item.className}</small>
                        <span className="student-row-arrow" aria-hidden="true" />
                      </NavLink>
                      )
                    })
                  ) : (
                    <p className="student-empty-note">No items in this section for the selected class.</p>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>
    </StudentGlobalPage>
  )
}

function CreateRepositoryModal({ onClose }) {
  const navigate = useNavigate()

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-create-repo-title">
      <section className="student-action-modal student-create-repo-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close create repository" />
        <p>Create Repository</p>
        <h2 id="student-create-repo-title">New student repository</h2>
        <div className="student-create-repo-form">
          <label className="student-create-repo-name">
            Repository name
            <input value="prelim-group-project-1-team-03" readOnly />
            <span>
              Repository name is fixed for this project requirement in the prototype.
            </span>
          </label>
          <label>
            Link to class
            <select defaultValue="IT 112 - Computer Programming 1">
              <option>IT 112 - Computer Programming 1</option>
              <option>CS 111 - Introduction to Computing</option>
              <option>Personal repository</option>
            </select>
          </label>
          <fieldset className="student-visibility-options">
            <legend>Visibility level</legend>
            <label>
              <input type="radio" name="student-repo-visibility" defaultChecked />
              <span>
                <strong>Private</strong>
                <small>Project access must be granted explicitly to each collaborator.</small>
              </span>
            </label>
            <label>
              <input type="radio" name="student-repo-visibility" />
              <span>
                <strong>Class-visible</strong>
                <small>Visible to enrolled classmates and instructors in the linked class.</small>
              </span>
            </label>
            <label>
              <input type="radio" name="student-repo-visibility" />
              <span>
                <strong>Public prototype</strong>
                <small>Visible in the local prototype repository list only.</small>
              </span>
            </label>
          </fieldset>
          <label>
            Invite collaborator by email
            <input placeholder="student@slu.edu.ph" />
          </label>
        </div>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="student-primary-action"
            onClick={() => navigate('/student/projects/prelim-group-project-1/repository')}
          >
            Create Repository
          </button>
        </div>
      </section>
    </div>
  )
}

function RepositoryRow({ repo }) {
  const repoState = repo.status.toLowerCase().replace(/\s+/g, '-')

  return (
    <NavLink to={repo.path} className={`student-repository-index-row student-repository-index-row--${repoState}`}>
      <span className="student-repository-row-icon" aria-hidden="true" />
      <div>
        <strong>{repo.name}</strong>
        <span>{repo.detail}</span>
      </div>
      <span className="student-repo-branch" aria-hidden="true">main</span>
      <span className="student-repo-code-mark" aria-hidden="true" />
      <em>{repo.status}</em>
      <small>{repo.updated}</small>
      <span className="student-row-arrow" aria-hidden="true" />
    </NavLink>
  )
}

function StudentRepositoriesPage() {
  const [openGroups, setOpenGroups] = useState(() => ({
    it112: true,
    cs111: true,
    personal: true,
  }))
  const [modalOpen, setModalOpen] = useState(false)
  const repositoryStats = [
    { label: 'In Progress', value: '1', detail: 'repository', tone: 'blue' },
    { label: 'Submitted', value: '1', detail: 'repository', tone: 'green' },
    { label: 'Personal Repositories', value: '1', detail: 'workspace', tone: 'orange' },
  ]
  const visibleRepositoryGroups = [
    ...studentRepositoryGroups,
    {
      id: 'personal',
      label: 'Personal Repositories',
      section: '',
      repos: personalRepositories,
      tone: 'purple',
    },
  ]

  return (
    <StudentGlobalPage
      eyebrow="Repository Learning"
      title="My Repositories"
      action={(
        <button type="button" className="student-global-action" onClick={() => setModalOpen(true)}>
          <span aria-hidden="true">+</span>
          Create Repository
        </button>
      )}
    >
      <section className="student-repository-stats" aria-label="Repository overview">
        {repositoryStats.map((stat) => (
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

      <section className="student-global-panel student-repository-board">
        {visibleRepositoryGroups.map((group) => {
          const isOpen = openGroups[group.id]
          const tone = group.tone || (group.id === 'cs111' ? 'green' : 'blue')

          return (
            <article className={`student-collapsible-section student-repository-group student-repository-group--${tone}`} key={group.id}>
              <button
                type="button"
                className={isOpen ? 'is-open' : undefined}
                onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !isOpen }))}
              >
                <span className="student-task-group-title">
                  <span className={`student-repository-group-icon student-repository-group-icon--${tone}`} aria-hidden="true">
                    {group.label.charAt(0)}
                  </span>
                  <span>
                    {group.label}
                    {group.section && <small>{group.section}</small>}
                  </span>
                </span>
                <em>{group.repos.length}</em>
              </button>

              {isOpen && (
                <div className="student-repository-index-list">
                  {group.repos.map((repo) => (
                    <RepositoryRow repo={repo} key={repo.name} />
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </section>

      {modalOpen && <CreateRepositoryModal onClose={() => setModalOpen(false)} />}
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

export function StudentRoutePage({ pagePath }) {
  const pages = {
    dashboard: <HomeDashboardPage />,
    classes: <StudentClassesPage />,
    todo: <StudentTodoPage />,
    'join-class': <StudentJoinClassPage />,
    invitations: <DeferredStudentPage title="Class Invitations" message="Class invitation acceptance is not part of the current backend. Join an active class with an instructor-provided code instead." />,
    activity: <ActivitiesPage />,
    submissions: <ActivitiesPage />,
    'activity/act-loops-01': <ActivityDetailPage />,
    'activity/act-loops-01/workspace': <CodingWorkspacePage />,
    'activity/act-loops-01/submission-record': <ActivityDetailPage initialSubmitted />,
    'activity/act-loops-01/feedback': <ActivityDetailPage initialSubmitted openFeedback />,
    projects: <GroupProjectsPage />,
    'projects/prelim-group-project-1': <GroupProjectDetailPage />,
    'projects/prelim-group-project-1/repository': <RepositoryWorkspacePage />,
    'projects/repo-campus-nav': <GroupProjectsPage />,
    'projects/repo-campus-nav/contributions': <GroupProjectsPage />,
    repositories: <StudentRepositoriesPage />,
    analytics: <DeferredStudentPage title="Analytics" message="Canonical student analytics remain recognized but are not available in the core iteration." />,
    archive: <DeferredStudentPage title="Archived Projects" message="Archived project and repository preservation views will be integrated in Phase 10C." />,
    people: <PeoplePage />,
    settings: <DeferredStudentPage title="Settings" message="Additional account settings are not available in this iteration." />,
  }

  return pages[pagePath] || <RequestState kind="notFound" />
}

export default StudentRoutePage

