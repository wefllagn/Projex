import { apiClient } from '../api/api-client.js'
export const groupBrowserApi = {
  create(repositoryId, input, key) { return apiClient.post(`/repositories/${repositoryId}/browser-commits`, input, { headers: { 'Idempotency-Key': key } }) },
  get(repositoryId, jobId, options) { return apiClient.get(`/repositories/${repositoryId}/browser-commits/${jobId}`, options) },
}
