import { describe,expect,it,vi } from 'vitest'
import { createApiClient } from './api-client.js'
const response=(status,data)=>new Response(JSON.stringify(status===200?{data}:{error:{code:'DENIED',message:'internal detail'}}),{status,headers:{'Content-Type':'application/json'}})
describe('stale authenticated responses',()=>{
 it('discards an in-flight private response after account invalidation',async()=>{
  let resolve
  const client=createApiClient({fetchImpl:()=>new Promise(done=>{resolve=done})})
  const pending=client.get('/classes');client.invalidateRequests();resolve(response(200,[{private:'old account'}]))
  await expect(pending).rejects.toMatchObject({name:'AbortError'})
 })
 it('never refreshes and replays an invalidated request into the new session',async()=>{
  let resolve
  const fetchImpl=vi.fn(()=>new Promise(done=>{resolve=done}))
  const client=createApiClient({fetchImpl});const pending=client.get('/classes')
  client.invalidateRequests();resolve(response(401,null))
  await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(fetchImpl).toHaveBeenCalledTimes(1)
 })
 it('reports denied reads with their context so access loss can be revalidated',async()=>{
  const listener=vi.fn(),client=createApiClient({fetchImpl:vi.fn().mockResolvedValue(response(403,null))})
  client.subscribeAuthorizationFailure(listener)
  await expect(client.get('/classes/private')).rejects.toMatchObject({status:403})
  expect(listener).toHaveBeenCalledWith(expect.any(Error),{path:'/classes/private',method:'GET'})
 })
 it('revalidates denied access after a successful token refresh as well',async()=>{
  const listener=vi.fn()
  const fetchImpl=vi.fn().mockResolvedValueOnce(response(401,null)).mockResolvedValueOnce(response(200,{})).mockResolvedValueOnce(response(403,null))
  const client=createApiClient({fetchImpl,getCsrfToken:()=> 'test-csrf'});client.subscribeAuthorizationFailure(listener)
  await expect(client.get('/classes/private')).rejects.toMatchObject({status:403})
  expect(listener).toHaveBeenCalledWith(expect.any(Error),{path:'/classes/private',method:'GET'})
 })
})
