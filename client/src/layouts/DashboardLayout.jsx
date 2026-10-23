import AccountMenu from '../components/AccountMenu.jsx'
import { Brand } from '../origin/OriginPrimitives.jsx'
import { StudentInvitationProvider, StudentNotificationMenu } from '../classes/StudentInvitationNotifications.jsx'
import '../design/academic-ui.css'
import AppDialog from '../components/AppDialog.jsx'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'
import ProgramField from '../classes/ProgramField.jsx'
import '../instructor-overhaul.css'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { useClasses } from '../classes/class-context.js'
import { classHref, classInitial, classOfferingLabel } from '../classes/class-links.js'
import { courseOptions, sectionOptions } from '../data/projexData.js'
import AcademicFields from '../classes/AcademicFields.jsx'
import '../admin/admin-refinement.css'

function StudentSidebarLink({ to, children, end = false, count, icon }) {
  return (
    <NavLink to={to} end={end} className="student-sidebar__link" aria-label={typeof children === 'string' ? children : undefined} title={typeof children === 'string' ? children : undefined}>
      <ProjexIcon name={icon} className="sidebar-vector" />
      <span>{children}</span>
      {count && <span className="student-sidebar__count">{count}</span>}
    </NavLink>
  )
}

function SidebarBrand({ to, label, collapsed, onToggle, onClose }) {
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
        <Brand />
      </NavLink>
      <button type="button" className="student-mobile-nav-close" onClick={onClose} aria-label="Close navigation">×</button>
    </div>
  )
}

