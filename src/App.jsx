import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import './App.css'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AdminRoutePage from './pages/AdminPages.jsx'
import LoginPage, { InstructorLoginPage, PrototypeRoleSwitcher, RoleLandingPage } from './pages/LoginPage.jsx'
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

const roleRoutes = routeCatalog.flatMap((role) => [
  {
    path: role.path,
    element: <DashboardLayout role={role} />,
    children: [
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
    element: <PrototypeRoleSwitcher />,
  },
  ...roleRoutes,
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
