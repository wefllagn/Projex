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

export function createActivityApi(client = apiClient) {
  return {
    listActivities(classId, query, options) {
      return client.get(`/classes/${classId}/activities${queryString(query)}`, options)
    },
    getActivity(activityId, options) {
      return client.get(`/activities/${activityId}`, options)
    },
    createActivity(classId, input, options) {
      return client.post(`/classes/${classId}/activities`, input, options)
    },
    updateActivity(activityId, input, options) {
      return client.patch(`/activities/${activityId}`, input, options)
    },
    listTestCases(activityId, query, options) {
      return client.get(`/activities/${activityId}/test-cases${queryString(query)}`, options)
    },
    replaceTestCases(activityId, input, options) {
      return client.put(`/activities/${activityId}/test-cases`, input, options)
    },
    transition(activityId, action, input, options) {
      return client.post(`/activities/${activityId}/${action}`, input, options)
    },
  }
}

export const activityApi = createActivityApi()
