import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const streamPosts = [
  {
    id: 'stream-assignment',
    author: 'Mac Miller',
    text: 'posted a new assignment: Prelim Programming Exercise 1 LAB',
    date: 'Aug 25, 2022 (Edited Oct 5, 2022)',
    type: 'assignment',
  },
  {
    id: 'stream-announcement',
    author: 'Mac Miller',
    text: 'Please be informed that all 9:00 AM classes are required to attend the mass today, August 25, 2022 at the 6th-floor lobby. Thank you',
    date: 'Aug 25, 2022',
    type: 'announcement',
  },
]

const activities = [
  {
    title: 'Prelim Programming Exercise 6 LAB',
    due: 'Due Sep 10, 2022, 10:30 AM',
  },
  {
    title: 'Prelim Programming Exercise 5 LAB',
    due: 'Due Sep 10, 2022, 10:30 AM',
  },
  {
    title: 'Prelim Programming Exercise 4 LAB',
    due: 'Due Sep 3, 2022',
    selected: true,
  },
  {
    title: 'Prelim Programming Exercise 3 LAB',
    due: 'Due Sep 3, 2022, 10:30 AM',
  },
  {
    title: 'Prelim Programming Exercise 2 LAB',
    due: 'Due Aug 27, 2022, 11:59PM',
  },
  {
    title: 'Prelim Programming Exercise 1 LAB',
    due: 'Due Aug 27, 2022, 10:30 AM',
    expanded: true,
    status: 'Graded',
  },
]

const groupProjects = [
  {
    title: 'Final Group Project Proposal',
    due: 'Dec 5, 2026, 10:30 AM',
  },
  {
    title: 'Midterm Group Project 1 Specifications',
    due: 'Oct 20, 2026, 10:30 AM',
  },
  {
    title: 'Prelim Group Project 2 Specifications',
    due: 'Sep 24, 2026, 10:30 AM',
  },
  {
    title: 'Prelim Group Project 1 Specifications',
    due: 'Aug 27, 2026, 10:30 AM',
    expanded: true,
    posted: 'Posted Aug 25, 2026',
  },
]

const homeClasses = [
  {
    title: 'IT 112 - Computer Programming 1',
    section: 'BSIT 2A',
    schedule: 'Mon & Wed',
    time: '8:00 - 9:30 AM',
    instructor: 'Mr. Rickon Morty',
    initial: 'I',
    path: '/student/classes',
  },
  {
    title: 'CS 111 - Introduction to Computing',
    section: 'BSIT 2A',
    schedule: 'Tue & Thu',
    time: '10:00 - 11:30 AM',
    instructor: 'Ms. Alyssa Mendoza',
    initial: 'C',
    path: '/student/classes',
  },
  {
    title: 'IT 123 - Platform Technologies',
    section: 'BSIT 2A',
    schedule: 'Mon & Wed',
    time: '1:00 - 2:30 PM',
    instructor: 'Ms. Olivia Dean',
    initial: 'I',
    path: '/student/classes',
  },
  {
    title: 'MATH 101 - College Algebra',
    section: 'BSIT 2A',
    schedule: 'Fri',
    time: '9:00 - 10:30 AM',
    instructor: 'Mr. Marco Rivera',
    initial: 'M',
    path: '/student/classes',
  },
]

const instructors = [
  { name: 'Mr. Rickon Morty', email: 'rickon.morty@slu.edu.ph', avatar: 'RM' },
  { name: 'Mac Miller', email: 'mac.miller@slu.edu.ph', avatar: 'MM' },
]

