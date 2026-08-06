import { describe, expect, it } from 'vitest'
import type { DestinationStream } from 'pino'
import { createLogger } from './logger.js'

describe('structured log redaction', () => {
  it('redacts source, test, feedback, database, and Git storage fields', () => {
    const chunks: string[] = []
    const destination: DestinationStream = {
      write(message) {
        chunks.push(message)
      },
    }
    const logger = createLogger('info', destination)

    logger.info(
      {
        sourceCode: 'SENTINEL_SOURCE',
        sourceHash: 'SENTINEL_HASH',
        inputSnapshot: 'SENTINEL_INPUT',
        expectedOutputSnapshot: 'SENTINEL_EXPECTED',
        actualOutput: 'SENTINEL_ACTUAL',
        compilerOutput: 'SENTINEL_COMPILER',
        feedbackText: 'SENTINEL_FEEDBACK',
        reason: 'SENTINEL_REASON',
        DATABASE_URL: 'SENTINEL_DATABASE',
        storagePath: 'SENTINEL_STORAGE_PATH',
        repositoryPath: 'SENTINEL_REPOSITORY_PATH',
        gitArguments: ['SENTINEL_GIT_ARGUMENT'],
        GIT_STORAGE_ROOT: 'SENTINEL_GIT_ROOT',
        secret: 'SENTINEL_GIT_CREDENTIAL',
        secretHash: 'SENTINEL_GIT_CREDENTIAL_HASH',
        req: { body: { sourceCode: 'SENTINEL_BODY' } },
      },
      'redaction test',
    )

    const output = chunks.join('')
    for (const sentinel of [
      'SENTINEL_SOURCE',
      'SENTINEL_HASH',
      'SENTINEL_INPUT',
      'SENTINEL_EXPECTED',
      'SENTINEL_ACTUAL',
      'SENTINEL_COMPILER',
      'SENTINEL_FEEDBACK',
      'SENTINEL_REASON',
      'SENTINEL_DATABASE',
      'SENTINEL_STORAGE_PATH',
      'SENTINEL_REPOSITORY_PATH',
      'SENTINEL_GIT_ARGUMENT',
      'SENTINEL_GIT_ROOT',
      'SENTINEL_GIT_CREDENTIAL',
      'SENTINEL_GIT_CREDENTIAL_HASH',
      'SENTINEL_BODY',
    ]) {
      expect(output).not.toContain(sentinel)
    }
    expect(output).toContain('[REDACTED]')
  })
})
