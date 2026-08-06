import { describe, expect, it } from 'vitest'
import { evaluateGitPermission } from './git-authorization.js'
import type { GitTransportAccess } from './git-transport.types.js'

function access(overrides: Partial<GitTransportAccess> = {}): GitTransportAccess {
  return {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    repositoryType: 'CLASS_PROJECT',
    ownerId: '22222222-2222-4222-8222-222222222222',
    status: 'ACTIVE',
    storageStatus: 'READY',
    storagePath: 'repositories/11/11/repository.git',
    reviewStatus: 'WORKING',
    user: { id: '22222222-2222-4222-8222-222222222222', role: 'STUDENT', status: 'ACTIVE' },
    repositoryMember: { memberRole: 'OWNER', status: 'ACTIVE' },
    teamMember: { status: 'ACTIVE' },
    projectTask: {
      status: 'PUBLISHED',
      dueDate: new Date('2030-01-02T00:00:00.000Z'),
      class: { instructorId: '33333333-3333-4333-8333-333333333333', status: 'ACTIVE', membership: { status: 'ACTIVE' } },
    },
    teamLeadStudentId: '22222222-2222-4222-8222-222222222222',
    ...overrides,
  }
}

describe('Git authorization', () => {
  const now = new Date('2030-01-01T00:00:00.000Z')

  it('allows an active class-project lead to read, write, and update main', () => {
    expect(evaluateGitPermission(access(), now)).toEqual({ read: true, write: true, canUpdateMain: true })
  })

  it('allows active members to write feature branches without main authority', () => {
    expect(evaluateGitPermission(access({ ownerId: '44444444-4444-4444-8444-444444444444', teamLeadStudentId: '44444444-4444-4444-8444-444444444444' }), now))
      .toEqual({ read: true, write: true, canUpdateMain: false })
  })

  it('keeps instructors read-only and administrators metadata-only', () => {
    const instructor = access({
      user: { id: '33333333-3333-4333-8333-333333333333', role: 'INSTRUCTOR', status: 'ACTIVE' },
      repositoryMember: null,
      teamMember: null,
    })
    expect(evaluateGitPermission(instructor, now)).toEqual({ read: true, write: false, canUpdateMain: false })
    const admin = access({ user: { id: '55555555-5555-4555-8555-555555555555', role: 'ADMIN', status: 'ACTIVE' }, repositoryMember: null, teamMember: null })
    expect(evaluateGitPermission(admin, now)).toEqual({ read: false, write: false, canUpdateMain: false })
  })

  it('revokes source access for removed or inactive members', () => {
    expect(evaluateGitPermission(access({ repositoryMember: { memberRole: 'MEMBER', status: 'REMOVED' } }), now).read).toBe(false)
    expect(evaluateGitPermission(access({ user: { id: '22222222-2222-4222-8222-222222222222', role: 'STUDENT', status: 'SUSPENDED' } }), now).read).toBe(false)
    expect(evaluateGitPermission(access({
      projectTask: {
        ...access().projectTask!,
        class: { ...access().projectTask!.class, membership: { status: 'REMOVED' } },
      },
    }), now).read).toBe(false)
  })

  it('makes class repositories read-only after cutoff or review submission', () => {
    expect(evaluateGitPermission(access({ projectTask: { ...access().projectTask!, dueDate: now } }), now).write).toBe(false)
    expect(evaluateGitPermission(access({ reviewStatus: 'READY_FOR_REVIEW' }), now).write).toBe(false)
  })
})
