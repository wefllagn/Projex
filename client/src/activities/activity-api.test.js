import { describe, expect, it, vi } from 'vitest'
import { createActivityApi } from './activity-api.js'

function transport() {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  }
}

describe('activity API adapter', () => {
  it('maps bounded list, detail, and test-case reads', async () => {
    const client = transport()
    const api = createActivityApi(client)

    await api.listActivities('class-1', { page: 2, pageSize: 20, status: 'DRAFT', search: 'loops' })
    await api.getActivity('activity-1')
    await api.listTestCases('activity-1', { page: 1, pageSize: 50 })

    expect(client.get).toHaveBeenNthCalledWith(1, '/classes/class-1/activities?page=2&pageSize=20&status=DRAFT&search=loops', undefined)
    expect(client.get).toHaveBeenNthCalledWith(2, '/activities/activity-1', undefined)
    expect(client.get).toHaveBeenNthCalledWith(3, '/activities/activity-1/test-cases?page=1&pageSize=50', undefined)
  })

  it('maps activity writes and lifecycle transitions without unsupported fields', async () => {
    const client = transport()
    const api = createActivityApi(client)
    const input = { title: 'Loops' }
    const transition = { expectedUpdatedAt: '2026-08-10T00:00:00.000Z' }

    await api.createActivity('class-1', input)
    await api.updateActivity('activity-1', input)
    await api.replaceTestCases('activity-1', { expectedUpdatedAt: transition.expectedUpdatedAt, testCases: [] })
    await api.transition('activity-1', 'publish', transition)

    expect(client.post).toHaveBeenCalledWith('/classes/class-1/activities', input, undefined)
    expect(client.patch).toHaveBeenCalledWith('/activities/activity-1', input, undefined)
    expect(client.put).toHaveBeenCalledWith('/activities/activity-1/test-cases', expect.objectContaining({ testCases: [] }), undefined)
    expect(client.post).toHaveBeenCalledWith('/activities/activity-1/publish', transition, undefined)
  })
})
