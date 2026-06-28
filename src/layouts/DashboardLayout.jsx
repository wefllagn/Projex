import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { courseOptions, roles, sectionOptions } from '../data/projexData.js'

const studentClasses = [
  { label: 'IT 112 - Computer Programming 1', initial: 'I', active: true },
  { label: 'CS 111', initial: 'C' },
  { label: 'IT 123', initial: 'I' },
  { label: 'MATH 101', initial: 'M' },
]

const instructorClasses = [
  { label: 'IT 112 - Computer Programming 1', initial: 'I', active: true },
  { label: 'CS 111', initial: 'C' },
  { label: 'IT 123', initial: 'I' },
]

function StudentSidebarLink({ to, children, end = false, count, icon }) {
  return (
    <NavLink to={to} end={end} className="student-sidebar__link">
      <span className={`student-sidebar__icon student-sidebar__icon--${icon}`} aria-hidden="true" />
      <span>{children}</span>
      {count && <span className="student-sidebar__count">{count}</span>}
    </NavLink>
  )
}

function InstructorDashboardLayout() {
  return (
    <div className="student-app-shell">
      <aside className="student-sidebar">
        <NavLink to="/instructor" className="student-brand" aria-label="Projex instructor home">
          <img src="/assets/brand/projex-sidebar-logo.png" alt="Projex" />
        </NavLink>

        <nav className="student-sidebar__nav" aria-label="Instructor navigation">
          <StudentSidebarLink to="/instructor" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/instructor/activity" count="18" icon="todo">
            Review Queue
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {instructorClasses.map((item) => (
                <NavLink
                  key={item.label}
                  to="/instructor/classes"
                  className={item.active ? 'student-class-link is-active' : 'student-class-link'}
                >
                  <span className={`student-class-dot student-class-dot--${item.initial.toLowerCase()}`}>
                    {item.initial}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="student-sidebar__lower">
            <StudentSidebarLink to="/instructor/projects" icon="folder">Project Reviews</StudentSidebarLink>
            <StudentSidebarLink to="/instructor/people" icon="plus">People</StudentSidebarLink>
          </div>
        </nav>
      </aside>

      <main className="student-main">
        <Outlet />
      </main>
    </div>
  )
}

function StudentDashboardLayout() {
  const location = useLocation()

  if (location.pathname.includes('/workspace')) {
    return <Outlet />
  }

  return (
    <div className="student-app-shell">
      <aside className="student-sidebar">
        <NavLink to="/student" className="student-brand" aria-label="Projex student home">
          <img src="/assets/brand/projex-sidebar-logo.png" alt="Projex" />
        </NavLink>

        <nav className="student-sidebar__nav" aria-label="Student navigation">
          <StudentSidebarLink to="/student" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/student/activity" count="3" icon="todo">
            To-do
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {studentClasses.map((item) => (
                <NavLink
                  key={item.label}
                  to="/student/classes"
                  className={item.active ? 'student-class-link is-active' : 'student-class-link'}
                >
                  <span className={`student-class-dot student-class-dot--${item.initial.toLowerCase()}`}>
                    {item.initial}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="student-sidebar__lower">
            <StudentSidebarLink to="/student/projects" icon="folder">My Repositories</StudentSidebarLink>
            <StudentSidebarLink to="/student/join-class" icon="plus">Join Class</StudentSidebarLink>
          </div>
        </nav>
      </aside>

      <main className="student-main">
        <Outlet />
      </main>
    </div>
  )
}

function DashboardLayout({ role }) {
  const navigate = useNavigate()
  const location = useLocation()

  if (role.id === 'student') {
    return <StudentDashboardLayout />
  }

  if (role.id === 'instructor') {
    return <InstructorDashboardLayout />
  }

  const groupedRoutes = role.routes.reduce((groups, route) => {
    groups[route.group] = groups[route.group] || []
    groups[route.group].push(route)
    return groups
  }, {})

  const currentMode = location.pathname.includes('/projects')
    ? 'Project Collaboration Mode'
    : 'Activity Mode'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand__mark">PX</span>
          <span>
            <strong>Projex</strong>
            <small>Saint Louis University</small>
          </span>
        </NavLink>

        <div className="role-switcher" aria-label="Role switcher">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === role.id ? 'is-active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.id}
            </button>
          ))}
        </div>

        <nav className="sidebar__nav" aria-label={`${role.label} navigation`}>
          <NavLink to={role.path} end>
            Dashboard
          </NavLink>
          {Object.entries(groupedRoutes).map(([group, routes]) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {routes.map((route) => (
                <NavLink key={route.path} to={`${role.path}/${route.path}`}>
                  {route.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentMode}</p>
            <h1>{role.label}</h1>
          </div>
          <div className="topbar__controls">
            <label>
              Course
              <select defaultValue={courseOptions[0]}>
                {courseOptions.map((course) => (
                  <option key={course}>{course}</option>
                ))}
              </select>
            </label>
            <label>
              Section
              <select defaultValue={sectionOptions[0]}>
                {sectionOptions.map((section) => (
                  <option key={section}>{section}</option>
                ))}
              </select>
            </label>
            <button type="button" className="notification-button">
              Notifications
              <span>5</span>
            </button>
            <div className="identity-pill">
              <span>{role.person}</span>
              <strong>{role.id}</strong>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
