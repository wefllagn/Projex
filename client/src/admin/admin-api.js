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
  }
}

export const adminApi = createAdminApi()
