export type AttemptCreditPolicyValue = 'LATEST' | 'HIGHEST'

export interface ReleasedCreditCandidate {
  id: string
  attemptNumber: number
  releasedFinalScore: number
}

export function selectCreditedReleasedAttempt<T extends ReleasedCreditCandidate>(
  policy: AttemptCreditPolicyValue,
  candidates: readonly T[],
): T | null {
  return candidates.reduce<T | null>((credited, candidate) => {
    if (!credited) return candidate
    if (policy === 'LATEST') {
      return candidate.attemptNumber > credited.attemptNumber
        ? candidate
        : credited
    }
    if (candidate.releasedFinalScore > credited.releasedFinalScore) {
      return candidate
    }
    if (
      candidate.releasedFinalScore === credited.releasedFinalScore &&
      candidate.attemptNumber > credited.attemptNumber
    ) {
      return candidate
    }
    return credited
  }, null)
}

export function submissionAttemptLabel(record: {
  attemptNumber: number
  replacementForAttemptNumber?: number | null
}): string {
  return record.replacementForAttemptNumber
    ? `Replacement attempt for Attempt ${record.replacementForAttemptNumber}`
    : `Attempt ${record.attemptNumber}`
}
