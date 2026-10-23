import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RequestState from './RequestState.jsx'
import { ApiError } from '../api/api-client.js'

describe('Shared safe request presentation', () => {
  it.each([401, 403, 404, 409, 422, 500, 505])('conceals diagnostics for %s without changing the error contract', (status) => {
    const error = new ApiError({ status, requestId: 'private-reference', message: 'Raw internal exception at /api/private' })
    render(<RequestState error={error} />)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/private-reference|Raw internal|\/api\/|401|403|404|409|422|500|505/)
    expect(error.status).toBe(status)
    expect(error.requestId).toBe('private-reference')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not expose raw exceptions or request diagnostics', () => {
    render(<RequestState error={new ApiError({ status: 500, message: 'private constraint stack', requestId: 'diagnostic-reference' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again')
    expect(screen.queryByText(/private constraint|diagnostic-reference|Request ID|500/)).not.toBeInTheDocument()
  })
})
