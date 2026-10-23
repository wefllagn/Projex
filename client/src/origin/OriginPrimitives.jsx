export function Icon({ name, className = '' }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    code: (
      <>
        <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14" />
      </>
    ),
    branch: (
      <>
        <circle cx="7" cy="5" r="2" />
        <circle cx="17" cy="5" r="2" />
        <circle cx="7" cy="19" r="2" />
        <path d="M7 7v10m10-10c0 6-10 3-10 9" />
      </>
    ),
    commit: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M2 12h6m8 0h6" />
      </>
    ),
    merge: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="19" r="2" />
        <circle cx="6" cy="19" r="2" />
        <path d="M6 7v10m0-9c0 5 12 3 12 9" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chart: (
      <>
        <path d="M4 20V11m6 9V4m6 16V8m5 12H2" />
      </>
    ),
    cap: (
      <>
        <path d="m2 9 10-5 10 5-10 5L2 9Zm4 3v6c4 3 8 3 12 0v-6m4-3v8" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-3a6 6 0 0 1 12 0v3H3Z" />
        <path d="M17 5a3 3 0 0 1 0 6m1 3c3 0 4 2 4 5v1h-4" />
      </>
    ),
    home: <path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z" />,
    file: (
      <>
        <path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7V5Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  }
  return (
    <svg
      className={`origin-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.code}
    </svg>
  )
}

export function Brand({ compact = false }) {
  return (
    <span className={`origin-brand ${compact ? 'origin-brand--compact' : ''}`}>
      <span className="origin-brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>Origin</span>
    </span>
  )
}

export function ThemeControl({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="origin-atmosphere"
      onClick={onToggle}
      aria-label="Light appearance"
      aria-pressed={theme === 'light'}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`}
    >
      <span className="origin-theme-thumb" aria-hidden="true" />
      <Icon name="sun" className={theme === 'light' ? 'is-active' : ''} />
      <Icon name="moon" className={theme === 'dark' ? 'is-active' : ''} />
    </button>
  )
}
