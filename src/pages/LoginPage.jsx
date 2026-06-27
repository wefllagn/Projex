import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { roles } from '../data/projexData.js'

export function PrototypeRoleSwitcher() {
  return (
    <main className="login-page login-page--switcher">
      <section className="login-panel login-panel--switcher">
        <div className="login-copy">
          <p className="eyebrow">Saint Louis University programming education</p>
          <h1>Projex</h1>
          <p>
            Academic repository-learning workspace for activities, project
            collaboration, code review signals, feedback, analytics, and
            preserved programming work.
          </p>
          <div className="mode-strip">
            <StatusBadge label="Activity Mode" />
            <StatusBadge label="Project Collaboration Mode" />
          </div>
        </div>

        <Card title="Choose a prototype role" eyebrow="Simulated access">
          <div className="role-card-list">
            {roles.map((role) => (
              <Link className="role-card" to={role.path} key={role.id}>
                <strong>{role.label}</strong>
                <span>{role.description}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </main>
  )
}

function LoginPage() {
  const navigate = useNavigate()

  return (
    <main className="student-login-page">
      <section className="student-login-stage" aria-label="Student login">
        <img
          className="student-login-logo"
          src="/assets/brand/projex-login-logo.png"
          alt="Projex by Saint Louis University"
        />

        <form
          className="student-login-card"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/student')
          }}
        >
          <div>
            <h1>Welcome, student!</h1>
            <p>Let's get started!</p>
          </div>

          <label className="student-login-field">
            <span>Email</span>
            <input type="email" defaultValue="julius.teodoro@slu.edu.ph" />
          </label>

          <label className="student-login-field">
            <span>Password</span>
            <div className="student-password-control">
              <input type="password" defaultValue="projexstudent" />
              <button type="button" className="student-eye-button" aria-label="Show password" />
            </div>
          </label>

          <button type="submit" className="student-login-button">
            Login
          </button>
        </form>

        <aside className="student-login-info" aria-label="Projex information">
          <div className="student-login-info__copy">
            <h2>Little infographic or fun fact</h2>
            <p>Regarding what is Projex</p>
            <p>Include pictures</p>
          </div>
          <img
            className="student-login-mascot"
            src="/assets/brand/projex-login-mascot.png"
            alt=""
            aria-hidden="true"
          />
        </aside>

        <Link className="student-dev-switcher-link" to="/prototype-switcher">
          Prototype role switcher
        </Link>
      </section>
    </main>
  )
}

export default LoginPage
