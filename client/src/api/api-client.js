import { CSRF_HEADER_NAME, readCsrfToken } from './csrf.js'

const DEFAULT_API_BASE_URL = '/api/v1'
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const SAFE_BUSINESS_MESSAGE_CODES = new Set([
  'CLASS_ARCHIVED',
  'CLASS_CODE_INVALID',
  'CLASS_HAS_UNFINISHED_PROJECT_WORK',
  'CLASS_HAS_UNFINISHED_SUBMISSION_WORK',
  'CLASS_MEMBERSHIP_PENDING',
  'CLASS_MEMBERSHIP_REMOVED',
  'REPOSITORY_ARCHIVE_BLOCKED',
])

function normalizeBaseUrl(value) {
  const baseUrl = String(value || DEFAULT_API_BASE_URL).trim()
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

export function buildPublicApiUrl(
  path,
  {
    baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
    origin = globalThis.location?.origin,
  } = {},
) {
  const target = `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`
  try {
    return new URL(target, origin).toString()
  } catch {
    throw new ApiError({
      code: 'PUBLIC_API_URL_INVALID',
      message: 'The public API address is not configured correctly.',
    })
  }
}

async function readResponseBody(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor({ status = 0, code, message, details, requestId, cause }) {
    super(message || 'The request could not be completed.', cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.code = code || 'REQUEST_FAILED'
    this.details = details
    this.requestId = requestId ?? null
  }

  get fieldErrors() {
    const issues = Array.isArray(this.details?.issues) ? this.details.issues : []
    return issues.reduce((errors, issue) => {
      if (typeof issue?.path === 'string' && typeof issue?.message === 'string') {
        errors[issue.path] = issue.message
      }
      return errors
    }, {})
  }
}

export function describeApiError(error) {
  if (!(error instanceof ApiError)) {
    return 'The request could not be completed. Please try again.'
  }

  if (error.code === 'NETWORK_ERROR') {
    return 'Projex could not reach the server. Check the connection and try again.'
  }
  if (SAFE_BUSINESS_MESSAGE_CODES.has(error.code)) return error.message
  if (error.status === 401) return 'Your session has expired. Please sign in again.'
  if (error.status === 403) return 'You do not have permission to perform this action.'
  if (error.status === 404) return 'The requested Projex record was not found.'
  if (error.status === 409) return 'This record changed while you were working. Refresh it before trying again.'
  if (error.status === 422) return error.message
  if (error.status === 503) return 'This Projex service is temporarily unavailable. Please try again later.'
  return error.message
}

export function createApiClient({
  baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  getCsrfToken = readCsrfToken,
} = {}) {
  if (!fetchImpl) throw new Error('A fetch implementation is required.')

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const authenticationFailureListeners = new Set()
  let refreshPromise = null

  function notifyAuthenticationFailure(error) {
    for (const listener of authenticationFailureListeners) listener(error)
  }

  async function send(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase()
    const headers = new Headers(options.headers)
    const needsCsrf = options.csrf ?? MUTATION_METHODS.has(method)

    headers.set('Accept', 'application/json')
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')

    if (needsCsrf) {
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new ApiError({
          status: 403,
          code: 'CSRF_TOKEN_MISSING',
          message: 'The security token is missing or expired. Please sign in again.',
        })
      }
      headers.set(CSRF_HEADER_NAME, csrfToken)
    }

    let response
    try {
      response = await fetchImpl(`${normalizedBaseUrl}${normalizePath(path)}`, {
        method,
        headers,
        credentials: 'include',
        signal: options.signal,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Projex could not reach the server.',
        cause: error,
      })
    }

    const payload = await readResponseBody(response)
    const acceptedDataStatus =
      Array.isArray(options.acceptedDataStatuses) &&
      options.acceptedDataStatuses.includes(response.status)
    if (!response.ok && (!acceptedDataStatus || payload?.error)) {
      throw new ApiError({
        status: response.status,
        code: payload?.error?.code,
        message: payload?.error?.message || `Request failed with status ${response.status}.`,
        details: payload?.error?.details,
        requestId: payload?.meta?.requestId,
      })
    }

    if (payload === null) {
      if (acceptedDataStatus) {
        throw new ApiError({
          status: response.status,
          code: 'INVALID_API_RESPONSE',
          message: 'Projex returned an invalid response.',
        })
      }
      return { data: null, meta: { requestId: null } }
    }
    if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
      throw new ApiError({
        status: response.status,
        code: 'INVALID_API_RESPONSE',
        message: 'Projex returned an invalid response.',
      })
    }
    if (acceptedDataStatus && payload.data === null) {
      throw new ApiError({
        status: response.status,
        code: 'INVALID_API_RESPONSE',
        message: 'Projex returned an invalid response.',
      })
    }

    return acceptedDataStatus
      ? { ...payload, meta: { ...payload.meta, httpStatus: response.status } }
      : payload
  }

  async function refreshSession() {
    if (!refreshPromise) {
      refreshPromise = send('/auth/refresh', {
        method: 'POST',
        body: {},
        csrf: true,
      }).catch((error) => {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.code === 'CSRF_TOKEN_MISSING' || error.code === 'CSRF_VALIDATION_FAILED')
        ) {
          notifyAuthenticationFailure(error)
        }
        throw error
      }).finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  async function request(path, options = {}) {
    const allowRefresh = options.allowRefresh !== false
    try {
      return await send(path, options)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !allowRefresh) throw error
      await refreshSession()
      try {
        return await send(path, { ...options, allowRefresh: false })
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401) {
          notifyAuthenticationFailure(retryError)
        }
        throw retryError
      }
    }
  }

  return {
    request,
    refreshSession,
    subscribeAuthenticationFailure(listener) {
      authenticationFailureListeners.add(listener)
      return () => authenticationFailureListeners.delete(listener)
    },
    get(path, options) {
      return request(path, { ...options, method: 'GET' })
    },
    post(path, body, options) {
      return request(path, { ...options, method: 'POST', body })
    },
    put(path, body, options) {
      return request(path, { ...options, method: 'PUT', body })
    },
    patch(path, body, options) {
      return request(path, { ...options, method: 'PATCH', body })
    },
  }
}

export const apiClient = createApiClient()
