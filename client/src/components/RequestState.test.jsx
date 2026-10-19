import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RequestState from './RequestState.jsx'
import { ApiError } from '../api/api-client.js'

describe('safe ordinary error presentation', () => {
  it('does not expose raw exceptions or request diagnostics', () => {
    render(<RequestState error={new ApiError({ status: 500, message: 'private constraint stack', requestId: 'diagnostic-reference' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again')
    expect(screen.queryByText(/private constraint|diagnostic-reference|Request ID|500/)).not.toBeInTheDocument()
  })
})
