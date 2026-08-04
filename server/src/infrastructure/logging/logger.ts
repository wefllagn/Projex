import type { RequestHandler } from 'express'
import pino, { type DestinationStream, type Logger } from 'pino'

const sensitivePaths = [
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'password',
  '*.password',
  'sessionToken',
  '*.sessionToken',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'csrfToken',
  '*.csrfToken',
  'setupToken',
  '*.setupToken',
  'tokenHash',
  '*.tokenHash',
  'passwordHash',
  '*.passwordHash',
  'classCode',
  '*.classCode',
  'joinCode',
  '*.joinCode',
  'starterCode',
  '*.starterCode',
  'sourceCode',
  '*.sourceCode',
  'sourceHash',
  '*.sourceHash',
  'inputData',
  '*.inputData',
  'expectedOutput',
  '*.expectedOutput',
  'inputSnapshot',
  '*.inputSnapshot',
  'expectedOutputSnapshot',
  '*.expectedOutputSnapshot',
  'actualOutput',
  '*.actualOutput',
  'compilerOutput',
  '*.compilerOutput',
  'feedbackText',
  '*.feedbackText',
  'reason',
  '*.reason',
  'testCases',
  '*.testCases',
  'smtpPassword',
  '*.smtpPassword',
  'ACCESS_TOKEN_SECRET',
  '*.ACCESS_TOKEN_SECRET',
  'DATABASE_URL',
  '*.DATABASE_URL',
  'TEST_DATABASE_URL',
  '*.TEST_DATABASE_URL',
  'databaseUrl',
  '*.databaseUrl',
  'storagePath',
  '*.storagePath',
  'repositoryPath',
  '*.repositoryPath',
  'stagingPath',
  '*.stagingPath',
  'quarantinePath',
  '*.quarantinePath',
  'gitExecutable',
  '*.gitExecutable',
  'gitStorageRoot',
  '*.gitStorageRoot',
  'gitArguments',
  '*.gitArguments',
  'GIT_EXECUTABLE',
  '*.GIT_EXECUTABLE',
  'GIT_STORAGE_ROOT',
  '*.GIT_STORAGE_ROOT',
  'TEST_GIT_STORAGE_ROOT',
  '*.TEST_GIT_STORAGE_ROOT',
  'req.body',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
]

export function createLogger(
  level: string,
  destination?: DestinationStream,
): Logger {
  const options = {
    level,
    base: undefined,
    redact: {
      paths: sensitivePaths,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }
  return destination ? pino(options, destination) : pino(options)
}

export function createRequestLogger(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint()

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      const fields = {
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      }

      if (response.statusCode >= 500) {
        logger.error(fields, 'request completed')
      } else if (response.statusCode >= 400) {
        logger.warn(fields, 'request completed')
      } else {
        logger.info(fields, 'request completed')
      }
    })

    next()
  }
}
