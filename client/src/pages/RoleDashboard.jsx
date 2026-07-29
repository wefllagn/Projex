import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { dashboardRows, dashboardStats } from '../data/projexData.js'

function RoleDashboard({ role }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Role workspace</p>
          <h2>{role.label} dashboard</h2>
          <p>{role.description}</p>
        </div>
        <StatusBadge label="Hardcoded prototype" />
      </div>

      <div className="mode-overview">
        <Card title="Activity Mode" eyebrow="Programming activities">
          <p>
            Activity lists, programming workspaces, mock editor/compiler,
            deadlines, one locked submission, instructor monitoring, grading,
            feedback, and learning analytics remain visible in the shell.
          </p>
        </Card>
        <Card title="Project Collaboration Mode" eyebrow="Repository learning">
          <p>
            Project repositories, commits, tasks, contribution tracking,
            instructor-facing similarity review, repository governance, storage,
            and archived preservation remain visible in navigation.
          </p>
        </Card>
      </div>

      <div className="stat-grid">
        {dashboardStats[role.id].map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card title="Current Projex signals" eyebrow="Placeholder data">
        <DataTable
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'mode', label: 'Mode' },
            { key: 'status', label: 'Status' },
            { key: 'signal', label: 'Signal' },
          ]}
          rows={dashboardRows[role.id]}
        />
      </Card>
    </div>
  )
}

export default RoleDashboard
