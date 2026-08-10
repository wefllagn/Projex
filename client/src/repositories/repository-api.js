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
  }
}

export const repositoryApi = createRepositoryApi()
