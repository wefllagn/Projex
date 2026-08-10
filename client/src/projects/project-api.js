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

export function createProjectApi(client = apiClient) {
  return {
    listProjectTasks(classId, query, options) {
      return client.get(`/classes/${classId}/project-tasks${queryString(query)}`, options)
    },
    getProjectTask(projectTaskId, options) {
      return client.get(`/project-tasks/${projectTaskId}`, options)
    },
    createProjectTask(classId, input, options) {
      return client.post(`/classes/${classId}/project-tasks`, input, options)
    },
    updateProjectTask(projectTaskId, input, options) {
      return client.patch(`/project-tasks/${projectTaskId}`, input, options)
    },
    transitionProjectTask(projectTaskId, action, input, options) {
      return client.post(`/project-tasks/${projectTaskId}/${action}`, input, options)
    },
    listTeams(projectTaskId, options) {
      return client.get(`/project-tasks/${projectTaskId}/teams`, options)
    },
    getMonitoring(projectTaskId, options) {
      return client.get(`/project-tasks/${projectTaskId}/monitoring`, options)
    },
  }
}

export const projectApi = createProjectApi()
