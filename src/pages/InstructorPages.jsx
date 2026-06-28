import { NavLink } from 'react-router-dom'

const instructorClass = {
  course: 'IT 112 - Computer Programming 1',
  section: 'BSIT 2A',
  instructor: 'Engr. Marco Rivera',
  classCode: '9446',
}

const dashboardStats = [
  { label: 'Total students', value: '38', detail: '36 enrolled, 2 invited' },
  { label: 'Published activities', value: '5', detail: '2 close this week' },
  { label: 'Pending submissions', value: '18', detail: 'Final records to check' },
  { label: 'Repositories created', value: '9', detail: '11 expected teams' },
  { label: 'Projects ready for review', value: '4', detail: 'Across prelim requirements' },
  { label: 'Similarity review alerts', value: '3', detail: 'Instructor-only signals' },
]

const attentionItems = [
  {
    title: 'Prelim Programming Exercise 2 LAB',
    meta: 'Activity Mode',
    status: 'Needs grading',
    signal: '14 final submissions pending feedback release',
  },
  {
    title: 'Team 04 repository',
    meta: 'Project Collaboration Mode',
    status: 'Missing repository',
    signal: 'Prelim Group Project 1 is due Aug 27, 2026, 10:30 AM',
  },
  {
    title: 'Team 02 contribution balance',
    meta: 'Repository oversight',
    status: 'Needs watch',
    signal: 'Uneven commit activity across four members',
  },
  {
    title: 'Student Grade Analyzer',
    meta: 'Activity Mode',
    status: 'Failed tests',
    signal: '6 submissions have hidden checking issues',
  },
  {
    title: 'Similarity review queue',
    meta: 'Academic review',
    status: 'Needs review',
    signal: 'Comparable structure detected in 3 student records',
  },
]

const streamItems = [
  {
    id: 'activity-1',
    type: 'assignment',
    title: 'Published Prelim Programming Exercise 1 LAB',
    detail: 'Due Aug 27, 2026, 10:30 AM - one final submission only',
    date: 'Aug 25, 2026',
  },
  {
    id: 'activity-2',
    type: 'assignment',
    title: 'Updated Loop Patterns and Input Validation',
    detail: 'Visible test cases refreshed; hidden checking remains instructor-only',
    date: 'Aug 26, 2026',
  },
  {
    id: 'project-1',
    type: 'announcement',
    title: 'Project update: Prelim Group Project 1 Specifications',
    detail: '9 of 11 teams have created repositories; 4 are ready for review',
    date: 'Aug 26, 2026',
  },
]

const repositorySummary = [
  { label: 'Repositories created', value: '9 / 11' },
  { label: 'Ready for review', value: '4 teams' },
  { label: 'Uneven contribution', value: '2 teams' },
  { label: 'Missing repository', value: '2 teams' },
]

const activities = [
  {
    title: 'Prelim Programming Exercise 1 LAB',
    due: 'Aug 27, 2026, 10:30 AM',
    status: 'Published',
    submissions: '31 / 38',
    grading: 'Feedback releasing',
  },
  {
    title: 'Prelim Programming Exercise 2 LAB',
    due: 'Aug 30, 2026, 11:59 PM',
    status: 'Published',
    submissions: '24 / 38',
    grading: 'Needs grading',
  },
  {
    title: 'Loop Patterns and Input Validation',
    due: 'Sep 3, 2026, 5:00 PM',
    status: 'Published',
    submissions: '12 / 38',
    grading: 'Monitoring',
  },
  {
    title: 'Student Grade Analyzer',
    due: 'Sep 10, 2026, 10:30 AM',
    status: 'Draft',
    submissions: 'Not open',
    grading: 'Setup review',
  },
  {
    title: 'CSV Enrollment Parser',
    due: 'Sep 17, 2026, 5:00 PM',
    status: 'Draft',
    submissions: 'Not open',
    grading: 'Setup review',
  },
]

const groupProjects = [
  {
    title: 'Prelim Group Project 1 Specifications',
    due: 'Aug 27, 2026, 10:30 AM',
    status: 'Published',
    repositories: '9 / 11',
    review: '4 ready',
  },
  {
    title: 'Prelim Group Project 2 Specifications',
    due: 'Sep 24, 2026, 10:30 AM',
    status: 'Published',
    repositories: '0 / 11',
    review: 'Not open',
  },
  {
    title: 'Midterm Group Project 1 Specifications',
    due: 'Oct 20, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    review: 'Setup review',
  },
  {
    title: 'Final Group Project Proposal',
    due: 'Dec 5, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    review: 'Setup review',
  },
]

