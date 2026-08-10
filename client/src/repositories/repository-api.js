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

export function createRepositoryApi(client = apiClient) {
  return {
    createClassProject(projectTaskId, input, options) {
      return client.post(`/project-tasks/${projectTaskId}/repositories`, input, options)
    },
    createPersonal(input, options) {
      return client.post('/repositories/personal', input, options)
    },
    listRepositories(query, options) {
      return client.get(`/repositories${queryString(query)}`, options)
    },
    getRepository(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}`, options)
    },
    updateRepository(repositoryId, input, options) {
      return client.patch(`/repositories/${repositoryId}`, input, options)
    },
    readyForReview(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/ready-for-review`, input, options)
    },
    requestChanges(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/request-changes`, input, options)
    },
    approveRepository(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/approve`, input, options)
    },
    archiveRepository(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/archive`, input, options)
    },
    restoreRepository(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/restore`, input, options)
    },
    listMembers(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/members`, options)
    },
    transitionMember(repositoryId, memberId, input, options) {
      return client.patch(`/repositories/${repositoryId}/members/${memberId}`, input, options)
    },
    createInvitation(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/invitations`, input, options)
    },
    listRepositoryInvitations(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/invitations`, options)
    },
    listReceivedInvitations(options) {
      return client.get('/repository-invitations', options)
    },
    acceptInvitation(invitationId, options) {
      return client.post(`/repository-invitations/${invitationId}/accept`, {}, options)
    },
    declineInvitation(invitationId, options) {
      return client.post(`/repository-invitations/${invitationId}/decline`, {}, options)
    },
    revokeInvitation(invitationId, input = {}, options) {
      return client.post(`/repository-invitations/${invitationId}/revoke`, input, options)
    },
    listFeedback(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/feedback`, options)
    },
    createFeedbackDraft(repositoryId, input, options) {
      return client.post(`/repositories/${repositoryId}/feedback-drafts`, input, options)
    },
    updateFeedbackDraft(feedbackId, input, options) {
      return client.patch(`/repository-feedback/${feedbackId}`, input, options)
    },
  }
}

export const repositoryApi = createRepositoryApi()
