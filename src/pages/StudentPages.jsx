import { NavLink } from 'react-router-dom'

const streamPosts = [
  {
    id: 'stream-assignment',
    author: 'RAMEL CABANILLA',
    text: 'posted a new assignment: Prelim Programming Exercise 1 LAB',
    date: 'Aug 25, 2022 (Edited Oct 5, 2022)',
    type: 'assignment',
  },
  {
    id: 'stream-announcement',
    author: 'RAMEL CABANILLA',
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

const instructors = [
  { name: 'Mr. Rickon Morty', email: 'rickon.morty@slu.edu.ph', avatar: 'RM' },
  { name: 'Ramel Cabanilla', email: 'ramel.cabanilla@slu.edu.ph', avatar: 'RC' },
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
          <button type="button" className="student-bell" aria-label="Notifications">
            <span className="student-bell__shape" aria-hidden="true" />
            <span className="student-bell__count">5</span>
          </button>
          <span className="student-user-avatar" aria-hidden="true" />
          <div className="student-user-name">
            <strong>Julius Teodoro</strong>
            <span>BSIT 2A</span>
          </div>
          <span className="student-dropdown" aria-hidden="true" />
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
        <button type="button" className="student-class-info">
          <span aria-hidden="true">i</span>
          Class Info
        </button>
      </div>
    </header>
  )
}

function StudentClassPage({ activeTab, children }) {
  return (
    <div className="student-class-page">
      <ClassHeader activeTab={activeTab} />
      <section className="student-class-content">{children}</section>
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
                <strong>{activity.title}</strong>
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
                  <NavLink to="/student/activity" className="student-text-link">
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
                <strong>{project.title}</strong>
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
                    <NavLink to="/student/projects" className="student-text-link">
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
    dashboard: <StreamPage />,
    classes: <StreamPage />,
    'join-class': <StreamPage />,
    invitations: <StreamPage />,
    activity: <ActivitiesPage />,
    submissions: <ActivitiesPage />,
    'activity/act-loops-01': <ActivitiesPage />,
    'activity/act-loops-01/submission-record': <ActivitiesPage />,
    'activity/act-loops-01/feedback': <ActivitiesPage />,
    projects: <GroupProjectsPage />,
    'projects/repo-campus-nav': <GroupProjectsPage />,
    'projects/repo-campus-nav/contributions': <GroupProjectsPage />,
    analytics: <StreamPage />,
    archive: <GroupProjectsPage />,
    people: <PeoplePage />,
    settings: <StreamPage />,
  }

  return pages[pagePath] || <StreamPage />
}

export default StudentRoutePage
