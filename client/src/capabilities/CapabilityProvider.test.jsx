import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CapabilityProvider } from './CapabilityProvider.jsx'
import { useCapabilities } from './capability-context.js'

function Probe() { const value = useCapabilities(); return <output>{value.status}:{String(value.java.execution)}:{String(value.git.provisioning)}</output> }

describe('CapabilityProvider', () => {
  it('refreshes genuine transport availability when returning from a Git client', async () => {
    const ready = { profile: 'HOSTED_SAFE', java: { execution: true }, git: { provisioning: true, inspection: true, smartHttp: true } }
    const client = { get: vi.fn().mockResolvedValueOnce({ data: ready }).mockResolvedValue({ data: { ...ready, git: { ...ready.git, smartHttp: false } } }) }
    function TransportProbe() { return <output>{String(useCapabilities().git.smartHttp)}</output> }
    render(<CapabilityProvider client={client}><TransportProbe /></CapabilityProvider>)
    await waitFor(() => expect(screen.getByText('true')).toBeInTheDocument())
    fireEvent.focus(window)
    await waitFor(() => expect(screen.getByText('false')).toBeInTheDocument())
  })
  it('adopts the allowlisted server contract', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { profile: 'LOCAL_FULL', java: { execution: true }, git: { provisioning: true, inspection: true, smartHttp: false } } }) }
    render(<CapabilityProvider client={client}><Probe /></CapabilityProvider>)
    await waitFor(() => expect(screen.getByText('ready:true:true')).toBeInTheDocument())
  })
  it('fails closed when capabilities cannot be loaded', async () => {
    render(<CapabilityProvider client={{ get: vi.fn().mockRejectedValue(new Error('offline')) }}><Probe /></CapabilityProvider>)
    await waitFor(() => expect(screen.getByText('error:false:false')).toBeInTheDocument())
  })
})
