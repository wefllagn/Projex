import { describe, expect, it, vi } from 'vitest'
import { createAdminApi } from './admin-api.js'

function client() {
  return {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  }
}

describe('admin API mapping', () => {
  it('maps overview, directory filters, and identity-bound account reads', async () => {
    const transport = client()
    const api = createAdminApi(transport)
    await api.getOverview()
    await api.listUsers({ page: 2, pageSize: 20, search: 'Ada Lovelace', role: 'INSTRUCTOR', status: 'ACTIVE' })
    await api.getUser('user-1')
    await api.getAccountSummary('user-1')
    expect(transport.get).toHaveBeenNthCalledWith(1, '/admin/overview', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(2, '/users?page=2&pageSize=20&search=Ada+Lovelace&role=INSTRUCTOR&status=ACTIVE', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(3, '/users/user-1', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(4, '/admin/users/user-1/account-summary', undefined)
  })

  it('maps only supported provisioning and account recovery mutations', async () => {
    const transport = client()
    const api = createAdminApi(transport)
    await api.provisionStudent({ fullName: 'Student Example', universityEmail: 'student@slu.edu.ph' })
    await api.provisionInstructor({ fullName: 'Instructor Example', universityEmail: 'instructor@slu.edu.ph' })
    await api.resendSetup('user-1')
    await api.updateUserStatus('user-1', { status: 'SUSPENDED', reason: 'Approved account hold.', expectedUpdatedAt: '2030-01-01T00:00:00.000Z' })
    await api.revokeUserSessions('user-1', { reason: 'Approved account recovery.' })
    expect(transport.post).toHaveBeenNthCalledWith(1, '/users/students', expect.objectContaining({ fullName: 'Student Example' }), undefined)
    expect(transport.post).toHaveBeenNthCalledWith(2, '/users/instructors', expect.objectContaining({ fullName: 'Instructor Example' }), undefined)
    expect(transport.post).toHaveBeenNthCalledWith(3, '/users/user-1/resend-setup', {}, undefined)
    expect(transport.patch).toHaveBeenCalledWith('/users/user-1/status', expect.objectContaining({ expectedUpdatedAt: '2030-01-01T00:00:00.000Z' }), undefined)
    expect(transport.post).toHaveBeenNthCalledWith(4, '/admin/users/user-1/sessions/revoke', { reason: 'Approved account recovery.' }, undefined)
    expect(api).not.toHaveProperty('provisionAdmin')
    expect(api).not.toHaveProperty('changeRole')
  })
})
