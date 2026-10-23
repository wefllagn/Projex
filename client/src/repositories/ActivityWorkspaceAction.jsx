import { describeApiError } from '../api/api-client.js'
import { repositoryApi } from './repository-api.js'
import { useActivityRepositoryAction } from './use-activity-repository-action.js'

export function ActivityWorkspaceAction({ activity, classId, api = repositoryApi }) {
  const action = useActivityRepositoryAction({ activity, classId, api })
  return <div className="activity-workspace-action"><button type="button" className="student-primary-action" disabled={action.busy} onClick={() => action.start('workspace')}>{action.busy ? 'Preparing workspace…' : 'Open workspace'}</button>{action.error && <p role="alert" className="activity-action-error">{describeApiError(action.error)}</p>}{(action.error || action.stopped) && <button type="button" className="student-outline-action" onClick={action.retry}>{action.stopped ? 'Check again' : 'Try again'}</button>}</div>
}
