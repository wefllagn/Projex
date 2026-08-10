import { describe, expect, it, vi } from 'vitest'
import { createSubmissionApi } from './submission-api.js'

function transport() {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  }
}

describe('submission API adapter', () => {
  it('maps bounded student reads and practice execution routes', async () => {
    const client = transport()
    const api = createSubmissionApi(client)

    await api.listSubmissions('activity-1', { page: 2, pageSize: 20, status: 'RELEASED' })
    await api.getSubmission('submission-1')
    await api.createVisibleTestRun('activity-1', 'class Main {}')
    await api.getVisibleTestRun('run-1')

    expect(client.get).toHaveBeenNthCalledWith(1, '/activities/activity-1/submissions?page=2&pageSize=20&status=RELEASED', undefined)
    expect(client.get).toHaveBeenNthCalledWith(2, '/submissions/submission-1', undefined)
    expect(client.post).toHaveBeenCalledWith('/activities/activity-1/visible-test-runs', { sourceCode: 'class Main {}' }, undefined)
    expect(client.get).toHaveBeenNthCalledWith(3, '/visible-test-runs/run-1', undefined)
  })

  it('places the idempotency key only in the required header', async () => {
    const client = transport()
    const api = createSubmissionApi(client)
    const sourceCode = 'public class Main {}'
    const idempotencyKey = 'submission:00000000-0000-4000-8000-000000000001'

    await api.createSubmission('activity-1', sourceCode, idempotencyKey)

    const [path, body, options] = client.post.mock.calls[0]
    expect(path).toBe('/activities/activity-1/submissions')
    expect(body).toEqual({ sourceCode })
    expect(JSON.stringify(body)).not.toContain(idempotencyKey)
    expect(path).not.toContain(idempotencyKey)
    expect(options.headers.get('Idempotency-Key')).toBe(idempotencyKey)
  })

  it('maps instructor correction, review, release, retry, and resolution routes', async () => {
    const client = transport()
    const api = createSubmissionApi(client)
    const version = '2026-08-10T00:00:00.000Z'

    await api.correctAutomatedScore('submission-1', {
      newEffectiveScore: 80,
      reason: 'Corrected after reviewing the preserved assessment evidence.',
      expectedUpdatedAt: version,
    })
    await api.saveReview('submission-1', {
      instructorPoints: 12,
      feedbackText: 'Good explanation.',
      expectedUpdatedAt: version,
    })
    await api.releaseSubmission('submission-1', { expectedUpdatedAt: version })
    await api.retryAssessment('submission-1', { expectedUpdatedAt: version })
    await api.resolveAssessmentFailure('submission-1', {
      resolutionType: 'REPLACEMENT_GRANTED',
      reason: 'The assessment infrastructure failed after its retry allowance.',
      replacementExpiresAt: '2026-08-11T00:00:00.000Z',
      expectedUpdatedAt: version,
    })

    expect(client.post).toHaveBeenNthCalledWith(1, '/submissions/submission-1/score-corrections', expect.objectContaining({ newEffectiveScore: 80 }), undefined)
    expect(client.put).toHaveBeenCalledWith('/submissions/submission-1/review', expect.objectContaining({ instructorPoints: 12 }), undefined)
    expect(client.post).toHaveBeenNthCalledWith(2, '/submissions/submission-1/release', { expectedUpdatedAt: version }, undefined)
    expect(client.post).toHaveBeenNthCalledWith(3, '/submissions/submission-1/assessment/retry', { expectedUpdatedAt: version }, undefined)
    expect(client.post).toHaveBeenNthCalledWith(4, '/submissions/submission-1/assessment/resolve-failure', expect.objectContaining({ resolutionType: 'REPLACEMENT_GRANTED' }), undefined)
  })
})
