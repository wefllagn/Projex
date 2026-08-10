import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient, describeApiError } from './api-client.js'

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function success(data = { ok: true }, requestId = 'request-1') {
  return jsonResponse(200, { data, meta: { requestId } })
}

function failure(status, code = 'FAILED', message = 'Safe failure', details) {
  return jsonResponse(status, {
    error: { code, message, ...(details ? { details } : {}) },
    meta: { requestId: 'request-error' },
  })
}

describe('API client', () => {
  it('includes browser credentials and parses the standard envelope', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(success({ id: 'user-1' }))
    const client = createApiClient({ baseUrl: '/api/v1', fetchImpl })

    const result = await client.get('/auth/me', { allowRefresh: false })

    expect(result).toEqual({ data: { id: 'user-1' }, meta: { requestId: 'request-1' } })
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({ credentials: 'include' }))
  })

  it('preserves safe error fields and validation issues', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(failure(400, 'VALIDATION_FAILED', 'Invalid input.', {
      issues: [{ path: 'email', code: 'invalid_format', message: 'Enter a valid email.' }],
    }))
    const client = createApiClient({ fetchImpl })

    await expect(client.get('/users', { allowRefresh: false })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      requestId: 'request-error',
      fieldErrors: { email: 'Enter a valid email.' },
    })
  })

  it('adds JSON and CSRF headers to protected mutations', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(success())
    const client = createApiClient({ fetchImpl, getCsrfToken: () => 'synthetic-csrf' })

    await client.post('/auth/logout', {})

    const options = fetchImpl.mock.calls[0][1]
    expect(options.headers.get('Content-Type')).toBe('application/json')
    expect(options.headers.get('X-CSRF-Token')).toBe('synthetic-csrf')
    expect(options.body).toBe('{}')
  })

  it('fails closed before a protected mutation when CSRF is absent', async () => {
    const fetchImpl = vi.fn()
    const client = createApiClient({ fetchImpl, getCsrfToken: () => null })

    await expect(client.post('/auth/logout', {})).rejects.toMatchObject({ code: 'CSRF_TOKEN_MISSING' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('shares one refresh across concurrent 401 responses and retries each request once', async () => {
    let meCalls = 0
    let refreshCalls = 0
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        await Promise.resolve()
        return success({ refreshed: true }, 'refresh-request')
      }
      meCalls += 1
      return meCalls <= 2
        ? failure(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.')
        : success({ id: `user-${meCalls}` })
    })
    const client = createApiClient({ fetchImpl, getCsrfToken: () => 'synthetic-csrf' })

    const results = await Promise.all([client.get('/auth/me'), client.get('/auth/me')])

    expect(refreshCalls).toBe(1)
    expect(meCalls).toBe(4)
    expect(results).toHaveLength(2)
  })

  it('never recursively refreshes a failed refresh request', async () => {
    const fetchImpl = vi.fn(async (url) => (
      url.endsWith('/auth/refresh')
        ? failure(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.')
        : failure(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.')
    ))
    const client = createApiClient({ fetchImpl, getCsrfToken: () => 'synthetic-csrf' })

    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('notifies authentication state once when a shared refresh fails closed', async () => {
    const fetchImpl = vi.fn(async () => failure(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'))
    const client = createApiClient({ fetchImpl, getCsrfToken: () => 'synthetic-csrf' })
    const listener = vi.fn()
    client.subscribeAuthenticationFailure(listener)

    await Promise.allSettled([client.get('/auth/me'), client.get('/auth/me')])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('does not refresh login requests when explicitly disabled', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(failure(401, 'AUTHENTICATION_FAILED', 'Invalid credentials.'))
    const client = createApiClient({ fetchImpl })

    await expect(client.post('/auth/login', { email: 'test@example.edu', password: 'synthetic' }, {
      csrf: false,
      allowRefresh: false,
    })).rejects.toMatchObject({ status: 401 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps a network failure without exposing the underlying payload', async () => {
    const client = createApiClient({ fetchImpl: vi.fn().mockRejectedValue(new Error('private transport detail')) })
    await expect(client.get('/health', { allowRefresh: false })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Projex could not reach the server.',
    })
  })

  it.each([
    [401, 'Your session has expired. Please sign in again.'],
    [403, 'You do not have permission to perform this action.'],
    [404, 'The requested Projex record was not found.'],
    [409, 'This record changed while you were working. Refresh it before trying again.'],
    [422, 'Lifecycle correction'],
    [503, 'This Projex service is temporarily unavailable. Please try again later.'],
  ])('provides a safe status message for HTTP %s', (status, expected) => {
    expect(describeApiError(new ApiError({ status, message: 'Lifecycle correction' }))).toBe(expected)
  })

  it.each([
    ['CLASS_HAS_UNFINISHED_PROJECT_WORK', 'The class cannot be archived while project collaboration work remains unfinished.'],
    ['REPOSITORY_ARCHIVE_BLOCKED', 'The repository cannot be archived until review and invitation blockers are resolved.'],
  ])('preserves allowlisted %s lifecycle guidance without broadening generic errors', (code, message) => {
    expect(describeApiError(new ApiError({ status: 409, code, message }))).toBe(message)
  })
})
