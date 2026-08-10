import { describe, expect, it } from 'vitest'
import { AdminProjectionError } from './admin-projections.js'
import {
  projectAcademicActivity,
  projectAcademicRepository,
  projectAcademicSubmission,
  projectDetailedRosterMember,
  projectGovernedClass,
  projectJoinCode,
} from './admin-academic-projections.js'

const classRecord = { id: 'class-1', className: 'Java', section: 'A', semester: 'First', schoolYear: '2030', status: 'ACTIVE' }
const user = { id: 'user-1', fullName: 'Synthetic User', email: 'user@slu.edu.ph' }

describe('admin academic projection allowlists', () => {
  it('fails closed on class and member identity/version mismatches', () => {
    const governed = projectGovernedClass({ ...classRecord, createdAt: null, updatedAt: '2030-01-01T00:00:00.000Z', archivedAt: null, instructor: user }, 'class-1')
    expect(governed.classId).toBe('class-1')
    expect(() => projectGovernedClass({ ...classRecord, updatedAt: '2030-01-01T00:00:00.000Z', instructor: user }, 'other')).toThrow(AdminProjectionError)
    expect(() => projectDetailedRosterMember({ memberId: 'member-1', userId: 'user-1' })).toThrow(AdminProjectionError)
  })

  it('keeps the real membership version and drops unrelated roster data', () => {
    const member = projectDetailedRosterMember({ memberId: 'member-1', userId: 'user-1', fullName: 'Student', email: 'student@slu.edu.ph', userStatus: 'ACTIVE', membershipStatus: 'ACTIVE', joinedAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-02T00:00:00.000Z', removedAt: null, lastActivatedAt: '2030-01-01T00:00:00.000Z', passwordHash: 'must-not-leak' })
    expect(member.updatedAt).toBe('2030-01-02T00:00:00.000Z')
    expect(JSON.stringify(member)).not.toMatch(/passwordHash/i)
  })

  it('never adopts hidden academic or repository material', () => {
    const activity = projectAcademicActivity({ id: 'activity-1', title: 'Loops', status: 'PUBLISHED', language: 'JAVA', totalPoints: 100, maxAttempts: 2, testCaseCount: 3, testCasePointTotal: 60, submissionCount: 4, class: classRecord, createdBy: user, instructions: 'must-not-leak', starterSource: 'must-not-leak', testCases: ['must-not-leak'] })
    const repository = projectAcademicRepository({ id: 'repo-1', repositoryType: 'PERSONAL', repositoryName: 'Practice', slug: 'practice', visibility: 'PRIVATE', status: 'ACTIVE', reviewStatus: 'WORKING', storageStatus: 'READY', storageSizeBytes: null, owner: user, projectTask: null, team: null, counts: {}, storagePath: 'must-not-leak', feedback: 'must-not-leak', credential: 'must-not-leak' })
    expect(JSON.stringify({ activity, repository })).not.toMatch(/instructions|starterSource|testCases|storagePath|feedback|credential|must-not-leak/i)
  })

  it('shows a score only for a released submission', () => {
    const base = { id: 'submission-1', attemptNumber: 1, isLate: false, student: user, activity: { id: 'activity-1', title: 'Loops', status: 'PUBLISHED', class: classRecord }, releasedScore: 98, sourceCode: 'must-not-leak' }
    expect(projectAcademicSubmission({ ...base, submissionStatus: 'ASSESSED' }).releasedScore).toBeNull()
    expect(projectAcademicSubmission({ ...base, submissionStatus: 'RELEASED' }).releasedScore).toBe(98)
  })

  it('adopts join codes only from the matching class response', () => {
    expect(projectJoinCode({ classId: 'class-1', classCode: 'ABCDE-23456', active: true, changedAt: null }, 'class-1').active).toBe(true)
    expect(() => projectJoinCode({ classId: 'class-2', classCode: 'ABCDE-23456', active: true }, 'class-1')).toThrow(AdminProjectionError)
  })

  it('drops an inactive join code from the retained projection', () => {
    expect(projectJoinCode({
      classId: 'class-1',
      classCode: 'SHOULD-NOT-REMAIN',
      active: false,
      changedAt: '2030-01-03T00:00:00.000Z',
    }, 'class-1')).toMatchObject({ active: false, classCode: '' })
  })
})
