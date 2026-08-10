import { describe, expect, it, vi } from 'vitest'
import { createClassApi } from './class-api.js'

function client() {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  }
}

describe('class API adapter', () => {
  it('uses bounded class and roster query parameters', async () => {
    const transport = client()
    const api = createClassApi(transport)

    await api.listClasses({ page: 2, pageSize: 100, status: 'ARCHIVED', search: 'java class' })
    await api.listMembers('class-1', { page: 1, pageSize: 50 })

    expect(transport.get).toHaveBeenNthCalledWith(1, '/classes?page=2&pageSize=100&status=ARCHIVED&search=java+class', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(2, '/classes/class-1/members?page=1&pageSize=50', undefined)
  })

  it('sends join codes only in the protected request body', async () => {
    const transport = client()
    const api = createClassApi(transport)

    await api.joinClass('SAFE-CODE')

    expect(transport.post).toHaveBeenCalledWith('/classes/join', { classCode: 'SAFE-CODE' }, undefined)
    expect(transport.post.mock.calls[0][0]).not.toContain('SAFE-CODE')
  })

  it('maps instructor lifecycle, join-code, and membership mutations exactly', async () => {
    const transport = client()
    const api = createClassApi(transport)

    await api.createClass({ className: 'Java', section: 'A', semester: 'First', schoolYear: '2026-2027' })
    await api.updateClass('class-1', { section: 'B' })
    await api.archiveClass('class-1')
    await api.restoreClass('class-1')
    await api.rotateJoinCode('class-1')
    await api.revokeJoinCode('class-1')
    await api.updateMember('class-1', 'member-1', { status: 'REMOVED' })

    expect(transport.post).toHaveBeenCalledWith('/classes', expect.objectContaining({ className: 'Java' }), undefined)
    expect(transport.patch).toHaveBeenCalledWith('/classes/class-1', { section: 'B' }, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/archive', {}, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/restore', {}, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/join-code/rotate', {}, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/join-code/revoke', {}, undefined)
    expect(transport.patch).toHaveBeenCalledWith('/classes/class-1/members/member-1', { status: 'REMOVED' }, undefined)
  })
})
