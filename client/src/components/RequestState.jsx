import { describeApiError } from '../api/api-client.js'

const stateCopy = {
  loading: ['Loading Projex', 'Restoring your secure session.'],
  empty: ['Nothing here yet', 'There are no records to show.'],
  unavailable: ['Temporarily unavailable', 'This Projex service is not available right now.'],
  forbidden: ['Access unavailable', 'Your account cannot access this area.'],
  notFound: ['Not found', 'The requested Projex record could not be found.'],
  conflict: ['Refresh required', 'This record changed while you were working.'],
}

export default function RequestState({
  kind = 'unavailable',
  title,
  message,
  error,
  action,
  compact = false,
}) {
  const fallback = stateCopy[kind] ?? stateCopy.unavailable
  return (
    <section className={compact ? 'request-state request-state--compact' : 'request-state'} role={kind === 'loading' ? 'status' : 'alert'}>
      <p>{title || fallback[0]}</p>
      <h1>{message || (error ? describeApiError(error) : fallback[1])}</h1>
      {error?.requestId && <small>Request ID: {error.requestId}</small>}
      {action}
    </section>
  )
}
