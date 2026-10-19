import RequestState from '../components/RequestState.jsx'
import { describeApiError } from '../api/api-client.js'
import { ProjexIcon } from '../design/ProjexIcon.jsx'

export default function GroupRequestState({ kind = 'unavailable', title, message, error, action, compact = false, resource = 'item' }) {
  if (kind === 'loading' || kind === 'empty') return <RequestState {...{ kind, title, message, error, action, compact }} />
  const status = error?.status
  const missing = status === 404 || kind === 'notFound'
  const forbidden = status === 403 || kind === 'forbidden'
  const server = status >= 500
  const heading = missing ? `We couldn’t find that ${resource}.` : forbidden ? 'Access unavailable' : server ? 'We couldn’t load this right now.' : title || 'This view couldn’t load.'
  const description = missing ? 'It may have moved, or it isn’t available to your account.' : forbidden ? 'You don’t have permission to access this content.' : server ? 'Please try again in a moment.' : error ? describeApiError(error) : message || 'Please try again or return to the previous view.'
  return <section className={`group-request-state${compact ? ' group-request-state--compact' : ''}`} role="alert">
    <span className="group-state-illustration"><ProjexIcon name={resource === 'file' ? 'file' : 'repository'} size={compact ? 18 : 28} /></span>
    <div><h2>{heading}</h2><p>{description}</p>{action && <div className="group-state-recovery">{action}</div>}</div>
  </section>
}
