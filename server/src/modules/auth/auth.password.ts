import argon2 from 'argon2'
import { z } from 'zod'
import { AppError } from '../../shared/errors/app-error.js'

export const passwordSchema = z
  .string()
  .min(10, 'Password must contain at least 10 characters.')
  .max(128, 'Password must contain at most 128 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character.')

export interface PasswordService {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  assertPolicy(password: string): void
}

export function createPasswordService(): PasswordService {
  return {
    async hash(password) {
      return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      })
    },
    async verify(hash, password) {
      try {
        return await argon2.verify(hash, password)
      } catch {
        return false
      }
    },
    assertPolicy(password) {
      const result = passwordSchema.safeParse(password)
      if (!result.success) {
        throw new AppError({
          statusCode: 400,
          code: 'PASSWORD_POLICY_VIOLATION',
          message: 'Password does not meet the security requirements.',
          details: {
            issues: result.error.issues.map((issue) => issue.message),
          },
        })
      }
    },
  }
}
