import { useState } from 'react'
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
    detail: 'Due Aug 27, 2026, 10:30 AM - attempts allowed until due date',
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

const monitoringStats = [
  { label: 'Submitted', value: '31', detail: 'Final records received' },
  { label: 'Missing', value: '5', detail: 'No submission yet' },
  { label: 'Late', value: '2', detail: 'Submitted after due time' },
  { label: 'Locked', value: '38', detail: 'Attempts closed after due date' },
]

const submissionRows = [
  {
    student: 'Julius Teodoro',
    status: 'Submitted',
    submittedAt: 'Aug 27, 2026, 9:42 AM',
    tests: '5/5 visible passed',
    similarity: 'Checked',
    grade: 'Ready to release',
  },
  {
    student: 'Alyssa Mendoza',
    status: 'Submitted',
    submittedAt: 'Aug 27, 2026, 10:08 AM',
    tests: '4/5 visible passed',
    similarity: 'Needs review',
    grade: 'Draft grade',
  },
  {
    student: 'Marco Rivera',
    status: 'Late',
    submittedAt: 'Aug 27, 2026, 10:46 AM',
    tests: '3/5 visible passed',
    similarity: 'Under review',
    grade: 'Needs grading',
  },
  {
    student: 'Daniel Reyes',
    status: 'Missing',
    submittedAt: 'No final submission',
    tests: 'No submitted code',
    similarity: 'Not checked',
    grade: 'Missing',
  },
  {
    student: 'Mica Dela Cruz',
    status: 'Submitted',
    submittedAt: 'Aug 27, 2026, 9:58 AM',
    tests: 'Failed tests',
    similarity: 'Checked',
    grade: 'Needs grading',
  },
]

const queueRows = [
  {
    student: 'Alyssa Mendoza',
    activity: 'Prelim Programming Exercise 1 LAB',
    status: 'Needs review',
    submittedAt: 'Aug 27, 2026, 10:08 AM',
    tests: '4/5 visible, hidden pending',
    grade: 'Draft',
  },
  {
    student: 'Marco Rivera',
    activity: 'Prelim Programming Exercise 1 LAB',
    status: 'Late',
    submittedAt: 'Aug 27, 2026, 10:46 AM',
    tests: '3/5 visible, 1 hidden failed',
    grade: 'Needs grading',
  },
  {
    student: 'Mica Dela Cruz',
    activity: 'Prelim Programming Exercise 1 LAB',
    status: 'Failed tests',
    submittedAt: 'Aug 27, 2026, 9:58 AM',
    tests: '2/5 visible, hidden pending',
    grade: 'Needs grading',
  },
  {
    student: 'Julius Teodoro',
    activity: 'Prelim Programming Exercise 1 LAB',
    status: 'Graded',
    submittedAt: 'Aug 27, 2026, 9:42 AM',
    tests: '5/5 visible, 2/2 hidden',
    grade: '96/100',
  },
]

const reviewTests = [
  { name: 'Displays required header text', visibility: 'Visible', result: 'Passed', points: '10 / 10' },
  { name: 'Uses five formatted output lines', visibility: 'Visible', result: 'Passed', points: '15 / 15' },
  { name: 'Handles blank-line spacing', visibility: 'Visible', result: 'Failed', points: '0 / 10' },
  { name: 'Matches hidden formatting edge case', visibility: 'Hidden', result: 'Failed', points: '0 / 15' },
  { name: 'Compiles without errors', visibility: 'Hidden', result: 'Passed', points: '20 / 20' },
]

const submittedCode = `package exercises.prelim;

public class Exercise1 {
    public static void main(String[] args) {
        System.out.println("*******************************");
        System.out.println("*         hello world         *");
        System.out.println("*                             *");
        System.out.println("*******************************");
    }
}`

const groupProjects = [
  {
    title: 'Prelim Group Project 1 Specifications',
    due: 'Aug 27, 2026, 10:30 AM',
    status: 'Published',
    repositories: '9 / 11',
    ready: '4 teams',
    atRisk: '2 teams',
  },
  {
    title: 'Prelim Group Project 2 Specifications',
    due: 'Sep 24, 2026, 10:30 AM',
    status: 'Published',
    repositories: '0 / 11',
    ready: 'Not open',
    atRisk: 'Not started',
  },
  {
    title: 'Midterm Group Project 1 Specifications',
    due: 'Oct 20, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    ready: 'Setup review',
    atRisk: 'Not open',
  },
  {
    title: 'Final Group Project Proposal',
    due: 'Dec 5, 2026, 10:30 AM',
    status: 'Draft',
    repositories: 'Not open',
    ready: 'Setup review',
    atRisk: 'Not open',
  },
]

