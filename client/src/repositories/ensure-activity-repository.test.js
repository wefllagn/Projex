import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api-client.js'
import { ensureActivityRepository } from './ensure-activity-repository.js'
const activity = { id: 'activity', classId: 'class', status: 'PUBLISHED', dueState: 'OPEN' }
const repository = { id: 'repo', repositoryType: 'ACTIVITY_WORKSPACE', activityId: activity.id, classId: null, owner: { userId: 'student', fullName: 'Student' }, defaultBranch: 'main', storageStatus: 'READY' }
const missing = () => new ApiError({ status: 404 })
describe('intentional Activity repository ensure', () => {
  it('shares concurrent requests and provisions once after an absent association', async () => {
    let resolve
    const api = { getActivityWorkspace: vi.fn(() => new Promise((_resolve, reject) => { resolve = reject })), createActivityWorkspace: vi.fn().mockResolvedValue({ data: repository }) }
    const first = ensureActivityRepository(api, activity, true)
    const second = ensureActivityRepository(api, activity, true)
    expect(first).toBe(second)
    resolve(missing())
    expect((await first).id).toBe(repository.id)
    expect(api.createActivityWorkspace).toHaveBeenCalledExactlyOnceWith(activity.id)
  })
  it('reuses the winner of a server creation race', async () => {
    const api = { getActivityWorkspace: vi.fn().mockRejectedValueOnce(missing()).mockResolvedValue({ data: repository }), createActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status: 409 })) }
    expect((await ensureActivityRepository(api, activity, true)).id).toBe(repository.id)
    expect(api.getActivityWorkspace).toHaveBeenCalledTimes(2)
    expect(api.createActivityWorkspace).toHaveBeenCalledTimes(1)
  })
  it('rechecks association after an ambiguous failed POST, without replaying a creation', async () => {
    const api = { getActivityWorkspace: vi.fn().mockRejectedValueOnce(missing()).mockResolvedValue({ data: repository }), createActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR' })) }
    await expect(ensureActivityRepository(api, activity, true)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect((await ensureActivityRepository(api, activity, true)).id).toBe(repository.id)
    expect(api.createActivityWorkspace).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 500])('never creates after a GET failure %s', async (status) => {
    const api = { getActivityWorkspace: vi.fn().mockRejectedValue(new ApiError({ status })), createActivityWorkspace: vi.fn() }
    await expect(ensureActivityRepository(api, activity, true)).rejects.toMatchObject({ status })
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })
  it.each([[false, 'PUBLISHED', 'OPEN'], [true, 'CLOSED', 'CLOSED'], [true, 'DRAFT', 'OPEN']])('preserves creation policy for provisioning=%s, status=%s', async (enabled, status, dueState) => {
    const api = { getActivityWorkspace: vi.fn().mockRejectedValue(missing()), createActivityWorkspace: vi.fn() }
    await expect(ensureActivityRepository(api, { ...activity, status, dueState }, enabled)).rejects.toMatchObject({ code: 'REPOSITORY_CREATION_UNAVAILABLE' })
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })
  it('reuses existing closed repositories even when creation is disabled', async () => {
    const api = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: repository }), createActivityWorkspace: vi.fn() }
    expect((await ensureActivityRepository(api, { ...activity, status: 'CLOSED' }, false)).id).toBe(repository.id)
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })
  it('rejects cross-class associations', async () => {
    const api = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: { ...repository, classId: 'wrong-class' } }), createActivityWorkspace: vi.fn() }
    await expect(ensureActivityRepository(api, activity, true)).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' })
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })
  it('rejects an association for another Student', async () => {
    const api = { getActivityWorkspace: vi.fn().mockResolvedValue({ data: repository }), createActivityWorkspace: vi.fn() }
    await expect(ensureActivityRepository(api, activity, true, 'other-student')).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' })
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })
  it('does not create after the initiating view is cancelled', async () => {
    let finish
    const controller = new AbortController()
    const api = { getActivityWorkspace: vi.fn(() => new Promise((_resolve, reject) => { finish = reject })), createActivityWorkspace: vi.fn() }
    const result = ensureActivityRepository(api, activity, true, 'student', { signal: controller.signal })
    controller.abort(); finish(missing())
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(api.createActivityWorkspace).not.toHaveBeenCalled()
  })

})
