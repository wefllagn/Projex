import { useEffect } from 'react'
import AppDialog from './AppDialog.jsx'
import { useOriginTheme } from '../origin/use-origin-theme.js'

export default function RecoveryScreen({ title, message, actions, busy = false }) {
  const { theme } = useOriginTheme()
  useEffect(() => {
    const previous = document.documentElement.dataset.originAppearance
    document.documentElement.dataset.originAppearance = theme
    return () => {
      if (previous) document.documentElement.dataset.originAppearance = previous
      else delete document.documentElement.dataset.originAppearance
    }
  }, [theme])
  return <div className="origin-recovery-shell">
    <span className="origin-recovery-brand" aria-hidden="true">Origin</span>
    <AppDialog title={title} busy={busy} blocking className="origin-recovery-dialog" onClose={() => {}}>
      <p>{message}</p>
      {busy && <p role="status">Checking your account…</p>}
      <footer className="origin-recovery-actions">{actions}</footer>
    </AppDialog>
  </div>
}
