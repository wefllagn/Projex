import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, apiClient } from '../api/api-client.js'
import { AuthContext } from './auth-context.js'

const SESSION_SIGNAL = 'origin-session-change'
const anonymous = () => ({ status: 'anonymous', user: null, error: null })
const authenticated = user => user?.status === 'ACTIVE'
  ? { status: 'authenticated', user, error: null }
  : { status: 'blocked', user, error: null }
const sameIdentity = (a, b) => a && b && a.id === b.id && a.role === b.role && a.status === b.status
const expired = error => error instanceof ApiError && (error.status === 401 || ['CSRF_TOKEN_MISSING', 'CSRF_VALIDATION_FAILED'].includes(error.code))

export function AuthProvider({ children, client = apiClient, autoBootstrap = true }) {
  const [state, setState] = useState({ status: autoBootstrap ? 'loading' : 'anonymous', user: null, error: null })
  const current = useRef(state), version = useRef(0), validation = useRef(null), channel = useRef(null), identity = useRef(null)
  const adopt = useCallback(next => {
    if (next.user) identity.current = next.user
    else if (next.status === 'anonymous') identity.current = null
    current.current = next; setState(next)
  }, [])
  const invalidate = useCallback(() => { version.current += 1; client.invalidateRequests?.() }, [client])
  const signalChange = useCallback(() => {
    // A notification only: no account, token, credential or private content.
    channel.current?.postMessage('changed')
    try { localStorage.setItem(SESSION_SIGNAL, crypto.randomUUID()) } catch { /* Focus revalidation remains available. */ }
  }, [])

  const revalidate = useCallback(({ interrupt = false, reason = 'changed', signal } = {}) => {
    if (validation.current && !interrupt) return validation.current
    const previous = current.current
    const known = previous.user ?? previous.pendingUser ?? identity.current
    const ticket = ++version.current
    if (interrupt && known) {
      client.invalidateRequests?.()
      adopt({ status: 'interrupted', user: null, pendingUser: null, issue: 'checking', error: null })
    }
    const request = (async () => {
      await Promise.resolve()
      try {
        const response = await client.get('/auth/me', { signal })
        if (ticket !== version.current || signal?.aborted) return null
        const user = response.data
        if (known && (interrupt || previous.status === 'interrupted' || !sameIdentity(known, user))) {
          client.invalidateRequests?.()
          adopt({ status: 'interrupted', user: null, pendingUser: user, issue: user?.status !== 'ACTIVE' ? 'blocked' : sameIdentity(known, user) && (reason === 'access' || previous.issue === 'access') ? 'access' : 'changed', error: null })
        } else adopt(authenticated(user))
        return user
      } catch (error) {
        if (ticket !== version.current || error?.name === 'AbortError') return null
        if (known || previous.status === 'interrupted') {
          client.invalidateRequests?.()
          adopt({ status: 'interrupted', user: null, pendingUser: null, issue: expired(error) ? 'expired' : 'unavailable', error })
        } else adopt(expired(error) ? anonymous() : { status: 'error', user: null, error })
        return null
      } finally {
        if (validation.current === request) validation.current = null
      }
    })()
    validation.current = request
    return request
  }, [adopt, client])

  useEffect(() => {
    if (!autoBootstrap) return undefined
    const controller = new AbortController()
    void revalidate({ signal: controller.signal })
    return () => { controller.abort(); validation.current = null }
  }, [autoBootstrap, revalidate])

  useEffect(() => {
    const onChange = () => { void revalidate({ interrupt: true }) }
    const onFocus = () => { void revalidate() }
    const onVisible = () => { if (document.visibilityState === 'visible') onFocus() }
    const onStorage = event => { if (event.key === SESSION_SIGNAL) onChange() }
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel(SESSION_SIGNAL)
      channel.current.onmessage = onChange
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const unsubscribe = client.subscribeAuthenticationFailure?.(() => {
      if (!validation.current) onChange()
    })
    const unsubscribeDenied = client.subscribeAuthorizationFailure?.((_error, request) => {
      if (request?.method === 'GET' && !request.path.startsWith('/auth/')) void revalidate({ interrupt: true, reason: 'access' })
      else onFocus()
    })
    return () => {
      channel.current?.close(); channel.current = null
      unsubscribe?.(); unsubscribeDenied?.()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [client, revalidate])

  const login = useCallback(async (email, password) => {
    invalidate()
    const ticket = version.current
    const response = await client.post('/auth/login', { email, password }, { csrf: false, allowRefresh: false })
    if (ticket !== version.current) throw new ApiError({ code: 'SESSION_CHANGED' })
    adopt(authenticated(response.data)); signalChange()
    return response.data
  }, [adopt, client, invalidate, signalChange])

  const logout = useCallback(async ({ requireServerConfirmation = false } = {}) => {
    try { await client.post('/auth/logout', {}) }
    catch (error) { if (requireServerConfirmation && !(error instanceof ApiError && error.status === 401)) throw error }
    invalidate(); adopt(anonymous()); signalChange()
  }, [adopt, client, invalidate, signalChange])
  const logoutAll = useCallback(async () => {
    await client.post('/auth/logout-all', {})
    invalidate(); adopt(anonymous()); signalChange()
  }, [adopt, client, invalidate, signalChange])
  const continueSession = useCallback(() => {
    const next = current.current.pendingUser
    adopt(next ? authenticated(next) : anonymous())
  }, [adopt])
  const goToSignIn = useCallback(() => { invalidate(); adopt(anonymous()) }, [adopt, invalidate])
  const refresh = useCallback(async () => { await client.refreshSession(); return revalidate() }, [client, revalidate])
  const completeAccountSetup = useCallback((setupToken, password, confirmPassword) => client.post('/account-setup/complete', { setupToken, password, confirmPassword }, { csrf: false, allowRefresh: false }), [client])
  const changePassword = useCallback((currentPassword, newPassword, confirmPassword) => client.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }), [client])
  const value = useMemo(() => ({ ...state, bootstrap: revalidate, revalidate, login, logout, logoutAll, refresh, continueSession, goToSignIn, completeAccountSetup, changePassword }), [state, revalidate, login, logout, logoutAll, refresh, continueSession, goToSignIn, completeAccountSetup, changePassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
