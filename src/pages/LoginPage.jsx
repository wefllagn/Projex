import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { roles } from "../data/projexData.js";

export function RoleLandingPage() {
  const [activeBenefit, setActiveBenefit] = useState(0);

  const previewRows = [
    {
      name: "Julius Teodoro",
      status: "Graded 96/100",
      submitted: "Aug 27, 2026, 9:42 AM",
      similarity: "Low",
      action: "Reviewed",
    },
    {
      name: "Alyssa Mendoza",
      status: "For Review",
      submitted: "Aug 27, 2026, 10:08 AM",
      similarity: "Medium",
      action: "Review",
    },
    {
      name: "Marco Rivera",
      status: "Late",
      submitted: "Aug 27, 2026, 10:46 AM",
      similarity: "High",
      action: "Review",
    },
    {
      name: "Daniel Reyes",
      status: "Missing",
      submitted: "No final submission",
      similarity: "Low",
      action: "Review",
    },
    {
      name: "Mica Dela Cruz",
      status: "Graded 40/100",
      submitted: "Aug 27, 2026, 9:58 AM",
      similarity: "High",
      action: "Review",
    },
  ];

  const benefitCards = [
    {
      title: "Unified workflow",
      message: "Activities, repositories, submissions, and feedback in one place.",
      meta: "01",
      accent: "blue",
    },
    {
      title: "Repository-ready collaboration",
      message:
        "Students can create project repositories, invite teammates, and work inside a class-based workflow.",
      meta: "02",
      accent: "violet",
    },
    {
      title: "Easier checking for instructors",
      message:
        "Instructors can monitor submissions, review repositories, and track class progress faster.",
      meta: "03",
      accent: "cyan",
    },
    {
      title: "Feedback-ready progress",
      message:
        "Grades, comments, checking results, and improvement signals are easier to follow.",
      meta: "04",
      accent: "green",
    },
  ];

  const previousBenefit =
    (activeBenefit - 1 + benefitCards.length) % benefitCards.length;
  const nextBenefit = (activeBenefit + 1) % benefitCards.length;
  const activeCard = benefitCards[activeBenefit];

  const goToPreviousBenefit = () => {
    setActiveBenefit(previousBenefit);
  };

  const goToNextBenefit = () => {
    setActiveBenefit(nextBenefit);
  };

  return (
    <main className="role-landing-page">
      <span className="role-landing-glow role-landing-glow--one" aria-hidden="true" />
      <span className="role-landing-glow role-landing-glow--two" aria-hidden="true" />
      <div className="role-landing-shell">
        <header className="role-landing-brandbar">
          <Link className="role-landing-brand" to="/" aria-label="Projex home">
            <img src="/assets/brand/projex-landingpage-logo.png" alt="Projex" />
          </Link>
          <div className="role-landing-school">
            <span>Saint Louis University</span>
            <small>Baguio City, Philippines</small>
            <img src="/assets/brand/slu-landing-logo.png" alt="" aria-hidden="true" />
          </div>
        </header>

        <section
          className="role-landing-hero"
          aria-labelledby="role-landing-title"
        >
          <div className="role-landing-copy">
            <h1 id="role-landing-title">
              One platform for programming education.
            </h1>
            <p>
              Activities, repositories, and submissions all in one place.
            </p>
            <div
              className="role-landing-actions"
              aria-label="Choose your workspace"
            >
              <Link
                className="role-landing-button role-landing-button--student"
                to="/student-login"
              >
                <span className="role-landing-button-icon role-landing-button-icon--student" aria-hidden="true" />
                Continue as Student
              </Link>
              <Link
                className="role-landing-button role-landing-button--instructor"
                to="/instructor-login"
              >
                <span className="role-landing-button-icon role-landing-button-icon--instructor" aria-hidden="true" />
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
                <div className="role-landing-preview-tabs" aria-label="Preview tabs">
                  <span className="is-active">Activities</span>
                  <span>Group Projects</span>
                </div>
                <span className="role-landing-preview-action">View all activities</span>
              </div>
              <div className="role-landing-preview-heading">
                <span>Activity Monitoring</span>
                <h2>Prelim Programming Exercise 1 LAB</h2>
                <p>Due Aug 27, 2026, 10:30 AM - attempts allowed until due date</p>
              </div>
              <div className="role-landing-preview-metrics">
                <div>
                  <span>Submitted</span>
                  <strong>31</strong>
                  <small>Final records received</small>
                </div>
                <div>
                  <span>Missing</span>
                  <strong>5</strong>
                  <small>No submission yet</small>
                </div>
                <div>
                  <span>Late</span>
                  <strong>2</strong>
                  <small>Submitted after due time</small>
                </div>
              </div>
              <div className="role-landing-preview-table" aria-label="Mock monitoring table">
                <div className="role-landing-preview-row role-landing-preview-row--head">
                  <span>Student Name</span>
                  <span>Status</span>
                  <span>Last Submitted</span>
                  <span>Similarity</span>
                  <span>Action</span>
                </div>
                {previewRows.map((row) => (
                  <div className="role-landing-preview-row" key={row.name}>
                    <span>{row.name}</span>
                    <span className={`role-landing-status role-landing-status--${row.status.toLowerCase().replaceAll(" ", "-").replace("/", "-")}`}>
                      {row.status}
                    </span>
                    <span>{row.submitted}</span>
                    <span>{row.similarity}</span>
                    <span className="role-landing-review-action">{row.action}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="role-landing-mascot-float">
              <img
                src="/assets/brand/projex-login-mascot.png"
                alt=""
                aria-hidden="true"
              />
            </div>
          </aside>
        </section>

        <section className="role-landing-experience" aria-labelledby="role-landing-experience-title">
          <div className="role-landing-experience-heading">
            <span>The experience</span>
            <h2 id="role-landing-experience-title">Designed for progress</h2>
            <div className="role-landing-progress" aria-label="Benefit progress">
              {benefitCards.map((benefit, index) => (
                <button
                  type="button"
                  className={index === activeBenefit ? "is-active" : ""}
                  key={benefit.title}
                  onClick={() => setActiveBenefit(index)}
                  aria-label={`Show ${benefit.title}`}
                />
              ))}
            </div>
          </div>

          <div className="role-landing-carousel">
            <button
              className="role-landing-carousel-button"
              type="button"
              onClick={goToPreviousBenefit}
              aria-label="Previous benefit"
            >
              <span aria-hidden="true">‹</span>
            </button>

            <div className="role-landing-carousel-stage" aria-live="polite">
              <article className="role-landing-benefit-card role-landing-benefit-card--side">
                <span>{benefitCards[previousBenefit].meta}</span>
                <h3>{benefitCards[previousBenefit].title}</h3>
                <p>{benefitCards[previousBenefit].message}</p>
              </article>

              <article className={`role-landing-benefit-card role-landing-benefit-card--active role-landing-benefit-card--${activeCard.accent}`}>
                <div>
                  <span>{activeCard.meta}</span>
                  <h3>{activeCard.title}</h3>
                  <p>{activeCard.message}</p>
                </div>
                <div className="role-landing-benefit-visual" aria-hidden="true">
                  <div className="role-landing-benefit-chip">Activity</div>
                  <div className="role-landing-benefit-chip">Repository</div>
                  <div className="role-landing-benefit-chip">Feedback</div>
                  <img src="/assets/brand/projex-login-mascot.png" alt="" />
                </div>
              </article>

              <article className="role-landing-benefit-card role-landing-benefit-card--side">
                <span>{benefitCards[nextBenefit].meta}</span>
                <h3>{benefitCards[nextBenefit].title}</h3>
                <p>{benefitCards[nextBenefit].message}</p>
              </article>
            </div>

            <button
              className="role-landing-carousel-button"
              type="button"
              onClick={goToNextBenefit}
              aria-label="Next benefit"
            >
              <span aria-hidden="true">›</span>
            </button>
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
