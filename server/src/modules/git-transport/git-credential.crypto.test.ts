import { describe, expect, it } from 'vitest'
import {
  generateGitCredentialSecret,
  hashGitCredentialSecret,
  verifyGitCredentialSecret,
} from './git-credential.crypto.js'

describe('Git credential secrets', () => {
  it('generates high-entropy one-time secrets and stores only verifiers', () => {
    const secret = generateGitCredentialSecret()
    const other = generateGitCredentialSecret()
    const hash = hashGitCredentialSecret(secret)
    expect(secret).not.toBe(other)
    expect(secret.length).toBeGreaterThanOrEqual(40)
    expect(hash).not.toBe(secret)
    expect(verifyGitCredentialSecret(secret, hash)).toBe(true)
    expect(verifyGitCredentialSecret(other, hash)).toBe(false)
  })
})
