import { NavLink } from 'react-router-dom'
import { classHref, classInitial } from './class-links.js'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'

export default function ClassCardGrid({ classes, role = 'student' }) {
  return <div className="academic-classroom-grid">{classes.map(item => {
    const tone = [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3
    const active = item.status === 'ACTIVE'
    return <article className={`academic-classroom-card academic-classroom-card--${tone}`} key={item.id}>
      <NavLink className="academic-classroom-cover" to={classHref(`/${role}/classes`, item.id)}>
        <h2>{item.className}</h2><span>{item.section || item.officialClassCode || 'Class'}</span>
        <small>{item.instructor?.fullName || 'Instructor not assigned'}</small>
      </NavLink>
      <span className="academic-classroom-avatar" aria-hidden="true">{classInitial(item)}</span>
      <div className="academic-classroom-body"><span className={active ? 'academic-classroom-status' : 'academic-classroom-status is-archived'}>{active ? 'Active' : 'Archived · read-only'}</span><p>{item.semester || item.academicPeriod || 'Term not set'}{item.schoolYear ? ` · ${item.schoolYear}` : ''}</p>{item.schedule && <p>{item.schedule}</p>}{item.room && <small>{item.room}</small>}</div>
      <footer><NavLink to={classHref(`/${role}/activity`, item.id)} aria-label={`Classwork for ${item.className}`} title="Classwork"><ProjexIcon name="activity" />Classwork</NavLink><NavLink to={role === 'student' ? `${classHref('/student/activity', item.id)}&view=work` : classHref('/instructor/people', item.id)} aria-label={`${role === 'student' ? 'Your work' : 'People'} for ${item.className}`} title={role === 'student' ? 'Your work' : 'People'}><ProjexIcon name={role === 'student' ? 'submission' : 'people'} /></NavLink></footer>
    </article>
  })}</div>
}