function useMobileNavigation() {
  const location = useLocation()
  const [openedRoute, setOpenedRoute] = useState(null)
  const open = openedRoute === location.key
  const setOpen = (next) => setOpenedRoute((current) => {
    const nextOpen = typeof next === 'function' ? next(current === location.key) : next
    return nextOpen ? location.key : null
  })

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpenedRoute(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return { open, setOpen, close: () => setOpen(false) }
}

function MobileShellNavigation({ role, open, setOpen, close, navigationId }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [accountRoute, setAccountRoute] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const accountOpen = accountRoute === location.key

  useEffect(() => {
    if (!accountOpen || role !== 'Administrator') return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setAccountRoute(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [accountOpen, role])

  return (
    <>
      <header className="student-mobile-header">
        <button
          type="button"
          className="student-mobile-menu-button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-controls={navigationId}
          aria-expanded={open}
          onClick={() => { setAccountRoute(null); setOpen((current) => !current) }}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <span className="student-mobile-header__brand"><Brand /></span>
        {role !== 'Administrator' ? <div className="academic-mobile-controls">
          {role === 'Student' && <StudentNotificationMenu onOpen={() => { setAccountRoute(null); close() }} />}
          <AccountMenu expanded={accountOpen} onExpandedChange={value => { if (value) close(); setAccountRoute(value ? location.key : null) }} />
        </div> : <div className="student-mobile-account">
          <button
            type="button"
            className="student-mobile-header__identity"
            aria-label="Account menu"
            aria-expanded={accountOpen}
            onClick={() => { close(); setAccountRoute(accountOpen ? null : location.key) }}
          >
            <strong>{auth.user.fullName}</strong><small>{role}</small>
          </button>
          {accountOpen && (
            <div className="student-mobile-account__menu">
              <strong>{auth.user.fullName}</strong>
              <span>{auth.user.email}</span>
              <button type="button" disabled={signingOut} onClick={async () => {
                setSigningOut(true)
                try {
                  await auth.logout()
                  navigate('/', { replace: true })
                } finally {
                  setSigningOut(false)
                }
              }}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
            </div>
          )}
        </div>}
      </header>
      {open && <button type="button" className="student-mobile-nav-backdrop" onClick={close} aria-label="Close navigation menu" />}
    </>
  )
}

function closeMobileNavigationOnLink(event, close) {
  if (event.target.closest('a')) close()
}

function SidebarClassLink({ item, to, active }) {
  const initial = classInitial(item)
  return (
    <NavLink
      to={to}
      aria-label={`${item.className} · ${classOfferingLabel(item)}${item.status === 'ARCHIVED' ? ' · Archived' : ''}`}
      className={active ? 'student-class-link is-active' : 'student-class-link'}
    >
      <span className={`student-class-dot student-class-dot--${initial.toLowerCase()}`}>
        {initial}
      </span>
      <span className="student-class-link__text">
        <strong>{item.className}</strong>
        <small>{classOfferingLabel(item)}{item.status === 'ARCHIVED' ? ' · Archived' : ''}</small>
      </span>
    </NavLink>
  )
}

export function CreateClassModal({ onClose, onCreated }) {
  const { api, upsertClass } = useClasses()
  const [form, setForm] = useState({
    className: '',
    program: '',
    section: '',
    semester: '',
    schoolYear: '',
    schedule: '',
    room: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [classCodeError, setClassCodeError] = useState('')
  const [invitationEmail, setInvitationEmail] = useState('')
  const [invitationTargets, setInvitationTargets] = useState([])
  const [invitationLookup, setInvitationLookup] = useState({ status: 'idle', message: '' })

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (field === 'section') setClassCodeError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.section.trim()) { setClassCodeError('Enter a Class Code.'); return }
    setSaving(true)
    setError(null)
    try {
      const response = await api.createClass({
        className: form.className,
        ...Object.fromEntries(Object.entries(form).filter(([key, value]) => key !== 'className' && value.trim())),
        ...(invitationTargets.length > 0
          ? { invitationEmails: invitationTargets.map((target) => target.universityEmail) }
          : {}),
      })
      upsertClass(response.data)
      onCreated(response.data)
    } catch (requestError) {
      setError(requestError)
      setSaving(false)
    }
  }

  const addInvitation = async () => {
    const normalized = invitationEmail.trim().toLowerCase()
    if (!normalized || invitationTargets.some((target) => target.universityEmail === normalized)) {
      setInvitationLookup({
        status: 'error',
        message: normalized ? 'That Student is already in the invitation list.' : 'Enter a university email.',
      })
      return
    }
    setInvitationLookup({ status: 'loading', message: '' })
    try {
      const response = await api.lookupInvitationStudent(normalized)
      if (response.data.eligibility !== 'ELIGIBLE') {
        setInvitationLookup({ status: 'error', message: 'No registered active Student found.' })
        return
      }
      setInvitationTargets((current) => [...current, response.data.student])
      setInvitationEmail('')
      setInvitationLookup({ status: 'ready', message: `${response.data.student.fullName} added.` })
    } catch (lookupError) {
      setInvitationLookup({ status: 'error', message: describeApiError(lookupError) })
    }
  }

  return (
    <AppDialog title="New Class" className="projex-dialog--class" onClose={onClose} busy={saving}>
      <form className="class-create-form" onSubmit={submit} aria-busy={saving}>
        <div className="class-create-body">
        <div className="instructor-form-grid class-create-grid">
          <label className="class-create-wide">
            Class Name
            <input value={form.className} onChange={updateField('className')} maxLength={200} required disabled={saving} />
          </label>
          <label>
            Class Code
            <input value={form.section} onChange={updateField('section')} maxLength={100} required disabled={saving} aria-invalid={Boolean(classCodeError)} aria-describedby={classCodeError ? 'new-class-code-error' : undefined} />
            {classCodeError && <small id="new-class-code-error" className="class-form-error" role="alert">{classCodeError}</small>}
          </label>
          <ProgramField value={form.program} onChange={value => setForm(old => ({ ...old, program: value }))} required disabled={saving} />
          <AcademicFields semester={form.semester} schoolYear={form.schoolYear} onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} disabled={saving} />
          <label>Schedule Type (optional)<input value={form.schedule} onChange={updateField('schedule')} maxLength={200} disabled={saving} /></label>
          <label>Room (optional)<input value={form.room} onChange={updateField('room')} maxLength={100} disabled={saving} /></label>
        </div>
        <details className="class-create-invitations"><summary>Invite Students (optional)</summary>
          <div>
            <span>Only existing registered Origin Students can be invited.</span>
            <span>If any listed Student is no longer eligible, the class and all invitations will not be created.</span>
          </div>
          <div className="class-invitation-create-row">
            <label>
              University email
              <input
                type="email"
                value={invitationEmail}
                onChange={(event) => {
                  setInvitationEmail(event.target.value)
                  setInvitationLookup({ status: 'idle', message: '' })
                }}
                placeholder="2216146@slu.edu.ph"
                autoComplete="off"
                disabled={saving}
              />
            </label>
            <button
              type="button"
              className="student-outline-action"
              onClick={addInvitation}
              disabled={saving || invitationLookup.status === 'loading' || !invitationEmail.trim()}
            >
              {invitationLookup.status === 'loading' ? 'Checking…' : '+ Add Student'}
            </button>
          </div>
          {invitationLookup.message && (
            <p className={invitationLookup.status === 'error' ? 'class-form-error' : 'class-form-note'} role="status">
              {invitationLookup.message}
            </p>
          )}
          {invitationTargets.length > 0 && (
            <ul className="class-create-invitation-list">
              {invitationTargets.map((target) => (
                <li key={target.universityEmail}>
                  <span><strong>{target.fullName}</strong><small>{target.universityEmail}</small></span>
                  <button
                    type="button"
                    onClick={() => setInvitationTargets((current) => current.filter((item) => item.universityEmail !== target.universityEmail))}
                    disabled={saving}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>

        {error && <p className="class-form-error" role="alert">{describeApiError(error)}</p>}
        </div>
        <footer className="class-create-footer">
          <button type="button" className="student-outline-action" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="student-primary-action" disabled={saving}>
            {saving ? 'Creating…' : 'Create Class'}
          </button>
        </footer>
      </form>
    </AppDialog>
  )
}

function AcademicSidebarSignout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div className="instructor-sidebar-signout academic-sidebar-signout"><button type="button" className="student-sidebar__link" title="Sign out" aria-label="Sign out" disabled={busy} onClick={async () => { setBusy(true); try { await auth.logout(); navigate('/', { replace: true }) } catch (cause) { setError(describeApiError(cause)) } finally { setBusy(false) } }}><ProjexIcon name="signout" /><span>{busy ? 'Signing out…' : 'Sign out'}</span></button>{error && <p role="alert">{error}</p>}</div>
}

function InstructorDashboardLayout() {
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()
  const mobileNavigation = useMobileNavigation()
  const { classes, requestedClassId, status, error, pagination, loadMore } = useClasses()

  return (
    <div className={`${sidebarCollapsed ? 'student-app-shell is-sidebar-collapsed' : 'student-app-shell'} projex-academic-shell${mobileNavigation.open ? ' is-mobile-menu-open' : ''}`}>
      <MobileShellNavigation role="Instructor" navigationId="instructor-navigation" {...mobileNavigation} />
      <aside id="instructor-navigation" className="student-sidebar">
        <SidebarBrand
          to="/instructor"
          label="Origin instructor home"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          onClose={mobileNavigation.close}
        />

        <nav className="student-sidebar__nav" aria-label="Instructor navigation" onClick={(event) => closeMobileNavigationOnLink(event, mobileNavigation.close)}>
          <StudentSidebarLink to="/instructor" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/instructor/review-queues" icon="review">
            To Review
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>My classes</p>
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
            <button type="button" className="student-sidebar__link instructor-sidebar-button" onClick={() => { mobileNavigation.close(); setCreateClassOpen(true) }}>
              <ProjexIcon name="createClass" />
              <span>Create Class</span>
            </button>
          </div>
        </nav>
        <AcademicSidebarSignout />
      </aside>

      <main id="origin-main" tabIndex={-1} className="student-main">
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
  const mobileNavigation = useMobileNavigation()
  const effectiveSidebarCollapsed = sidebarCollapsed || isCodingWorkspace
  const isInsideStudentClass = location.pathname.startsWith('/student/classes')
    || location.pathname.startsWith('/student/activity')
    || location.pathname.startsWith('/student/projects')
    || location.pathname.startsWith('/student/people')
  const { classes, requestedClassId, status, error, pagination, loadMore } = useClasses()

  return (
    <StudentInvitationProvider><div className={`${effectiveSidebarCollapsed ? 'student-app-shell is-sidebar-collapsed' : 'student-app-shell'} projex-academic-shell${isCodingWorkspace ? ' is-coding-workspace' : ''}${mobileNavigation.open ? ' is-mobile-menu-open' : ''}`}>
      <MobileShellNavigation role="Student" navigationId="student-navigation" {...mobileNavigation} />
      <aside id="student-navigation" className="student-sidebar">
        <SidebarBrand
          to="/student"
          label="Origin student home"
          collapsed={effectiveSidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          onClose={mobileNavigation.close}
        />

        <nav className="student-sidebar__nav" aria-label="Student navigation" onClick={(event) => closeMobileNavigationOnLink(event, mobileNavigation.close)}>
          <StudentSidebarLink to="/student" end icon="home">
            Home
          </StudentSidebarLink>
          <StudentSidebarLink to="/student/todo" icon="todo">
            To-do
          </StudentSidebarLink>

          <div className="student-sidebar__group">
            <p>My classes</p>
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
            <StudentSidebarLink to="/student/repositories" icon="repository">My Repositories</StudentSidebarLink>
          </div>
        </nav>
        <AcademicSidebarSignout />
      </aside>

      <main id="origin-main" tabIndex={-1} className="student-main">
        <Outlet />
      </main>
    </div></StudentInvitationProvider>
  )
}

function AdminDashboardLayout() {
  const { pathname } = useLocation()
  const academicActive = pathname === '/admin/academic' || ['/activities', '/submissions', '/project-tasks', '/repositories'].some((suffix) => pathname.startsWith(`/admin/academic${suffix}`))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const mobileNavigation = useMobileNavigation()

  const signOut = async () => {
    setSigningOut(true)
    try {
      await auth.logout()
      navigate('/', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={`${sidebarCollapsed ? 'student-app-shell admin-app-shell is-sidebar-collapsed' : 'student-app-shell admin-app-shell'}${mobileNavigation.open ? ' is-mobile-menu-open' : ''}`}>
      <MobileShellNavigation role="Administrator" navigationId="administrator-navigation" {...mobileNavigation} />
      <aside id="administrator-navigation" className="student-sidebar admin-sidebar">
        <SidebarBrand
          to="/admin"
          label="Origin administrator home"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          onClose={mobileNavigation.close}
        />
        <nav className="student-sidebar__nav" aria-label="Administrator navigation" onClick={(event) => closeMobileNavigationOnLink(event, mobileNavigation.close)}>
          <StudentSidebarLink to="/admin" end icon="home">Overview</StudentSidebarLink>
          <StudentSidebarLink to="/admin/users" icon="people">Users</StudentSidebarLink>
          <StudentSidebarLink to="/admin/academic/classes" icon="people">Classes</StudentSidebarLink>
          <Link to="/admin/academic" className={`student-sidebar__link${academicActive ? ' active' : ''}`} aria-current={academicActive ? 'page' : undefined}><span className="student-sidebar__icon student-sidebar__icon--activity" aria-hidden="true" /><span>Academic Records</span></Link>
          <div className="student-sidebar__group">
            <p>System</p>
            <StudentSidebarLink to="/admin/operations" icon="folder">Operations</StudentSidebarLink>
            <StudentSidebarLink to="/admin/audit-events" icon="todo">Audit Events</StudentSidebarLink>
          </div>
          <div className="student-sidebar__group">
            <p>Tools</p>
            <StudentSidebarLink to="/admin/academic/courses" icon="folder">Course Catalog</StudentSidebarLink>
          </div>
          <div className="student-sidebar__lower admin-sidebar__account">
            <div className="admin-sidebar-identity">
              <span>{auth.user.fullName}</span>
              <small>Administrator</small>
            </div>
            <button type="button" className="student-sidebar__link admin-signout-button" onClick={signOut} disabled={signingOut}>
              <span className="student-sidebar__icon student-sidebar__icon--logout" aria-hidden="true" />
              <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </nav>
      </aside>
      <main id="origin-main" tabIndex={-1} className="student-main admin-main">
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

  if (role.id === 'admin') {
    return <AdminDashboardLayout />
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
            <strong>Origin</strong>
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
