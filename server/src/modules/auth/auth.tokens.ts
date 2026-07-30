import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { UserRole } from '@prisma/client'
import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'

const accessClaimsSchema = z.object({
  sub: z.uuid(),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']),
  sid: z.uuid(),
  tokenType: z.literal('access'),
})

export interface AccessClaims {
  sub: string
  role: UserRole
  sid: string
  tokenType: 'access'
}

export interface TokenService {
  createOpaqueToken(): string
  hashOpaqueToken(token: string): string
  safeEqual(left: string, right: string): boolean
  signAccessToken(input: { userId: string; role: UserRole; sessionId: string }): Promise<string>
  verifyAccessToken(token: string): Promise<AccessClaims>
}

export function createTokenService(
  secret: string,
  accessTokenTtlMinutes: number,
): TokenService {
  const key = new TextEncoder().encode(secret)

  return {
    createOpaqueToken() {
      return randomBytes(32).toString('base64url')
    },
    hashOpaqueToken(token) {
      return createHash('sha256').update(token, 'utf8').digest('hex')
    },
    safeEqual(left, right) {
      const leftBuffer = Buffer.from(left)
      const rightBuffer = Buffer.from(right)
      return (
        leftBuffer.length === rightBuffer.length &&
        timingSafeEqual(leftBuffer, rightBuffer)
      )
    },
    async signAccessToken({ userId, role, sessionId }) {
      return new SignJWT({ role, sid: sessionId, tokenType: 'access' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${accessTokenTtlMinutes}m`)
        .sign(key)
    },
    async verifyAccessToken(token) {
      const verified = await jwtVerify(token, key, { algorithms: ['HS256'] })
      return accessClaimsSchema.parse(verified.payload)
    },
  }
}
