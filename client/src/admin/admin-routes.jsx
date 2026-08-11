import { Navigate } from 'react-router-dom'
import AdminRoutePage from './AdminViews.jsx'
import {
  AdminAcademicHomePage,
  AdminAcademicListPage,
  AdminClassCreatePage,
  AdminClassDetailPage,
  AdminClassListPage,
} from './AdminAcademicViews.jsx'
import {
  AdminAuditEventsPage,
  AdminOperationalListPage,
  AdminOperationsOverviewPage,
} from './AdminOperationsViews.jsx'

export const adminChildren = [
  { index: true, element: <AdminRoutePage pagePath="dashboard" /> },
  { path: 'users', element: <AdminRoutePage pagePath="users" /> },
  { path: 'users/:userId', element: <AdminRoutePage pagePath="user-detail" /> },
  { path: 'academic', element: <AdminAcademicHomePage /> },
  { path: 'academic/classes', element: <AdminClassListPage /> },
  { path: 'academic/classes/new', element: <AdminClassCreatePage /> },
  { path: 'academic/classes/:classId', element: <AdminClassDetailPage /> },
  { path: 'academic/activities', element: <AdminAcademicListPage kind="activities" /> },
  { path: 'academic/submissions', element: <AdminAcademicListPage kind="submissions" /> },
  { path: 'academic/project-tasks', element: <AdminAcademicListPage kind="project-tasks" /> },
  { path: 'academic/repositories', element: <AdminAcademicListPage kind="repositories" /> },
  { path: 'operations', element: <AdminOperationsOverviewPage /> },
  { path: 'operations/execution-jobs', element: <AdminOperationalListPage kind="execution" /> },
  { path: 'operations/repository-provisioning-jobs', element: <AdminOperationalListPage kind="provisioning" /> },
  { path: 'operations/git-credentials', element: <AdminOperationalListPage kind="credentials" /> },
  { path: 'audit-events', element: <AdminAuditEventsPage /> },
  ...['courses', 'sections', 'enrollments', 'instructor-assignments']
    .map((path) => ({ path, element: <Navigate to="/admin/academic/classes" replace /> })),
  { path: 'repositories', element: <Navigate to="/admin/academic/repositories" replace /> },
  { path: 'archive', element: <Navigate to="/admin/academic" replace /> },
  ...['storage', 'system'].map((path) => ({ path, element: <Navigate to="/admin/operations" replace /> })),
]
