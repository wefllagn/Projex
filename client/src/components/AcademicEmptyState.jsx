import ProjexIcon from './icons/ProjexIcon.jsx'

export default function AcademicEmptyState({ icon = 'activity', title, description }) {
  return <section className="academic-empty-state" role="status"><span className="academic-empty-icon"><ProjexIcon name={icon} size={32} /></span><h3>{title}</h3>{description && <p>{description}</p>}</section>
}
