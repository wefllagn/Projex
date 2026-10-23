import '../design/projex-tokens.css'

export function ProjexStatus({ value, children }) {
  const tone = ['READY', 'APPROVED', 'ACTIVE'].includes(value) ? 'success'
    : ['PENDING', 'PROVISIONING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED'].includes(value) ? 'warning'
      : ['FAILED', 'QUARANTINED', 'REMOVED'].includes(value) ? 'danger' : 'neutral'
  return <span className={`projex-status projex-status--${tone}`}>{children || String(value || '').toLowerCase().replaceAll('_', ' ')}</span>
}
