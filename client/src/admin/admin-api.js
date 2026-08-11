import { apiClient } from '../api/api-client.js'

function queryString(query = {}) {
  const parameters = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value))
    }
  })
  const value = parameters.toString()
  return value ? `?${value}` : ''
}

export function createAdminApi(client = apiClient) {
  return {
    getOverview(options) {
      return client.get('/admin/overview', options)
    },
    listUsers(query, options) {
      return client.get(`/users${queryString(query)}`, options)
    },
    getUser(userId, options) {
      return client.get(`/users/${userId}`, options)
    },
    getAccountSummary(userId, options) {
      return client.get(`/admin/users/${userId}/account-summary`, options)
    },
    provisionStudent(input, options) {
      return client.post('/users/students', input, options)
    },
    provisionInstructor(input, options) {
      return client.post('/users/instructors', input, options)
    },
    resendSetup(userId, options) {
      return client.post(`/users/${userId}/resend-setup`, {}, options)
    },
    updateUserStatus(userId, input, options) {
      return client.patch(`/users/${userId}/status`, input, options)
    },
    revokeUserSessions(userId, input, options) {
      return client.post(`/admin/users/${userId}/sessions/revoke`, input, options)
    },
    listAcademicClasses(query, options) {
      return client.get(`/admin/academic/classes${queryString(query)}`, options)
    },
    listAcademicActivities(query, options) {
      return client.get(`/admin/academic/activities${queryString(query)}`, options)
    },
    listAcademicSubmissions(query, options) {
      return client.get(`/admin/academic/submissions${queryString(query)}`, options)
    },
    listAcademicProjectTasks(query, options) {
      return client.get(`/admin/academic/project-tasks${queryString(query)}`, options)
    },
    listAcademicRepositories(query, options) {
      return client.get(`/admin/academic/repositories${queryString(query)}`, options)
    },
    getClass(classId, options) {
      return client.get(`/classes/${classId}`, options)
    },
    createClass(input, options) {
      return client.post('/classes', input, options)
    },
    updateClass(classId, input, options) {
      return client.patch(`/classes/${classId}`, input, options)
    },
    archiveClass(classId, reason, options) {
      return client.post(`/classes/${classId}/archive`, { reason }, options)
    },
    restoreClass(classId, reason, options) {
      return client.post(`/classes/${classId}/restore`, { reason }, options)
    },
    getJoinCode(classId, options) {
      return client.get(`/classes/${classId}/join-code`, options)
    },
    rotateJoinCode(classId, reason, options) {
      return client.post(`/classes/${classId}/join-code/rotate`, { reason }, options)
    },
    revokeJoinCode(classId, reason, options) {
      return client.post(`/classes/${classId}/join-code/revoke`, { reason }, options)
    },
    listClassMembers(classId, query, options) {
      return client.get(`/classes/${classId}/members${queryString(query)}`, options)
    },
    updateClassMember(classId, memberId, input, options) {
      return client.patch(`/classes/${classId}/members/${memberId}`, input, options)
    },
    getOperationalHealth(options) {
      return client.get('/admin/operations/health', {
        ...options,
        acceptedDataStatuses: [503],
      })
    },
    getStorageSummary(options) {
      return client.get('/admin/operations/storage', options)
    },
    listExecutionJobs(query, options) {
      return client.get(`/admin/operations/execution-jobs${queryString(query)}`, options)
    },
    listProvisioningJobs(query, options) {
      return client.get(`/admin/operations/repository-provisioning-jobs${queryString(query)}`, options)
    },
    retryProvisioningJob(jobId, input, options) {
      return client.post(`/admin/operations/repository-provisioning-jobs/${jobId}/retry`, input, options)
    },
    listGitCredentials(query, options) {
      return client.get(`/admin/operations/git-credentials${queryString(query)}`, options)
    },
    revokeGitCredential(credentialId, input, options) {
      return client.post(`/admin/operations/git-credentials/${credentialId}/revoke`, input, options)
    },
    listAuditEvents(query, options) {
      return client.get(`/admin/audit-events${queryString(query)}`, options)
    },
  }
}

export const adminApi = createAdminApi()
