import OriginLogin from "../origin/OriginLogin.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, describeApiError } from "../api/api-client.js";
import { useAuth } from "../auth/auth-context.js";
import { roleHome, roleMatchesPath } from "../auth/auth-routes.js";

function useLoginController() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (auth.status === "authenticated") {
      navigate(roleHome(auth.user.role), { replace: true });
    }
  }, [auth.status, auth.user, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    try {
      const user = await auth.login(email, password);
      const intended = typeof location.state?.from === "string" ? location.state.from : "";
      navigate(
        intended && roleMatchesPath(user.role, intended) ? intended : roleHome(user.role),
        { replace: true },
      );
    } catch (error) {
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {});
      setMessage(error instanceof ApiError && error.status === 401 ? error.message : describeApiError(error));
    } finally {
      setPassword("");
      setShowPassword(false);
      setSubmitting(false);
    }
  };

  return {
    email,
    fieldErrors,
    message,
    password,
    setEmail,
    setPassword,
    setShowPassword,
    showPassword,
    submit,
    submitting,
  };
}

export function RoleLandingPage() {
  const [activeBenefit, setActiveBenefit] = useState(0);
  const experienceRef = useRef(null);

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
      image: "/assets/brand/landing-benefit-1.png",
    },
    {
      title: "Repository-ready collaboration",
      message:
        "Students can create project repositories, invite teammates, and work inside a class-based workflow.",
      meta: "02",
      accent: "violet",
      image: "/assets/brand/landing-benefit-2.png",
    },
    {
      title: "Easier checking for instructors",
      message:
        "Instructors can monitor submissions, review repositories, and track class progress faster.",
      meta: "03",
      accent: "cyan",
      image: "/assets/brand/landing-benefit-3.png",
    },
    {
      title: "Feedback-ready progress",
      message:
        "Grades, comments, checking results, and improvement signals are easier to follow.",
      meta: "04",
      accent: "green",
      image: "/assets/brand/landing-benefit-4.png",
    },
  ];

  const previousBenefit =
    (activeBenefit - 1 + benefitCards.length) % benefitCards.length;
  const nextBenefit = (activeBenefit + 1) % benefitCards.length;

  const getBenefitPosition = (index) => {
    if (index === activeBenefit) {
      return "active";
    }

    if (index === previousBenefit) {
      return "previous";
    }

    if (index === nextBenefit) {
      return "next";
    }

    return "hidden";
  };

  useEffect(() => {
    const updateActiveBenefit = () => {
      const section = experienceRef.current;

      if (!section) {
        return;
      }

      if (window.matchMedia("(max-width: 760px)").matches) {
        setActiveBenefit(0);
        return;
      }

      const sectionTop = section.offsetTop;
      const scrollStart = sectionTop;
      const scrollEnd = sectionTop + section.offsetHeight - window.innerHeight;
      const currentScroll = window.scrollY;

      if (currentScroll < scrollStart) {
        setActiveBenefit(0);
        return;
      }

      if (currentScroll >= scrollEnd) {
        setActiveBenefit(benefitCards.length - 1);
        return;
      }

      const maxIndex = benefitCards.length - 1;
      const scrollRange = Math.max(scrollEnd - scrollStart, 1);
      const progress = Math.min(
        Math.max((currentScroll - scrollStart) / scrollRange, 0),
        1,
      );
      const nextIndex = Math.min(
        Math.floor(progress * benefitCards.length),
        maxIndex,
      );

      setActiveBenefit(nextIndex);
    };

    updateActiveBenefit();
    window.addEventListener("scroll", updateActiveBenefit, { passive: true });
    window.addEventListener("resize", updateActiveBenefit);

    return () => {
      window.removeEventListener("scroll", updateActiveBenefit);
      window.removeEventListener("resize", updateActiveBenefit);
    };
  }, [benefitCards.length]);
  return (
    <main className="role-landing-page">
      <span className="role-landing-glow role-landing-glow--one" aria-hidden="true" />
      <span className="role-landing-glow role-landing-glow--two" aria-hidden="true" />
      <div className="role-landing-shell">
        <header className="role-landing-brandbar">
          <Link className="role-landing-brand" to="/" aria-label="Origin home">
            <img src="/assets/brand/projex-landingpage-logo.png" alt="Origin" />
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
            aria-label="Origin product preview"
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

        <section
          className="role-landing-experience"
          aria-labelledby="role-landing-experience-title"
          ref={experienceRef}
        >
          <div className="role-landing-experience-pin">
            <div className="role-landing-experience-heading">
              <span>The experience</span>
              <h2 id="role-landing-experience-title">Designed for progress</h2>
              <div className="role-landing-progress" aria-label="Benefit progress">
                {benefitCards.map((benefit, index) => (
                  <span
                    className={index === activeBenefit ? "is-active" : ""}
                    key={benefit.title}
                  />
                ))}
              </div>
            </div>

            <div className="role-landing-carousel">
              <div className="role-landing-carousel-stage" aria-live="polite">
                {benefitCards.map((benefit, index) => {
                  const position = getBenefitPosition(index);

                  return (
                    <article
                      className={"role-landing-benefit-card role-landing-benefit-card--" + position + " role-landing-benefit-card--" + benefit.accent}
                      aria-hidden={position === "hidden"}
                      key={benefit.title}
                    >
                      <div className="role-landing-benefit-copy">
                        <span>{benefit.meta}</span>
                        <h3>{benefit.title}</h3>
                        <p>{benefit.message}</p>
                      </div>
                      <div className="role-landing-benefit-visual" aria-hidden="true">
                        <img src={benefit.image} alt="" />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <footer
              className={
                "role-landing-footer" +
                (activeBenefit === benefitCards.length - 1 ? " is-visible" : "")
              }
            >
              &copy; 2026 Origin. All rights reserved.
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

export function InstructorLoginPage() {
  const login = useLoginController();
  return <OriginLogin role="instructor" login={login} />;
}

function LoginPage() {
  const login = useLoginController();
  return <OriginLogin role="student" login={login} />;
}

export default LoginPage;
