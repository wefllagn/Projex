import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateGitCredentialSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function hashGitCredentialSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('base64url')
}

export function verifyGitCredentialSecret(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashGitCredentialSecret(secret), 'utf8')
  const expected = Buffer.from(expectedHash, 'utf8')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
