import { useState } from 'react'
import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  instructorActivities,
  instructorActivitySettings,
  instructorAnalytics,
  instructorAnalyticsRows,
  instructorClassCode,
  instructorMonitoringRows,
  instructorProjectDetail,
  instructorProjects,
  instructorReview,
  instructorRoster,
  instructorSimilarityReports,
  instructorStudentProfile,
  instructorSubmissions,
} from '../data/projexData.js'

const standardColumns = [
  { key: 'item', label: 'Item' },
  { key: 'mode', label: 'Context' },
  { key: 'status', label: 'Status' },
  { key: 'signal', label: 'Signal' },
]

function PageIntro({ eyebrow, title, summary, status }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      {status && <StatusBadge label={status} />}
    </div>
  )
}

function ActionButton({ children, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className={disabled ? 'action-button is-disabled' : 'action-button'}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function InstructorDashboard() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Instructor workspace"
        title="Dashboard"
        summary="Course operations for rosters, deadlines, final submissions, checking, grading, similarity review, and project oversight."
        status="Hardcoded prototype"
      />
      <div className="stat-grid">
        <StatCard label="Class roster" value="96" detail="8 pending invitations" />
        <StatCard label="Published activities" value="9" detail="4 close this week" />
        <StatCard label="Submissions" value="28" detail="Final locked records to review" />
        <StatCard label="Similarity reviews" value="6" detail="Instructor-only detailed view" />
      </div>
      <div className="mode-overview">
        <Card title="Activity Mode" eyebrow="Checking and grading">
          <p>
            Manage deadlines, one-submission-only settings, checking setup, final
            submission queues, compiler output, feedback, and rubric grades.
          </p>
        </Card>
        <Card title="Project Collaboration Mode" eyebrow="Repository oversight">
          <p>
            Monitor project groups, repositories, commits, tasks, contribution balance,
            similarity review, and archive readiness.
          </p>
        </Card>
      </div>
      <Card title="Instructor attention queue" eyebrow="Selected course and section">
        <DataTable columns={standardColumns} rows={instructorAnalyticsRows} />
      </Card>
    </div>
  )
}

function RosterPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Class management"
        title="Class Roster"
        summary="Enrolled and invited students for CS 111 - BSCS 1A. Student status is hardcoded for this prototype."
        status="BSCS 1A"
      />
      <Card title="Roster" eyebrow="Enrolled students and invitation status">
        <DataTable columns={standardColumns} rows={instructorRoster} />
      </Card>
    </div>
  )
}

function InviteStudentsPage() {
  const [email, setEmail] = useState('student@slu.example')
  const [studentId, setStudentId] = useState('2026-00123')
  const [message, setMessage] = useState('No invitation sent in this mock session.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Class management"
        title="Invite Students"
        summary="Simulated invitation form for adding students to the selected course and section. No email or backend request is sent."
        status="Mock UI"
      />
      <Card title="Invite by email or student ID" eyebrow="CS 111 | BSCS 1A">
        <div className="form-row form-row--triple">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Student ID
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} />
          </label>
          <ActionButton onClick={() => setMessage(`Invitation previewed for ${email} (${studentId}).`)}>
            Send Mock Invite
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
      <Card title="Recent invitation status" eyebrow="Hardcoded records">
        <DataTable columns={standardColumns} rows={instructorRoster.filter((row) => row.status === 'Invited')} />
      </Card>
    </div>
  )
}

function ClassCodePage() {
  const [code, setCode] = useState(instructorClassCode.code)

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Class management"
        title="Class Code"
        summary="Generate and display the class code students use to join this section. Generation is simulated locally."
        status={instructorClassCode.status}
      />
      <Card title={code} eyebrow={`${instructorClassCode.course} | ${instructorClassCode.section}`}>
        <div className="detail-list">
          <span>Generated: {instructorClassCode.generatedAt}</span>
          <span>Expires: {instructorClassCode.expiresAt}</span>
          <span>Status: {instructorClassCode.status}</span>
        </div>
        <div className="button-row">
          <ActionButton onClick={() => setCode('SLU-CS111-1A-R2')}>Generate Mock Code</ActionButton>
        </div>
      </Card>
    </div>
  )
}

function ActivityManagementPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Activity Mode"
        title="Activity Management"
        summary="Instructor-created programming activities with language, deadline, publish/close status, one-submission rule, and checking setup."
        status="One submission only"
      />
      <Card title="Activities" eyebrow="Created by instructor">
        <DataTable columns={standardColumns} rows={instructorActivities} />
      </Card>
    </div>
  )
}

