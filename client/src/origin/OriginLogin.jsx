import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Brand, Icon, ThemeControl } from './OriginPrimitives.jsx'
import { useOriginTheme } from './use-origin-theme.js'
import { useOriginInteractions } from '../landing/use-origin-interactions.js'
import { useOriginDocument } from './use-origin-document.js'
import '../landing/origin-landing.css'
import './origin-themes.css'
import './origin-auth.css'

function AuthenticationObject({ instructor }) {
  return (
    <div className="origin-auth-object" aria-hidden="true">
      <div className="origin-auth-orbit" />
      <div className="origin-auth-tile origin-auth-tile--back">
        <Icon name={instructor ? 'chart' : 'branch'} />
      </div>
      <div className="origin-auth-tile origin-auth-tile--front">
        <span className="origin-auth-tile-edge" />
        <Icon name={instructor ? 'people' : 'code'} />
        <span className="origin-auth-object-caption">
          {instructor ? 'Review. Guide. Inspire.' : 'Write. Build. Grow.'}
        </span>
        <i />
        <i />
        <i />
      </div>
      <span className="origin-auth-object-node" />
    </div>
  )
}

export default function OriginLogin({ role, login }) {
  const instructor = role === 'instructor'
  const { theme, toggleTheme } = useOriginTheme()
  const rootRef = useRef(null)
  useOriginInteractions(rootRef)
  useOriginDocument(`${instructor ? 'Instructor' : 'Student'} sign in — Origin`)

  return (
    <div
      className="origin-landing origin-auth"
      data-theme={theme}
      ref={rootRef}
    >
      <a className="origin-skip-link" href="#origin-login">
        Skip to sign in
      </a>
      <header className="origin-auth-header">
        <Link to="/" aria-label="Origin home">
          <Brand />
        </Link>
        <div>
          <Link className="origin-auth-back" to="/">
            Back to Origin
          </Link>
          <ThemeControl theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <main className="origin-auth-stage">
        <section
          className="origin-auth-story"
          aria-labelledby="origin-auth-story-title"
        >
          <p className="origin-eyebrow">
            {instructor
              ? 'For the people who guide'
              : 'For the ideas you’ll build'}
          </p>
          <h1 id="origin-auth-story-title">
            {instructor ? (
              <>
                Give great ideas <br />a little direction.
              </>
            ) : (
              <>
                Your next idea <br />
                starts here.
              </>
            )}
          </h1>
          <p>
            {instructor
              ? 'A considered space to review code, follow progress, and help your students move forward.'
              : 'A focused space for your code, your collaborators, and everything you’re learning along the way.'}
          </p>
          <AuthenticationObject instructor={instructor} />
          <div className="origin-auth-story-note">
            <span className="origin-auth-note-line" />
            <p>
              One workspace. Room to grow.
              <small>Programming, repositories, and academic assessment.</small>
            </p>
          </div>
        </section>
        <section
          className="origin-auth-panel origin-touch-surface"
          aria-label={`${instructor ? 'Instructor' : 'Student'} login`}
        >
          <span className="origin-surface-light" aria-hidden="true" />
          <div className="origin-auth-panel-heading">
            <span className="origin-auth-role-symbol">
              <Icon name={instructor ? 'people' : 'cap'} />
            </span>
            <p>{instructor ? 'Instructor workspace' : 'Student workspace'}</p>
            <h2>Welcome back.</h2>
            <span>Sign in with your Origin account.</span>
          </div>
          <nav
            className="origin-auth-role-switch"
            aria-label="Choose your sign-in view"
          >
            <Link
              to="/student-login"
              aria-current={!instructor ? 'page' : undefined}
            >
              Student
            </Link>
            <Link
              to="/instructor-login"
              aria-current={instructor ? 'page' : undefined}
            >
              Instructor
            </Link>
          </nav>
          <form
            onSubmit={login.submit}
            className="origin-auth-form"
            id="origin-login"
          >
            <label className="origin-auth-field" htmlFor="origin-email">
              Email
            </label>
            <input
              id="origin-email"
              className="origin-auth-input"
              type="email"
              autoComplete="email"
              placeholder="you@slu.edu.ph"
              value={login.email}
              onChange={(event) => login.setEmail(event.target.value)}
              disabled={login.submitting}
              required
              aria-invalid={Boolean(login.fieldErrors.email)}
              aria-describedby={
                login.fieldErrors.email ? 'origin-email-error' : undefined
              }
            />
            {login.fieldErrors.email && (
              <small
                className="origin-auth-field-error"
                id="origin-email-error"
              >
                {login.fieldErrors.email}
              </small>
            )}
            <label className="origin-auth-field" htmlFor="origin-password">
              Password
            </label>
            <div className="origin-auth-password">
              <input
                id="origin-password"
                className="origin-auth-input"
                type={login.showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={login.password}
                onChange={(event) => login.setPassword(event.target.value)}
                disabled={login.submitting}
                required
                aria-invalid={Boolean(login.fieldErrors.password)}
                aria-describedby={
                  login.fieldErrors.password
                    ? 'origin-password-error'
                    : undefined
                }
              />
              <button
                type="button"
                aria-label={
                  login.showPassword ? 'Hide password' : 'Show password'
                }
                onClick={() => login.setShowPassword(!login.showPassword)}
              >
                {login.showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {login.fieldErrors.password && (
              <small
                className="origin-auth-field-error"
                id="origin-password-error"
              >
                {login.fieldErrors.password}
              </small>
            )}
            {login.message && (
              <p className="origin-auth-message" role="alert">
                {login.message.replaceAll('Origin', 'Origin')}
              </p>
            )}
            <button
              className="origin-button origin-auth-submit"
              type="submit"
              disabled={login.submitting}
            >
              {login.submitting ? 'Signing in…' : 'Login'}
              {!login.submitting && <Icon name="arrow" />}
            </button>
          </form>
          <p className="origin-auth-account-note">
            Use the account provided through your class or institution.
          </p>
        </section>
      </main>
      <footer className="origin-auth-footer">
        <span>Partnered With Saint Louis University</span>
        <span>Computing &amp; Information Technology Department</span>
      </footer>
    </div>
  )
}
