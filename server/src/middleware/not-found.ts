import type { RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error.js'

export const notFoundMiddleware: RequestHandler = (_request, _response, next) => {
  next(
    new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Route not found.',
    }),
  )
}
