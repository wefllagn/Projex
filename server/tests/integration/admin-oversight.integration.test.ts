import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaDatabaseHealth } from '../../src/infrastructure/database/prisma.js'
import { createPrismaAdminOversightRepository } from '../../src/modules/admin/admin-oversight.repository.js'
import {
  adminActivityQuerySchema,
  adminAuditEventQuerySchema,
  adminClassQuerySchema,
  adminExecutionJobQuerySchema,
  adminGitCredentialQuerySchema,
  adminProjectTaskQuerySchema,
  adminProvisioningJobQuerySchema,
  adminRepositoryQuerySchema,
  adminSubmissionQuerySchema,
} from '../../src/modules/admin/admin-oversight.schemas.js'
import { createAdminOversightService } from '../../src/modules/admin/admin-oversight.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const now = new Date('2031-01-10T08:00:00.000Z')

beforeEach(async () => cleanIntegrationDatabase(prisma))
afterAll(async () => prisma.$disconnect())

function service() {
  return createAdminOversightService({
    repository: createPrismaAdminOversightRepository(prisma),
    databaseHealth: createPrismaDatabaseHealth(prisma),
    now: () => now,
  })
}

async function createSensitiveFixture() {
  const admin = await createActiveUser(prisma, 'ADMIN')
  const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
  const student = await createActiveUser(prisma, 'STUDENT')
  const classRecord = await createActiveClass(prisma, instructor.id, 'Administrative View Class')
  await createActiveMembership(prisma, classRecord.id, student.id)
  const activity = await prisma.programmingActivity.create({
    data: {
      classId: classRecord.id,
      createdById: instructor.id,
      title: 'Safe activity title',
      instructions: 'SECRET_ACTIVITY_INSTRUCTIONS',
      starterCode: 'SECRET_STARTER_SOURCE',
      dueDate: new Date('2031-01-20T08:00:00.000Z'),
      totalPoints: 100,
      maxAttempts: 3,
      status: 'PUBLISHED',
      publishedAt: new Date('2031-01-01T08:00:00.000Z'),
    },
  })
  await prisma.testCase.create({
    data: {
      activityId: activity.id,
      name: 'SECRET_HIDDEN_TEST_NAME',
      testCaseOrder: 1,
      inputData: 'SECRET_HIDDEN_INPUT',
      expectedOutput: 'SECRET_HIDDEN_OUTPUT',
      isHidden: true,
      points: 40,
    },
  })
  const released = await prisma.activitySubmission.create({
    data: {
      activityId: activity.id,
      studentId: student.id,
      attemptNumber: 1,
      sourceCode: 'SECRET_SUBMITTED_SOURCE',
      sourceHash: 'a'.repeat(64),
      activityTitleSnapshot: activity.title,
      dueDateSnapshot: activity.dueDate,
      totalPointsSnapshot: 100,
      automatedMaximum: 40,
      instructorMaximum: 60,
      submissionStatus: 'RELEASED',
      releasedFinalScore: 88,
      releasedAt: new Date('2031-01-09T08:00:00.000Z'),
    },
  })
  const assessed = await prisma.activitySubmission.create({
    data: {
      activityId: activity.id,
      studentId: student.id,
      attemptNumber: 2,
      sourceCode: 'SECOND_SECRET_SUBMITTED_SOURCE',
      sourceHash: 'b'.repeat(64),
      activityTitleSnapshot: activity.title,
      dueDateSnapshot: activity.dueDate,
      totalPointsSnapshot: 100,
      automatedMaximum: 40,
      instructorMaximum: 60,
      submissionStatus: 'ASSESSED',
    },
  })
  const projectTask = await prisma.projectTask.create({
    data: {
      classId: classRecord.id,
      createdById: instructor.id,
      title: 'Safe project title',
      instructions: 'SECRET_PROJECT_INSTRUCTIONS',
      dueDate: new Date('2031-01-25T08:00:00.000Z'),
      maxTeamSize: 4,
      status: 'PUBLISHED',
      publishedAt: new Date('2031-01-01T08:00:00.000Z'),
    },
  })
  const repository = await prisma.repository.create({
    data: {
      ownerId: student.id,
      repositoryType: 'PERSONAL',
      repositoryName: 'Safe Personal Repository',
      slug: `safe-personal-${student.id}`,
      description: 'SECRET_REPOSITORY_DESCRIPTION',
      storagePath: 'SECRET_HOST_STORAGE_PATH',
      storageStatus: 'READY',
      storageSizeBytes: 1234n,
      provisionedAt: new Date('2031-01-02T08:00:00.000Z'),
      storageVerifiedAt: new Date('2031-01-02T08:00:00.000Z'),
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      reviewStatus: 'WORKING',
    },
  })
  await prisma.repositoryMember.create({
    data: { repositoryId: repository.id, studentId: student.id, memberRole: 'OWNER' },
  })
  await prisma.repositoryFeedback.create({
    data: {
      repositoryId: repository.id,
      instructorId: instructor.id,
      feedbackText: 'SECRET_FEEDBACK_BODY',
      status: 'DRAFT',
    },
  })
  const provisioningRepository = await prisma.repository.create({
    data: {
      ownerId: student.id,
      repositoryType: 'PERSONAL',
      repositoryName: 'Provisioning Repository',
      slug: `provisioning-${student.id}`,
      description: 'SECOND_SECRET_REPOSITORY_DESCRIPTION',
      storageStatus: 'PROVISIONING',
      storageFailureCode: 'SECRET_STORAGE_FAILURE',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      reviewStatus: 'WORKING',
    },
  })
  await prisma.executionJob.create({
    data: {
      jobType: 'OFFICIAL_ASSESSMENT',
      submissionId: assessed.id,
      status: 'RUNNING',
      claimAttempt: 1,
      maxClaimAttempts: 3,
      claimedAt: new Date('2031-01-10T06:00:00.000Z'),
      leaseExpiresAt: new Date('2031-01-10T07:00:00.000Z'),
      workerId: 'SECRET_WORKER_HOST',
      lastFailureCode: 'unsafe raw process output',
    },
  })
  await prisma.repositoryProvisioningJob.create({
    data: {
      repositoryId: provisioningRepository.id,
      status: 'RUNNING',
      claimAttempt: 1,
      maxClaimAttempts: 3,
      claimedAt: new Date('2031-01-10T06:00:00.000Z'),
      leaseExpiresAt: new Date('2031-01-10T07:00:00.000Z'),
      workerId: 'SECRET_GIT_WORKER_HOST',
      lastFailureCode: 'GIT_COMMAND_FAILED',
      quarantineKey: 'SECRET_QUARANTINE_KEY',
    },
  })
  await prisma.gitCredential.create({
    data: {
      userId: student.id,
      repositoryId: repository.id,
      secretHash: 'SECRET_GIT_CREDENTIAL_HASH',
      allowedOperations: ['READ'],
      expiresAt: new Date('2031-01-11T08:00:00.000Z'),
    },
  })
  await prisma.adminAuditEvent.create({
    data: {
      actorAdminId: admin.id,
      action: 'USER_STATUS_CHANGED',
      targetType: 'USER',
      targetId: student.id,
      reason: 'Approved bounded administrative reason.',
      requestId: '77777777-7777-4777-8777-777777777777',
      metadataJson: {
        previousStatus: 'INACTIVE',
        newStatus: 'ACTIVE',
        revokedSessionCount: 1,
        arbitrarySecret: 'SECRET_ARBITRARY_AUDIT_METADATA',
      },
    },
  })
  return { admin, instructor, student, classRecord, activity, released, assessed, projectTask, repository }
}

