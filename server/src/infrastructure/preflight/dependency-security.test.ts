import { createRequire } from 'node:module'
import { createServer, request as httpRequest } from 'node:http'
import { createServer as smtpServer, type Socket } from 'node:net'
import { brotliCompressSync } from 'node:zlib'
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { Router } from 'express'
import request from 'supertest'
import pino from 'pino'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createSmtpEmailClient } from '../email/smtp-email-client.js'

const require = createRequire(import.meta.url)
const proxyAddr = require('proxy-addr') as { compile(input: string[]): (address: string) => boolean }
function app(hops = 0) {
  const probe = Router()
  probe.get('/probe', (req, res) => { res.json({ ip: req.ip, ips: req.ips, secure: req.secure }) })
  probe.post('/probe', (req, res) => { res.json({ accepted: req.body?.probe === true }) })
  return createApp({ config: { frontendOrigin: 'https://origin.example.invalid', requestBodyLimit: '32kb', trustProxyHops: hops },
    databaseHealth: { checkConnection: async () => undefined }, logger: pino({ level: 'silent' }),
    featureRouters: { auth: Router(), accountSetup: Router(), users: Router(), classes: Router(), activities: Router(), submissions: Router(), capabilities: probe } })
}

describe('patched dependency security boundaries', () => {
  it('rejects IPv4 spoofing through short-prefix IPv6 trust rules and preserves valid trust rules', () => {
    for (const subnet of ['::ffff:10.0.0.0/8', '::/1']) {
      const trust = proxyAddr.compile([subnet])
      expect(trust('203.0.113.17')).toBe(false)
      expect(trust('::ffff:203.0.113.17')).toBe(false)
    }
    for (const subnet of ['10.0.0.0/8', '::ffff:10.0.0.0/104']) {
      const trust = proxyAddr.compile([subnet])
      expect(trust('10.23.4.5')).toBe(true)
      expect(trust('203.0.113.17')).toBe(false)
    }
  })
  it('retains the numeric one-hop proxy boundary, exact Origin policy and untrusted direct-client handling', async () => {
    const response = await request(app(1)).get('/api/v1/capabilities/probe')
      .set('X-Forwarded-For', '192.0.2.99, 198.51.100.17').set('X-Forwarded-Proto', 'https').expect(200)
    expect(response.body).toEqual({ ip: '198.51.100.17', ips: ['198.51.100.17'], secure: true })
    await request(app(1)).get('/api/v1/capabilities/probe').set('Origin', 'https://attacker.invalid').expect(403)
    const direct = await request(app()).get('/api/v1/capabilities/probe').set('X-Forwarded-For', '192.0.2.99').set('X-Forwarded-Proto', 'https').expect(200)
    expect(direct.body.ips).toEqual([]); expect(direct.body.secure).toBe(false); expect(direct.body.ip).not.toBe('192.0.2.99')
  })
  it('survives delayed trailing bytes after compressed JSON and serves subsequent requests', async () => {
    const server = createServer(app())
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port, compressed = brotliCompressSync(Buffer.from('{"probe":true}'))
    async function post(trailing: Buffer) {
      return new Promise<number>((resolve, reject) => {
        const req = httpRequest({ hostname: '127.0.0.1', port, method: 'POST', path: '/api/v1/capabilities/probe', headers: {
          'Content-Type': 'application/json', 'Content-Encoding': 'br', 'Content-Length': compressed.length + trailing.length,
        } }, res => { res.resume(); res.once('end', () => resolve(res.statusCode!)); res.once('error', reject) })
        req.once('error', reject); req.setTimeout(2000, () => req.destroy(new Error('Compressed-body test timed out')))
        req.write(compressed); setTimeout(() => req.end(trailing), 5)
      })
    }
    try {
      expect(await post(Buffer.alloc(0))).toBe(200)
      expect([200, 400]).toContain(await post(Buffer.from('invalid trailing compressed data')))
      // The advisory triggers after the response, when trailing bytes arrive.
      await new Promise(resolve => setTimeout(resolve, 50))
      await request(server).get('/api/v1/health').expect(200)
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  })
  it('bounds oversized collection validation before invoking element validators', () => {
    let visited = 0
    const result = z.array(z.string().superRefine(() => { visited++ })).max(2).safeParse(Array<string>(10000).fill('test'))
    expect(result.success).toBe(false); expect(visited).toBe(0)
    if (!result.success) expect(result.error.issues).toMatchObject([{ code: 'too_big' }])
  })
  it('handles recursive object graphs through the patched Prisma config dependency', () => {
    const fromConfig = createRequire(require.resolve('@prisma/config'))
    const { deepmerge } = fromConfig('deepmerge-ts') as { deepmerge(...objects: object[]): { self: unknown } }
    const left: { self?: unknown } = {}, right: { self?: unknown } = {}
    left.self = left; right.self = right
    const result = deepmerge(left, right)
    expect(result.self).toBe(result)
    expect(deepmerge({ migration: { first: 'kept' } }, { migration: { second: 'added' } })).toEqual({ migration: { first: 'kept', second: 'added' } })
  })
  it('loads a real Prisma 6 plain-object config and validates the existing schema', async () => {
    const temp = await realpath(os.tmpdir()), root = await mkdtemp(path.join(temp, 'origin-security-config-'))
    if (path.dirname(path.resolve(root)) !== temp || !path.basename(root).startsWith('origin-security-config-')) throw new Error('Unsafe temporary cleanup target')
    const schema = path.resolve('prisma/schema.prisma'), migrations = path.resolve('prisma/migrations'), config = path.join(root, 'prisma.config.ts')
    await writeFile(config, `export default ${JSON.stringify({ schema, migrations: { path: migrations } })}\n`)
    try {
      const { loadConfigFromFile } = await import('@prisma/config')
      const loaded = await loadConfigFromFile({ configFile: config, configRoot: root })
      expect(loaded.error).toBeUndefined(); expect(loaded.config?.schema).toBe(schema); expect(loaded.config?.migrations?.path).toBe(migrations)
      const checked = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'validate', '--config', config], {
        cwd: process.cwd(), env: { ...process.env, DATABASE_URL: 'postgresql://build_only@127.0.0.1:5432/build_only' }, encoding: 'utf8', timeout: 15000, windowsHide: true,
      })
      expect(checked.status, 'Prisma config/validate compatibility').toBe(0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('does not load CLI/config tooling through generated Prisma client execution', () => {
    const script = "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();const forbidden=Object.keys(require.cache).some(k=>/[/\\\\](?:@prisma[/\\\\]config|prisma[/\\\\]build|deepmerge-ts)[/\\\\]/.test(k));p.$disconnect().then(()=>process.exit(forbidden?1:0));"
    const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: 'postgresql://build_only@127.0.0.1:5432/build_only' }, timeout: 5000, windowsHide: true })
    expect(result.status).toBe(0)
  })
  it('retains SMTP authentication, exact recipients and message delivery with the patched mailer', async () => {
    const sockets = new Set<Socket>(), messages: string[] = []
    let authenticated = false, recipient = ''
    const server = smtpServer(socket => {
      sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.write('220 localhost ESMTP test\r\n')
      let buffer = '', data = false, message = ''
      socket.on('data', chunk => {
        buffer += chunk.toString()
        while (buffer.includes('\r\n')) {
          const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2)
          if (data) { if (line === '.') { data = false; messages.push(message); socket.write('250 queued\r\n') } else message += line + '\r\n'; continue }
          if (/^EHLO|^HELO/.test(line)) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n')
          else if (line.startsWith('AUTH PLAIN ')) { authenticated = true; socket.write('235 authenticated\r\n') }
          else if (line.startsWith('MAIL FROM:')) socket.write('250 sender ok\r\n')
          else if (line.startsWith('RCPT TO:')) { recipient = line; socket.write('250 recipient ok\r\n') }
          else if (line === 'DATA') { data = true; socket.write('354 send message\r\n') }
          else if (line === 'QUIT') socket.end('221 goodbye\r\n')
          else socket.write('250 ok\r\n')
        }
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const client = createSmtpEmailClient({ host: '127.0.0.1', port: (server.address() as { port: number }).port, secure: false,
        user: 'test-only-user', password: 'test-only-password', fromName: 'Origin', fromAddress: 'origin@example.test' })
      const result = await client.send({ to: 'student@example.test', subject: 'Origin security regression', text: 'Account setup message.', html: '<p>Account setup message.</p>' })
      expect(result.messageId).toBeTruthy(); expect(authenticated).toBe(true); expect(recipient).toBe('RCPT TO:<student@example.test>')
      expect(messages).toHaveLength(1); expect(messages[0]).toContain('Subject: Origin security regression'); expect(messages[0]).toContain('Account setup message.')
    } finally { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => server.close(() => resolve())) }
  })
})