const projectTeams = [
  {
    team: 'Team 01',
    repo: 'prelim-group-project-1-team-01',
    members: 'Julius Teodoro, Alyssa Mendoza, Daniel Reyes',
    lastCommit: 'Aug 26, 2026, 8:14 PM',
    contribution: 'Balanced',
    status: 'Ready for review',
    similarity: 'Checked',
  },
  {
    team: 'Team 02',
    repo: 'prelim-group-project-1-team-02',
    members: 'Marco Rivera, Mica Dela Cruz, Rafael Santos',
    lastCommit: 'Aug 26, 2026, 5:30 PM',
    contribution: 'Uneven',
    status: 'In progress',
    similarity: 'Needs review',
  },
  {
    team: 'Team 03',
    repo: 'prelim-group-project-1-team-03',
    members: 'Julius Teodoro, Alyssa Mendoza, Marco Rivera, Daniel Reyes',
    lastCommit: 'Aug 27, 2026, 9:20 AM',
    contribution: 'Balanced',
    status: 'Not yet marked ready',
    similarity: 'Comparable structure detected',
  },
  {
    team: 'Team 04',
    repo: 'No repository yet',
    members: 'Pending team setup',
    lastCommit: 'No activity',
    contribution: 'Missing',
    status: 'Missing repository',
    similarity: 'Not checked',
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

const archiveChecklist = [
  { item: 'Requirements complete', status: 'Ready' },
  { item: 'README present', status: 'Ready' },
  { item: 'Specifications linked', status: 'Ready' },
  { item: 'Final review completed', status: 'Pending instructor decision' },
  { item: 'Repository ready for preservation', status: 'Needs approval' },
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
      <NavLink to="/instructor/activity/new" className="student-primary-action">{primaryLabel}</NavLink>
      <NavLink to="/instructor/activity/act-loops-01/submissions" className="student-outline-action">
        View submissions
      </NavLink>
      <NavLink to="/instructor/activity/new" className="student-outline-action">Edit settings</NavLink>
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
                <NavLink to="/instructor/activity/act-loops-01/monitor">Monitor</NavLink>
                <NavLink to="/instructor/activity/act-loops-01/submissions">Submissions</NavLink>
                <NavLink to="/instructor/activity/new">Settings</NavLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function CreateActivityPage() {
  const [status, setStatus] = useState('Draft not saved in this prototype session.')
  const [attemptLimit, setAttemptLimit] = useState('1')

  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel instructor-form-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="activities" />
          <NavLink to="/instructor/activity" className="student-outline-action">Back to activities</NavLink>
        </div>

        <section className="instructor-page-heading">
          <p>Create Activity</p>
          <h2>Programming activity setup</h2>
          <span>Hardcoded prototype form - no backend request is sent.</span>
        </section>

        <div className="instructor-form-grid">
          <label>
            Activity title
            <input defaultValue="Loop Patterns and Input Validation" />
          </label>
          <label>
            Programming language
            <span className="instructor-fixed-value">Java</span>
          </label>
          <label>
            Due date
            <input defaultValue="2026-09-03 17:00" />
          </label>
          <label>
            Submission Attempts
            <div className="instructor-attempt-control" role="group" aria-label="Submission attempts">
              {['1', '2', '3'].map((attempt) => (
                <button
                  type="button"
                  className={attemptLimit === attempt ? 'is-active' : undefined}
                  onClick={() => setAttemptLimit(attempt)}
                  key={attempt}
                >
                  {attempt}
                </button>
              ))}
            </div>
          </label>
        </div>
        <p className="instructor-field-note">
          Students may use up to {attemptLimit} submission {attemptLimit === '1' ? 'attempt' : 'attempts'} until the due date. Attempts lock after the deadline.
        </p>

        <label className="instructor-wide-field">
          Instructions
          <textarea defaultValue="Write a program that reads integer input, validates the values, and prints a formatted loop summary. Submit only when your final code is ready." />
        </label>

        <section className="instructor-upload-placeholder">
          <span className="student-pdf-icon">PDF</span>
          <div>
            <strong>Resource / PDF attachment placeholder</strong>
            <p>Programming Exercise Instructions.pdf can be attached in the final product.</p>
          </div>
          <button type="button">Choose file</button>
        </section>

        <section className="instructor-upload-placeholder">
          <span className="instructor-code-file-icon">JAVA</span>
          <div>
            <strong>Add source code for test cases</strong>
            <p>Upload a Java source file used only for instructor-side prototype test-case setup.</p>
          </div>
          <button type="button">Choose source file</button>
        </section>

        <div className="instructor-settings-grid">
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Compiler enabled</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Show visible test summaries to students</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Hide hidden test logic from students</span>
          </label>
          <label className="instructor-toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Release feedback after instructor approval</span>
          </label>
        </div>

        <section className="instructor-testcase-panel">
          <div className="instructor-section-title">
            <h3>Test Case Setup</h3>
            <button type="button">Add test case</button>
          </div>
          <div className="instructor-data-table">
            <div className="instructor-table-row instructor-table-row--head instructor-test-row">
              <span>Sample Input</span>
              <span>Expected Output</span>
              <span>Points</span>
              <span>Visibility</span>
            </div>
            {[
              ['10 20 30 -1', 'Count: 3 | Average: 20.00', '20', 'Visible'],
              ['5 -3 8 -1', 'Invalid input ignored | Count: 2', '20', 'Visible'],
              ['0 -1', 'Count: 1 | Average: 0.00', '30', 'Hidden'],
            ].map(([input, output, points, visibility]) => (
              <div className="instructor-table-row instructor-test-row" key={`${input}-${visibility}`}>
                <span>{input}</span>
                <span>{output}</span>
                <span>{points}</span>
                <em>{visibility}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="instructor-testcase-panel">
          <div className="instructor-section-title">
            <h3>Rubric / Scoring</h3>
            <span>100 points</span>
          </div>
          <div className="instructor-rubric-grid">
            <label>
              Correctness
              <input defaultValue="40" />
            </label>
            <label>
              Input validation
              <input defaultValue="20" />
            </label>
            <label>
              Code readability
              <input defaultValue="20" />
            </label>
            <label>
              Output formatting
              <input defaultValue="20" />
            </label>
          </div>
        </section>

        <div className="instructor-form-actions">
          <button type="button" className="student-outline-action" onClick={() => setStatus('Draft saved locally for preview.')}>
            Save Draft
          </button>
          <button type="button" className="student-primary-action" onClick={() => setStatus('Activity marked as published in local prototype state.')}>
            Publish Activity
          </button>
          <p>{status}</p>
        </div>
      </div>
    </InstructorClassPage>
  )
}

function ActivityMonitoringPage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="activities" />
          <div className="instructor-controls-row">
            <NavLink to="/instructor/activity" className="student-outline-action">Back to activities</NavLink>
            <NavLink to="/instructor/activity/act-loops-01/submissions" className="student-primary-action">
              View submission queue
            </NavLink>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Activity Monitoring</p>
          <h2>Prelim Programming Exercise 1 LAB</h2>
          <span>Due Aug 27, 2026, 10:30 AM - attempts allowed until due date</span>
        </section>

        <div className="instructor-stat-grid instructor-monitor-grid">
          {monitoringStats.map((stat) => (
            <article className="instructor-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="instructor-data-table" role="table" aria-label="Student submissions">
          <div className="instructor-table-row instructor-table-row--head instructor-submission-row" role="row">
            <span>Student name</span>
            <span>Submission status</span>
            <span>Last submitted</span>
            <span>Test result</span>
            <span>Similarity signal</span>
            <span>Grade status</span>
            <span>Action</span>
          </div>
          {submissionRows.map((row) => (
            <div className="instructor-table-row instructor-submission-row" role="row" key={row.student}>
              <strong>{row.student}</strong>
              <em>{row.status}</em>
              <span>{row.submittedAt}</span>
              <span>{row.tests}</span>
              <span>{row.similarity}</span>
              <span>{row.grade}</span>
              <div>
                <NavLink to="/instructor/submission-review">Review</NavLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function SubmissionQueuePage() {
  return (
    <InstructorClassPage activeTab="assignments">
      <div className="student-assignment-panel instructor-assignment-panel">
        <div className="instructor-assignment-toolbar">
          <AssignmentSubTabs active="activities" />
          <div className="instructor-controls-row">
            <NavLink to="/instructor/activity/act-loops-01/monitor" className="student-outline-action">
              Monitor activity
            </NavLink>
            <NavLink to="/instructor/submission-review" className="student-primary-action">
              Open selected review
            </NavLink>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Submission Queue</p>
          <h2>Final submitted activity records</h2>
          <span>Submitted, missing, late, failed tests, needs review, and graded records.</span>
        </section>

        <div className="instructor-data-table" role="table" aria-label="Submission queue">
          <div className="instructor-table-row instructor-table-row--head instructor-queue-row" role="row">
            <span>Student</span>
            <span>Activity</span>
            <span>Status</span>
            <span>Submitted at</span>
            <span>Tests</span>
            <span>Grade</span>
            <span>Action</span>
          </div>
          {queueRows.map((row) => (
            <div className="instructor-table-row instructor-queue-row" role="row" key={`${row.student}-${row.status}`}>
              <strong>{row.student}</strong>
              <span>{row.activity}</span>
              <em>{row.status}</em>
              <span>{row.submittedAt}</span>
              <span>{row.tests}</span>
              <span>{row.grade}</span>
              <div>
                <NavLink to="/instructor/submission-review">Review</NavLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstructorClassPage>
  )
}

function ReleaseFeedbackModal({ grade, feedback, onCancel, onRelease }) {
  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="release-feedback-title">
      <section className="student-submit-modal instructor-release-modal">
        <span className="student-submit-icon" aria-hidden="true" />
        <h2 id="release-feedback-title">Release feedback to student?</h2>
        <p>Grade: {grade || 'Not set'}</p>
        <p>{feedback || 'No feedback comment entered.'}</p>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="student-primary-action" onClick={onRelease}>
            Release Feedback
          </button>
        </div>
      </section>
    </div>
  )
}

function SubmissionReviewPage() {
  const [feedback, setFeedback] = useState('Good structure overall. Fix the blank-line formatting so the boxed output matches the required sample exactly.')
  const [grade, setGrade] = useState('82')
  const [status, setStatus] = useState('Feedback draft')
  const [testRunState, setTestRunState] = useState('idle')
  const [modalOpen, setModalOpen] = useState(false)
  const testsHaveRun = testRunState !== 'idle'
  const visibleTests = reviewTests.filter((test) => test.visibility === 'Visible')
  const failedTests = visibleTests.filter((test) => test.result === 'Failed')

  return (
    <InstructorClassPage activeTab="assignments">
      <div className="instructor-review-page">
        <div className="instructor-assignment-toolbar">
          <NavLink to="/instructor/activity/act-loops-01/submissions" className="student-outline-action">
            Back to queue
          </NavLink>
          <em>{status}</em>
        </div>

        <section className="instructor-page-heading">
          <p>Selected Student Submission Review</p>
          <h2>Alyssa Mendoza - Prelim Programming Exercise 1 LAB</h2>
          <span>Submitted Aug 27, 2026, 10:08 AM - latest recorded attempt before the deadline</span>
        </section>

        <div className="instructor-review-grid">
          <section className="instructor-code-card">
            <div className="instructor-section-title">
              <h3>Submitted code viewer</h3>
              <span>Exercise1.java</span>
            </div>
            <pre>{submittedCode}</pre>
          </section>

          <aside className="instructor-review-side">
            <section className="instructor-output-card">
              <div className="instructor-section-title">
                <h3>Compiler output</h3>
                <button type="button" onClick={() => setTestRunState('failed')}>Run Tests</button>
              </div>
              <pre>
                {testsHaveRun
                  ? 'Mock compile succeeded.\nVisible tests: 2/3 passed.\nHidden tests: held for instructor-only review.\nFailed testcase: Handles blank-line spacing.'
                  : 'Tests have not been run in this review session.\nClick Run Tests to execute the hardcoded prototype check.'}
              </pre>
            </section>

            <section className="instructor-similarity-card">
              <span>Similarity signal</span>
              <strong>Needs instructor review</strong>
              <p>Comparable structure detected in standard setup code. No student-facing score is shown.</p>
            </section>
          </aside>
        </div>

        <section className="instructor-testcase-panel">
          <div className="instructor-section-title">
            <h3>Test case results</h3>
            <span>{testsHaveRun ? '2 / 3 visible tests passed' : 'Waiting for Run Tests'}</span>
          </div>
          {testsHaveRun ? (
            <>
              <div className="instructor-test-summary is-failed">
                <strong>Failed</strong>
                <span>2 passed, 1 failed. Hidden test logic remains instructor-only.</span>
              </div>
              <div className="instructor-data-table">
                <div className="instructor-table-row instructor-table-row--head instructor-test-result-row">
                  <span>Visible test case</span>
                  <span>Visibility</span>
                  <span>Result</span>
                  <span>Points</span>
                </div>
                {visibleTests.map((test) => (
                  <div className="instructor-table-row instructor-test-result-row" key={test.name}>
                    <strong>{test.name}</strong>
                    <span>{test.visibility}</span>
                    <em>{test.result}</em>
                    <span>{test.points}</span>
                  </div>
                ))}
              </div>
              {failedTests.length > 0 && (
                <section className="instructor-failed-details">
                  <h3>Failed testcase details</h3>
                  {failedTests.map((test) => (
                    <article key={test.name}>
                      <strong>{test.name}</strong>
                      <p>Expected a blank spacer line inside the output box before the closing border.</p>
                      <code>Expected: "*                             *" before final border</code>
                      <code>Received: final border printed immediately after "hello world"</code>
                    </article>
                  ))}
                </section>
              )}
            </>
          ) : (
            <div className="instructor-test-summary">
              <strong>Not run</strong>
              <span>Use Run Tests to show the hardcoded visible test summary for this submitted code.</span>
            </div>
          )}
        </section>

        <section className="instructor-feedback-panel">
          <label>
            Instructor feedback
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          </label>
          <label>
            Grade
            <input value={grade} onChange={(event) => setGrade(event.target.value)} />
          </label>
          <div className="instructor-form-actions">
            <button type="button" className="student-outline-action" onClick={() => setStatus('Feedback saved')}>
              Save feedback
            </button>
            <button type="button" className="student-primary-action" onClick={() => setModalOpen(true)}>
              Release feedback
            </button>
          </div>
        </section>

        {modalOpen && (
          <ReleaseFeedbackModal
            grade={grade}
            feedback={feedback}
            onCancel={() => setModalOpen(false)}
            onRelease={() => {
              setModalOpen(false)
              setStatus('Feedback released')
            }}
          />
        )}
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
          <div className="instructor-controls-row">
            <NavLink to="/instructor/projects/new" className="student-primary-action">Create Project Requirement</NavLink>
            <button type="button" className="student-outline-action">View teams</button>
            <button type="button" className="student-outline-action">Edit settings</button>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Group Projects</p>
          <h2>Project requirements management</h2>
          <span>Publish requirements, monitor repositories, and review archive readiness with hardcoded prototype data.</span>
        </section>

        <div className="instructor-data-table" role="table" aria-label="Group projects">
          <div className="instructor-table-row instructor-table-row--head instructor-project-row" role="row">
            <span>Project Requirement</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Repositories</span>
            <span>Teams Ready</span>
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
                <NavLink to="/instructor/projects/prelim-group-project-1">Monitor</NavLink>
                <NavLink to="/instructor/projects/new">Settings</NavLink>
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
            Group size
            <input defaultValue="4 students" />
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
            <NavLink to="/instructor/projects/prelim-group-project-1/repository" className="student-primary-action">
              Open repository review
            </NavLink>
          </div>
        </div>

        <section className="instructor-page-heading">
          <p>Project Requirement Monitoring</p>
          <h2>Prelim Group Project 1 Specifications</h2>
          <span>Due Aug 27, 2026, 10:30 AM - repositories created 9 / 11</span>
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
            <strong>9 / 11</strong>
            <p>Team repositories created</p>
          </article>
          <article className="instructor-stat-card">
            <span>Ready for review</span>
            <strong>4</strong>
            <p>Teams marked ready</p>
          </article>
          <article className="instructor-stat-card">
            <span>At-risk teams</span>
            <strong>2</strong>
            <p>Missing or uneven progress</p>
          </article>
          <article className="instructor-stat-card">
            <span>Similarity signals</span>
            <strong>2</strong>
            <p>Instructor-only review needed</p>
          </article>
        </div>

        <div className="instructor-data-table" role="table" aria-label="Project teams">
          <div className="instructor-table-row instructor-table-row--head instructor-team-row">
            <span>Team</span>
            <span>Repository</span>
            <span>Members</span>
            <span>Last commit</span>
            <span>Contribution</span>
            <span>Status</span>
            <span>Similarity</span>
            <span>Action</span>
          </div>
          {projectTeams.map((team) => (
            <div className="instructor-table-row instructor-team-row" key={team.team}>
              <strong>{team.team}</strong>
              <span>{team.repo}</span>
              <span>{team.members}</span>
              <span>{team.lastCommit}</span>
              <em>{team.contribution}</em>
              <span>{team.status}</span>
              <span>{team.similarity}</span>
              <div>
                <NavLink to="/instructor/projects/prelim-group-project-1/repository">Open Repository</NavLink>
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

function SimilarityReviewPanel() {
  const [decision, setDecision] = useState('Open')

  return (
    <section className="instructor-repo-panel">
      <div className="instructor-section-title">
        <h3>Similarity Review</h3>
        <span>Instructor-only detail</span>
      </div>
      <div className="instructor-similarity-review">
        <strong>Needs review</strong>
        <p>Comparable structure detected with Team 02 in menu controller and validation helper organization.</p>
        <div>
          <span>Files involved: src/MenuController.java, src/InputValidator.java</span>
          <span>Signal: Moderate</span>
          <span>Decision: {decision}</span>
        </div>
        <button type="button" onClick={() => setDecision('Marked reviewed')}>Mark reviewed</button>
      </div>
    </section>
  )
}

function ArchiveReadinessPanel() {
  const [archiveStatus, setArchiveStatus] = useState('Awaiting final review')

  return (
    <section className="instructor-repo-panel">
      <div className="instructor-section-title">
        <h3>Archive Readiness</h3>
        <span>{archiveStatus}</span>
      </div>
      <div className="instructor-archive-list">
        {archiveChecklist.map((item) => (
          <article key={item.item}>
            <span>{item.item}</span>
            <strong>{item.status}</strong>
          </article>
        ))}
      </div>
      <div className="instructor-controls-row">
        <button type="button" className="student-primary-action" onClick={() => setArchiveStatus('Archive approved')}>
          Approve archive
        </button>
        <button type="button" className="student-outline-action" onClick={() => setArchiveStatus('Returned for revision')}>
          Return for revision
        </button>
      </div>
    </section>
  )
}

function InstructorRepositoryReviewPage() {
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
          <button type="button">main</button>
          <span>Linked to IT 112</span>
          <span>Team repository</span>
          <span>Ready for Review</span>
          <button type="button" className="student-repo-code-button">Code</button>
          <button type="button">History</button>
          <button type="button">Review actions</button>
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
                <li>Archive review pending</li>
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
                  </li>
                ))}
              </ul>
            </section>

            <section className="student-repo-card instructor-review-actions">
              <h2>Instructor Review Panel</h2>
              <p>Review repository completeness, contribution balance, similarity signal, and archive readiness.</p>
              <button type="button" className="student-primary-action">Save review note</button>
              <button type="button" className="student-outline-action">Return for revision</button>
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
          <SimilarityReviewPanel />
          <ArchiveReadinessPanel />
        </div>
      </main>
    </div>
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
    ['Activity rules', 'Submission attempts can be set from 1 to 3; attempts close after the due date'],
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
    'activity/new': <CreateActivityPage />,
    'activity-settings': <CreateActivityPage />,
    'activity/act-loops-01/monitor': <ActivityMonitoringPage />,
    'activity/act-loops-01/submissions': <SubmissionQueuePage />,
    'submission-review': <SubmissionReviewPage />,
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
    'class-code': <InstructorClassInfoPage />,
  }

  return pages[pagePath] || <InstructorStreamPage />
}

export default InstructorRoutePage
