import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/

export const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.header('x-request-id')
  const requestId =
    suppliedRequestId && requestIdPattern.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID()

  request.requestId = requestId
  response.setHeader('x-request-id', requestId)
  next()
}
