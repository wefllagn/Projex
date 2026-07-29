import type { ErrorRequestHandler } from 'express'
import type { Logger } from 'pino'
import { AppError } from '../shared/errors/app-error.js'
import { errorResponse } from '../shared/http/response.js'

interface HttpParserError extends Error {
  status?: number
  type?: string
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    const parserError = error as HttpParserError

    if (parserError.type === 'entity.too.large') {
      return new AppError({
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the configured limit.',
      })
    }

    if (parserError.status === 400 && error instanceof SyntaxError) {
      return new AppError({
        statusCode: 400,
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON.',
      })
    }
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  })
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, request, response, _next) => {
    const appError = normalizeError(error)

    if (appError.statusCode >= 500) {
      logger.error(
        {
          requestId: request.requestId,
          code: appError.code,
          statusCode: appError.statusCode,
          errorType: error instanceof Error ? error.name : typeof error,
        },
        'request failed',
      )
    }

    response
      .status(appError.statusCode)
      .json(
        errorResponse(
          {
            code: appError.code,
            message: appError.message,
            ...(appError.details ? { details: appError.details } : {}),
          },
          request.requestId,
        ),
      )
  }
}