function CreateActivityPage() {
  const [title, setTitle] = useState('Campus Events API Client')
  const [status, setStatus] = useState('Draft activity not saved.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Activity Mode"
        title="Create Activity"
        summary="Mock creation form for configuring activity basics, deadline, test count, and one-submission-only rule."
        status="Draft"
      />
      <Card title="Activity draft" eyebrow="Simulated form">
        <div className="form-grid">
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Language
            <input defaultValue="JavaScript" />
          </label>
          <label>
            Deadline
            <input defaultValue="2026-07-12 17:00" />
          </label>
          <label>
            Test case count
            <input defaultValue="4 visible, 2 hidden" />
          </label>
        </div>
        <div className="button-row">
          <StatusBadge label="One submission only" />
          <StatusBadge label="Draft" />
          <ActionButton onClick={() => setStatus(`Draft preview created for ${title}.`)}>
            Preview Activity
          </ActionButton>
        </div>
        <p className="helper-text">{status}</p>
      </Card>
    </div>
  )
}

function ActivitySettingsPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Activity Mode"
        title="Activity Settings"
        summary="Deadline, publish/close status, one-submission-only rule, checking setup, test case count, and rubric configuration."
        status={instructorActivitySettings.publishStatus}
      />
      <div className="stat-grid">
        <StatCard label="Deadline" value="Jul 3" detail={instructorActivitySettings.deadline} />
        <StatCard label="Rule" value="One" detail={instructorActivitySettings.submissionRule} />
        <StatCard label="Tests" value="5" detail={instructorActivitySettings.testCaseCount} />
        <StatCard label="Close status" value="Open" detail={instructorActivitySettings.closeStatus} />
      </div>
      <Card title={instructorActivitySettings.title} eyebrow={instructorActivitySettings.language}>
        <p>{instructorActivitySettings.checkingSetup}</p>
        <div className="inline-badges">
          <StatusBadge label={instructorActivitySettings.publishStatus} />
          <StatusBadge label={instructorActivitySettings.submissionRule} />
          <StatusBadge label="Mock checking" />
        </div>
      </Card>
      <Card title="Rubric and checking setup" eyebrow="Configured criteria">
        <DataTable columns={standardColumns} rows={instructorActivitySettings.rubric} />
      </Card>
    </div>
  )
}

function MonitoringPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Activity Mode"
        title="Student Monitoring"
        summary="Live-style monitoring mockup for editing state, compiler state, submitted records, and intervention signals."
        status="Monitoring"
      />
      <Card title="Progress by student" eyebrow="Mock activity states">
        <DataTable columns={standardColumns} rows={instructorMonitoringRows} />
      </Card>
    </div>
  )
}

function SubmissionQueuePage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Activity Mode"
        title="Submission Queue"
        summary="Final submitted activity records only, with submitted date/time, compiler output state, test summary, feedback, grade, and similarity signal."
        status="Review queue"
      />
      <Card title="Submitted records" eyebrow="One final submission per student">
        <DataTable
          columns={[
            { key: 'item', label: 'Student' },
            { key: 'activity', label: 'Activity' },
            { key: 'submittedAt', label: 'Submitted at' },
            { key: 'status', label: 'Review' },
            { key: 'tests', label: 'Tests' },
            { key: 'grade', label: 'Grade' },
            { key: 'feedback', label: 'Feedback' },
          ]}
          rows={instructorSubmissions}
        />
      </Card>
    </div>
  )
}

function SubmissionReviewPage() {
  const [feedback, setFeedback] = useState('Return with comments on empty input handling.')
  const [grade, setGrade] = useState('73')
  const [status, setStatus] = useState(instructorReview.status)

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Submission Review"
        title={`${instructorReview.student} | ${instructorReview.activity}`}
        summary="Instructor-only review with code preview, mock compiler output, visible and hidden checking summary, rubric draft, feedback, and grade controls."
        status={status}
      />
      <div className="stat-grid">
        <StatCard label="Submitted" value="Jun 21" detail={instructorReview.submittedAt} />
        <StatCard label="Compiler" value="OK" detail="Mock compile succeeded" />
        <StatCard label="Visible tests" value="2/3" detail="Instructor sees full result" />
        <StatCard label="Hidden tests" value="1/2" detail="Instructor-only checks" />
      </div>
      <div className="workspace-grid workspace-grid--editor">
        <Card title="Code preview" eyebrow="Mock editor">
          <pre className="code-panel">{instructorReview.code}</pre>
        </Card>
        <Card title="Compiler output" eyebrow="Automated checking">
          <pre className="terminal-panel">{instructorReview.compilerOutput}</pre>
        </Card>
      </div>
      <Card title="Test case results" eyebrow="Visible and hidden checks">
        <DataTable columns={standardColumns} rows={instructorReview.tests} />
      </Card>
      <div className="workspace-grid">
        <Card title="Grade and rubric" eyebrow="Mock grading">
          <DataTable columns={standardColumns} rows={instructorReview.rubric} />
          <div className="form-row">
            <label>
              Grade
              <input value={grade} onChange={(event) => setGrade(event.target.value)} />
            </label>
            <ActionButton onClick={() => setStatus('Graded')}>Mark Graded</ActionButton>
          </div>
        </Card>
        <Card title="Final instructor feedback" eyebrow="Mock feedback panel">
          <label>
            Feedback
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          </label>
          <div className="button-row">
            <ActionButton onClick={() => setStatus('Needs Revision')}>Request Revision</ActionButton>
            <ActionButton onClick={() => setStatus('Checked')}>Release Feedback</ActionButton>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProjectOversightPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Project Collaboration Mode"
        title="Project Oversight"
        summary="Project groups, repositories, project status, task progress, contribution balance, and archive readiness."
        status="Repository learning"
      />
      <Card title="Project repositories" eyebrow="Course project groups">
        <DataTable columns={standardColumns} rows={instructorProjects} />
      </Card>
      <div className="mode-overview">
        <Card title="Group members" eyebrow="Campus Navigation Assistant">
          <DataTable columns={standardColumns} rows={instructorProjectDetail.members} />
        </Card>
        <Card title="Task progress" eyebrow="Milestone work">
          <DataTable columns={standardColumns} rows={instructorProjectDetail.tasks} />
        </Card>
      </div>
      <Card title="Commit timeline" eyebrow="Repository activity">
        <DataTable columns={standardColumns} rows={instructorProjectDetail.commits} />
      </Card>
    </div>
  )
}

function ContributionReviewPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Project Collaboration Mode"
        title="Contribution Review"
        summary="Instructor view of contribution balance across members, commits, reviews, tasks, and intervention signals."
        status="Review"
      />
      <Card title="Contribution balance" eyebrow="Campus Navigation Assistant">
        <DataTable columns={standardColumns} rows={instructorProjectDetail.members} />
      </Card>
    </div>
  )
}

function SimilarityPage() {
  const [decision, setDecision] = useState('Open')
  const rows = instructorSimilarityReports.map((report) => ({
    ...report,
    decision: report.item === 'Nico Santos - Student Grade Analyzer' ? decision : report.decision,
  }))

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Instructor-only similarity review"
        title="Project and Submission Similarity"
        summary="Detailed similarity indicators are visible here for instructors only. Student pages expose only general academic review labels."
        status="Instructor-only"
      />
      <Card title="Detailed similarity reports" eyebrow="Scores, matches, and decisions">
        <DataTable
          columns={[
            { key: 'item', label: 'Flagged work' },
            { key: 'mode', label: 'Type' },
            { key: 'status', label: 'Severity' },
            { key: 'signal', label: 'Score and matched source' },
            { key: 'decision', label: 'Instructor decision' },
          ]}
          rows={rows}
        />
        <div className="button-row">
          <ActionButton onClick={() => setDecision('Dismissed after review')}>Dismiss</ActionButton>
          <ActionButton onClick={() => setDecision('Request student explanation')}>Request Explanation</ActionButton>
          <ActionButton onClick={() => setDecision('Escalated')}>Escalate</ActionButton>
        </div>
      </Card>
    </div>
  )
}

function ArchiveReadinessPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Project Collaboration Mode"
        title="Archive Readiness"
        summary="Preservation readiness for final project repositories, including metadata, snapshot labels, retention, and unresolved review items."
        status="Archive review"
      />
      <Card title="Archive checklist" eyebrow="Campus Navigation Assistant">
        <DataTable columns={standardColumns} rows={instructorProjectDetail.archive} />
      </Card>
    </div>
  )
}

function AnalyticsPage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Learning analytics"
        title="Class Learning Analytics"
        summary="Class completion, weak topics, compiler/test performance, student progress indicators, and intervention signals."
        status="Instructor"
      />
      <div className="stat-grid">
        {instructorAnalytics.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <Card title="Intervention signals" eyebrow="Course and section analytics">
        <DataTable columns={standardColumns} rows={instructorAnalyticsRows} />
      </Card>
    </div>
  )
}

function StudentProfilePage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Student coding profile"
        title={instructorStudentProfile.name}
        summary={`Academic coding profile for ${instructorStudentProfile.section}, including submissions, checking trend, feedback, and repository contribution.`}
        status={instructorStudentProfile.status}
      />
      <Card title="Profile signals" eyebrow="Instructor view">
        <DataTable columns={standardColumns} rows={instructorStudentProfile.rows} />
      </Card>
    </div>
  )
}

function InstructorRoutePage({ pagePath }) {
  const pages = {
    dashboard: <InstructorDashboard />,
    roster: <RosterPage />,
    'invite-students': <InviteStudentsPage />,
    'class-code': <ClassCodePage />,
    activity: <ActivityManagementPage />,
    'activity/new': <CreateActivityPage />,
    'activity-settings': <ActivitySettingsPage />,
    'activity/act-loops-01/monitor': <MonitoringPage />,
    'activity/act-loops-01/submissions': <SubmissionQueuePage />,
    'submission-review': <SubmissionReviewPage />,
    projects: <ProjectOversightPage />,
    'projects/repo-campus-nav/contributions': <ContributionReviewPage />,
    'projects/repo-campus-nav/similarity': <SimilarityPage />,
    'projects/repo-campus-nav/archive': <ArchiveReadinessPage />,
    analytics: <AnalyticsPage />,
    'students/stu-alyssa': <StudentProfilePage />,
  }

  return pages[pagePath]
}

export default InstructorRoutePage
