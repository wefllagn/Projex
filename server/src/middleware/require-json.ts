import type { RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error.js'

export const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is('application/json')) {
    next(
      new AppError({
        statusCode: 415,
        code: 'JSON_REQUIRED',
        message: 'Content-Type must be application/json.',
      }),
    )
    return
  }

  next()
}
