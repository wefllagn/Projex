import { describe, expect, it } from 'vitest'
import { selectCreditedReleasedAttempt } from './submission-credit.js'

const candidates = [
  { id: 'attempt-1', attemptNumber: 1, releasedFinalScore: 70 },
  { id: 'attempt-2', attemptNumber: 2, releasedFinalScore: 90 },
  { id: 'attempt-3', attemptNumber: 3, releasedFinalScore: 80 },
]

describe('credited released attempt selection', () => {
  it('uses chronological attempt number for LATEST', () => {
    expect(selectCreditedReleasedAttempt('LATEST', candidates)?.id).toBe(
      'attempt-3',
    )
  })

  it('uses released score and the later attempt tie-break for HIGHEST', () => {
    expect(selectCreditedReleasedAttempt('HIGHEST', candidates)?.id).toBe(
      'attempt-2',
    )
    expect(
      selectCreditedReleasedAttempt('HIGHEST', [
        candidates[0]!,
        { id: 'attempt-2-tie', attemptNumber: 2, releasedFinalScore: 70 },
      ])?.id,
    ).toBe('attempt-2-tie')
  })

  it('returns null when no released candidate exists', () => {
    expect(selectCreditedReleasedAttempt('LATEST', [])).toBeNull()
  })
})
