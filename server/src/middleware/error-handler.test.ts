import express from 'express'
import request from 'supertest'
import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from './error-handler.js'
import { AppError } from '../shared/errors/app-error.js'

describe('diagnostics remain available behind friendly UI presentation', () => {
  it('retains status, correlation and structured server logging without logging private exception text', async () => {
    const logger = { error: vi.fn() }
    const app = express()
    app.use((req, _res, next) => { req.requestId = 'diagnostic-test'; next() })
    app.get('/failure', () => { throw new Error('private repository source and host path') })
    app.use(createErrorHandler(logger as unknown as Logger))
    const response = await request(app).get('/failure')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }, meta: { requestId: 'diagnostic-test' } })
    expect(logger.error).toHaveBeenCalledWith({ requestId: 'diagnostic-test', code: 'INTERNAL_ERROR', statusCode: 500, errorType: 'Error' }, 'request failed')
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private repository')
  })
  it('retains structured validation details in the API contract', async () => {
    const app = express()
    app.use((req, _res, next) => { req.requestId = 'validation-test'; next() })
    app.get('/validation', () => { throw new AppError({ statusCode: 422, code: 'VALIDATION_ERROR', message: 'Invalid input', details: { issues: [{ path: 'academicYear', message: 'Please select an academic year.' }] } }) })
    app.use(createErrorHandler({ error: vi.fn() } as unknown as Logger))
    const response = await request(app).get('/validation')
    expect(response.status).toBe(422)
    expect(response.body.error.details.issues[0].path).toBe('academicYear')
    expect(response.body.meta.requestId).toBe('validation-test')
  })
})
