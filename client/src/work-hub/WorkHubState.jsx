import { describeApiError } from '../api/api-client.js'
import ProjexIcon from '../components/icons/ProjexIcon.jsx'

export default function WorkHubState({ kind, message, error, onRetry }) {
  const title = kind === 'error' ? 'Unable to load work' : kind === 'loading' ? 'Loading your work' : 'Nothing to show'
  return <div className={`academic-hub-state is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    <span className="academic-hub-state-icon" aria-hidden="true"><ProjexIcon name={kind === 'error' ? 'bell' : kind === 'loading' ? 'activity' : 'folder'} size={24} /></span>
    <div><strong>{title}</strong><p>{error ? describeApiError(error) : message}</p></div>
    {onRetry && <button type="button" className="student-outline-action" onClick={onRetry}>Try again</button>}
  </div>
}
