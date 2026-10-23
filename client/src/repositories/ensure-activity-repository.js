import { ApiError } from '../api/api-client.js'
import { repositoryProjection } from './repository-projections.js'

const pending = new WeakMap()
export function activityRepositoryProjection(raw, activity, studentId) {
  const repository = repositoryProjection(raw)
  if (!repository.id || repository.repositoryType !== 'ACTIVITY_WORKSPACE' || repository.activityId !== activity.id || (repository.classId && repository.classId !== activity.classId) || (repository.contextClassId && repository.contextClassId !== activity.classId) || (studentId && repository.owner.userId !== studentId)) {
    throw new ApiError({ status: 502, code: 'INVALID_API_RESPONSE' })
  }
  return repository
}

// Called only by an intentional workspace/repository action, never a page read.
// The server's unique association and transaction remain authoritative across clients.
export function ensureActivityRepository(api, activity, canProvision, studentId, options) {
  let requests = pending.get(api)
  if (!requests) { requests = new Map(); pending.set(api, requests) }
  const key = `${studentId || ''}:${activity.id}`
  if (requests.has(key)) return requests.get(key)
  const request = (async () => {
    try { return activityRepositoryProjection((await api.getActivityWorkspace(activity.id, options)).data, activity, studentId) }
    catch (error) { if (error?.status !== 404) throw error }
    if (options?.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError')
    if (!canProvision || activity.status !== 'PUBLISHED' || activity.dueState !== 'OPEN') {
      throw new ApiError({ status: 403, code: 'REPOSITORY_CREATION_UNAVAILABLE' })
    }
    try { return activityRepositoryProjection((await api.createActivityWorkspace(activity.id)).data, activity, studentId) }
    catch (error) {
      // Another click/client may have won the creation race. Reuse its association.
      if (error?.status !== 409) throw error
      return activityRepositoryProjection((await api.getActivityWorkspace(activity.id, options)).data, activity, studentId)
    }
  })().finally(() => requests.delete(key))
  requests.set(key, request)
  return request
}
