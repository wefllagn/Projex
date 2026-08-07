import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, describeApiError } from '../api/api-client.js'
import { useAuth } from '../auth/auth-context.js'
import { consumeSetupToken } from './account-setup-token.js'

function passwordPolicyError(password) {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (password.length > 128) return 'Use at most 128 characters.'
  if (!/[A-Z]/.test(password)) return 'Add an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Add a lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Add a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add a special character.'
  return null
}

export default function AccountSetupPage() {
  const auth = useAuth()
  const tokenRef = useRef('')
  const cleanupTimerRef = useRef(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('ready')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useLayoutEffect(() => {
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
    if (!tokenRef.current) tokenRef.current = consumeSetupToken()
    if (!tokenRef.current) {
      setStatus('invalid')
      setMessage('This setup link is missing its secure token. Request a new setup email.')
    }

    return () => {
      // StrictMode immediately replays effects in development. Delaying only the
      // in-memory cleanup one task keeps that replay from discarding the token.
      cleanupTimerRef.current = setTimeout(() => {
        tokenRef.current = ''
      }, 0)
    }
  }, [])

  const clearSensitiveState = () => {
    tokenRef.current = ''
    setPassword('')
    setConfirmPassword('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const policyError = passwordPolicyError(password)
    const errors = {
      ...(policyError ? { password: policyError } : {}),
      ...(password !== confirmPassword ? { confirmPassword: 'Password confirmation does not match.' } : {}),
    }
    setFieldErrors(errors)
    setMessage('')
    if (Object.keys(errors).length > 0) return

    setStatus('submitting')
    try {
      await auth.completeAccountSetup(tokenRef.current, password, confirmPassword)
      clearSensitiveState()
      setStatus('success')
      setMessage('Your Projex password is ready. You can now sign in.')
    } catch (error) {
      setPassword('')
      setConfirmPassword('')
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {})
      setStatus('invalid')
      setMessage(
        error instanceof ApiError && error.code === 'SETUP_TOKEN_INVALID'
          ? 'This setup link is invalid, expired, or already used. Request a new setup email.'
          : describeApiError(error),
      )
      tokenRef.current = ''
    }
  }

  return (
    <main className="student-login-page">
      <section className="student-login-stage" aria-label="Projex account setup">
        <img className="student-login-logo" src="/assets/brand/projex-login-logo.png" alt="Projex by Saint Louis University" />
        <form className="student-login-card account-setup-card" onSubmit={submit}>
          <div>
            <h1>Set up your account</h1>
            <p>Create the password you will use to sign in to Projex.</p>
          </div>

          {status === 'success' || status === 'invalid' ? (
            <div className={`auth-form-message ${status === 'success' ? 'is-success' : 'is-error'}`} role="alert">
              {message}
            </div>
          ) : (
            <>
              <label className="student-login-field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={status === 'submitting'}
                />
                {fieldErrors.password && <small className="auth-field-error">{fieldErrors.password}</small>}
              </label>
              <label className="student-login-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={status === 'submitting'}
                />
                {fieldErrors.confirmPassword && <small className="auth-field-error">{fieldErrors.confirmPassword}</small>}
              </label>
              <p className="account-setup-policy">Use 10–128 characters with uppercase, lowercase, number, and special character.</p>
              <button type="submit" className="student-login-button" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Setting up account…' : 'Set password'}
              </button>
            </>
          )}

          {(status === 'success' || status === 'invalid') && (
            <Link className="student-login-button account-setup-link" to="/">Return to sign in</Link>
          )}
        </form>

        <aside className="student-login-info" aria-label="Account security information">
          <div className="student-login-info__copy">
            <h2>Your Projex account, secured.</h2>
            <p>The setup link is removed from your browser address as soon as this page opens.</p>
          </div>
          <img className="student-login-mascot" src="/assets/brand/projex-login-mascot.png" alt="" aria-hidden="true" />
        </aside>
      </section>
    </main>
  )
}