const classmates = [
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

const studentNotifications = [
  {
    title: 'New announcement from Mr. Rickon Morty',
    detail: 'IT 112 class stream was updated this morning.',
    time: '10 min ago',
  },
  {
    title: 'Activity due soon',
    detail: 'Prelim Programming Exercise 1 LAB is due Jul 3, 2026, 5:00 PM.',
    time: '1 hr ago',
  },
  {
    title: 'Feedback released',
    detail: 'Your Hello World submission feedback is ready to view.',
    time: 'Yesterday',
  },
  {
    title: 'Repository invitation',
    detail: 'Alyssa invited you to prelim-group-project-1-team-03.',
    time: 'Jun 27',
  },
  {
    title: 'Class invitation',
    detail: 'Dr. Helena Cruz invited you to CS 122 - Data Structures.',
    time: 'Jun 24',
  },
]

const todoSections = [
  {
    id: 'no-due-date',
    label: 'No Due Date',
    items: [
      {
        title: 'Read repository contribution guide',
        meta: 'Personal repository setup',
        type: 'Repository',
        className: 'Personal Repositories',
        path: '/student/projects/prelim-group-project-1/repository',
      },
    ],
  },
  {
    id: 'this-week',
    label: 'This Week',
    items: [
      {
        title: 'Prelim Programming Exercise 1 LAB',
        meta: 'Due Jul 3, 2026, 5:00 PM',
        type: 'Activity',
        className: 'IT 112 - BSIT 2A',
        path: '/student/activity/act-loops-01',
      },
      {
        title: 'Prelim Group Project 1 Specifications',
        meta: 'Repository setup due Aug 27, 2026',
        type: 'Group Project',
        className: 'IT 112 - BSIT 2A',
        path: '/student/projects/prelim-group-project-1',
      },
    ],
  },
  {
    id: 'next-week',
    label: 'Next Week',
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
    items: [
      {
        title: 'Campus Navigator repository workspace',
        meta: 'Continue README and initial folders',
        type: 'Repository',
        className: 'CS 111 - BSIT 2A',
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
    name: 'java-practice-notes',
    detail: 'Personal Java drills and scratch work',
    status: 'Private',
    updated: 'Updated Jun 25, 2026',
    path: '/student/projects/prelim-group-project-1/repository',
  },
]

const pendingClassInvitations = [
  {
    id: 'cs122',
    course: 'CS 122 - Data Structures',
    section: 'BSCS 2B',
    instructor: 'Dr. Helena Cruz',
    sent: 'Sent Jun 24, 2026',
  },
  {
    id: 'it123',
    course: 'IT 123 - Platform Technologies',
    section: 'BSIT 2A',
    instructor: 'Ms. Olivia Dean',
    sent: 'Sent Jun 26, 2026',
  },
]

function StudentNotificationMenu({ count = 5 }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="student-notification-menu">
      <button
        type="button"
        className={open ? 'student-bell is-active' : 'student-bell'}
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="student-bell__shape" aria-hidden="true" />
        <span className="student-bell__count">{count}</span>
      </button>

      {open && (
        <section className="student-notification-dropdown">
          <div className="student-notification-heading">
            <h2>Notifications</h2>
            <span>{count} unread</span>
          </div>
          {studentNotifications.slice(0, count).map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
              <em>{item.time}</em>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function StudentProfileMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="student-profile-menu">
      <button type="button" className="student-profile-trigger" onClick={() => setOpen(!open)}>
        <span className="student-user-avatar" aria-hidden="true" />
        <span className="student-user-name">
          <strong>Julius Teodoro</strong>
          <span>BSIT 2A</span>
        </span>
        <span className="student-dropdown" aria-hidden="true" />
      </button>

      {open && (
        <section className="student-profile-dropdown">
          <button type="button" className="student-profile-close" onClick={() => setOpen(false)} aria-label="Close profile menu" />
          <strong>2216146@slu.edu.ph</strong>
          <span>Managed by slu.edu.ph</span>
          <div className="student-profile-photo">
            <span className="student-user-avatar" aria-hidden="true" />
          </div>
          <h2>Hi, JULIUS!</h2>
          <button type="button" className="student-manage-account">Manage your projex account</button>
          <div className="student-profile-menu-list">
            <button type="button">Profile</button>
            <button type="button">Settings</button>
            <button type="button" onClick={() => navigate('/')}>Sign out</button>
          </div>
          <p>Privacy Policy · Terms of Service</p>
        </section>
      )}
    </div>
  )
}

function ClassHeader({ activeTab }) {
  const tabs = [
    { label: 'Stream', path: '/student', key: 'stream' },
    { label: 'Assignments', path: '/student/activity', key: 'assignments' },
    { label: 'People', path: '/student/people', key: 'people' },
  ]

  return (
    <header className="student-class-header">
      <div className="student-class-header__top">
        <div className="student-course-title">
          <span className="student-course-avatar">I</span>
          <div>
            <h1>IT 112 - Computer Programming 1</h1>
            <div className="student-course-meta">
              <span>BSIT 2A</span>
              <span>Mr. Rickon Morty</span>
              <span className="student-class-code">9446</span>
            </div>
          </div>
        </div>

        <div className="student-user-area">
          <StudentNotificationMenu count={5} />
          <StudentProfileMenu />
        </div>
      </div>

      <div className="student-class-header__bottom">
        <nav className="student-class-tabs" aria-label="Class tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
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

function StudentClassPage({ activeTab, children, wide = false }) {
  return (
    <div className="student-class-page">
      <ClassHeader activeTab={activeTab} />
      <section className={wide ? 'student-class-content student-class-content--wide' : 'student-class-content'}>
        {children}
      </section>
    </div>
  )
}

function HomeDashboardPage() {
  return (
    <div className="student-home-page">
      <header className="student-home-topbar">
        <div />
        <div className="student-user-area">
          <StudentNotificationMenu count={3} />
          <StudentProfileMenu />
        </div>
      </header>

      <main className="student-home-content">
        <h1>Welcome back, Julius</h1>

        <section className="student-home-classes">
          <div className="student-home-section-heading">
            <h2>My Classes</h2>
            <NavLink to="/student/classes">View all classes</NavLink>
          </div>

          <div className="student-home-class-grid">
            {homeClasses.map((item) => (
              <NavLink to={item.path} className="student-home-class-card" key={item.title}>
                <span className={`student-class-dot student-class-dot--${item.initial.toLowerCase()}`}>
                  {item.initial}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.section} · Sec. 01</span>
                  <span>{item.instructor}</span>
                </div>
                <div className="student-home-class-schedule">
                  <span>{item.schedule}</span>
                  <span>{item.time}</span>
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

function StreamPage() {
  return (
    <StudentClassPage activeTab="stream">
      <div className="student-stream-card" aria-label="Class stream">
        {streamPosts.map((post) => (
          <article className="student-stream-post" key={post.id}>
            <div className={`student-post-icon student-post-icon--${post.type}`} aria-hidden="true" />
            <div>
              <p>
                <strong>{post.author}</strong> {post.text}
              </p>
              <span>{post.date}</span>
              {post.type === 'announcement' && (
                <button type="button" className="student-comment-button">
                  Add comment
                </button>
              )}
            </div>
            <button type="button" className="student-more" aria-label="More options" />
          </article>
        ))}
      </div>
    </StudentClassPage>
  )
}

function AssignmentSubTabs({ active }) {
  return (
    <div className="student-segmented-tabs" aria-label="Assignment type">
      <NavLink to="/student/activity" className={active === 'activities' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Activities
      </NavLink>
      <NavLink to="/student/projects" className={active === 'projects' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Group Projects
      </NavLink>
    </div>
  )
}

function ActivityAttachment() {
  return (
    <div className="student-attachment">
      <span className="student-pdf-icon">PDF</span>
      <div>
        <strong>Prelim Programming Exerc...</strong>
        <span>PDF</span>
      </div>
      <span className="student-document-preview" aria-hidden="true" />
    </div>
  )
}

function ActivitiesPage() {
  return (
    <StudentClassPage activeTab="assignments">
      <div className="student-assignment-panel">
        <AssignmentSubTabs active="activities" />
        <div className="student-list-table">
          <div className="student-list-header">
            <span>Title</span>
            <span>Due Date</span>
          </div>
          {activities.map((activity) => (
            <article
              className={
                activity.expanded
                  ? 'student-activity-row is-expanded'
                  : activity.selected
                    ? 'student-activity-row is-selected'
                    : 'student-activity-row'
              }
              key={activity.title}
            >
              <div className="student-row-summary">
                <span className="student-row-icon" aria-hidden="true" />
                {activity.expanded ? (
                  <NavLink to="/student/activity/act-loops-01" className="student-row-title-link">
                    {activity.title}
                  </NavLink>
                ) : (
                  <strong>{activity.title}</strong>
                )}
                <span>{activity.due}</span>
                <button type="button" className="student-more" aria-label="More options" />
              </div>
              {activity.expanded && (
                <div className="student-expanded-activity">
                  <div>
                    <small>Posted Aug 25, 2022 (Edited Oct 5, 2022)</small>
                    <ActivityAttachment />
                  </div>
                  <div className="student-activity-status">{activity.status}</div>
                  <NavLink to="/student/activity/act-loops-01" className="student-text-link">
                    View instructions
                  </NavLink>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </StudentClassPage>
  )
}

function ActivityDetailPage({ initialSubmitted = false, openFeedback = false }) {
  const submitted = initialSubmitted
  const [feedbackOpen, setFeedbackOpen] = useState(openFeedback)

  return (
    <StudentClassPage activeTab="assignments" wide>
      <div className="student-detail-layout">
        <main className="student-activity-detail-card">
          <NavLink to="/student/activity" className="student-back-link">
            Back to Activities
          </NavLink>

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
                <NavLink to="/student/activity/act-loops-01/workspace" className="student-primary-action">
                  Do Activity in Platform
                </NavLink>
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
  const [resultState, setResultState] = useState('success')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const failed = resultState === 'error'

  return (
    <div className="student-coding-page">
      <header className="student-coding-topbar">
        <NavLink to="/student/activity/act-loops-01" className="student-coding-brand">
          PROJEX
        </NavLink>
        <nav className="student-coding-breadcrumb" aria-label="Coding workspace breadcrumb">
          <NavLink to="/student/activity">Activities</NavLink>
          <span>Lab Activity 1</span>
          <strong>Do Activity</strong>
        </nav>
        <div className="student-coding-user">
          <span>Student</span>
          <strong>Julius Teodoro</strong>
          <span className="student-user-avatar" aria-hidden="true" />
        </div>
      </header>

      <main className="student-coding-shell">
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

        <section className="student-editor-area">
          <div className="student-editor-tabs">
            <span>Exercise1.java</span>
            <button type="button" aria-label="Add file">+</button>
          </div>
          <pre className="student-code-editor">{workspaceCode}</pre>
          <footer className="student-editor-status">
            <span>Line 13, Col 42</span>
            <span>Spaces: 4</span>
            <span>Java</span>
          </footer>
        </section>

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
              <button type="button" aria-label="Close result details" />
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

        <section className="student-tests-area">
          <div className="student-tests-tabs">
            <button type="button" className="is-active">Sample Input Testcases</button>
            <button type="button">Custom Input Testcase</button>
            <span className={failed ? 'student-test-summary is-error' : 'student-test-summary'}>
              {failed ? '1 of 2 sample tests failed' : 'All sample tests passed'}
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
              <span>-</span>
              <span>Hello World box output exactly as shown above</span>
              <strong className="is-passed">Passed</strong>
            </div>
            <div className={failed ? 'student-tests-row is-failed' : 'student-tests-row'}>
              <span>2</span>
              <span>(no input)</span>
              <span>Hello World box output exactly as shown above</span>
              <strong className={failed ? 'is-failed' : 'is-passed'}>
                {failed ? 'Failed' : 'Passed'}
              </strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="student-coding-actions">
        <div className="student-state-switch">
          <button
            type="button"
            className={!failed ? 'is-active' : undefined}
            onClick={() => setResultState('success')}
          >
            Pass state
          </button>
          <button
            type="button"
            className={failed ? 'is-active' : undefined}
            onClick={() => setResultState('error')}
          >
            Failed testcase
          </button>
        </div>
        {failed && <span className="student-coding-failure">1 of 2 sample tests failed</span>}
        <button type="button" className="student-run-tests" onClick={() => setResultState('success')}>
          Run Tests
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
  return (
    <StudentClassPage activeTab="assignments">
      <div className="student-assignment-panel student-assignment-panel--narrow">
        <AssignmentSubTabs active="projects" />
        <div className="student-list-table">
          <div className="student-list-header">
            <span>Project Requirements</span>
            <span>Due Date</span>
          </div>
          {groupProjects.map((project) => (
            <article
              className={project.expanded ? 'student-activity-row is-expanded' : 'student-activity-row'}
              key={project.title}
            >
              <div className="student-row-summary">
                <span className="student-group-icon" aria-hidden="true" />
                {project.expanded ? (
                  <NavLink to="/student/projects/prelim-group-project-1" className="student-row-title-link">
                    {project.title}
                  </NavLink>
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
                  </div>
                  <div className="student-project-footer">
                    <NavLink to="/student/projects/prelim-group-project-1" className="student-text-link">
                      View instructions
                    </NavLink>
                    <span className="student-repository-status">Repository not yet created</span>
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

function GroupProjectDetailPage() {
  return (
    <StudentClassPage activeTab="assignments" wide>
      <div className="student-detail-layout">
        <main className="student-activity-detail-card">
          <NavLink to="/student/projects" className="student-back-link">
            Back to Group Projects
          </NavLink>

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
              <div className="student-attachment student-attachment--wide">
                <span className="student-pdf-icon">PDF</span>
                <div>
                  <strong>Prelim Group Project 1 Specifications.pdf</strong>
                  <span>PDF · 1.2 MB</span>
                </div>
                <span className="student-document-preview" aria-hidden="true" />
              </div>
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
              <span className="student-work-status">To Do</span>
            </div>
            <p className="student-repo-help">
              No repository created yet. Create a team repository and invite your groupmates as
              collaborators.
            </p>
            <NavLink to="/student/projects/prelim-group-project-1/repository" className="student-primary-action">
              Create Repository
            </NavLink>
            <button type="button" className="student-outline-action">
              Join Existing Repository
            </button>
            <button type="button" className="student-outline-action">
              View Specifications
            </button>
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
    </StudentClassPage>
  )
}

function RepositoryWorkspacePage() {
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
            <span className="student-repo-state">In Progress</span>
          </div>
        </section>

        <div className="student-repository-toolbar">
          <button type="button">main</button>
          <span>Linked to IT 112</span>
          <span>Team repository</span>
          <span>Instructor: Mr. Rickon Morty</span>
          <button type="button">Add file</button>
          <button type="button">Find file</button>
          <button type="button" className="student-repo-code-button">Code</button>
          <button type="button">History</button>
          <button type="button">Star 0</button>
          <button type="button">Fork 0</button>
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
                <li>1 commit</li>
                <li>1 branch</li>
                <li>0 tags</li>
                <li>1.2 MB project storage</li>
                <li>4 collaborators</li>
                <li>Created on Aug 25, 2026</li>
              </ul>
            </section>

            <section className="student-repo-card">
              <h2>Collaborators</h2>
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
              </ul>
              <button type="button" className="student-outline-action">Invite collaborators</button>
            </section>

            <section className="student-repo-card">
              <h2>Submission Status</h2>
              <p className="student-repo-muted">Not yet marked ready</p>
              <button type="button" className="student-primary-action">Mark Ready for Review</button>
              <p className="student-repo-muted">
                Mark your repository as ready once your team has completed the requirements.
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
  const [activeSection, setActiveSection] = useState('this-week')
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
      <section className="student-global-panel">
        {visibleSections.map((section) => {
          const isOpen = activeSection === section.id

          return (
            <article className="student-collapsible-section" key={section.id}>
              <button
                type="button"
                className={isOpen ? 'is-open' : undefined}
                onClick={() => setActiveSection(isOpen ? '' : section.id)}
              >
                <span>{section.label}</span>
                <em>{section.items.length}</em>
              </button>

              {isOpen && (
                <div className="student-todo-list">
                  {section.items.length ? (
                    section.items.map((item) => (
                      <NavLink to={item.path} className="student-todo-item" key={item.title}>
                        <span className={`student-todo-type student-todo-type--${item.type.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.type}
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.meta}</span>
                        </div>
                        <small>{item.className}</small>
                      </NavLink>
                    ))
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
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-create-repo-title">
      <section className="student-action-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close create repository" />
        <p>Create Repository</p>
        <h2 id="student-create-repo-title">New student repository</h2>
        <div className="student-action-form-grid">
          <label>
            Repository name
            <input defaultValue="java-practice-notes" />
          </label>
          <label>
            Link to class
            <select defaultValue="IT 112 - Computer Programming 1">
              <option>IT 112 - Computer Programming 1</option>
              <option>CS 111 - Introduction to Computing</option>
              <option>Personal repository</option>
            </select>
          </label>
          <label>
            Visibility
            <select defaultValue="Private">
              <option>Private</option>
              <option>Class-visible</option>
            </select>
          </label>
          <label>
            Invite collaborator by email
            <input placeholder="student@slu.edu.ph" />
          </label>
        </div>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button type="button" className="student-primary-action" onClick={onClose}>Create Repository</button>
        </div>
      </section>
    </div>
  )
}

function RepositoryRow({ repo }) {
  return (
    <NavLink to={repo.path} className="student-repository-index-row">
      <span className="student-repo-file-icon student-repo-file-icon--folder" aria-hidden="true" />
      <div>
        <strong>{repo.name}</strong>
        <span>{repo.detail}</span>
      </div>
      <em>{repo.status}</em>
      <small>{repo.updated}</small>
    </NavLink>
  )
}

function StudentRepositoriesPage() {
  const [openGroup, setOpenGroup] = useState('it112')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <StudentGlobalPage
      eyebrow="Repository Learning"
      title="My Repositories"
      action={(
        <button type="button" className="student-primary-action" onClick={() => setModalOpen(true)}>
          Create Repository
        </button>
      )}
    >
      <section className="student-global-panel">
        {studentRepositoryGroups.map((group) => {
          const isOpen = openGroup === group.id

          return (
            <article className="student-collapsible-section" key={group.id}>
              <button
                type="button"
                className={isOpen ? 'is-open' : undefined}
                onClick={() => setOpenGroup(isOpen ? '' : group.id)}
              >
                <span>{group.label}</span>
                <em>{group.repos.length}</em>
              </button>
              <p className="student-section-meta">{group.section}</p>

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

        <article className="student-collapsible-section">
          <button
            type="button"
            className={openGroup === 'personal' ? 'is-open' : undefined}
            onClick={() => setOpenGroup(openGroup === 'personal' ? '' : 'personal')}
          >
            <span>Personal Repositories</span>
            <em>{personalRepositories.length}</em>
          </button>
          {openGroup === 'personal' && (
            <div className="student-repository-index-list">
              {personalRepositories.map((repo) => (
                <RepositoryRow repo={repo} key={repo.name} />
              ))}
            </div>
          )}
        </article>
      </section>

      {modalOpen && <CreateRepositoryModal onClose={() => setModalOpen(false)} />}
    </StudentGlobalPage>
  )
}

function JoinClassModal({ onClose, onJoin }) {
  const [classCode, setClassCode] = useState('')

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-join-class-title">
      <section className="student-action-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close join class" />
        <p>Join Class</p>
        <h2 id="student-join-class-title">Enter class code</h2>
        <label className="student-single-field">
          Class code
          <input
            value={classCode}
            onChange={(event) => setClassCode(event.target.value)}
            placeholder="XXXX-XXXX"
          />
        </label>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="student-primary-action"
            onClick={() => onJoin(classCode || '9446')}
          >
            Join Class
          </button>
        </div>
      </section>
    </div>
  )
}

function StudentJoinClassPage() {
  const [invitationState, setInvitationState] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [joinedCode, setJoinedCode] = useState('')

  return (
    <StudentGlobalPage
      eyebrow="Class Membership"
      title="Join Class"
      action={(
        <button type="button" className="student-primary-action" onClick={() => setModalOpen(true)}>
          Join Class by Code
        </button>
      )}
    >
      <section className="student-global-panel">
        <div className="student-panel-heading">
          <h2>Pending invitations</h2>
          <span>{pendingClassInvitations.length} invitations</span>
        </div>

        <div className="student-invitation-list">
          {pendingClassInvitations.map((invite) => {
            const status = invitationState[invite.id] || 'Pending'

            return (
              <article className="student-invitation-card" key={invite.id}>
                <span className="student-class-dot">{invite.course.charAt(0)}</span>
                <div>
                  <strong>{invite.course}</strong>
                  <span>{invite.section} - {invite.instructor}</span>
                  <small>{invite.sent}</small>
                </div>
                <em>{status}</em>
                {status === 'Pending' && (
                  <div className="student-invitation-actions">
                    <button
                      type="button"
                      className="student-outline-action"
                      onClick={() => setInvitationState((current) => ({ ...current, [invite.id]: 'Declined' }))}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="student-primary-action"
                      onClick={() => setInvitationState((current) => ({ ...current, [invite.id]: 'Accepted' }))}
                    >
                      Accept
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {joinedCode && (
          <div className="student-joined-state">
            <strong>Joined class</strong>
            <span>Class code {joinedCode.toUpperCase()} accepted in the local prototype.</span>
          </div>
        )}
      </section>

      {modalOpen && (
        <JoinClassModal
          onClose={() => setModalOpen(false)}
          onJoin={(code) => {
            setJoinedCode(code)
            setModalOpen(false)
          }}
        />
      )}
    </StudentGlobalPage>
  )
}

function PersonRow({ person }) {
  return (
    <li className="student-person-row">
      <span className="student-person-avatar">{person.avatar}</span>
      <div>
        <strong>{person.name}</strong>
        <span>{person.email}</span>
      </div>
      <button type="button" className="student-mail-button" aria-label={`Message ${person.name}`} />
    </li>
  )
}

function PeoplePage() {
  return (
    <StudentClassPage activeTab="people">
      <div className="student-people-panel">
        <section>
          <h2>Instructors</h2>
          <ul className="student-people-list">
            {instructors.map((person) => (
              <PersonRow key={person.email} person={person} />
            ))}
          </ul>
        </section>
        <section>
          <div className="student-people-heading">
            <h2>Classmates</h2>
            <span>38 students</span>
          </div>
          <ul className="student-people-list">
            {classmates.map((person) => (
              <PersonRow key={person.email} person={person} />
            ))}
          </ul>
        </section>
      </div>
    </StudentClassPage>
  )
}

function StudentRoutePage({ pagePath }) {
  const pages = {
    dashboard: <HomeDashboardPage />,
    classes: <StreamPage />,
    todo: <StudentTodoPage />,
    'join-class': <StudentJoinClassPage />,
    invitations: <StudentJoinClassPage />,
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
    analytics: <StreamPage />,
    archive: <GroupProjectsPage />,
    people: <PeoplePage />,
    settings: <StreamPage />,
  }

  return pages[pagePath] || <StreamPage />
}

export default StudentRoutePage

