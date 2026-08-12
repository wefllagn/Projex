import { createContext, useContext } from 'react'

export const DISABLED_CAPABILITIES = Object.freeze({
  status: 'loading',
  profile: 'HOSTED_SAFE',
  java: Object.freeze({ execution: false }),
  git: Object.freeze({ provisioning: false, inspection: false, smartHttp: false }),
  refresh: async () => {},
})

// App always supplies the provider. The permissive fallback keeps isolated component
// harnesses backward-compatible; the production provider itself starts and fails closed.
export const CapabilityContext = createContext({
  status: 'ready',
  profile: 'LOCAL_FULL',
  java: { execution: true },
  git: { provisioning: true, inspection: true, smartHttp: true },
  refresh: async () => {},
})
export function useCapabilities() { return useContext(CapabilityContext) }
