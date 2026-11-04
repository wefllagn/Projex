import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { createIsolatedGitAvailability } from './git-http-availability.js'
const servers: Server[] = []
afterEach(async () => { for (const s of servers.splice(0)) { s.closeAllConnections(); await new Promise<void>(resolve => s.close(() => resolve())) } })
async function endpoint(status: number, body: string | null) {
  const server = createServer((_req, res) => { if (body !== null) { res.writeHead(status); res.end(body) } })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as { port: number }).port
}
describe('bounded isolated Git readiness', () => {
  it('does not contact a disabled transport', async () => { expect(await createIsolatedGitAvailability(false, 1)()).toBe(false) })
  it.each([[200, '{"ready":true}', true], [503, '{"ready":true}', false], [302, '{"ready":true}', false], [200, '{"ready":false}', false], [200, 'invalid', false], [200, 'x'.repeat(129), false]] as const)('validates status and bounded response: %s %s', async (status, body, ready) => {
    expect(await createIsolatedGitAvailability(true, await endpoint(status, body))()).toBe(ready)
  })
  it('bounds stalled responses', async () => { expect(await createIsolatedGitAvailability(true, await endpoint(200, null), 30)()).toBe(false) })
  it('fails closed for a stopped listener', async () => {
    const port = await endpoint(200, '{"ready":true}')
    await new Promise<void>(resolve => servers[0]!.close(() => resolve()))
    expect(await createIsolatedGitAvailability(true, port)()).toBe(false)
  })
})
