import { Navigate, useLocation } from 'react-router-dom'
import RequestState from '../components/RequestState.jsx'
import { useAuth } from './auth-context.js'
import { roleHome } from './auth-routes.js'

function loginPathFor(role) {
  return role === 'STUDENT' ? '/student-login' : '/instructor-login'
}

export default function ProtectedRoute({ role, children }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <RequestState kind="loading" />
  if (auth.status === 'error') {
    return (
      <RequestState
        kind="unavailable"
        error={auth.error}
        action={<button type="button" onClick={() => auth.bootstrap()}>Try again</button>}
      />
    )
  }
  if (auth.status === 'anonymous') {
    return <Navigate to={loginPathFor(role)} replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  if (auth.status === 'blocked' || auth.user?.status !== 'ACTIVE') {
    return (
      <RequestState
        kind="forbidden"
        title="Account unavailable"
        message="This account is not active. Contact an authorized Projex administrator."
      />
    )
  }
  if (auth.user.role !== role) return <Navigate to={roleHome(auth.user.role)} replace />

  return children
}
