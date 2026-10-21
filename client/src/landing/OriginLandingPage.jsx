import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOriginInteractions } from './use-origin-interactions.js'
import './origin-landing.css'
import { Brand, Icon, ThemeControl } from '../origin/OriginPrimitives.jsx'
import { useOriginTheme } from '../origin/use-origin-theme.js'
import '../origin/origin-themes.css'
import OriginWorkspaceShowcase from './OriginWorkspaceShowcase.jsx'
import { useOriginDocument } from '../origin/use-origin-document.js'

function BranchIllustration() {
  const [stage, setStage] = useState('commit')
  const descriptions = {
    commit: 'Commit · Capture a meaningful step in your work.',
    branch: 'Branch · Explore an idea without changing your main work.',
    merge: 'Merge · Bring your changes back together.',
    submit: 'Submit · Share your work for assessment and feedback.',
  }
  return (
    <div
      className="origin-branch-scene origin-touch-surface"
      role="group"
      aria-label="An idea connects to commit, branch, merge, and submit milestones."
    >
      <span className="origin-surface-light" aria-hidden="true" />
      <div className="origin-orbit-grid" />
      <svg
        className="origin-branch-lines"
        viewBox="0 0 640 370"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="origin-line-glow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <linearGradient id="origin-line-blue">
            <stop stopColor="#6386b1" />
            <stop offset=".5" stopColor="#9dd0ff" />
            <stop offset="1" stopColor="#408fff" />
          </linearGradient>
        </defs>
        <g className="origin-line-halo">
          <path d="M80 182h98c87 0 22-100 114-100h160M178 182c80 0 42 64 122 64h186" />
        </g>
        <g stroke="url(#origin-line-blue)" strokeWidth="2.5">
          <path d="M80 182h98c87 0 22-100 114-100h160M178 182c80 0 42 64 122 64h186" />
          <path
            opacity=".45"
            d="M180 182 470 150m-170 96c44 0 38 56 94 56h100"
          />
        </g>
        {[
          [178, 182],
          [241, 89],
          [300, 246],
          [407, 158],
          [394, 302],
        ].map(([cx, cy]) => (
          <g key={cx}>
            <circle className="origin-node-halo" cx={cx} cy={cy} r="10" />
            <circle
              cx={cx}
              cy={cy}
              r="4.5"
              fill="#c4e5ff"
              stroke="#6da9ff"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      <div className="origin-git-chip origin-git-chip--root">
        <Icon name="branch" />
        origin
      </div>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--commit"
        aria-label="Explain commits"
        aria-pressed={stage === 'commit'}
        onClick={() => setStage('commit')}
        onFocus={() => setStage('commit')}
        onMouseEnter={() => setStage('commit')}
      >
        <Icon name="commit" />
        <span>commit</span>
        <small>a1b2c3d</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--branch"
        aria-label="Explain branches"
        aria-pressed={stage === 'branch'}
        onClick={() => setStage('branch')}
        onFocus={() => setStage('branch')}
        onMouseEnter={() => setStage('branch')}
      >
        <Icon name="branch" />
        <span>branch</span>
        <small>feature/java</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--merge"
        aria-label="Explain merging"
        aria-pressed={stage === 'merge'}
        onClick={() => setStage('merge')}
        onFocus={() => setStage('merge')}
        onMouseEnter={() => setStage('merge')}
      >
        <Icon name="merge" />
        <span>merge</span>
        <small>e4f59a6</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--submit"
        aria-label="Explain submissions"
        aria-pressed={stage === 'submit'}
        onClick={() => setStage('submit')}
        onFocus={() => setStage('submit')}
        onMouseEnter={() => setStage('submit')}
      >
        <Icon name="file" />
        <span>submit</span>
        <span className="origin-check">
          <Icon name="check" />
        </span>
      </button>
      <p className="origin-branch-detail" aria-live="polite">
        {descriptions[stage]}
      </p>
    </div>
  )
}

const commits = [
  {
    branch: 'main',
    message: 'Merge array implementation',
    hash: 'a1b2c3d',
    time: '',
    detail: 'Feature work joins the main branch.',
  },
  {
    branch: 'feature/arrays',
    message: 'Add array implementation',
    hash: 'e4f59a6',
    time: '2m ago',
    detail: 'A focused change adds the array implementation.',
  },
  {
    branch: 'feature/loops',
    message: 'Improve loop logic',
    hash: '17b8c91',
    time: '3h ago',
    detail: 'A separate branch makes iteration easier to inspect.',
  },
  {
    branch: 'lesson-3',
    message: 'Initial commit',
    hash: 'd0a102b',
    time: '1d ago',
    detail: 'An initial commit gives the repository a starting point.',
  },
]

function ProgressIllustration() {
  const [selected, setSelected] = useState(1)
  return (
    <div
      className="origin-progress-art"
      role="group"
      aria-label="Illustrative Git history showing main, feature/arrays, feature/loops, and lesson-3 branches."
    >
      <svg
        viewBox="0 0 640 460"
        className="origin-progress-lines"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="#a1d2ff" strokeWidth="2">
          <path d="M24 145h50c36 0 0 190 38 190h90M74 145h90M74 145c0-49 20-55 90-55M74 145c0 85 20 85 90 85" />
        </g>
        {[
          [74, 145],
          [112, 335],
          [120, 230],
          [120, 90],
        ].map(([cx, cy]) => (
          <circle key={cy} cx={cx} cy={cy} r="5" fill="#c7e9ff" />
        ))}
      </svg>
      <div className="origin-commit-stack">
        {commits.map((commit, index) => (
          <button
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            key={commit.branch}
            className={`origin-commit-card ${index === selected ? 'origin-commit-card--active' : ''}`}
          >
            <span className="origin-commit-icon">
              <Icon name="people" />
            </span>
            <div>
              <strong>{commit.branch}</strong>
              <p>{commit.message}</p>
            </div>
            <code>{commit.hash}</code>
            {commit.time && (
              <span className="origin-commit-person">
                <span className="origin-demo-avatar">
                  {['', 'A', 'J', 'M'][index]}
                </span>
                <small>{commit.time}</small>
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="origin-progress-caption" aria-live="polite">
        <span>Demo history</span>
        {commits[selected].detail}
      </p>
    </div>
  )
}

function RoleArt({ instructor }) {
  return instructor ? (
    <div
      className="origin-role-art origin-role-art--instructor"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="origin-role-sheet">
          <span />
          <span />
          <span />
          <i />
        </div>
      ))}
    </div>
  ) : (
    <div
      className="origin-role-art origin-role-art--student"
      aria-hidden="true"
    />
  )
}

export default function OriginLandingPage() {
  const [activeTab, setActiveTab] = useState('programming')
  const { theme, toggleTheme } = useOriginTheme()
  const overviewRef = useRef(null)
  const overviewTriggerRef = useRef(null)
  const landingRef = useRef(null)
  useOriginInteractions(landingRef)

  useOriginDocument('Origin — Every idea starts somewhere.')

  function exploreRepositories() {
    setActiveTab('repositories')
  }

  return (
    <div ref={landingRef} className="origin-landing" data-theme={theme}>
      <a className="origin-skip-link" href="#origin-main">
        Skip to content
      </a>
      <div className="origin-hero-region">
        <header className="origin-header origin-container">
          <Link to="/" aria-label="Origin home">
            <Brand />
          </Link>
          <nav aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#students">For Students</a>
            <a href="#instructors">For Instructors</a>
          </nav>
          <div className="origin-header-actions">
            <ThemeControl theme={theme} onToggle={toggleTheme} />
            <a className="origin-sign-in" href="#builders">
              Sign in
            </a>
            <a className="origin-button origin-button--small" href="#builders">
              Get started <Icon name="arrow" />
            </a>
          </div>
        </header>
        <main id="origin-main" tabIndex={-1}>
          <section
            className="origin-hero origin-container"
            aria-labelledby="origin-hero-title"
          >
            <div className="origin-hero-copy">
              <p className="origin-eyebrow">A new space for programming</p>
              <h1 id="origin-hero-title">
                Every idea
                <br />
                starts somewhere.
              </h1>
              <p className="origin-hero-description">
                A unified workspace for programming,
                <br className="origin-desktop-break" /> repositories, and
                assessment.
              </p>
              <div className="origin-hero-actions">
                <a className="origin-button" href="#builders">
                  Get started <Icon name="arrow" />
                </a>
                <button
                  className="origin-overview-button"
                  ref={overviewTriggerRef}
                  type="button"
                  onClick={() => overviewRef.current?.showModal()}
                >
                  <span>
                    <Icon name="play" />
                  </span>
                  View overview
                </button>
              </div>
              <div className="origin-classroom-note">
                <div className="origin-avatar-cluster" aria-hidden="true">
                  <span>A</span>
                  <span>J</span>
                  <span>M</span>
                  <span>K</span>
                </div>
                <p>
                  Built for modern classrooms
                  <small>Students. Instructors. Real progress.</small>
                </p>
              </div>
            </div>
            <BranchIllustration />
          </section>
          <OriginWorkspaceShowcase
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <section
            className="origin-progress"
            aria-labelledby="origin-progress-title"
          >
            <div className="origin-container origin-progress-inner">
              <div className="origin-progress-copy">
                <p className="origin-eyebrow">Built on progress</p>
                <h2 id="origin-progress-title">
                  From commits
                  <br />
                  to real growth.
                </h2>
                <p>
                  Track your progress through a modern Git-based repository
                  system. Every commit brings you closer to mastery.
                </p>
                <a
                  className="origin-button origin-button--glass"
                  href="#features"
                  onClick={exploreRepositories}
                >
                  Explore repositories <Icon name="arrow" />
                </a>
              </div>
              <ProgressIllustration />
            </div>
          </section>
          <section
            className="origin-builders origin-container"
            id="builders"
            aria-labelledby="origin-builders-title"
          >
            <div className="origin-section-heading">
              <p className="origin-eyebrow">For every builder</p>
              <h2 id="origin-builders-title">
                Same platform. Different perspectives.
              </h2>
              <p>
                Whether you’re learning or teaching, Origin gives you the tools
                to go further.
              </p>
            </div>
            <div className="origin-role-grid">
              {[
                {
                  id: 'students',
                  title: 'For Students',
                  icon: 'cap',
                  description:
                    'Build, experiment, and showcase your work. Track your progress and improve through real feedback.',
                  to: '/student-login',
                },
                {
                  id: 'instructors',
                  title: 'For Instructors',
                  icon: 'people',
                  description:
                    'Create assignments, review submissions, and track student progress with ease.',
                  to: '/instructor-login',
                },
              ].map((role) => (
                <Link
                  className="origin-role-card origin-touch-surface"
                  key={role.id}
                  id={role.id}
                  to={role.to}
                >
                  <span className="origin-surface-light" aria-hidden="true" />
                  <RoleArt instructor={role.id === 'instructors'} />
                  <span className="origin-role-icon">
                    <Icon name={role.icon} />
                  </span>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                  <span className="origin-role-arrow">
                    <Icon name="arrow" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <footer className="origin-footer">
        <div className="origin-container">
          <Link to="/" aria-label="Origin home">
            <Brand />
          </Link>
          <p>Built for SLU’s Computing and IT students.</p>
          <nav aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#students">For Students</a>
            <a href="#instructors">For Instructors</a>
          </nav>
          <ThemeControl theme={theme} onToggle={toggleTheme} />
        </div>
      </footer>
      <dialog
        className="origin-overview-dialog"
        ref={overviewRef}
        aria-labelledby="origin-overview-title"
        onClose={() => overviewTriggerRef.current?.focus()}
      >
        <button
          className="origin-dialog-close"
          aria-label="Close overview"
          type="button"
          onClick={() => overviewRef.current?.close()}
        >
          <Icon name="close" />
        </button>
        <Brand />
        <p className="origin-eyebrow">A quick look</p>
        <h2 id="origin-overview-title">One idea. Room to grow.</h2>
        <p>
          Origin brings your academic programming work into one connected
          workspace.
        </p>
        <ol>
          <li>
            <Icon name="code" />
            <div>
              <h3>Write and experiment</h3>
              <p>
                Work on Java programming activities and inspect execution
                results.
              </p>
            </div>
          </li>
          <li>
            <Icon name="branch" />
            <div>
              <h3>Build a history</h3>
              <p>
                Manage repository files and branches, and follow your
                contributions.
              </p>
            </div>
          </li>
          <li>
            <Icon name="chart" />
            <div>
              <h3>Learn from feedback</h3>
              <p>
                Submit your work and review available assessment results and
                instructor feedback.
              </p>
            </div>
          </li>
        </ol>
        <a
          className="origin-button"
          href="#builders"
          onClick={() => overviewRef.current?.close()}
        >
          Find your workspace <Icon name="arrow" />
        </a>
      </dialog>
    </div>
  )
}