describe('Phase 9B PostgreSQL administrative oversight', () => {
  it('returns explicit zero-valued aggregate totals for an empty application database', async () => {
    const emptyAdmin = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'Empty State Admin',
      email: 'empty-admin@integration.test',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
    }
    const overview = await service().overview(emptyAdmin)
    expect(overview).toMatchObject({
      users: { total: 0, byRole: {}, byStatus: {}, accountSetup: { complete: 0, pending: 0, actionRequired: 0 } },
      academics: {
        classesByStatus: {}, membershipsByStatus: {}, activitiesByStatus: {},
        submissionsByStatus: {}, projectTasksByStatus: {}, teamsByStatus: {},
      },
      repositories: { knownMeasuredBytes: '0', measuredRecords: 0, unmeasuredRecords: 0 },
      operations: { executionJobsByStatus: {}, provisioningJobsByStatus: {}, gitCredentials: { active: 0, expired: 0, revoked: 0 } },
    })
  })

  it('derives accurate overview and safe academic projections from authoritative records', async () => {
    const fixture = await createSensitiveFixture()
    const oversight = service()
    const overview = await oversight.overview(fixture.admin)
    expect(overview).toMatchObject({
      users: { total: 3, byRole: { ADMIN: 1, INSTRUCTOR: 1, STUDENT: 1 } },
      academics: { activitiesByStatus: { PUBLISHED: 1 }, submissionsByStatus: { RELEASED: 1, ASSESSED: 1 } },
      repositories: { knownMeasuredBytes: '1234', measuredRecords: 1, unmeasuredRecords: 1 },
      operations: { gitCredentials: { active: 1, expired: 0, revoked: 0 } },
    })

    const classes = await oversight.listClasses(fixture.admin, adminClassQuerySchema.parse({}))
    const activities = await oversight.listActivities(fixture.admin, adminActivityQuerySchema.parse({}))
    const submissions = await oversight.listSubmissions(fixture.admin, adminSubmissionQuerySchema.parse({}))
    const tasks = await oversight.listProjectTasks(fixture.admin, adminProjectTaskQuerySchema.parse({}))
    const repositories = await oversight.listRepositories(fixture.admin, adminRepositoryQuerySchema.parse({}))
    expect(classes.items[0]).toMatchObject({ membershipCounts: { ACTIVE: 1 } })
    expect(activities.items[0]).toMatchObject({ testCaseCount: 1, testCasePointTotal: 40, submissionCount: 2 })
    expect(submissions.items.find((item) => item.id === fixture.released.id)?.releasedScore).toBe(88)
    expect(submissions.items.find((item) => item.id === fixture.assessed.id)?.releasedScore).toBeNull()
    expect(tasks.items[0]).toMatchObject({ counts: { teams: 0, repositories: 0, invitations: 0 } })
    expect(repositories.items.find((item) => item.id === fixture.repository.id)).toMatchObject({ storageSizeBytes: '1234', counts: { members: 1, invitations: 0 } })

    const serialized = JSON.stringify({ overview, classes, activities, submissions, tasks, repositories })
    for (const prohibited of [
      'SECRET_ACTIVITY_INSTRUCTIONS', 'SECRET_STARTER_SOURCE', 'SECRET_HIDDEN_TEST_NAME',
      'SECRET_HIDDEN_INPUT', 'SECRET_HIDDEN_OUTPUT', 'SECRET_SUBMITTED_SOURCE',
      'SECOND_SECRET_SUBMITTED_SOURCE', 'a'.repeat(64), 'b'.repeat(64), 'SECRET_PROJECT_INSTRUCTIONS',
      'SECRET_REPOSITORY_DESCRIPTION', 'SECOND_SECRET_REPOSITORY_DESCRIPTION', 'SECRET_HOST_STORAGE_PATH', 'SECRET_STORAGE_FAILURE',
      'SECRET_FEEDBACK_BODY',
    ]) expect(serialized).not.toContain(prohibited)
  })

  it('projects queue, storage, credential, health, and audit metadata without operational secrets', async () => {
    const fixture = await createSensitiveFixture()
    const oversight = service()
    const health = await oversight.health(fixture.admin)
    const storage = await oversight.storage(fixture.admin)
    const execution = await oversight.listExecutionJobs(fixture.admin, adminExecutionJobQuerySchema.parse({ stuck: 'true' }))
    const provisioning = await oversight.listProvisioningJobs(fixture.admin, adminProvisioningJobQuerySchema.parse({ stuck: 'true' }))
    const credentials = await oversight.listGitCredentials(fixture.admin, adminGitCredentialQuerySchema.parse({ lifecycle: 'ACTIVE' }))
    const audits = await oversight.listAuditEvents(fixture.admin, adminAuditEventQuerySchema.parse({ action: 'USER_STATUS_CHANGED' }))

    expect(health).toMatchObject({ statusCode: 200, data: {
      api: { status: 'available' }, database: { status: 'connected' },
      queues: { execution: { stuck: 1 }, repositoryProvisioning: { stuck: 1 } },
      workerHealth: { status: 'not_observed' },
    } })
    expect(storage).toMatchObject({ knownMeasuredBytes: '1234', measuredRecords: 1, unmeasuredRecords: 1 })
    expect(execution.items[0]).toMatchObject({ stuck: true, failureCode: 'INTERNAL_FAILURE' })
    expect(provisioning.items[0]).toMatchObject({ stuck: true, failureCode: 'GIT_COMMAND_FAILED' })
    expect((await oversight.listExecutionJobs(fixture.admin, adminExecutionJobQuerySchema.parse({ status: 'QUEUED', stuck: 'true' }))).items).toEqual([])
    expect((await oversight.listProvisioningJobs(fixture.admin, adminProvisioningJobQuerySchema.parse({ status: 'PENDING', stuck: 'true' }))).items).toEqual([])
    expect(credentials.items[0]).toMatchObject({ lifecycle: 'ACTIVE', allowedOperations: ['READ'] })
    expect(audits.items[0]).toMatchObject({
      metadata: { previousStatus: 'INACTIVE', newStatus: 'ACTIVE', revokedSessionCount: 1 },
    })
    const serialized = JSON.stringify({ health, storage, execution, provisioning, credentials, audits })
    for (const prohibited of [
      'SECRET_WORKER_HOST', 'SECRET_GIT_WORKER_HOST', 'SECRET_GIT_CREDENTIAL_HASH',
      'SECRET_QUARANTINE_KEY', 'SECRET_ARBITRARY_AUDIT_METADATA', 'unsafe raw process output',
      'storagePath', 'secretHash', 'workerId', 'quarantineKey',
    ]) expect(serialized).not.toContain(prohibited)
    expect(serialized).not.toMatch(/healthy/i)
  })

  it('supports bounded filters, stable pagination, empty states, and service-level fail-closed authorization', async () => {
    const fixture = await createSensitiveFixture()
    const oversight = service()
    const filtered = await oversight.listRepositories(fixture.admin, adminRepositoryQuerySchema.parse({
      repositoryType: 'PERSONAL', storageStatus: 'READY', page: 1, pageSize: 1, sortBy: 'repositoryName', sortOrder: 'asc',
    }))
    expect(filtered.items).toHaveLength(1)
    expect(filtered.pagination).toMatchObject({ totalItems: 1, totalPages: 1, hasNextPage: false })
    const empty = await oversight.listActivities(fixture.admin, adminActivityQuerySchema.parse({ status: 'ARCHIVED' }))
    expect(empty).toMatchObject({ items: [], pagination: { totalItems: 0, totalPages: 0 } })

    await expect(oversight.overview({ ...fixture.admin, role: 'INSTRUCTOR' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(oversight.overview({ ...fixture.admin, role: 'STUDENT' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(oversight.overview({ ...fixture.admin, status: 'SUSPENDED' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
