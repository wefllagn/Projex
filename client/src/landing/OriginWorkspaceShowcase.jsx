import { useCallback, useEffect, useRef, useState } from 'react'
import { Brand, Icon } from '../origin/OriginPrimitives.jsx'
import './origin-showcase.css'

const experiences = [
  { id: 'programming', label: 'Programming', icon: 'code' },
  { id: 'repositories', label: 'Repositories', icon: 'branch' },
  { id: 'assessment', label: 'Assessment', icon: 'chart' },
]

const javaSource = (name) => `public class Main {
  public static void main(String[] args) {
    String name = ${JSON.stringify(name)};
    System.out.println("Hello, " + name + "!");
  }
}`

const repositoryFiles = {
  'Main.java': javaSource('Origin'),
  'src/ArraysDemo.java':
    'import java.util.Arrays;\n\npublic class ArraysDemo {\n  public static void main(String[] args) {\n    int[] values = { 3, 1, 2 };\n    Arrays.sort(values);\n    System.out.println(Arrays.toString(values));\n  }\n}',
  'README.md':
    '# Programming fundamentals\n\nA demonstration repository for Java activities.\n\n## Getting started\nCompile Main.java, then run Main.\n\n## Focus\nSmall changes. Clear commits. Steady progress.',
}

const demoHistory = [
  {
    hash: 'e4f59a6',
    message: 'Add array implementation',
    author: 'Frank Ocean',
    file: 'src/ArraysDemo.java',
    detail: 'Add a sorting example using java.util.Arrays.',
    branch: 'feature/arrays',
  },
  {
    hash: '17b8c91',
    message: 'Improve loop logic',
    author: 'Sam Chen',
    file: 'Main.java',
    detail: 'Keep iteration logic clear and easy to inspect.',
    branch: 'main',
  },
  {
    hash: 'd0a102b',
    message: 'Add project introduction',
    author: 'Frank Ocean',
    file: 'README.md',
    detail: 'Document how to compile and run the example.',
    branch: 'main',
  },
]

const demoSubmissions = [
  {
    id: 'alex',
    name: 'Frank Ocean',
    initials: 'FO',
    status: 'Ready for review',
    passed: 3,
    time: '10:42 AM',
    feedback: 'Clear structure. Keep building on your solution.',
  },
  {
    id: 'sam',
    name: 'Sam Chen',
    initials: 'SC',
    status: 'Needs attention',
    passed: 2,
    time: '10:38 AM',
    feedback: 'Check how your solution handles an empty array.',
  },
  {
    id: 'jordan',
    name: 'Jordan Lee',
    initials: 'JL',
    status: 'Reviewed',
    passed: 3,
    time: '10:31 AM',
    feedback: 'Good use of boundary checks.',
  },
]

function CodeLines({ source }) {
  return (
    <ol className="origin-demo-code">
      {source.split('\n').map((line, index) => (
        <li key={index}>
          <code>
            {line
              .split(
                /("(?:\\.|[^"\\])*"|\b(?:public|class|static|void|String|int|import)\b)/g,
              )
              .map((token, part) => (
                <span
                  key={part}
                  className={
                    token.startsWith('"')
                      ? 'origin-demo-token-string'
                      : /^(public|class|static|void|String|int|import)$/.test(
                            token,
                          )
                        ? 'origin-demo-token-keyword'
                        : undefined
                  }
                >
                  {token || (line ? '' : ' ')}
                </span>
              ))}
          </code>
        </li>
      ))}
    </ol>
  )
}

