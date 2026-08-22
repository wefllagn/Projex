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

export function createClassApi(client = apiClient) {
  return {
    listClasses(query, options) {
      return client.get(`/classes${queryString(query)}`, options)
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
    archiveClass(classId, options) {
      return client.post(`/classes/${classId}/archive`, {}, options)
    },
    restoreClass(classId, options) {
      return client.post(`/classes/${classId}/restore`, {}, options)
    },
    getJoinCode(classId, options) {
      return client.get(`/classes/${classId}/join-code`, options)
    },
    rotateJoinCode(classId, options) {
      return client.post(`/classes/${classId}/join-code/rotate`, {}, options)
    },
    revokeJoinCode(classId, options) {
      return client.post(`/classes/${classId}/join-code/revoke`, {}, options)
    },
    joinClass(classCode, options) {
      return client.post('/classes/join', { classCode }, options)
    },
    listMembers(classId, query, options) {
      return client.get(`/classes/${classId}/members${queryString(query)}`, options)
    },
    updateMember(classId, memberId, input, options) {
      return client.patch(`/classes/${classId}/members/${memberId}`, input, options)
    },
    lookupInvitationStudent(universityEmail, classId, options) {
      return client.post('/class-invitations/lookup', {
        universityEmail,
        ...(classId ? { classId } : {}),
      }, options)
    },
    createClassInvitation(classId, universityEmail, options) {
      return client.post(`/classes/${classId}/invitations`, { universityEmail }, options)
    },
    listClassInvitations(classId, query, options) {
      return client.get(`/classes/${classId}/invitations${queryString(query)}`, options)
    },
    listMyClassInvitations(query, options) {
      return client.get(`/class-invitations${queryString(query)}`, options)
    },
    acceptClassInvitation(invitationId, options) {
      return client.post(`/class-invitations/${invitationId}/accept`, {}, options)
    },
    declineClassInvitation(invitationId, options) {
      return client.post(`/class-invitations/${invitationId}/decline`, {}, options)
    },
  }
}
