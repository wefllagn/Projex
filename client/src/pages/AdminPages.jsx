import { useState } from 'react'
import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  adminArchives,
  adminCourses,
  adminEnrollments,
  adminInstructorAssignments,
  adminRepositories,
  adminSections,
  adminStats,
  adminStorage,
  adminSystemHealth,
  adminUsers,
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

function ActionButton({ children, onClick }) {
  return (
    <button type="button" className="action-button" onClick={onClick}>
      {children}
    </button>
  )
}

function AdminDashboard() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="University-managed platform"
        title="Admin Dashboard"
        summary="Institutional governance for Projex users, courses, sections, enrollments, repositories, storage, system health, and academic preservation."
        status="Saint Louis University"
      />
      <div className="stat-grid">
        {adminStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="mode-overview">
        <Card title="Academic administration" eyebrow="Users, courses, sections">
          <p>
            Projex is managed as a university platform, with role/status controls,
            enrollment records, instructor assignments, and section governance.
          </p>
        </Card>
        <Card title="Repository preservation" eyebrow="Storage, policy, archives">
          <p>
            Repository governance includes storage warnings, archive readiness,
            integrity records, retention metadata, and preservation controls.
          </p>
        </Card>
      </div>
      <Card title="Institutional signals" eyebrow="System governance">
        <DataTable columns={standardColumns} rows={adminSystemHealth} />
      </Card>
    </div>
  )
}

function UserManagementPage() {
  const [message, setMessage] = useState('No user role/status action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Institutional management"
        title="User Management"
        summary="Students, instructors, and admins with mock role/status management controls. No real account changes are made."
        status="428 users"
      />
      <div className="stat-grid">
        <StatCard label="Students" value="362" detail="Across active sections" />
        <StatCard label="Instructors" value="54" detail="Assigned to courses" />
        <StatCard label="Admins" value="12" detail="Academic systems staff" />
        <StatCard label="Invited users" value="14" detail="Pending class invitations" />
      </div>
      <Card title="Users" eyebrow="Role and account status">
        <DataTable columns={standardColumns} rows={adminUsers} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: selected user role marked for review.')}>
            Review Role
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: selected user status toggled in preview only.')}>
            Toggle Status
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function CourseManagementPage() {
  const [message, setMessage] = useState('No course edit action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Course and section management"
        title="Course Management"
        summary="Course list with active status, assigned instructors, enrolled counts, activity counts, and mock create/edit controls."
        status="12 active courses"
      />
      <Card title="Courses" eyebrow="University catalog context">
        <DataTable columns={standardColumns} rows={adminCourses} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: create course drawer would open.')}>
            Create Course
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: selected course marked for editing.')}>
            Edit Course
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function SectionManagementPage() {
  const [message, setMessage] = useState('No section edit action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Course and section management"
        title="Section Management"
        summary="Section list with assigned instructor, enrolled student count, class code status, repository counts, and active/inactive state."
        status="28 active sections"
      />
      <Card title="Sections" eyebrow="Academic term governance">
        <DataTable columns={standardColumns} rows={adminSections} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: create section form would open.')}>
            Create Section
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: selected section status preview updated.')}>
            Edit Section
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function EnrollmentsPage() {
  const [message, setMessage] = useState('No enrollment action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Enrollment management"
        title="Enrollments"
        summary="Student enrollment records with course, section, enrollment status, invitation status, join code status, and mock approve/remove controls."
        status="386 records"
      />
      <Card title="Enrollment records" eyebrow="Class membership governance">
        <DataTable columns={standardColumns} rows={adminEnrollments} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: pending enrollment approved in preview.')}>
            Approve
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: selected enrollment removed in preview.')}>
            Remove
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function InstructorAssignmentsPage() {
  const [message, setMessage] = useState('No assignment action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Instructor assignment"
        title="Instructor Assignments"
        summary="Instructor-course-section assignments with student count, project/activity supervision load, and mock assign/reassign controls."
        status="32 assignments"
      />
      <Card title="Assignments" eyebrow="Teaching supervision">
        <DataTable columns={standardColumns} rows={adminInstructorAssignments} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: assignment form would open.')}>
            Assign Instructor
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: selected instructor reassignment previewed.')}>
            Reassign
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function RepositoryManagementPage() {
  const [message, setMessage] = useState('No repository governance action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Repository governance"
        title="Repository Management"
        summary="Repository ownership, course/section context, storage usage, policy check status, oversized warnings, and archive status."
        status="186 repositories"
      />
      <Card title="Repositories" eyebrow="Policy and archive status">
        <DataTable columns={standardColumns} rows={adminRepositories} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: policy check queued for selected repository.')}>
            Run Policy Check
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: archive review opened for selected repository.')}>
            Review Archive
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function StoragePage() {
  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="System storage"
        title="Storage Overview"
        summary="Storage by course, section, repository category, archived projects, warning indicators, and preservation summary."
        status="74% used"
      />
      <div className="stat-grid">
        <StatCard label="Total used" value="182 GB" detail="246 GB provisioned" />
        <StatCard label="Repositories" value="186" detail="155 active, 31 archived" />
        <StatCard label="Archives" value="31" detail="Academic preservation records" />
        <StatCard label="Warnings" value="12" detail="Oversized or policy review" />
      </div>
      <Card title="Storage buckets" eyebrow="Course and preservation usage">
        <DataTable columns={standardColumns} rows={adminStorage} />
      </Card>
    </div>
  )
}

function SystemHealthPage() {
  const [message, setMessage] = useState('No system notice action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="System health"
        title="System Health"
        summary="Operational view of active users, repositories, pending reviews, failed mock checking jobs, notices, and policy warnings."
        status="University-managed"
      />
      <Card title="Health and notices" eyebrow="Mock operational signals">
        <DataTable columns={standardColumns} rows={adminSystemHealth} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: failed checking jobs marked for retry.')}>
            Retry Mock Jobs
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: policy notice acknowledged.')}>
            Acknowledge Notice
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function ArchivePage() {
  const [message, setMessage] = useState('No archive action selected.')

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Archived preservation"
        title="Archived Project Preservation"
        summary="Archived student projects with course/section, academic year, repository integrity status, preservation notes, archive date, and mock restore/view controls."
        status="Preservation"
      />
      <Card title="Archived student projects" eyebrow="Read-only institutional records">
        <DataTable columns={standardColumns} rows={adminArchives} />
        <div className="button-row">
          <ActionButton onClick={() => setMessage('Mock action: read-only archive viewer would open.')}>
            View Snapshot
          </ActionButton>
          <ActionButton onClick={() => setMessage('Mock action: restore request queued for admin review.')}>
            Request Restore
          </ActionButton>
        </div>
        <p className="helper-text">{message}</p>
      </Card>
    </div>
  )
}

function AdminRoutePage({ pagePath }) {
  const pages = {
    dashboard: <AdminDashboard />,
    users: <UserManagementPage />,
    courses: <CourseManagementPage />,
    sections: <SectionManagementPage />,
    enrollments: <EnrollmentsPage />,
    'instructor-assignments': <InstructorAssignmentsPage />,
    repositories: <RepositoryManagementPage />,
    storage: <StoragePage />,
    system: <SystemHealthPage />,
    archive: <ArchivePage />,
  }

  return pages[pagePath]
}

export default AdminRoutePage