const roster = [
  {
    name: 'Julius Teodoro',
    email: '2216146@slu.edu.ph',
    section: 'BSIT 2A',
    status: 'Enrolled',
    invite: 'Accepted',
  },
  {
    name: 'Alyssa Mendoza',
    email: 'alyssa.mendoza@slu.edu.ph',
    section: 'BSIT 2A',
    status: 'Enrolled',
    invite: 'Accepted',
  },
  {
    name: 'Marco Rivera',
    email: 'marco.rivera.student@slu.edu.ph',
    section: 'BSIT 2A',
    status: 'Enrolled',
    invite: 'Accepted',
  },
  {
    name: 'Daniel Reyes',
    email: 'daniel.reyes@slu.edu.ph',
    section: 'BSIT 2A',
    status: 'Enrolled',
    invite: 'Accepted',
  },
  {
    name: 'Mica Dela Cruz',
    email: 'mica.delacruz@slu.edu.ph',
    section: 'BSIT 2A',
    status: 'Pending',
    invite: 'Invited',
  },
]

function InstructorProfileMenu() {
  return (
    <div className="student-profile-menu">
      <button type="button" className="student-profile-trigger">
        <span className="student-user-avatar" aria-hidden="true" />
        <span className="student-user-name">
          <strong>Engr. Marco Rivera</strong>
          <span>Instructor</span>
        </span>
      </button>
    </div>
  )
}

function InstructorUserArea({ count = 5 }) {
  return (
    <div className="student-user-area">
      <button type="button" className="student-bell" aria-label="Notifications">
        <span className="student-bell__shape" aria-hidden="true" />
        <span className="student-bell__count">{count}</span>
      </button>
      <InstructorProfileMenu />
    </div>
  )
}