function ProgrammingDemo({ program, setProgram, onManual }) {
  const complete = program.status === 'complete'
  const running = program.status === 'running'
  return (
    <div className="origin-program-demo">
      <div className="origin-demo-editor">
        <div className="origin-demo-filebar">
          <Icon name="code" />
          <span>Main.java</span>
          <span>Java</span>
        </div>
        <CodeLines source={javaSource(program.name)} />
        <div className="origin-demo-input-row">
          <label htmlFor="origin-demo-name">Greeting name</label>
          <input
            id="origin-demo-name"
            value={program.name}
            maxLength={24}
            disabled={running}
            onChange={(event) => {
              onManual()
              setProgram({
                ...program,
                name: event.target.value,
                status: 'idle',
                output: '',
              })
            }}
          />
          <button
            className="origin-demo-primary"
            type="button"
            disabled={running}
            onClick={() => {
              onManual()
              setProgram({ ...program, status: 'running', output: '' })
            }}
          >
            <Icon name="play" />
            {running ? 'Running…' : 'Run demo'}
          </button>
        </div>
      </div>
      <div className="origin-demo-terminal">
        <div className="origin-demo-filebar">
          <span>Output</span>
          <span>Local demonstration</span>
        </div>
        <div className="origin-demo-console" aria-live="polite">
          {running ? (
            <p className="origin-demo-running">Running the example…</p>
          ) : complete ? (
            <>
              <span className="origin-demo-console-label">stdout</span>
              <pre>{program.output}</pre>
              <p className="origin-demo-success">
                <Icon name="check" />
                Execution completed
              </p>
            </>
          ) : (
            <>
              <span className="origin-demo-console-label">
                Ready when you are
              </span>
              <p>
                Change the greeting name,
                <br />
                then run the example.
              </p>
            </>
          )}
        </div>
        <div className="origin-demo-checks">
          <div>
            <strong>Visible test cases</strong>
            <span>{complete ? '2 / 2 passed' : 'Not run'}</span>
          </div>
          {['Prints the greeting', 'Completes successfully'].map((label) => (
            <p key={label}>
              <span
                className={
                  complete
                    ? 'origin-demo-test-dot is-passed'
                    : 'origin-demo-test-dot'
                }
              >
                {complete ? '✓' : '−'}
              </span>
              {label}
              <small>{complete ? 'Passed' : 'Waiting'}</small>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function RepositoryDemo({ repo, setRepo, onManual }) {
  function update(next) {
    onManual()
    setRepo({ ...repo, ...next })
  }
  const selectedCommit = demoHistory.find((entry) => entry.hash === repo.commit)
  const history =
    repo.branch === 'main'
      ? demoHistory.filter((entry) => entry.branch === 'main')
      : demoHistory
  return (
    <div className="origin-repository-demo">
      <div className="origin-demo-repo-heading">
        <div>
          <Icon name="branch" />
          <strong>programming-fundamentals</strong>
        </div>
        <select
          aria-label="Demo branch"
          value={repo.branch}
          onChange={(event) =>
            update({
              branch: event.target.value,
              file:
                event.target.value === 'main' &&
                repo.file === 'src/ArraysDemo.java'
                  ? 'Main.java'
                  : repo.file,
              commit: event.target.value === 'main' ? '17b8c91' : 'e4f59a6',
            })
          }
        >
          <option value="main">main</option>
          <option value="feature/arrays">feature/arrays</option>
        </select>
      </div>
      <div className="origin-demo-inner-switch" aria-label="Repository view">
        <button
          type="button"
          aria-pressed={repo.view === 'files'}
          onClick={() => update({ view: 'files' })}
        >
          <Icon name="file" />
          Files
        </button>
        <button
          type="button"
          aria-pressed={repo.view === 'history'}
          onClick={() => update({ view: 'history' })}
        >
          <Icon name="commit" />
          History
        </button>
      </div>
      {repo.view === 'files' ? (
        <div className="origin-repo-file-layout">
          <nav aria-label="Demo repository files">
            {Object.keys(repositoryFiles)
              .filter(
                (file) =>
                  repo.branch !== 'main' || file !== 'src/ArraysDemo.java',
              )
              .map((file) => (
                <button
                  type="button"
                  key={file}
                  aria-pressed={repo.file === file}
                  onClick={() => update({ file })}
                >
                  <Icon name="file" />
                  <span>{file}</span>
                </button>
              ))}
          </nav>
          <div className="origin-repo-file-content">
            <div className="origin-demo-filebar">
              <span>{repo.file}</span>
              <span>Read-only demo</span>
            </div>
            <CodeLines source={repositoryFiles[repo.file]} />
          </div>
        </div>
      ) : (
        <div className="origin-repo-history-layout">
          <div className="origin-demo-history-list">
            {history.map((entry) => (
              <button
                type="button"
                key={entry.hash}
                aria-pressed={repo.commit === entry.hash}
                onClick={() => update({ commit: entry.hash })}
              >
                <span className="origin-history-node" />
                <span>
                  <strong>{entry.message}</strong>
                  <small>{entry.author}</small>
                </span>
                <code>{entry.hash}</code>
              </button>
            ))}
          </div>
          <div className="origin-demo-commit-detail" aria-live="polite">
            <Icon name="commit" />
            <h3>{selectedCommit.message}</h3>
            <p>{selectedCommit.detail}</p>
            <dl>
              <div>
                <dt>Commit</dt>
                <dd>{selectedCommit.hash}</dd>
              </div>
              <div>
                <dt>Changed file</dt>
                <dd>{selectedCommit.file}</dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>{selectedCommit.author}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

function AssessmentDemo({ assessment, setAssessment, onManual }) {
  const submission = demoSubmissions.find(
    (item) => item.id === assessment.student,
  )
  const feedback = assessment.feedback[submission.id] ?? submission.feedback
  function update(next) {
    onManual()
    setAssessment({ ...assessment, ...next })
  }
  return (
    <div className="origin-assessment-demo">
      <div className="origin-demo-repo-heading">
        <div>
          <Icon name="chart" />
          <strong>Array fundamentals</strong>
        </div>
        <span>3 submissions · demonstration</span>
      </div>
      <div className="origin-assessment-layout">
        <nav className="origin-demo-submissions" aria-label="Demo submissions">
          {demoSubmissions.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={item.id === submission.id}
              onClick={() => update({ student: item.id, saved: false })}
            >
              <span className="origin-demo-avatar">{item.initials}</span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {assessment.reviewed.includes(item.id)
                    ? 'Reviewed'
                    : item.status}
                </small>
              </span>
              <span>{item.passed}/3</span>
            </button>
          ))}
        </nav>
        <div className="origin-demo-review">
          <div className="origin-demo-review-heading">
            <div>
              <h3>{submission.name}</h3>
              <p>Submitted at {submission.time}</p>
            </div>
            <span className="origin-demo-review-status">
              {assessment.reviewed.includes(submission.id)
                ? 'Reviewed'
                : submission.status}
            </span>
          </div>
          <div
            className="origin-demo-inner-switch"
            aria-label="Assessment view"
          >
            <button
              type="button"
              aria-pressed={assessment.view === 'results'}
              onClick={() => update({ view: 'results' })}
            >
              Test results
            </button>
            <button
              type="button"
              aria-pressed={assessment.view === 'feedback'}
              onClick={() => update({ view: 'feedback' })}
            >
              Feedback
            </button>
          </div>
          {assessment.view === 'results' ? (
            <div className="origin-demo-review-results">
              <p>
                Automated checking{' '}
                <strong>{submission.passed} / 3 passed</strong>
              </p>
              {['Standard input', 'Empty array', 'Boundary values'].map(
                (label, index) => (
                  <div key={label}>
                    <span
                      className={`origin-demo-test-dot ${submission.passed === 3 || index !== 1 ? 'is-passed' : 'is-failed'}`}
                    >
                      {submission.passed === 3 || index !== 1 ? '✓' : '!'}
                    </span>
                    <span>{label}</span>
                    <small>
                      {submission.passed === 3 || index !== 1
                        ? 'Passed'
                        : 'Needs attention'}
                    </small>
                  </div>
                ),
              )}
              <p className="origin-demo-review-note">
                Test results support the instructor’s review. They are not a
                final grade.
              </p>
            </div>
          ) : (
            <div className="origin-demo-feedback-editor">
              <label htmlFor="origin-demo-feedback">Instructor feedback</label>
              <textarea
                id="origin-demo-feedback"
                value={feedback}
                onChange={(event) =>
                  update({
                    feedback: {
                      ...assessment.feedback,
                      [submission.id]: event.target.value,
                    },
                    saved: false,
                  })
                }
              />
              <button
                className="origin-demo-primary"
                type="button"
                onClick={() =>
                  update({
                    saved: true,
                    reviewed: [
                      ...new Set([...assessment.reviewed, submission.id]),
                    ],
                  })
                }
              >
                Save demo feedback
                <Icon name="check" />
              </button>
              <p role="status">
                {assessment.saved
                  ? 'Feedback saved in this demo.'
                  : 'Changes stay in this demonstration.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OriginWorkspaceShowcase({ activeTab, setActiveTab }) {
  const tabRefs = useRef([])
  const playbackRef = useRef(null)
  const explored = useRef(new Set())
  const [program, setProgram] = useState({
    name: 'Origin',
    status: 'idle',
    output: '',
  })
  const [repo, setRepo] = useState({
    file: 'Main.java',
    view: 'files',
    branch: 'feature/arrays',
    commit: 'e4f59a6',
  })
  const [assessment, setAssessment] = useState({
    student: 'alex',
    view: 'results',
    feedback: {},
    saved: false,
    reviewed: ['jordan'],
  })
  const [playback, setPlayback] = useState(null)
  const playing = playback?.tab === activeTab

  const stopWalkthrough = useCallback(() => {
    explored.current.add(activeTab)
    setPlayback(null)
  }, [activeTab])

  const startWalkthrough = useCallback(() => {
    explored.current.add(activeTab)
    if (activeTab === 'programming') {
      setProgram((current) => ({ ...current, status: 'idle', output: '' }))
    } else if (activeTab === 'repositories') {
      setRepo((current) => ({
        ...current,
        view: 'files',
        file: 'Main.java',
        branch: 'feature/arrays',
      }))
    } else {
      setAssessment((current) => ({
        ...current,
        view: 'results',
        saved: false,
      }))
    }
    setPlayback({ tab: activeTab, step: 0 })
  }, [activeTab])

  useEffect(() => {
    if (!window.IntersectionObserver) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setPlayback(null)
        } else if (
          entry.intersectionRatio >= 0.99 &&
          !document.hidden &&
          !reducedMotion.matches &&
          !explored.current.has(activeTab)
        ) {
          startWalkthrough()
        }
      },
      { threshold: 1 },
    )
    observer.observe(playbackRef.current)
    function stopWhenHidden() {
      if (document.hidden || reducedMotion.matches) setPlayback(null)
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    reducedMotion.addEventListener('change', stopWhenHidden)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', stopWhenHidden)
      reducedMotion.removeEventListener('change', stopWhenHidden)
    }
  }, [activeTab, startWalkthrough])

  useEffect(() => {
    if (program.status !== 'running') return
    const timer = setTimeout(() => {
      setProgram((current) => ({
        ...current,
        status: 'complete',
        output: `Hello, ${current.name}!`,
      }))
    }, 650)
    return () => clearTimeout(timer)
  }, [program.status])

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      const step = playback.step
      if (activeTab === 'programming' && step === 0) {
        setProgram((current) => ({
          ...current,
          status: 'running',
          output: '',
        }))
      } else if (activeTab === 'repositories') {
        setRepo((current) =>
          step === 0
            ? { ...current, file: 'src/ArraysDemo.java' }
            : { ...current, view: 'history', commit: 'e4f59a6' },
        )
      } else if (activeTab === 'assessment') {
        setAssessment((current) =>
          step === 0
            ? { ...current, view: 'feedback' }
            : {
                ...current,
                saved: true,
                reviewed: [...new Set([...current.reviewed, current.student])],
              },
        )
      }
      setPlayback(step < 1 ? { tab: activeTab, step: step + 1 } : null)
    }, 1600)
    return () => clearTimeout(timer)
  }, [playing, playback, activeTab])

  function selectTab(id) {
    stopWalkthrough()
    setActiveTab(id)
  }
  function handleTabKey(event, index) {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % 3
        : event.key === 'ArrowLeft'
          ? (index + 2) % 3
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 2
              : null
    if (next !== null) {
      event.preventDefault()
      selectTab(experiences[next].id)
      tabRefs.current[next]?.focus()
    }
  }
  function walkthrough() {
    if (playing) stopWalkthrough()
    else startWalkthrough()
  }

  return (
    <section
      className="origin-workspace origin-workspace--interactive"
      id="features"
      aria-labelledby="origin-workspace-title"
    >
      <div className="origin-section-heading">
        <p className="origin-eyebrow">The workspace</p>
        <h2 id="origin-workspace-title">Everything you need, in one place.</h2>
        <p>
          Write code, manage repositories, and get assessed in one focused
          workspace.
        </p>
      </div>
      <div
        className="origin-workspace-tabs"
        role="tablist"
        aria-label="Explore the workspace"
      >
        <span
          className="origin-tab-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${experiences.findIndex((tab) => tab.id === activeTab) * 100}%)`,
          }}
        />
        {experiences.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            id={`origin-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`origin-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="origin-showcase-window origin-touch-surface">
        <span className="origin-surface-light" aria-hidden="true" />
        <div className="origin-showcase-titlebar">
          <div className="origin-showcase-traffic" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>Origin Workspace</span>
          <span className="origin-showcase-demo-badge">Interactive demo</span>
        </div>
        <div className="origin-showcase-body">
          <aside className="origin-showcase-sidebar">
            <Brand compact />
            <span className="origin-showcase-space-label">Your workspace</span>
            <nav aria-label="Demo sections">
              {experiences.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  aria-pressed={activeTab === tab.id}
                  onClick={() => selectTab(tab.id)}
                >
                  <Icon name={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="origin-showcase-demo-user">
              <span className="origin-demo-avatar">{activeTab === 'assessment' ? 'TS' : 'FO'}</span>
              <span>
                {activeTab === 'assessment' ? 'Tony Stark' : 'Frank Ocean'}<small>Demo account</small>
              </span>
            </div>
          </aside>
          <div className="origin-showcase-main">
            <div className="origin-showcase-toolbar" ref={playbackRef}>
              <div>
                <span className="origin-showcase-course">
                  Programming fundamentals
                </span>
                <strong>
                  {experiences.find((tab) => tab.id === activeTab).label}
                </strong>
              </div>
              <button
                className="origin-demo-playback"
                type="button"
                onClick={walkthrough}
              >
                <Icon name="play" />
                {playing ? 'Stop walkthrough' : 'Play walkthrough'}
              </button>
            </div>
            <div
              className="origin-showcase-content"
              key={activeTab}
              role="tabpanel"
              id={`origin-panel-${activeTab}`}
              aria-labelledby={`origin-tab-${activeTab}`}
              tabIndex={0}
              onFocusCapture={stopWalkthrough}
            >
              {activeTab === 'programming' ? (
                <ProgrammingDemo
                  program={program}
                  setProgram={setProgram}
                  onManual={stopWalkthrough}
                />
              ) : activeTab === 'repositories' ? (
                <RepositoryDemo
                  repo={repo}
                  setRepo={setRepo}
                  onManual={stopWalkthrough}
                />
              ) : (
                <AssessmentDemo
                  assessment={assessment}
                  setAssessment={setAssessment}
                  onManual={stopWalkthrough}
                />
              )}
            </div>
            <div className="origin-showcase-statusbar">
              <span>
                <i />
                {activeTab === 'programming' && program.status === 'running'
                  ? 'Running demonstration'
                  : 'A place to focus'}
              </span>
              <span>
                {activeTab === 'programming'
                  ? 'Write → Run → Results'
                  : activeTab === 'repositories'
                    ? 'Files → Changes → History'
                    : 'Results → Feedback → Review'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
