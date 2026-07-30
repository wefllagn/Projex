import type { Request, RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error.js'

interface RateLimitBucket {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  windowMs: number
  max: number
  key: (request: Request) => string
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>()

  return (request, _response, next) => {
    const now = Date.now()
    const key = options.key(request)
    const existing = buckets.get(key)
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + options.windowMs }

    bucket.count += 1
    buckets.set(key, bucket)

    if (bucket.count > options.max) {
      next(
        new AppError({
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Try again later.',
        }),
      )
      return
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey)
      }
    }

    next()
  }
}
