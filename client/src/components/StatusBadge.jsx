function StatusBadge({ label }) {
  const variant = label.toLowerCase().replaceAll(' ', '-')

  return <span className={`status-badge status-badge--${variant}`}>{label}</span>
}

export default StatusBadge
