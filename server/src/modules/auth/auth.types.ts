import type { UserRole, UserStatus } from '@prisma/client'

export interface SafeUserProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface AuthUser extends SafeUserProfile {
  passwordHash: string | null
  passwordChangedAt: Date | null
}

export interface AuthSession {
  id: string
  userId: string
  familyId: string
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  replacedBySessionId: string | null
}

export interface AuthContext {
  user: SafeUserProfile
  session: AuthSession
}

export interface SessionMetadata {
  userAgent?: string
  ipAddress?: string
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  csrfToken: string
}
