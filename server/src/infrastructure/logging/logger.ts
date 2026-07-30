import type { RequestHandler } from 'express'
import pino, { type Logger } from 'pino'

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
  'smtpPassword',
  '*.smtpPassword',
  'ACCESS_TOKEN_SECRET',
  '*.ACCESS_TOKEN_SECRET',
  'DATABASE_URL',
  '*.DATABASE_URL',
  'databaseUrl',
  '*.databaseUrl',
  'req.body',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
]

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: undefined,
    redact: {
      paths: sensitivePaths,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  })
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
