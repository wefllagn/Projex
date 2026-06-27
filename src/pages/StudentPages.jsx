import { useState } from 'react'
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

const feedbackResults = [
  { label: 'Top border of asterisks', status: 'Passed' },
  { label: 'Bottom border of asterisks', status: 'Passed' },
  { label: '"hello world" appears correctly', status: 'Passed' },
  { label: 'Required blank lines inside the box', status: 'Passed' },
  { label: 'Program exits successfully', status: 'Passed' },
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
  const [submitted, setSubmitted] = useState(initialSubmitted)
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
                <button
                  type="button"
                  className="student-primary-action"
                  onClick={() => setSubmitted(true)}
                >
                  Preview submitted
                </button>
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
    'activity/act-loops-01': <ActivityDetailPage />,
    'activity/act-loops-01/submission-record': <ActivityDetailPage initialSubmitted />,
    'activity/act-loops-01/feedback': <ActivityDetailPage initialSubmitted openFeedback />,
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
