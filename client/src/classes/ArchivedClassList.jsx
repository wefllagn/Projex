import ClassCardGrid from './ClassCardGrid.jsx'
import { useClasses } from './class-context.js'
import useClassCatalog from './useClassCatalog.js'
import RequestState from '../components/RequestState.jsx'

export default function ArchivedClassList({ role }) {
  const { api } = useClasses()
  const { classes, status, error, pagination, refreshClasses, loadMore } = useClassCatalog(api, 'ARCHIVED')

  return (
    <>
      {status === 'loading' && <RequestState kind="loading" compact message="Loading your archived classes." />}
      {status === 'error' && (
        <RequestState kind="unavailable" compact error={error} action={
          <button type="button" className="student-outline-action" onClick={pagination?.hasNextPage ? loadMore : refreshClasses}>Retry</button>
        } />
      )}
      {status === 'ready' && classes.length === 0 && (
        <RequestState kind="empty" compact message="You have no archived classes." />
      )}
      {classes.length > 0 && <ClassCardGrid classes={classes} role={role} />}
      {status === 'ready' && pagination?.hasNextPage && (
        <button type="button" className="student-outline-action class-load-more" onClick={loadMore}>Load more classes</button>
      )}
    </>
  )
}
