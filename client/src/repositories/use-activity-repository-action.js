import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.js'
import { ApiError } from '../api/api-client.js'
import { classHref } from '../classes/class-links.js'
import { useCapabilities } from '../capabilities/capability-context.js'
import useBoundedPolling from '../submissions/use-bounded-polling.js'
import { isProvisioning } from './repository-projections.js'
import { activityRepositoryProjection, ensureActivityRepository } from './ensure-activity-repository.js'

export function useActivityRepositoryAction({ activity, classId, api }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const controller = useRef(null)
  const capabilities = useCapabilities()
  const generation = useRef(0)
  const lock = useRef(false)
  const target = useRef(null)
  const [state, setState] = useState({ busy: false, polling: false, stopped: false, error: null })
  useEffect(() => () => { generation.current += 1; lock.current = false; controller.current?.abort() }, [activity.id, api, classId, user?.id])
  const accept = (repository) => {
    if (repository.storageStatus === 'READY') {
      setState({ busy: false, polling: false, stopped: false, error: null }); lock.current = false
      navigate(classHref(target.current === 'workspace' ? `/student/activity/${activity.id}/workspace` : `/student/repositories/${repository.id}`, classId))
      return false
    }
    if (!isProvisioning(repository.storageStatus)) throw new ApiError({ code: 'REPOSITORY_UNAVAILABLE', status: 503 })
    setState({ busy: true, polling: true, stopped: false, error: null })
    return true
  }
  const fail = (error) => { lock.current = false; setState({ busy: false, polling: false, stopped: false, error }) }
  const start = async (destination) => {
    if (lock.current) return
    lock.current = true; target.current = destination
    controller.current?.abort()
    controller.current = new AbortController()
    const request = ++generation.current
    setState({ busy: true, polling: false, stopped: false, error: null })
    try {
      const repository = await ensureActivityRepository(api, activity, capabilities.git.provisioning, user?.id, { signal: controller.current.signal })
      if (request === generation.current) accept(repository)
    } catch (error) { if (request === generation.current) fail(error) }
  }
  useBoundedPolling({
    identity: `${classId}:${activity.id}`,
    active: state.polling,
    load: (_identity, options) => api.getActivityWorkspace(activity.id, options),
    onData: (response) => accept(activityRepositoryProjection(response.data, activity, user?.id)),
    onError: fail,
    onBoundedStop: () => { lock.current = false; setState({ busy: false, polling: false, stopped: true, error: null }) },
  })
  return { ...state, start, retry: () => start(target.current) }
}
