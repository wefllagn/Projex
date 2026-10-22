import { apiClient } from '../api/api-client.js'
export const groupBrowserRefApi = {
  create(repositoryId,input,key) { return apiClient.post('/repositories/'+repositoryId+'/browser-refs',input,{headers:{'Idempotency-Key':key}}) },
  get(repositoryId,jobId,options) { return apiClient.get('/repositories/'+repositoryId+'/browser-refs/'+jobId,options) },
  preview(repositoryId,sourceBranchName,targetBranchName) { return apiClient.get('/repositories/'+repositoryId+'/browser-refs/preview?'+new URLSearchParams({sourceBranchName,targetBranchName})) },
}
