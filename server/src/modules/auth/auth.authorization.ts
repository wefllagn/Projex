import type { UserRole } from '@prisma/client'
import type { RequestHandler } from 'express'
import { AppError } from '../../shared/errors/app-error.js'

export function requireAnyRole(roles: readonly UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.user.role)) {
      next(
        new AppError({
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'You are not authorized to perform this action.',
        }),
      )
      return
    }
    next()
  }
}

export function requireRole(role: UserRole): RequestHandler {
  return requireAnyRole([role])
}
