import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const placeholderRows = [
  {
    item: 'Loop Patterns and Input Validation',
    mode: 'Activity',
    status: 'Placeholder',
    signal: 'Deadline, one submission only, locked submit state planned',
  },
  {
    item: 'Submitted Activities',
    mode: 'Submission Record',
    status: 'Placeholder',
    signal: 'Final submitted record, not repeated attempts',
  },
  {
    item: 'Class Membership',
    mode: 'Class',
    status: 'Placeholder',
    signal: 'Class code joins, invitations, roster, and enrollments planned',
  },
  {
    item: 'Campus Navigation Assistant',
    mode: 'Project',
    status: 'Placeholder',
    signal: 'Contribution tracking and instructor-only similarity detail planned',
  },
  {
    item: 'Archived Capstone Snapshot',
    mode: 'Archive',
    status: 'Placeholder',
    signal: 'Read-only preservation metadata planned',
  },
]

function PlaceholderPage({ role, page }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{page.group}</p>
          <h2>{page.label}</h2>
          <p>{page.summary}</p>
        </div>
        <StatusBadge label={page.status} />
      </div>

      <div className="stat-grid">
        <StatCard label="Prototype scope" value="Shell" detail="Detailed workflow not built yet" />
        <StatCard label="Data source" value="Mock" detail="Hardcoded placeholder data only" />
        <StatCard label="Role context" value={role.id} detail={role.person} />
      </div>

      <Card title="Planned Projex surface" eyebrow="Feature placeholder">
        <DataTable
          columns={[
            { key: 'item', label: 'Academic programming item' },
            { key: 'mode', label: 'Mode' },
            { key: 'status', label: 'Status' },
            { key: 'signal', label: 'Visible signal' },
          ]}
          rows={placeholderRows}
        />
      </Card>
    </div>
  )
}

export default PlaceholderPage
