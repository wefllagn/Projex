import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OriginConnections from './OriginConnections.jsx'
import { useOriginInteractions } from './use-origin-interactions.js'
import './origin-landing.css'
import { Brand, Icon, ThemeControl } from '../origin/OriginPrimitives.jsx'
import { useOriginTheme } from '../origin/use-origin-theme.js'
import '../origin/origin-themes.css'
import OriginWorkspaceShowcase from './OriginWorkspaceShowcase.jsx'
import { useOriginDocument } from '../origin/use-origin-document.js'

function BranchIllustration() {
  const [stage, setStage] = useState('commit')
  const sceneRef = useRef(null)
  return (
    <div
      ref={sceneRef}
      className="origin-branch-scene origin-touch-surface"
      role="group"
      aria-label="An idea connects to commit, branch, merge, and submit milestones."
    >
      <span className="origin-surface-light" aria-hidden="true" />
      <div className="origin-orbit-grid" />
      <OriginConnections sceneRef={sceneRef} kind="hero" />
      <div className="origin-git-chip origin-git-chip--root" data-origin-panel>
        <span
          className="origin-connection-port origin-connection-port--right"
          data-origin-port="root"
          aria-hidden="true"
        />
        <Icon name="branch" />
        Origin
      </div>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--commit"
        data-origin-panel
        aria-label="Highlight commits"
        aria-pressed={stage === 'commit'}
        onClick={() => setStage('commit')}
        onFocus={() => setStage('commit')}
        onMouseEnter={() => setStage('commit')}
      >
        <Icon name="commit" />
        <span
          className="origin-connection-port"
          data-origin-port="commit"
          aria-hidden="true"
        />
        <span>commit</span>
        <small>a1b2c3d</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--branch"
        data-origin-panel
        aria-label="Highlight branches"
        aria-pressed={stage === 'branch'}
        onClick={() => setStage('branch')}
        onFocus={() => setStage('branch')}
        onMouseEnter={() => setStage('branch')}
      >
        <Icon name="branch" />
        <span
          className="origin-connection-port"
          data-origin-port="branch"
          aria-hidden="true"
        />
        <span>branch</span>
        <small>feature/java</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--merge"
        data-origin-panel
        aria-label="Highlight merging"
        aria-pressed={stage === 'merge'}
        onClick={() => setStage('merge')}
        onFocus={() => setStage('merge')}
        onMouseEnter={() => setStage('merge')}
      >
        <Icon name="merge" />
        <span
          className="origin-connection-port"
          data-origin-port="merge"
          aria-hidden="true"
        />
        <span
          className="origin-connection-port origin-connection-port--bottom"
          data-origin-port="merge-out"
          aria-hidden="true"
        />
        <span>merge</span>
        <small>e4f59a6</small>
      </button>
      <button
        type="button"
        className="origin-git-chip origin-git-chip--submit"
        data-origin-panel
        aria-label="Highlight submissions"
        aria-pressed={stage === 'submit'}
        onClick={() => setStage('submit')}
        onFocus={() => setStage('submit')}
        onMouseEnter={() => setStage('submit')}
      >
        <Icon name="file" />
        <span
          className="origin-connection-port"
          data-origin-port="submit"
          aria-hidden="true"
        />
        <span>submit</span>
        <span className="origin-check">
          <Icon name="check" />
        </span>
      </button>
    </div>
  )
}

const commits = [
  {
    branch: 'main',
    message: 'Merge array implementation',
    hash: 'a1b2c3d',
    time: '',
  },
  {
    branch: 'feature/arrays',
    message: 'Add array implementation',
    hash: 'e4f59a6',
    time: '2m ago',
  },
  {
    branch: 'feature/loops',
    message: 'Improve loop logic',
    hash: '17b8c91',
    time: '3h ago',
  },
  {
    branch: 'lesson-3',
    message: 'Initial commit',
    hash: 'd0a102b',
    time: '1d ago',
  },
]

function ProgressIllustration() {
  const [selected, setSelected] = useState(1)
  const sceneRef = useRef(null)
  return (
    <div
      ref={sceneRef}
      className="origin-progress-art"
      role="group"
      aria-label="Illustrative Git history showing main, feature/arrays, feature/loops, and lesson-3 branches."
    >
      <OriginConnections sceneRef={sceneRef} kind="progress" />
      <div className="origin-commit-stack">
        {commits.map((commit, index) => (
          <button
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            key={commit.branch}
            data-origin-panel
            className={`origin-commit-card ${index === selected ? 'origin-commit-card--active' : ''}`}
          >
            <span
              className="origin-connection-port"
              data-origin-port={commit.branch}
              aria-hidden="true"
            />
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
                <a className="origin-overview-button" href="#features">
                  <span>
                    <Icon name="play" />
                  </span>
                  View overview
                </a>
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
            id="progress"
            aria-labelledby="origin-progress-title"
          >
            <div className="origin-container origin-progress-inner">
              <div className="origin-progress-copy">
                <p className="origin-eyebrow">Built on progress</p>
                <h2 id="origin-progress-title">
                  <span
                    className="origin-progress-title-line"
                    data-origin-bridge
                  >
                    From commits
                  </span>
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
          <nav aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#students">For Students</a>
            <a href="#instructors">For Instructors</a>
          </nav>
          <ThemeControl theme={theme} onToggle={toggleTheme} />
        </div>
      </footer>
    </div>
  )
}
