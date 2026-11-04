import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/api-client.js'
import { CapabilityContext, DISABLED_CAPABILITIES } from './capability-context.js'

function safeProjection(value) {
  if (!value || !['LOCAL_FULL', 'HOSTED_SAFE'].includes(value.profile)) throw new Error('Invalid capability response.')
  for (const flag of [value.java?.execution, value.git?.provisioning, value.git?.inspection, value.git?.smartHttp]) {
    if (typeof flag !== 'boolean') throw new Error('Invalid capability response.')
  }
  return { profile: value.profile, java: { execution: value.java.execution }, git: { provisioning: value.git.provisioning, inspection: value.git.inspection, smartHttp: value.git.smartHttp } }
}

export function CapabilityProvider({ children, client = apiClient }) {
  const [state, setState] = useState(DISABLED_CAPABILITIES)
  const refresh = useCallback(async ({ signal } = {}) => {
    await Promise.resolve()
    setState((current) => ({ ...current, status: 'loading' }))
    try {
      const response = await client.get('/capabilities', { signal, allowRefresh: false })
      if (signal?.aborted) return
      setState({ status: 'ready', ...safeProjection(response.data) })
    } catch (error) {
      if (!signal?.aborted && error?.name !== 'AbortError') setState({ ...DISABLED_CAPABILITIES, status: 'error' })
    }
  }, [client])
  useEffect(() => {
    let controller
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      void refresh({ signal: controller.signal })
    }
    load()
    const visible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(visible, 15000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh])
  const value = useMemo(() => ({ ...state, refresh }), [refresh, state])
  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>
}
