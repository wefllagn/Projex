import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial } from '../classes/class-links.js'
import { courseOptions, sectionOptions } from '../data/projexData.js'

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
  const initial = classInitial(item)
  return (
    <NavLink
      to={to}
      className={active ? 'student-class-link is-active' : 'student-class-link'}
    >
      <span className={`student-class-dot student-class-dot--${initial.toLowerCase()}`}>
        {initial}
      </span>
      <span className="student-class-link__text">
        <strong>{item.className}</strong>
        <small>{item.section} · {item.status === 'ARCHIVED' ? 'Archived' : item.semester}</small>
      </span>
    </NavLink>
  )
}

export function CreateClassModal({ onClose, onCreated }) {
  const { api, upsertClass } = useClasses()
  const [form, setForm] = useState({
    className: '',
    section: '',
    semester: '',
    schoolYear: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await api.createClass(form)
      upsertClass(response.data)
      onCreated(response.data)
    } catch (requestError) {
      setError(requestError)
      setSaving(false)
    }
  }

  return (
    <div className="student-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <form className="instructor-action-modal" onSubmit={submit}>
        <button type="button" className="student-modal-close" onClick={onClose} aria-label="Close create class" />
        <p>Create Class</p>
        <h2 id="create-class-title">New instructor class</h2>
        <div className="instructor-form-grid">
          <label>
            Course name
            <input value={form.className} onChange={updateField('className')} maxLength={200} required />
          </label>
          <label>
            Section
            <input value={form.section} onChange={updateField('section')} maxLength={100} required />
          </label>
          <label>
            Semester
            <input value={form.semester} onChange={updateField('semester')} maxLength={100} placeholder="First Semester" required />
          </label>
          <label>
            School year
            <input value={form.schoolYear} onChange={updateField('schoolYear')} maxLength={20} placeholder="2026-2027" required />
          </label>
        </div>
        <p className="class-form-note">Projex creates the join code securely on the server. Manage it after the class is created.</p>
        {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
        <div className="student-submit-modal-actions">
          <button type="button" className="student-outline-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="student-primary-action" disabled={saving}>
            {saving ? 'Creating…' : 'Create Class'}
          </button>
        </div>
      </form>
    </div>
  )
}

function InstructorDashboardLayout() {
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()
  const { classes, requestedClassId, status, error, pagination, loadMore } = useClasses()

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
          <StudentSidebarLink to="/instructor/review-queues" icon="todo">
            Review Queues
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {classes.map((item) => (
                <SidebarClassLink
                  key={item.id}
                  to={classHref('/instructor/classes', item.id)}
                  item={item}
                  active={requestedClassId === item.id}
                />
              ))}
              {status === 'loading' && <span className="class-sidebar-note">Loading classes…</span>}
              {status === 'error' && <span className="class-sidebar-note">{describeApiError(error)}</span>}
              {pagination?.hasNextPage && (
                <button type="button" className="class-sidebar-more" onClick={loadMore}>Load more</button>
              )}
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

      {createClassOpen && (
        <CreateClassModal
          onClose={() => setCreateClassOpen(false)}
          onCreated={(classRecord) => {
            setCreateClassOpen(false)
            navigate(classHref('/instructor/class-info', classRecord.id))
          }}
        />
      )}
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
    || location.pathname.startsWith('/student/people')
  const { classes, requestedClassId, status, error, pagination, loadMore } = useClasses()

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
          <StudentSidebarLink to="/student/todo" icon="todo">
            To-do
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>MY CLASSES</p>
            <div className="student-class-list">
              {classes.map((item) => (
                <SidebarClassLink
                  key={item.id}
                  to={classHref('/student/classes', item.id)}
                  item={item}
                  active={requestedClassId === item.id && isInsideStudentClass}
                />
              ))}
              {status === 'loading' && <span className="class-sidebar-note">Loading classes…</span>}
              {status === 'error' && <span className="class-sidebar-note">{describeApiError(error)}</span>}
              {pagination?.hasNextPage && (
                <button type="button" className="class-sidebar-more" onClick={loadMore}>Load more</button>
              )}
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
  const auth = useAuth()

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
          <span className="is-active">{role.id}</span>
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
              <span>{auth.user.fullName}</span>
              <strong>{auth.user.role.toLowerCase()}</strong>
            </div>
            <button
              type="button"
              className="action-button"
              onClick={async () => {
                await auth.logout()
                navigate('/', { replace: true })
              }}
            >
              Sign out
            </button>
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
