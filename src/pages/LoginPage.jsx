import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { roles } from '../data/projexData.js'

export function RoleLandingPage() {
  const roleLinks = [
    {
      label: 'Student',
      to: '/student-login',
      description: 'Open the student sign-in page for activities, submissions, and team repositories.',
    },
    {
      label: 'Instructor',
      to: '/instructor-login',
      description: 'Open the instructor sign-in page for class, activity, and repository review tools.',
    },
    {
      label: 'Admin',
      to: '/admin',
      description: 'Go to the admin prototype workspace for users, courses, repositories, and storage.',
    },
  ]

  return (
    <main className="role-landing-page">
      <section className="role-landing-panel" aria-labelledby="role-landing-title">
        <img
          className="role-landing-logo"
          src="/assets/brand/projex-login-logo.png"
          alt="Projex by Saint Louis University"
        />

        <div className="role-landing-copy">
          <span>Saint Louis University</span>
          <h1 id="role-landing-title">Are you a student, instructor, or admin?</h1>
          <p>Choose your Projex workspace to continue.</p>
        </div>

        <div className="role-landing-card-grid" aria-label="Choose a role">
          {roleLinks.map((role) => (
            <Link className="role-landing-card" to={role.to} key={role.label}>
              <strong>{role.label}</strong>
              <span>{role.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

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

        <Card title="Choose a prototype role" eyebrow="Prototype roles">
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

export function InstructorLoginPage() {
  const navigate = useNavigate()

  return (
    <main className="student-login-page">
      <section className="student-login-stage" aria-label="Instructor login">
        <img
          className="student-login-logo"
          src="/assets/brand/projex-login-logo.png"
          alt="Projex by Saint Louis University"
        />

        <form
          className="student-login-card"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/instructor')
          }}
        >
          <div>
            <h1>Welcome, instructor!</h1>
            <p>Let's get started!</p>
          </div>

          <label className="student-login-field">
            <span>Email</span>
            <input type="email" defaultValue="marco.rivera@slu.edu.ph" />
          </label>

          <label className="student-login-field">
            <span>Password</span>
            <div className="student-password-control">
              <input type="password" defaultValue="projexinstructor" />
              <button type="button" className="student-eye-button" aria-label="Show password" />
            </div>
          </label>

          <button type="submit" className="student-login-button">
            Login
          </button>
        </form>

        <aside className="student-login-info" aria-label="Projex instructor information">
          <div className="student-login-info__copy">
            <span className="student-login-university">Saint Louis University</span>
            <h2>Guide programming work with Projex</h2>
            <p>Review class activity, submissions, repository progress, and feedback from one workspace.</p>
          </div>
          <img
            className="student-login-mascot"
            src="/assets/brand/projex-login-mascot.png"
            alt=""
            aria-hidden="true"
          />
          <div className="student-login-feature-list">
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--activities" aria-hidden="true" />
              <div>
                <strong>Activity Monitoring</strong>
                <p>Track deadlines, final submissions, checking results, and grading queues.</p>
              </div>
            </div>
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--teams" aria-hidden="true" />
              <div>
                <strong>Repository Review</strong>
                <p>Inspect team repositories, contribution signals, and project readiness.</p>
              </div>
            </div>
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--progress" aria-hidden="true" />
              <div>
                <strong>Feedback & Analytics</strong>
                <p>Prepare feedback, release grades, and watch class learning progress.</p>
              </div>
            </div>
          </div>
          <p className="student-login-designed">Designed for programming education at Saint Louis University.</p>
        </aside>

        <Link className="student-dev-switcher-link" to="/">
          Role selection
        </Link>
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
            <span className="student-login-university">Saint Louis University</span>
            <h2>Welcome to Projex</h2>
            <p>Your all-in-one platform for programming education, collaboration, and growth.</p>
          </div>
          <img
            className="student-login-mascot"
            src="/assets/brand/projex-login-mascot.png"
            alt=""
            aria-hidden="true"
          />
          <div className="student-login-feature-list">
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--activities" aria-hidden="true" />
              <div>
                <strong>Class Activities & Submissions</strong>
                <p>Access activities, submit your work, and track your submissions easily.</p>
              </div>
            </div>
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--teams" aria-hidden="true" />
              <div>
                <strong>Team Repositories & Collaboration</strong>
                <p>Work together on projects with team repositories and seamless collaboration tools.</p>
              </div>
            </div>
            <div className="student-login-feature">
              <span className="student-login-feature-icon student-login-feature-icon--progress" aria-hidden="true" />
              <div>
                <strong>Feedback & Progress Tracking</strong>
                <p>Receive feedback from instructors and monitor your progress over time.</p>
              </div>
            </div>
          </div>
          <p className="student-login-designed">Designed for programming education at Saint Louis University.</p>
        </aside>

        <Link className="student-dev-switcher-link" to="/prototype-switcher">
          Prototype role switcher
        </Link>
      </section>
    </main>
  )
}

export default LoginPage
