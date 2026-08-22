import { describe, expect, it } from 'vitest'
import {
  AdminProjectionError,
  assertMatchingAdminAccount,
  projectAdminAccount,
  projectAdminManualSetup,
  projectAdminOverview,
  projectAdminUser,
} from './admin-projections.js'

const user = {
  id: 'user-1', fullName: 'Synthetic User', email: 'synthetic@slu.edu.ph', role: 'STUDENT', status: 'ACTIVE',
  createdAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z',
  passwordHash: 'must-not-leak', tokenHash: 'must-not-leak', ipAddress: '127.0.0.1',
  manualSetup: { setupLink: 'http://example.test/account-setup#token=must-not-leak' },
}

const summary = {
  userId: 'user-1', fullName: 'Synthetic User', universityEmail: 'synthetic@slu.edu.ph', role: 'STUDENT', status: 'ACTIVE',
  createdAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z', passwordChangedAt: null, lastLoginAt: null,
  accountSetup: { state: 'COMPLETE', lastIssuedAt: null, expiresAt: null, token: 'must-not-leak' },
  sessions: { active: 1, revoked: 2, expired: 3, cookie: 'must-not-leak', userAgents: ['must-not-leak'] },
  memberships: [], sourceCode: 'must-not-leak', gitSecret: 'must-not-leak', storagePath: 'must-not-leak',
}

describe('admin projection allowlists', () => {
  it('accepts only a fragment-based HTTP(S) manual setup link with an expiration', () => {
    expect(projectAdminManualSetup({
      manualSetup: {
        setupLink: 'http://192.0.2.20:5173/account-setup#token=abcdefghijklmnopqrstuvwxyz123456',
        expiresAt: '2030-01-02T00:00:00.000Z',
      },
    })).toEqual({
      setupLink: 'http://192.0.2.20:5173/account-setup#token=abcdefghijklmnopqrstuvwxyz123456',
      expiresAt: '2030-01-02T00:00:00.000Z',
    })
    expect(() => projectAdminManualSetup({
      manualSetup: {
        setupLink: 'http://192.0.2.20:5173/account-setup?token=abcdefghijklmnopqrstuvwxyz123456',
        expiresAt: '2030-01-02T00:00:00.000Z',
      },
    })).toThrow(AdminProjectionError)
  })

  it('keeps directory records minimal', () => {
    const projected = projectAdminUser(user, 'user-1')
    expect(projected).toEqual({
      id: 'user-1', fullName: 'Synthetic User', universityEmail: 'synthetic@slu.edu.ph', role: 'STUDENT', status: 'ACTIVE',
      createdAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z',
    })
    expect(JSON.stringify(projected)).not.toMatch(/password|token|ipAddress/i)
  })

  it('keeps account detail to the accepted safe summary', () => {
    const projected = projectAdminAccount(summary, 'user-1')
    expect(projected.sessions).toEqual({ active: 1, revoked: 2, expired: 3 })
    expect(JSON.stringify(projected)).not.toMatch(/cookie|userAgent|sourceCode|gitSecret|storagePath|token/i)
    expect(assertMatchingAdminAccount(projectAdminUser(user), projected, 'user-1')).toBe(projected)
  })

  it('rejects route identity and cross-contract mismatches', () => {
    expect(() => projectAdminUser(user, 'other-user')).toThrow(AdminProjectionError)
    expect(() => projectAdminAccount(summary, 'other-user')).toThrow(AdminProjectionError)
    expect(() => assertMatchingAdminAccount(projectAdminUser(user), { ...projectAdminAccount(summary), status: 'SUSPENDED' }, 'user-1')).toThrow(AdminProjectionError)
  })

  it('projects only authoritative overview groups and nonnegative counts', () => {
    const projected = projectAdminOverview({
      generatedAt: '2030-01-01T00:00:00.000Z',
      users: { total: 4, byRole: { STUDENT: 2, INSTRUCTOR: 1, ADMIN: 1, unsafe: 99 }, byStatus: { ACTIVE: 4 }, accountSetup: { complete: 4, pending: 0, actionRequired: 0 } },
      academics: { classesByStatus: { ACTIVE: 2 }, membershipsByStatus: {}, activitiesByStatus: {}, submissionsByStatus: {}, projectTasksByStatus: {}, teamsByStatus: {} },
      repositories: { byType: {}, byLifecycle: { ACTIVE: 3 }, byStorage: {}, byReview: {}, knownMeasuredBytes: '1024', measuredRecords: 3, unmeasuredRecords: 0, storagePath: 'must-not-leak' },
      operations: { executionJobsByStatus: {}, provisioningJobsByStatus: {}, gitCredentials: { active: 1, expired: 0, revoked: 0, secret: 'must-not-leak' }, workerHealth: 'healthy' },
      capacityPercent: 74,
    })
    expect(projected.users.byRole).toEqual({ STUDENT: 2, INSTRUCTOR: 1, ADMIN: 1 })
    expect(projected).not.toHaveProperty('capacityPercent')
    expect(JSON.stringify(projected)).not.toMatch(/storagePath|workerHealth|secret/i)
  })
})
