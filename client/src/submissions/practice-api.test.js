import { describe, expect, it, vi } from 'vitest'
import { createPracticeApi } from './practice-api.js'
describe('practice transport adapter', () => {
  it('keeps practice starts separate and polls the existing safe result endpoints with the supplied client', () => {
    const client = { get: vi.fn(), post: vi.fn() }, api = createPracticeApi(client), options = { signal: new AbortController().signal }
    api.enter('activity', options)
    api.get('activity', options)
    api.save('activity', { operation: 'RESET' })
    api.getSave('activity', 'save', options)
    api.createPracticeRun('activity', 'source')
    api.getPracticeRun('run', options)
    api.createInteractiveCodeRun('activity', 'source', 'key')
    api.getInteractiveCodeRun('console', options)
    api.sendInteractiveInput('console', { text: 'ok' }, options)
    api.stopInteractiveCodeRun('console', options)
    expect(client.get.mock.calls).toEqual([
      ['/activities/activity/practice', options], ['/activities/activity/practice/saves/save', options],
      ['/visible-test-runs/run', options], ['/interactive-code-runs/console', options],
    ])
    expect(client.post.mock.calls).toEqual([
      ['/activities/activity/practice', {}, options], ['/activities/activity/practice/saves', { operation: 'RESET' }],
      ['/activities/activity/practice/visible-test-runs', { sourceCode: 'source' }],
      ['/activities/activity/practice/interactive-code-runs', { sourceCode: 'source', requestKey: 'key' }],
      ['/interactive-code-runs/console/input', { text: 'ok' }, options], ['/interactive-code-runs/console/stop', {}, options],
    ])
  })
})
