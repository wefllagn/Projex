import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiClient } from '../api/api-client.js'
import { AuthContext } from './auth-context.js'

function authenticatedState(user) {
  return user?.status === 'ACTIVE'
    ? { status: 'authenticated', user, error: null }
    : { status: 'blocked', user, error: null }
}

function isAnonymousError(error) {
  return error instanceof ApiError && (
    error.status === 401 ||
    error.code === 'CSRF_TOKEN_MISSING' ||
    error.code === 'CSRF_VALIDATION_FAILED'
  )
}

export function AuthProvider({ children, client = apiClient, autoBootstrap = true }) {
  const [state, setState] = useState({ status: autoBootstrap ? 'loading' : 'anonymous', user: null, error: null })

  const bootstrap = useCallback(async ({ signal } = {}) => {
    await Promise.resolve()
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const response = await client.get('/auth/me', { signal })
      setState(authenticatedState(response.data))
      return response.data
    } catch (error) {
      if (error?.name === 'AbortError') return null
      if (isAnonymousError(error)) {
        setState({ status: 'anonymous', user: null, error: null })
        return null
      }
      setState({ status: 'error', user: null, error })
      return null
    }
  }, [client])

  useEffect(() => {
    if (!client.subscribeAuthenticationFailure) return undefined
    return client.subscribeAuthenticationFailure(() => {
      setState({ status: 'anonymous', user: null, error: null })
    })
  }, [client])

  useEffect(() => {
    if (!autoBootstrap) return undefined
    const controller = new AbortController()
    const restoreSession = async () => {
      try {
        const response = await client.get('/auth/me', { signal: controller.signal })
        setState(authenticatedState(response.data))
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (isAnonymousError(error)) {
          setState({ status: 'anonymous', user: null, error: null })
          return
        }
        setState({ status: 'error', user: null, error })
      }
    }
    restoreSession()
    return () => controller.abort()
  }, [autoBootstrap, client])

  const login = useCallback(async (email, password) => {
    const response = await client.post('/auth/login', { email, password }, {
      csrf: false,
      allowRefresh: false,
    })
    setState(authenticatedState(response.data))
    return response.data
  }, [client])

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout', {})
    } catch {
      // Protected content must disappear even when the server session is already unavailable.
    } finally {
      setState({ status: 'anonymous', user: null, error: null })
    }
  }, [client])

  const logoutAll = useCallback(async () => {
    try {
      await client.post('/auth/logout-all', {})
    } finally {
      setState({ status: 'anonymous', user: null, error: null })
    }
  }, [client])

  const refresh = useCallback(async () => {
    await client.refreshSession()
    return bootstrap()
  }, [bootstrap, client])

  const completeAccountSetup = useCallback(async (setupToken, password, confirmPassword) => {
    return client.post('/account-setup/complete', {
      setupToken,
      password,
      confirmPassword,
    }, {
      csrf: false,
      allowRefresh: false,
    })
  }, [client])

  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    return client.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    })
  }, [client])

  const value = useMemo(() => ({
    ...state,
    bootstrap,
    login,
    logout,
    logoutAll,
    refresh,
    completeAccountSetup,
    changePassword,
  }), [bootstrap, changePassword, completeAccountSetup, login, logout, logoutAll, refresh, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
