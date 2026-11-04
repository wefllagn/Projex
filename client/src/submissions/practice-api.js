import { apiClient } from '../api/api-client.js'
export function createPracticeApi(client = apiClient) {
  const path = id => `/activities/${id}/practice`
  return {
    enter: (id, options) => client.post(path(id), {}, options),
    get: (id, options) => client.get(path(id), options),
    save: (id, input) => client.post(`${path(id)}/saves`, input),
    getSave: (id, jobId, options) => client.get(`${path(id)}/saves/${jobId}`, options),
    createPracticeRun: (id, sourceCode) => client.post(`${path(id)}/visible-test-runs`, { sourceCode }),
    getPracticeRun: (id, options) => client.get(`/visible-test-runs/${id}`, options),
    createInteractiveCodeRun: (id, sourceCode, requestKey) => client.post(`${path(id)}/interactive-code-runs`, { sourceCode, requestKey }),
    getInteractiveCodeRun: (id, options) => client.get(`/interactive-code-runs/${id}`, options),
    sendInteractiveInput: (id, input, options) => client.post(`/interactive-code-runs/${id}/input`, input, options),
    stopInteractiveCodeRun: (id, options) => client.post(`/interactive-code-runs/${id}/stop`, {}, options),
  }
}
export const practiceApi = createPracticeApi()
