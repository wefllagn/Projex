import { describe, expect, it, vi } from 'vitest'
import { createSubmissionApi } from './submission-api.js'

function transport() {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
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
})
