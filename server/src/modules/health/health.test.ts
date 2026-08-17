import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { DatabaseHealth } from '../../infrastructure/database/prisma.js'
import { createLogger } from '../../infrastructure/logging/logger.js'

const fixedTimestamp = '2026-07-29T04:00:00.000Z'

function createTestApp(databaseHealth: DatabaseHealth) {
  return createApp({
    config: {
      frontendOrigin: 'http://localhost:5173',
      requestBodyLimit: '1mb',
    },
    databaseHealth,
    logger: createLogger('silent'),
    now: () => new Date(fixedTimestamp),
  })
}

describe('GET /api/v1/health', () => {
  it('uses only the configured numeric reverse-proxy hop count', () => {
    const app = createApp({ config: { frontendOrigin: 'http://localhost:5173', requestBodyLimit: '1mb', trustProxyHops: 1 }, databaseHealth: { checkConnection: async () => undefined }, logger: createLogger('silent') })
    expect(app.get('trust proxy')).not.toBe(true)
    expect(app.get('trust proxy fn')).toBeTypeOf('function')
  })
  it('returns a standard success envelope when the database is available', async () => {
    const app = createTestApp({
      checkConnection: async () => undefined,
    })

    const response = await request(app).get('/api/v1/health').expect(200)

    expect(response.body).toEqual({
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: fixedTimestamp,
      },
      meta: {
        requestId: expect.any(String),
      },
    })
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId)
  })

  it('allows only the exact configured LAN frontend origin', async () => {
    const app = createApp({
      config: {
        frontendOrigin: 'http://192.0.2.20:5173',
        requestBodyLimit: '1mb',
      },
      databaseHealth: { checkConnection: async () => undefined },
      logger: createLogger('silent'),
      now: () => new Date(fixedTimestamp),
    })

    const allowed = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://192.0.2.20:5173')
      .expect(200)
    expect(allowed.headers['access-control-allow-origin']).toBe('http://192.0.2.20:5173')
    expect(allowed.headers['access-control-allow-credentials']).toBe('true')

    const denied = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://192.0.2.21:5173')
      .expect(403)
    expect(denied.body.error).toEqual({
      code: 'CORS_ORIGIN_DENIED',
      message: 'Origin is not allowed.',
    })
  })

  it('propagates a valid caller request ID', async () => {
    const app = createTestApp({
      checkConnection: async () => undefined,
    })

    const response = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', 'test-request-123')
      .expect(200)

    expect(response.headers['x-request-id']).toBe('test-request-123')
    expect(response.body.meta.requestId).toBe('test-request-123')
  })

  it('returns the standard unknown-route response', async () => {
    const app = createTestApp({
      checkConnection: async () => undefined,
    })

    const response = await request(app).get('/api/v1/unknown').expect(404)

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('returns a safe unavailable response when the database check fails', async () => {
    const privateFailure =
      'postgresql://projex_user:private-password@localhost:5432/projex C:\\private\\db'
    const app = createTestApp({
      checkConnection: async () => {
        throw new Error(privateFailure)
      },
    })

    const response = await request(app).get('/api/v1/health').expect(503)
    const serializedBody = JSON.stringify(response.body)

    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connectivity check failed.',
      },
      meta: {
        requestId: expect.any(String),
      },
    })
    expect(serializedBody).not.toContain('private-password')
    expect(serializedBody).not.toContain('C:\\private\\db')
    expect(serializedBody).not.toContain('stack')
  })
})
