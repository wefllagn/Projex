import request from 'supertest'
import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { createGitHttpWorkerServer } from './git-http-worker.js'
import type { GitCredentialService } from '../../modules/git-transport/git-credential.service.js'
import { startIsolatedGitHttpWorker } from './git-http-worker.js'
import { assertHostedGitService } from '../preflight/hosted-service.js'
import type { AppEnv } from '../../config/env.js'
import type { PrismaClient } from '@prisma/client'

vi.mock('../preflight/hosted-service.js', () => ({ assertHostedGitService: vi.fn() }))

const id = '22222222-2222-4222-8222-222222222222'
function fixture(enabled = true) {
  const handle = vi.fn(async ({ response }) => { response.status(204).end() })
  const databaseReady = vi.fn().mockResolvedValue(undefined)
  const server = createGitHttpWorkerServer({ enabled, transportService: { initialize: vi.fn(), handle }, credentialService: {} as GitCredentialService, databaseReady, logger: pino({ level: 'silent' }), timeoutMs: 5000 })
  return { server, handle, databaseReady }
}

describe('isolated Git protocol listener', () => {
  it('refuses to start outside the existing hosted confinement guard before touching Git or PostgreSQL', async () => {
    vi.mocked(assertHostedGitService).mockRejectedValueOnce(new Error('HOSTED_SERVICE_ISOLATION_REQUIRED'))
    const env = { gitExecutionMode: 'service_isolated', gitSmartHttpEnabled: true, gitStorageRoot: '/guarded' } as AppEnv
    await expect(startIsolatedGitHttpWorker(env, {} as PrismaClient, pino({ level: 'silent' }))).rejects.toThrow('HOSTED_SERVICE_ISOLATION_REQUIRED')
  })
  it.each(['info/refs?service=git-upload-pack', 'info/refs?service=git-receive-pack', 'git-upload-pack', 'git-receive-pack'])('passes only canonical protocol requests to the existing authorized service: %s', async suffix => {
    const f = fixture()
    const method = suffix.startsWith('info/') ? 'get' : 'post'
    await request(f.server)[method](`/api/v1/git/repositories/${id}/${suffix}`).set('X-Forwarded-Proto', 'https').expect(204)
    expect(f.handle).toHaveBeenCalledOnce()
    expect(f.handle.mock.calls[0]?.[0]).toMatchObject({ repositoryId: id })
  })
  it.each([
    `/api/v1/git/repositories/${id}/HEAD`, `/api/v1/git/repositories/${id}/objects/info/packs`,
    '/api/v1/git/repositories/not-a-uuid/git-upload-pack',
    `/api/v1/git/repositories/%32${id.slice(1)}/git-upload-pack`,
    `/api/v1/git/repositories/${id}/git-upload-pack/`,
    '/api/v1/git/repositories/..%2f..%2fetc/info/refs',
    `/api/v1/repositories/${id}/git-credentials`, '/git/repositories/anything',
  ])('rejects malformed, filesystem and browser API paths without executing transport: %s', async url => {
    const f = fixture()
    await request(f.server).post(url).set('X-Forwarded-Proto', 'https').expect(404)
    expect(f.handle).not.toHaveBeenCalled()
  })
  it('requires the HTTPS proxy boundary and exact HTTP method', async () => {
    const f = fixture()
    const url = `/api/v1/git/repositories/${id}/info/refs?service=git-upload-pack`
    await request(f.server).get(url).expect(404)
    await request(f.server).get(url).set('X-Forwarded-Proto', 'http').expect(404)
    await request(f.server).head(url).set('X-Forwarded-Proto', 'https').expect(405)
    await request(f.server).post(url).set('X-Forwarded-Proto', 'https').expect(405)
    await request(f.server).post(`/api/v1/git/repositories/${id}/git-upload-pack`).set('X-Forwarded-Proto', 'https').set('Content-Encoding', 'gzip').expect(415)
    expect(f.handle).not.toHaveBeenCalled()
  })
  it('fails closed in disabled mode without transport or database work', async () => {
    const f = fixture(false)
    await request(f.server).get(`/api/v1/git/repositories/${id}/info/refs?service=git-upload-pack`).set('X-Forwarded-Proto', 'https').expect(404)
    await request(f.server).get('/internal/git/ready').expect(503, { ready: false })
    expect(f.handle).not.toHaveBeenCalled()
    expect(f.databaseReady).not.toHaveBeenCalled()
  })
  it('reports only non-secret readiness and fails closed when the database is unavailable', async () => {
    const f = fixture()
    await request(f.server).get('/internal/git/ready').expect(200, { ready: true })
    f.databaseReady.mockRejectedValueOnce(new Error('private database diagnostic'))
    await request(f.server).get('/internal/git/ready').expect(503, { ready: false })
  })
})
