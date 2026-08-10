import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import './App.css'
import { AuthProvider } from './auth/AuthContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import ClassProvider from './classes/ClassProvider.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AdminRoutePage from './admin/AdminViews.jsx'
import AccountSetupPage from './pages/AccountSetupPage.jsx'
import LoginPage, { InstructorLoginPage, RoleLandingPage } from './pages/LoginPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import InstructorRoutePage from './pages/InstructorPages.jsx'
import RoleDashboard from './pages/RoleDashboard.jsx'
import StudentRoutePage from './pages/StudentPages.jsx'
import { routeCatalog } from './data/projexData.js'

function getRouteElement(role, route) {
  if (role.id === 'student') {
    return <StudentRoutePage pagePath={route.path} />
  }

  if (role.id === 'instructor') {
    return <InstructorRoutePage pagePath={route.path} />
  }

  if (role.id === 'admin') {
    return <AdminRoutePage pagePath={route.path} />
  }

  return <PlaceholderPage role={role} page={route} />
}

function RoleLayout({ role }) {
  const layout = <DashboardLayout role={role} />
  return role.id === 'student' || role.id === 'instructor'
    ? <ClassProvider>{layout}</ClassProvider>
    : layout
}

const adminChildren = [
  { index: true, element: <AdminRoutePage pagePath="dashboard" /> },
  { path: 'users', element: <AdminRoutePage pagePath="users" /> },
  { path: 'users/:userId', element: <AdminRoutePage pagePath="user-detail" /> },
  { path: 'academic', element: <AdminRoutePage pagePath="academic" /> },
  { path: 'operations', element: <AdminRoutePage pagePath="operations" /> },
  { path: 'audit-events', element: <AdminRoutePage pagePath="audit-events" /> },
  ...['courses', 'sections', 'enrollments', 'instructor-assignments', 'repositories', 'storage', 'system', 'archive']
    .map((path) => ({ path, element: <AdminRoutePage pagePath={path} /> })),
]

const roleRoutes = routeCatalog.flatMap((role) => [
  {
    path: role.path,
    element: (
      <ProtectedRoute role={role.id.toUpperCase()}>
        <RoleLayout role={role} />
      </ProtectedRoute>
    ),
    children: role.id === 'admin' ? adminChildren : [
      {
        index: true,
        element:
          role.id === 'student' ? (
            <StudentRoutePage pagePath="dashboard" />
          ) : role.id === 'instructor' ? (
            <InstructorRoutePage pagePath="dashboard" />
          ) : role.id === 'admin' ? (
            <AdminRoutePage pagePath="dashboard" />
          ) : (
            <RoleDashboard role={role} />
          ),
      },
      ...role.routes.map((route) => ({
        path: route.path,
        element: getRouteElement(role, route),
      })),
    ],
  },
])

const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleLandingPage />,
  },
  {
    path: '/student-login',
    element: <LoginPage />,
  },
  {
    path: '/instructor-login',
    element: <InstructorLoginPage />,
  },
  {
    path: '/prototype-switcher',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/account-setup',
    element: <AccountSetupPage />,
  },
  ...roleRoutes,
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
