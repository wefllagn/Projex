import { useState } from 'react'
import { describeApiError } from '../api/api-client.js'
import { useNavigate } from 'react-router-dom'
import RecoveryScreen from '../components/RecoveryScreen.jsx'
import { useAuth } from './auth-context.js'
import { roleHome } from './auth-routes.js'

export default function SessionRecovery({ role = 'STUDENT' }) {
  const auth = useAuth(), navigate = useNavigate()
  const [switchError, setSwitchError] = useState('')
  const access = auth.issue === 'access'
  const checking = auth.issue === 'checking'
  const changed = auth.issue === 'changed'
  const unavailable = auth.issue === 'unavailable'
  const signIn = async () => {
    if (auth.pendingUser?.status === 'ACTIVE') {
      try { await auth.logout({ requireServerConfirmation: true }) }
      catch (error) { setSwitchError(describeApiError(error)); return }
    } else auth.goToSignIn()
    navigate(role === 'STUDENT' ? '/student-login' : '/instructor-login', { replace: true })
  }
  return <RecoveryScreen
    title={checking ? 'Checking your session' : access ? 'This page is no longer available to your account' : changed ? 'Your account has changed' : unavailable ? 'We couldn’t confirm your session' : auth.issue === 'blocked' ? 'This account is unavailable' : 'Your session has ended'}
    message={checking ? 'Please wait while Origin confirms the account available in this tab.' : access ? 'Your access to this page has changed. Return to your dashboard to choose an available workspace.' : changed ? "You're now signed in with another account. This page is no longer available under your previous account." : unavailable ? 'Check your connection, then try again. Your previous page is locked until we can confirm your account.' : auth.issue === 'blocked' ? 'This account can no longer open the workspace. Contact your institution for help.' : 'Sign in again to continue securely in Origin.'}
    busy={checking}
    actions={!checking && <>
      {(changed || access) && auth.pendingUser?.status === 'ACTIVE' && <button type="button" className="student-primary-action" onClick={() => { const home = roleHome(auth.pendingUser.role); auth.continueSession(); navigate(home, { replace: true }) }}>{access ? 'Back to dashboard' : 'Continue with current account'}</button>}
      {unavailable && <button type="button" className="student-primary-action" onClick={() => auth.revalidate({ interrupt: true })}>Try again</button>}
      {switchError && <p role="alert">{switchError}</p>}
      <button type="button" className="student-outline-action" onClick={signIn}>{auth.pendingUser?.status === 'ACTIVE' ? 'Sign out and switch account' : 'Go to sign in'}</button>
    </>}
  />
}
