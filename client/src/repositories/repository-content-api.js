import { apiClient, buildPublicApiUrl } from '../api/api-client.js'

function queryString(query = {}) {
  const parameters = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value))
  })
  const value = parameters.toString()
  return value ? `?${value}` : ''
}

export function createRepositoryContentApi(client = apiClient, publicUrl = buildPublicApiUrl) {
  return {
    getSummary(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/source/summary`, options)
    },
    listBranches(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/source/branches`, options)
    },
    listCommits(repositoryId, query, options) {
      return client.get(`/repositories/${repositoryId}/source/commits${queryString(query)}`, options)
    },
    getCommit(repositoryId, commitId, options) {
      return client.get(`/repositories/${repositoryId}/source/commits/${commitId}`, options)
    },
    getTree(repositoryId, query, options) {
      return client.get(`/repositories/${repositoryId}/source/tree${queryString(query)}`, options)
    },
    getFile(repositoryId, query, options) {
      return client.get(`/repositories/${repositoryId}/source/file${queryString(query)}`, options)
    },
    getDiff(repositoryId, query, options) {
      return client.get(`/repositories/${repositoryId}/source/diff${queryString(query)}`, options)
    },
    issueCredential(repositoryId, operations, options) {
      return client.post(`/repositories/${repositoryId}/git-credentials`, { operations }, options)
    },
    listCredentials(repositoryId, options) {
      return client.get(`/repositories/${repositoryId}/git-credentials`, options)
    },
    revokeCredential(credentialId, options) {
      return client.post(`/git-credentials/${credentialId}/revoke`, {}, options)
    },
    getTransportUrl(repositoryId) {
      return publicUrl(`/git/repositories/${encodeURIComponent(repositoryId)}`)
    },
  }
}

export const repositoryContentApi = createRepositoryContentApi()
