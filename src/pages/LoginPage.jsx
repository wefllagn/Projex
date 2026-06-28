import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { roles } from "../data/projexData.js";

export function RoleLandingPage() {
  const featureCards = [
    {
      title: "Activity Submissions",
      description:
        "Students submit programming activities while instructors monitor deadlines, outputs, and evaluation status.",
    },
    {
      title: "Repository Collaboration",
      description:
        "Teams can create project repositories tied to class requirements and collaborate in a structured academic workspace.",
    },
    {
      title: "Instructor Review",
      description:
        "Instructors can review submissions, inspect repositories, provide feedback, and track student progress.",
    },
  ];

  return (
    <main className="role-landing-page">
      <div className="role-landing-shell">
        <header className="role-landing-brandbar">
          <Link className="role-landing-brand" to="/" aria-label="Projex home">
            <img src="/assets/brand/projex-sidebar-logo.png" alt="Projex" />
          </Link>
          <span className="role-landing-school">Saint Louis University</span>
        </header>

        <section
          className="role-landing-hero"
          aria-labelledby="role-landing-title"
        >
          <div className="role-landing-copy">
            <p className="role-landing-kicker">
              Academic programming workspace
            </p>
            <h1 id="role-landing-title">
              One workspace for programming classes, submissions, and project
              repositories.
            </h1>
            <p>
              Projex helps students submit coding activities, collaborate on
              repositories, and receive feedback while instructors manage class
              progress, reviews, and project evaluation in one academic
              platform.
            </p>
            <div
              className="role-landing-actions"
              aria-label="Choose your workspace"
            >
              <Link
                className="role-landing-button role-landing-button--primary"
                to="/student-login"
              >
                Continue as Student
              </Link>
              <Link
                className="role-landing-button role-landing-button--secondary"
                to="/instructor-login"
              >
                Continue as Instructor
              </Link>
            </div>
          </div>

          <aside
            className="role-landing-preview"
            aria-label="Projex product preview"
          >
            <div className="role-landing-preview-card role-landing-preview-card--main">
              <div className="role-landing-preview-top">
                <div>
                  <span>IT 112</span>
                  <strong>Programming workspace</strong>
                </div>
                <span className="role-landing-preview-pill">Live class</span>
              </div>
              <div className="role-landing-preview-metrics">
                <div>
                  <strong>18</strong>
                  <span>Submissions</span>
                </div>
                <div>
                  <strong>9</strong>
                  <span>Repositories</span>
                </div>
                <div>
                  <strong>96%</strong>
                  <span>Reviewed</span>
                </div>
              </div>
              <div className="role-landing-preview-list">
                <div>
                  <span className="role-landing-preview-dot" />
                  <strong>Class Activities</strong>
                  <small>Deadlines, code outputs, and submission states</small>
                </div>
                <div>
                  <span className="role-landing-preview-dot role-landing-preview-dot--green" />
                  <strong>Repository Projects</strong>
                  <small>Team repositories linked to requirements</small>
                </div>
                <div>
                  <span className="role-landing-preview-dot role-landing-preview-dot--amber" />
                  <strong>Feedback & Review</strong>
                  <small>Grades, notes, and instructor review queues</small>
                </div>
                <div>
                  <span className="role-landing-preview-dot role-landing-preview-dot--violet" />
                  <strong>Progress / Analytics</strong>
                  <small>Class signals for programming progress</small>
                </div>
              </div>
            </div>
            <div className="role-landing-preview-card role-landing-preview-card--float">
              <img
                src="/assets/brand/projex-login-mascot.png"
                alt=""
                aria-hidden="true"
              />
              <div>
                <strong>Ready for review</strong>
                <span>4 projects</span>
              </div>
            </div>
          </aside>
        </section>

        <section
          className="role-landing-about"
          aria-labelledby="role-landing-about-title"
        >
          <div className="role-landing-about-copy">
            <h2 id="role-landing-about-title">
              Built for programming education.
            </h2>
            <p>
              Projex is a web-based academic repository-learning platform for
              programming classes at Saint Louis University. It supports coding
              activities, team repositories, code submissions, instructor
              feedback, and long-term project organization in one structured
              workspace.
            </p>
          </div>
          <div className="role-landing-feature-grid">
            {featureCards.map((feature) => (
              <article
                className="role-landing-feature-card"
                key={feature.title}
              >
                <span
                  className="role-landing-feature-mark"
                  aria-hidden="true"
                />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PrototypeRoleSwitcher() {
  return (
    <main className="login-page login-page--switcher">
      <section className="login-panel login-panel--switcher">
        <div className="login-copy">
          <p className="eyebrow">
            Saint Louis University programming education
          </p>
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
  );
}

export function InstructorLoginPage() {
  const navigate = useNavigate();

  return (
    <main className="student-login-page">
      <section className="student-login-stage" aria-label="Instructor login">
        <img
          className="student-login-logo"
          src="/assets/brand/projex-login-logo1.png"
          alt="Projex by Saint Louis University"
        />

        <form
          className="student-login-card"
          onSubmit={(event) => {
            event.preventDefault();
            navigate("/instructor");
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
              <button
                type="button"
                className="student-eye-button"
                aria-label="Show password"
              />
            </div>
          </label>

          <button type="submit" className="student-login-button">
            Login
          </button>
        </form>

        <aside
          className="student-login-info"
          aria-label="Projex instructor information"
        >
          <div className="student-login-info__copy">
            <span className="student-login-university">
              Saint Louis University
            </span>
            <h2>Your Projex classroom, reviewed in minutes.</h2>
            <p>
              Submissions, code progress, and feedback without jumping between
              tools.
            </p>
          </div>
          <img
            className="student-login-mascot"
            src="/assets/brand/projex-login-mascot.png"
            alt=""
            aria-hidden="true"
          />
          <div className="student-login-feature-list">
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--activities"
                aria-hidden="true"
              />
              <div>
                <strong>Activity Monitoring</strong>
                <p>
                  Track deadlines, final submissions, checking results, and
                  grading queues.
                </p>
              </div>
            </div>
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--teams"
                aria-hidden="true"
              />
              <div>
                <strong>Repository Review</strong>
                <p>
                  Inspect team repositories, contribution signals, and project
                  readiness.
                </p>
              </div>
            </div>
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--progress"
                aria-hidden="true"
              />
              <div>
                <strong>Feedback & Analytics</strong>
                <p>
                  Prepare feedback, release grades, and watch class learning
                  progress.
                </p>
              </div>
            </div>
          </div>
          <p className="student-login-designed">
            Designed for programming education at Saint Louis University.
          </p>
        </aside>

        <Link className="student-dev-switcher-link" to="/">
          Role selection
        </Link>
      </section>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="student-login-page">
      <section className="student-login-stage" aria-label="Student login">
        <img
          className="student-login-logo"
          src="/assets/brand/projex-login-logo1.png"
          alt="Projex by Saint Louis University"
        />

        <form
          className="student-login-card"
          onSubmit={(event) => {
            event.preventDefault();
            navigate("/student");
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
              <button
                type="button"
                className="student-eye-button"
                aria-label="Show password"
              />
            </div>
          </label>

          <button type="submit" className="student-login-button">
            Login
          </button>
        </form>

        <aside className="student-login-info" aria-label="Projex information">
          <div className="student-login-info__copy">
            <span className="student-login-university">
              Saint Louis University
            </span>
            <h2>Welcome to Projex</h2>
            <p>
              Your all-in-one platform for programming education, collaboration,
              and growth.
            </p>
          </div>
          <img
            className="student-login-mascot"
            src="/assets/brand/projex-login-mascot.png"
            alt=""
            aria-hidden="true"
          />
          <div className="student-login-feature-list">
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--activities"
                aria-hidden="true"
              />
              <div>
                <strong>Class Activities & Submissions</strong>
                <p>
                  Access activities, submit your work, and track your
                  submissions easily.
                </p>
              </div>
            </div>
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--teams"
                aria-hidden="true"
              />
              <div>
                <strong>Team Repositories & Collaboration</strong>
                <p>
                  Work together on projects with team repositories and seamless
                  collaboration tools.
                </p>
              </div>
            </div>
            <div className="student-login-feature">
              <span
                className="student-login-feature-icon student-login-feature-icon--progress"
                aria-hidden="true"
              />
              <div>
                <strong>Feedback & Progress Tracking</strong>
                <p>
                  Receive feedback from instructors and monitor your progress
                  over time.
                </p>
              </div>
            </div>
          </div>
          <p className="student-login-designed">
            Designed for programming education at Saint Louis University.
          </p>
        </aside>

        <Link className="student-dev-switcher-link" to="/prototype-switcher">
          Prototype role switcher
        </Link>
      </section>
    </main>
  );
}

export default LoginPage;
