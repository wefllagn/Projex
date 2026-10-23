import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import { classOfferingLabel } from './class-links.js'

export default function ClassOverviewCard({ classRecord }) {
  const archived = classRecord.status === 'ARCHIVED'
  const instructor = classRecord.instructor?.fullName ?? 'Not assigned'
  const initials = instructor.split(' ').map(part => part.charAt(0)).join('').slice(0, 2)
  return <section className="student-global-panel class-overview-card academic-overview-card">
    <div className="academic-overview-heading">
      <span className="academic-overview-icon" aria-hidden="true"><ProjexIcon name="classes" size={28} /></span>
      <div>
        <span className={`academic-overview-status${archived ? ' is-archived' : ''}`}>{archived ? 'Archived' : 'Active'}</span>
        <h2>{classRecord.className}</h2>
        <p>{classOfferingLabel(classRecord)}</p>
      </div>
    </div>
    <div className="academic-staff-person">
      <span className="academic-person-avatar" aria-hidden="true">{initials}</span>
      <div><small>Primary Instructor</small><strong>{instructor}</strong></div>
    </div>
    {archived && <small className="academic-overview-note">This class is read-only.</small>}
  </section>
}