function InstructorClassHeader({ activeTab }) {
  const tabs = [
    { label: 'Stream', path: '/instructor/classes', key: 'stream' },
    { label: 'Assignments', path: '/instructor/activity', key: 'assignments' },
    { label: 'People', path: '/instructor/people', key: 'people' },
    { label: 'Class Info', path: '/instructor/class-info', key: 'info' },
  ]

  return (
    <header className="student-class-header">
      <div className="student-class-header__top">
        <div className="student-course-title">
          <span className="student-course-avatar">I</span>
          <div>
            <h1>{instructorClass.course}</h1>
            <div className="student-course-meta">
              <span>{instructorClass.section}</span>
              <span>{instructorClass.instructor}</span>
              <span className="student-class-code">{instructorClass.classCode}</span>
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
              to={tab.path}
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

function InstructorClassPage({ activeTab, children }) {
  return (
    <div className="student-class-page">
      <InstructorClassHeader activeTab={activeTab} />
      <section className="student-class-content instructor-class-content">{children}</section>
    </div>
  )
}

function InstructorDashboard() {
  return (
    <div className="instructor-home-page">
      <header className="student-home-topbar">
        <InstructorUserArea count={6} />
      </header>

      <main className="student-home-content instructor-home-content">
        <h1>Welcome back, Engr. Rivera</h1>

        <section className="instructor-dashboard-section">
          <div className="student-home-section-heading">
            <h2>Instructor Dashboard</h2>
            <NavLink to="/instructor/classes">Open class stream</NavLink>
          </div>

          <div className="instructor-stat-grid">
            {dashboardStats.map((stat) => (
              <article className="instructor-stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="instructor-dashboard-section">
          <div className="student-home-section-heading">
            <h2>Attention Queue</h2>
            <span>IT 112 - BSIT 2A</span>
          </div>

          <div className="instructor-attention-list">
            {attentionItems.map((item) => (
              <article className="instructor-attention-card" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <em>{item.status}</em>
                <p>{item.signal}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function InstructorStreamPage() {
  return (
    <InstructorClassPage activeTab="stream">
      <div className="student-stream-card instructor-stream-card" aria-label="Instructor class stream">
        <section className="instructor-composer-card">
          <span className="student-user-avatar" aria-hidden="true" />
          <button type="button">Announce something to BSIT 2A</button>
        </section>

        <section className="instructor-stream-section">
          <h2>Recent Published Activities</h2>
          {streamItems
            .filter((item) => item.type === 'assignment')
            .map((item) => (
              <article className="student-stream-post" key={item.id}>
                <div className="student-post-icon student-post-icon--assignment" aria-hidden="true" />
                <div>
                  <p>
                    <strong>{instructorClass.instructor}</strong> {item.title}
                  </p>
                  <span>{item.detail}</span>
                  <span>{item.date}</span>
                </div>
                <button type="button" className="student-more" aria-label="More options" />
              </article>
            ))}
        </section>

        <section className="instructor-stream-section">
          <h2>Recent Project Updates</h2>
          {streamItems
            .filter((item) => item.type === 'announcement')
            .map((item) => (
              <article className="student-stream-post" key={item.id}>
                <div className="student-post-icon student-post-icon--announcement" aria-hidden="true" />
                <div>
                  <p>
                    <strong>{instructorClass.instructor}</strong> {item.title}
                  </p>
                  <span>{item.detail}</span>
                  <span>{item.date}</span>
                </div>
                <button type="button" className="student-more" aria-label="More options" />
              </article>
            ))}
        </section>

        <section className="instructor-repository-summary">
          <h2>Student Repository Activity Summary</h2>
          <div>
            {repositorySummary.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </InstructorClassPage>
  )
}

function AssignmentSubTabs({ active }) {
  return (
    <div className="student-segmented-tabs" aria-label="Instructor assignment type">
      <NavLink to="/instructor/activity" className={active === 'activities' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Activities
      </NavLink>
      <NavLink to="/instructor/projects" className={active === 'projects' ? 'is-active' : undefined}>
        <span aria-hidden="true" />
        Group Projects
      </NavLink>
    </div>
  )
}

function InstructorControls({ primaryLabel }) {
  return (
    <div className="instructor-controls-row">
      <button type="button" className="student-primary-action">{primaryLabel}</button>
      <button type="button" className="student-outline-action">View queue</button>
      <button type="button" className="student-outline-action">Edit settings</button>
    </div>
  )
}

function InstructorActivitiesPage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="activities" />
          <InstructorControls primaryLabel="Create Activity" />
        </div>

        <div className="instructor-data-table" role="table" aria-label="Programming activities">
          <div className="instructor-table-row instructor-table-row--head" role="row">
            <span>Activity</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Submissions</span>
            <span>Grading</span>
            <span>Actions</span>
          </div>
          {activities.map((activity) => (
            <div className="instructor-table-row" role="row" key={activity.title}>
              <strong>{activity.title}</strong>
              <span>{activity.due}</span>
              <em>{activity.status}</em>
              <span>{activity.submissions}</span>
              <span>{activity.grading}</span>
              <div>
                <button type="button">Monitor</button>
                <button type="button">Settings</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function InstructorProjectsPage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="projects" />
          <InstructorControls primaryLabel="Create Project Requirement" />
        </div>

        <div className="instructor-data-table" role="table" aria-label="Group projects">
          <div className="instructor-table-row instructor-table-row--head" role="row">
            <span>Project Requirement</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Repositories</span>
            <span>Review</span>
            <span>Actions</span>
          </div>
          {groupProjects.map((project) => (
            <div className="instructor-table-row" role="row" key={project.title}>
              <strong>{project.title}</strong>
              <span>{project.due}</span>
              <em>{project.status}</em>
              <span>{project.repositories}</span>
              <span>{project.review}</span>
              <div>
                <button type="button">Monitor</button>
                <button type="button">Settings</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function InstructorPeoplePage() {
  return (
    <InstructorClassPage activeTab="people">
      <div className="student-people-panel instructor-people-panel">
        <section className="instructor-people-actions">
          <div>
            <h2>Class Roster</h2>
            <span>38 students - class code {instructorClass.classCode}</span>
          </div>
          <div>
            <button type="button" className="student-primary-action">Invite Students</button>
            <button type="button" className="student-outline-action">Generate Class Code</button>
          </div>
        </section>

        <div className="instructor-data-table instructor-people-table" role="table" aria-label="Class roster">
          <div className="instructor-table-row instructor-table-row--head" role="row">
            <span>Student</span>
            <span>Email / Student No.</span>
            <span>Section</span>
            <span>Status</span>
            <span>Invite</span>
            <span>Actions</span>
          </div>
          {roster.map((student) => (
            <div className="instructor-table-row" role="row" key={student.email}>
              <strong>{student.name}</strong>
              <span>{student.email}</span>
              <span>{student.section}</span>
              <em>{student.status}</em>
              <span>{student.invite}</span>
              <div>
                <button type="button">Manage</button>
                <button type="button">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function InstructorClassInfoPage() {
  const rules = [
    ['Course name', instructorClass.course],
    ['Section', instructorClass.section],
    ['Instructor', instructorClass.instructor],
    ['Class code', instructorClass.classCode],
    ['Activity rules', 'One final submission only; deadline locks submit controls'],
    ['Repository rules', 'Team repositories are linked to group project requirements'],
    ['Feedback release', 'Grades and comments are released after instructor review'],
  ]

  return (
    <InstructorClassPage activeTab="info">
      <div className="student-people-panel instructor-info-panel">
        <section>
          <h2>Class Info</h2>
          <p>Academic programming workspace settings for IT 112 - BSIT 2A.</p>
        </section>

        <div className="instructor-info-list">
          {rules.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function InstructorRoutePage({ pagePath }) {
  const pages = {
    dashboard: <InstructorDashboard />,
    classes: <InstructorStreamPage />,
    activity: <InstructorActivitiesPage />,
    projects: <InstructorProjectsPage />,
    people: <InstructorPeoplePage />,
    roster: <InstructorPeoplePage />,
    'class-info': <InstructorClassInfoPage />,
    'class-code': <InstructorClassInfoPage />,
  }

  return pages[pagePath] || <InstructorStreamPage />
}

export default InstructorRoutePage
