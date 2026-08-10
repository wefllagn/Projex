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

  it('maps class governance reads and reason-bound mutations', async () => {
    const transport = client()
    const api = createAdminApi(transport)
    await api.getClass('class-1')
    await api.createClass({ className: 'Java', instructorId: 'instructor-1' })
    await api.updateClass('class-1', { section: 'B', reason: 'Approved metadata correction.' })
    await api.archiveClass('class-1', 'Approved archival request.')
    await api.restoreClass('class-1', 'Approved restoration request.')
    await api.getJoinCode('class-1')
    await api.rotateJoinCode('class-1', 'Approved join-code rotation.')
    await api.revokeJoinCode('class-1', 'Approved join-code revocation.')
    await api.listClassMembers('class-1', { page: 2, pageSize: 20 })
    await api.updateClassMember('class-1', 'member-1', { status: 'REMOVED', reason: 'Approved roster correction.', expectedUpdatedAt: '2030-01-01T00:00:00.000Z' })
    expect(transport.get).toHaveBeenCalledWith('/classes/class-1', undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes', expect.objectContaining({ instructorId: 'instructor-1' }), undefined)
    expect(transport.patch).toHaveBeenCalledWith('/classes/class-1', expect.objectContaining({ reason: 'Approved metadata correction.' }), undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/archive', { reason: 'Approved archival request.' }, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/restore', { reason: 'Approved restoration request.' }, undefined)
    expect(transport.get).toHaveBeenCalledWith('/classes/class-1/join-code', undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/join-code/rotate', { reason: 'Approved join-code rotation.' }, undefined)
    expect(transport.post).toHaveBeenCalledWith('/classes/class-1/join-code/revoke', { reason: 'Approved join-code revocation.' }, undefined)
    expect(transport.get).toHaveBeenCalledWith('/classes/class-1/members?page=2&pageSize=20', undefined)
    expect(transport.patch).toHaveBeenCalledWith('/classes/class-1/members/member-1', expect.objectContaining({ expectedUpdatedAt: '2030-01-01T00:00:00.000Z' }), undefined)
  })

  it('maps bounded academic oversight lists without instructor detail endpoints', async () => {
    const transport = client()
    const api = createAdminApi(transport)
    await api.listAcademicClasses({ page: 1, status: 'ACTIVE' })
    await api.listAcademicActivities({ classId: 'class-1', sortBy: 'dueDate' })
    await api.listAcademicSubmissions({ status: 'RELEASED' })
    await api.listAcademicProjectTasks({ search: 'Capstone' })
    await api.listAcademicRepositories({ repositoryType: 'PERSONAL', storageStatus: 'READY' })
    expect(transport.get).toHaveBeenNthCalledWith(1, '/admin/academic/classes?page=1&status=ACTIVE', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(2, '/admin/academic/activities?classId=class-1&sortBy=dueDate', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(3, '/admin/academic/submissions?status=RELEASED', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(4, '/admin/academic/project-tasks?search=Capstone', undefined)
    expect(transport.get).toHaveBeenNthCalledWith(5, '/admin/academic/repositories?repositoryType=PERSONAL&storageStatus=READY', undefined)
    expect(api).not.toHaveProperty('getSubmissionSource')
    expect(api).not.toHaveProperty('getHiddenTests')
  })
})
