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

export function createSubmissionApi(client = apiClient) {
  return {
    createSubmission(activityId, sourceCode, idempotencyKey, options = {}) {
      const headers = new Headers(options.headers)
      headers.set('Idempotency-Key', idempotencyKey)
      return client.post(
        `/activities/${activityId}/submissions`,
        { sourceCode },
        { ...options, headers },
      )
    },
    listSubmissions(activityId, query, options) {
      return client.get(
        `/activities/${activityId}/submissions${queryString(query)}`,
        options,
      )
    },
    getAttemptState(activityId, options) {
      return client.get(`/activities/${activityId}/attempt-state`, options)
    },
    getSubmission(submissionId, options) {
      return client.get(`/submissions/${submissionId}`, options)
    },
    correctAutomatedScore(submissionId, input, options) {
      return client.post(
        `/submissions/${submissionId}/score-corrections`,
        input,
        options,
      )
    },
    saveReview(submissionId, input, options) {
      return client.put(`/submissions/${submissionId}/review`, input, options)
    },
    releaseSubmission(submissionId, input, options) {
      return client.post(`/submissions/${submissionId}/release`, input, options)
    },
    retryAssessment(submissionId, input, options) {
      return client.post(
        `/submissions/${submissionId}/assessment/retry`,
        input,
        options,
      )
    },
    resolveAssessmentFailure(submissionId, input, options) {
      return client.post(
        `/submissions/${submissionId}/assessment/resolve-failure`,
        input,
        options,
      )
    },
    createVisibleTestRun(activityId, sourceCode, options) {
      return client.post(
        `/activities/${activityId}/visible-test-runs`,
        { sourceCode },
        options,
      )
    },
    getVisibleTestRun(runId, options) {
      return client.get(`/visible-test-runs/${runId}`, options)
    },
  }
}

export const submissionApi = createSubmissionApi()
