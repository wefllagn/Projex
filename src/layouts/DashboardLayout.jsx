import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { courseOptions, roles, sectionOptions } from '../data/projexData.js'

const studentClasses = [
  { label: 'IT 112 - Computer Programming 1', code: 'IT 112', classCode: '9346', name: 'Computer Programming', initial: 'I', active: true },
  { label: 'CS 111', code: 'CS 111', name: 'Introduction to Computing', initial: 'C' },
  { label: 'IT 123', code: 'IT 123', name: 'Platform Technologies', initial: 'I' },
  { label: 'MATH 101', code: 'MATH 101', name: 'College Algebra', initial: 'M' },
]

const instructorClasses = [
  { label: 'IT 112 - Computer Programming 1', code: 'IT 112', classCode: '9446', name: 'Computer Programming 1', initial: 'I', active: true },
  { label: 'CS 111', code: 'CS 111', name: 'Introduction to Computing', initial: 'C' },
  { label: 'IT 123', code: 'IT 123', name: 'Platform Technologies', initial: 'I' },
]

function generateClassCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const part = () => Array.from({ length: 4 }, () => characters[Math.floor(Math.random() * characters.length)]).join('')
  return `${part()}-${part()}`
}

function copyClassCode(code) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(code)
  }
}

function StudentSidebarLink({ to, children, end = false, count, icon }) {
  return (
    <NavLink to={to} end={end} className="student-sidebar__link">
      <span className={`student-sidebar__icon student-sidebar__icon--${icon}`} aria-hidden="true" />
      <span>{children}</span>
      {count && <span className="student-sidebar__count">{count}</span>}
    </NavLink>
  )
}

function SidebarBrand({ to, label, collapsed, onToggle }) {
  return (
    <div className="student-sidebar-brand-row">
      <button
        type="button"
        className="student-sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span aria-hidden="true" />
      </button>
      <NavLink to={to} className="student-brand" aria-label={label}>
        <img src="/assets/brand/projex-sidebar-logo.png" alt="Projex" />
      </NavLink>
    </div>
  )
}

function SidebarClassLink({ item, to, active }) {
  return (
    <NavLink
      to={to}
      className={active ? 'student-class-link is-active' : 'student-class-link'}
    >
      <span className={`student-class-dot student-class-dot--${item.initial.toLowerCase()}`}>
        {item.initial}
      </span>
      <span className="student-class-link__text">
        <strong>
          {item.code}
          {item.classCode ? ` - ${item.classCode}` : ''}
        </strong>
        <small>{item.name}</small>
      </span>
    </NavLink>
  )
}

function CreateClassModal({ onClose }) {
  const [code, setCode] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <section className="instructor-action-modal">
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close create class" />
        <p>Create Class</p>
        <h2 id="create-class-title">New instructor class</h2>
        <div className="instructor-form-grid">
          <label>
            Course name
            <input defaultValue="IT 112 - Computer Programming 1" />
          </label>
          <label>
            Section
            <input defaultValue="BSIT 2A" />
          </label>
          <label>
            Instructor
            <input defaultValue="Engr. Marco Rivera" />
          </label>
          <label>
            Invite student
            <input placeholder="student@slu.edu.ph" />
          </label>
        </div>
        <section className="instructor-modal-code-panel">
          <span>Class code</span>
          {code ? (
            <div className="instructor-code-copy-row">
              <strong>{code}</strong>
              <button
                type="button"
                onClick={() => {
                  copyClassCode(code)
                  setCopyStatus('Copied')
                }}
              >
                Copy
              </button>
            </div>
          ) : (
            <p>No generated class code yet.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setCode(generateClassCode())
              setCopyStatus('')
            }}
          >
            Generate class code
          </button>
          {copyStatus && <em>{copyStatus}</em>}
        </section>
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button type="button" className="student-primary-action" onClick={onClose}>Create Class</button>
        </div>
      </section>
    </div>
  )
}

function InstructorDashboardLayout() {
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className={sidebarCollapsed ? 'student-app-shell is-sidebar-collapsed' : 'student-app-shell'}>
      <aside className="student-sidebar">
        <SidebarBrand
          to="/instructor"
          label="Projex instructor home"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />

        <nav className="student-sidebar__nav" aria-label="Instructor navigation">
          <StudentSidebarLink to="/instructor" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/instructor/review-queues" count="18" icon="todo">
            Review Queues
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {instructorClasses.map((item) => (
                <SidebarClassLink
                  key={item.label}
                  to="/instructor/classes"
                  item={item}
                  active={item.active && location.pathname.startsWith('/instructor/classes')}
                />
              ))}
            </div>
          </div>

          <div className="student-sidebar__lower">
            <button type="button" className="student-sidebar__link instructor-sidebar-button" onClick={() => setCreateClassOpen(true)}>
              <span className="student-sidebar__icon student-sidebar__icon--plus" aria-hidden="true" />
              <span>Create Class</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="student-main">
        <Outlet />
      </main>

      {createClassOpen && <CreateClassModal onClose={() => setCreateClassOpen(false)} />}
    </div>
  )
}

function StudentDashboardLayout() {
  const location = useLocation()
  const isCodingWorkspace = location.pathname.includes('/workspace')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isCodingWorkspace)
  const effectiveSidebarCollapsed = sidebarCollapsed || isCodingWorkspace
  const isInsideStudentClass = location.pathname.startsWith('/student/classes')
    || location.pathname.startsWith('/student/activity')
    || location.pathname.startsWith('/student/projects')

  return (
    <div className={`${effectiveSidebarCollapsed ? 'student-app-shell is-sidebar-collapsed' : 'student-app-shell'}${isCodingWorkspace ? ' is-coding-workspace' : ''}`}>
      <aside className="student-sidebar">
        <SidebarBrand
          to="/student"
          label="Projex student home"
          collapsed={effectiveSidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />

        <nav className="student-sidebar__nav" aria-label="Student navigation">
          <StudentSidebarLink to="/student" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/student/todo" count="3" icon="todo">
            To-do
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {studentClasses.map((item) => (
                <SidebarClassLink
                  key={item.label}
                  to="/student/classes"
                  item={item}
                  active={item.active && isInsideStudentClass}
                />
              ))}
            </div>
          </div>

          <div className="student-sidebar__lower">
            <StudentSidebarLink to="/student/repositories" icon="folder">My Repositories</StudentSidebarLink>
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
