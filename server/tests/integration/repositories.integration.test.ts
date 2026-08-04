import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPrismaClassRepository } from '../../src/modules/classes/class.repository.js'
import { createClassService } from '../../src/modules/classes/class.service.js'
import { createPrismaProjectTaskRepository } from '../../src/modules/project-tasks/project-task.repository.js'
import { createProjectTaskService } from '../../src/modules/project-tasks/project-task.service.js'
import { createPrismaRepositoryRepository } from '../../src/modules/repositories/repository.repository.js'
import { createRepositoryService } from '../../src/modules/repositories/repository.service.js'
import {
  cleanIntegrationDatabase,
  createActiveClass,
  createActiveMembership,
  createActiveUser,
  createIntegrationPrisma,
} from './database.js'

const prisma = createIntegrationPrisma()
const logger = pino({ level: 'silent' })
let currentTime = new Date('2030-09-01T00:00:00.000Z')
const dueDate = new Date('2030-09-20T00:00:00.000Z')

function services() {
  const classRepository = createPrismaClassRepository(prisma)
  return {
    classService: createClassService({ repository: classRepository, logger, now: () => currentTime }),
    projectTasks: createProjectTaskService({
      repository: createPrismaProjectTaskRepository(prisma),
      classRepository,
      logger,
      now: () => currentTime,
    }),
    repositories: createRepositoryService({
      repository: createPrismaRepositoryRepository(prisma),
      logger,
      now: () => currentTime,
    }),
  }
}

async function publishedTask(
  instructorId: string,
  title = 'Team Project',
  maxTeamSize = 3,
  taskDueDate = dueDate,
) {
  const classRecord = await createActiveClass(prisma, instructorId)
  const { projectTasks } = services()
  const draft = await projectTasks.create(
    await prisma.user.findUniqueOrThrow({ where: { id: instructorId } }),
    classRecord.id,
    {
      title,
      instructions: 'Create a class-linked project repository.',
      dueDate: taskDueDate,
      maxTeamSize,
    },
  )
  const published = await projectTasks.publish(
    await prisma.user.findUniqueOrThrow({ where: { id: instructorId } }),
    draft.id,
    { expectedUpdatedAt: draft.updatedAt },
  )
  return { classRecord, projectTask: published }
}

beforeEach(async () => {
  currentTime = new Date('2030-09-01T00:00:00.000Z')
  await cleanIntegrationDatabase(prisma)
})
afterAll(async () => prisma.$disconnect())

describe('PostgreSQL repository collaboration', () => {
  it('creates synchronized class-project metadata with server-controlled visibility', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT', 'Team Lead')
    const outsider = await createActiveUser(prisma, 'STUDENT', 'Outside Student')
    const { classRecord, projectTask } = await publishedTask(instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const { repositories } = services()

    const created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Team Alpha',
      repositoryName: 'Campus Navigation',
      description: 'Academic metadata only.',
    })
    expect(created).toMatchObject({
      repositoryType: 'CLASS_PROJECT',
      visibility: 'CLASS_ONLY',
      reviewStatus: 'WORKING',
      owner: { userId: owner.id },
    })
    expect(created).not.toHaveProperty('storagePath')
    expect(await prisma.team.count()).toBe(1)
    expect(await prisma.teamMember.count({ where: { status: 'ACTIVE' } })).toBe(1)
    expect(await prisma.repositoryMember.count({ where: { status: 'ACTIVE' } })).toBe(1)
    expect(await prisma.repositoryActivity.count()).toBe(0)
    await expect(repositories.get(outsider, created.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })

    const classmate = await createActiveUser(prisma, 'STUDENT', 'Same Class Student')
    await createActiveMembership(prisma, classRecord.id, classmate.id)
    await expect(repositories.get(classmate, created.id)).resolves.toMatchObject({ visibility: 'CLASS_ONLY' })

    await expect(
      repositories.createClassProject(owner, projectTask.id, {
        teamName: 'Second Team',
        repositoryName: 'Second Repository',
      }),
    ).rejects.toMatchObject({ code: 'STUDENT_ALREADY_ASSIGNED_TO_TEAM' })
  })

  it('keeps personal repositories private and owner-scoped', async () => {
    const owner = await createActiveUser(prisma, 'STUDENT')
    const other = await createActiveUser(prisma, 'STUDENT')
    const { repositories } = services()
    const personal = await repositories.createPersonal(owner, {
      repositoryName: 'Practice Sandbox',
      description: null,
    })
    expect(personal).toMatchObject({ repositoryType: 'PERSONAL', visibility: 'PRIVATE' })
    await expect(repositories.get(other, personal.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    expect((await repositories.list(owner, { page: 1, pageSize: 20 })).repositories).toHaveLength(1)
    expect((await repositories.list(other, { page: 1, pageSize: 20 })).repositories).toEqual([])
  })

  it('enforces invitation eligibility, expiry, capacity, and atomic acceptance', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT', 'Owner')
    const firstInvitee = await createActiveUser(prisma, 'STUDENT', 'First Invitee')
    const secondInvitee = await createActiveUser(prisma, 'STUDENT', 'Second Invitee')
    const outsider = await createActiveUser(prisma, 'STUDENT', 'Outside Invitee')
    const inactive = await createActiveUser(prisma, 'STUDENT', 'Inactive Invitee')
    await prisma.user.update({ where: { id: inactive.id }, data: { status: 'SUSPENDED' } })
    const { classRecord, projectTask } = await publishedTask(instructor.id)
    for (const student of [owner, firstInvitee, secondInvitee, inactive]) {
      await createActiveMembership(prisma, classRecord.id, student.id)
    }
    const { repositories } = services()
    const created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Capacity Team',
      repositoryName: 'Capacity Repository',
    })

    await expect(repositories.createInvitation(owner, created.id, { inviteeUserId: outsider.id })).rejects.toMatchObject({ code: 'COLLABORATOR_NOT_ELIGIBLE' })
    await expect(repositories.createInvitation(owner, created.id, { inviteeUserId: inactive.id })).rejects.toMatchObject({ code: 'COLLABORATOR_NOT_ELIGIBLE' })
    const first = await repositories.createInvitation(owner, created.id, { inviteeUserId: firstInvitee.id })
    const second = await repositories.createInvitation(owner, created.id, { inviteeUserId: secondInvitee.id })
    expect(first.expiresAt).toEqual(new Date('2030-09-08T00:00:00.000Z'))
    await expect(repositories.createInvitation(owner, created.id, { inviteeUserId: firstInvitee.id })).rejects.toMatchObject({ code: 'REPOSITORY_CONFLICT' })

    const accepted = await repositories.acceptInvitation(firstInvitee, first.invitationId)
    expect(accepted.status).toBe('ACCEPTED')
    const teamMember = await prisma.teamMember.findFirstOrThrow({ where: { studentId: firstInvitee.id } })
    const repositoryMember = await prisma.repositoryMember.findFirstOrThrow({ where: { studentId: firstInvitee.id } })
    expect(teamMember.status).toBe('ACTIVE')
    expect(repositoryMember.status).toBe('ACTIVE')
    await expect(repositories.acceptInvitation(firstInvitee, first.invitationId)).rejects.toMatchObject({ code: 'REPOSITORY_INVITATION_RESOLVED' })

    currentTime = new Date('2030-09-09T00:00:00.000Z')
    await expect(repositories.acceptInvitation(secondInvitee, second.invitationId)).rejects.toMatchObject({ code: 'REPOSITORY_INVITATION_EXPIRED' })
    expect((await repositories.listReceivedInvitations(secondInvitee))[0]?.status).toBe('EXPIRED')
  })

  it('rolls back partial membership writes and supports reasoned corrective synchronization', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const member = await createActiveUser(prisma, 'STUDENT')
    const { classRecord, projectTask } = await publishedTask(instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    await createActiveMembership(prisma, classRecord.id, member.id)
    const { projectTasks, repositories } = services()
    const created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Invariant Team', repositoryName: 'Invariant Repository',
    })
    const invitation = await repositories.createInvitation(owner, created.id, { inviteeUserId: member.id })
    await repositories.acceptInvitation(member, invitation.invitationId)
    const memberRow = await prisma.repositoryMember.findUniqueOrThrow({ where: { repositoryId_studentId: { repositoryId: created.id, studentId: member.id } } })
    const teamMember = await prisma.teamMember.findUniqueOrThrow({ where: { teamId_studentId: { teamId: created.teamId!, studentId: member.id } } })

    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.teamMember.update({ where: { id: teamMember.id }, data: { status: 'REMOVED', removedAt: currentTime } })
      }),
    ).rejects.toThrow(/membership must remain synchronized/i)
    expect((await prisma.teamMember.findUniqueOrThrow({ where: { id: teamMember.id } })).status).toBe('ACTIVE')

    const closed = await projectTasks.close(instructor, projectTask.id, { expectedUpdatedAt: projectTask.updatedAt })
    expect(closed.status).toBe('CLOSED')
    await expect(repositories.transitionMember(owner, created.id, memberRow.id, { action: 'REMOVE', expectedUpdatedAt: memberRow.updatedAt })).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    await expect(repositories.transitionMember(instructor, created.id, memberRow.id, { action: 'REMOVE', expectedUpdatedAt: memberRow.updatedAt })).rejects.toMatchObject({ code: 'CORRECTIVE_REASON_REQUIRED' })
    const removed = await repositories.transitionMember(instructor, created.id, memberRow.id, { action: 'REMOVE', expectedUpdatedAt: memberRow.updatedAt, reason: 'Approved team correction.' })
    expect(removed.membershipStatus).toBe('REMOVED')
    expect((await prisma.teamMember.findUniqueOrThrow({ where: { id: teamMember.id } })).status).toBe('REMOVED')
    expect((await prisma.repositoryMember.findUniqueOrThrow({ where: { id: memberRow.id } })).status).toBe('REMOVED')
    await expect(repositories.get(member, created.id)).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' })
    const reactivated = await repositories.transitionMember(instructor, created.id, memberRow.id, {
      action: 'REACTIVATE',
      expectedUpdatedAt: removed.updatedAt!,
      reason: 'Restore the approved class team membership.',
    })
    expect(reactivated.membershipStatus).toBe('ACTIVE')
    expect((await prisma.teamMember.findUniqueOrThrow({ where: { id: teamMember.id } })).status).toBe('ACTIVE')
    expect((await prisma.repositoryMember.findUniqueOrThrow({ where: { id: memberRow.id } })).status).toBe('ACTIVE')
    expect(await repositories.listMembers(owner, created.id)).toEqual([
      expect.objectContaining({ userId: owner.id }),
      expect.objectContaining({ userId: member.id }),
    ])
    const instructorMembers = await repositories.listMembers(instructor, created.id)
    expect(instructorMembers[0]).toEqual(expect.objectContaining({ membershipStatus: 'ACTIVE', userStatus: 'ACTIVE' }))
    const ownerRow = await prisma.repositoryMember.findUniqueOrThrow({ where: { repositoryId_studentId: { repositoryId: created.id, studentId: owner.id } } })
    await expect(repositories.transitionMember(instructor, created.id, ownerRow.id, { action: 'REMOVE', expectedUpdatedAt: ownerRow.updatedAt, reason: 'Not allowed.' })).rejects.toMatchObject({ code: 'REPOSITORY_OWNER_IMMUTABLE' })
  })

  it('couples review transitions to released feedback and permits approval after closing', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { classRecord, projectTask } = await publishedTask(instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const { projectTasks, repositories } = services()
    let created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Review Team', repositoryName: 'Review Repository',
    })
    created = await repositories.readyForReview(owner, created.id, { expectedUpdatedAt: created.updatedAt })
    const draft = await repositories.createFeedbackDraft(instructor, created.id, { feedbackText: 'Please improve the project documentation.' })
    expect(await repositories.listFeedback(owner, created.id)).toEqual([])
    created = await repositories.requestChanges(instructor, created.id, {
      expectedUpdatedAt: created.updatedAt,
      feedbackId: draft.feedbackId,
      expectedFeedbackUpdatedAt: draft.updatedAt,
    })
    expect(created.reviewStatus).toBe('CHANGES_REQUESTED')
    expect((await repositories.listFeedback(owner, created.id))[0]).toMatchObject({ status: 'RELEASED' })
    created = await repositories.readyForReview(owner, created.id, { expectedUpdatedAt: created.updatedAt })
    await projectTasks.close(instructor, projectTask.id, { expectedUpdatedAt: projectTask.updatedAt })
    await expect(
      repositories.requestChanges(instructor, created.id, {
        expectedUpdatedAt: created.updatedAt,
        feedbackId: draft.feedbackId,
        expectedFeedbackUpdatedAt: draft.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_TASK_NOT_OPEN' })
    const approved = await repositories.approve(instructor, created.id, { expectedUpdatedAt: created.updatedAt })
    expect(approved.reviewStatus).toBe('APPROVED')
  })

  it('enforces project-task and class archive blockers without generating Git activity', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const { classRecord, projectTask } = await publishedTask(instructor.id)
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const { classService, projectTasks, repositories } = services()
    let created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Archive Team', repositoryName: 'Archive Repository',
    })
    await expect(classService.archive(instructor, classRecord.id)).rejects.toMatchObject({ code: 'CLASS_HAS_UNFINISHED_PROJECT_WORK' })
    created = await repositories.readyForReview(owner, created.id, { expectedUpdatedAt: created.updatedAt })
    await expect(
      repositories.approve(instructor, created.id, { expectedUpdatedAt: created.updatedAt }),
    ).resolves.toMatchObject({ reviewStatus: 'APPROVED' })
    const closed = await projectTasks.close(instructor, projectTask.id, { expectedUpdatedAt: projectTask.updatedAt })
    const archivedTask = await projectTasks.archive(instructor, projectTask.id, { expectedUpdatedAt: closed.updatedAt })
    expect(archivedTask.status).toBe('ARCHIVED')
    await expect(classService.archive(instructor, classRecord.id)).resolves.toMatchObject({ status: 'ARCHIVED' })
    expect(await prisma.repositoryActivity.count()).toBe(0)
  })

  it('serializes duplicate invitations and enforces pending-invitation capacity', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const invitee = await createActiveUser(prisma, 'STUDENT')
    const extra = await createActiveUser(prisma, 'STUDENT')
    const { classRecord, projectTask } = await publishedTask(instructor.id, 'Concurrent Invitations', 2)
    for (const student of [owner, invitee, extra]) {
      await createActiveMembership(prisma, classRecord.id, student.id)
    }
    const { repositories } = services()
    const created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Concurrent Team', repositoryName: 'Concurrent Repository',
    })

    const outcomes = await Promise.allSettled([
      repositories.createInvitation(owner, created.id, { inviteeUserId: invitee.id }),
      repositories.createInvitation(owner, created.id, { inviteeUserId: invitee.id }),
    ])
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
    expect(await prisma.repositoryInvitation.count({ where: { status: 'PENDING' } })).toBe(1)
    await expect(
      repositories.createInvitation(owner, created.id, { inviteeUserId: extra.id }),
    ).rejects.toMatchObject({ code: 'TEAM_CAPACITY_REACHED' })
  })

  it('makes closed invitations unusable and ignores elapsed invitations for archive gates', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const invitee = await createActiveUser(prisma, 'STUDENT')
    const { classRecord, projectTask } = await publishedTask(instructor.id, 'Invitation Cutoff')
    await createActiveMembership(prisma, classRecord.id, owner.id)
    await createActiveMembership(prisma, classRecord.id, invitee.id)
    const { projectTasks, repositories } = services()
    let created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Cutoff Team', repositoryName: 'Cutoff Repository',
    })
    const invitation = await repositories.createInvitation(owner, created.id, { inviteeUserId: invitee.id })
    created = await repositories.readyForReview(owner, created.id, { expectedUpdatedAt: created.updatedAt })
    await expect(
      repositories.approve(instructor, created.id, { expectedUpdatedAt: created.updatedAt }),
    ).resolves.toMatchObject({ reviewStatus: 'APPROVED' })
    const closed = await projectTasks.close(instructor, projectTask.id, { expectedUpdatedAt: projectTask.updatedAt })

    await expect(repositories.acceptInvitation(invitee, invitation.invitationId)).rejects.toMatchObject({ code: 'PROJECT_TASK_NOT_OPEN' })
    await expect(repositories.declineInvitation(invitee, invitation.invitationId)).rejects.toMatchObject({ code: 'PROJECT_TASK_NOT_OPEN' })
    await expect(repositories.revokeInvitation(owner, invitation.invitationId, {})).rejects.toMatchObject({ code: 'PROJECT_TASK_NOT_OPEN' })
    await expect(repositories.revokeInvitation(instructor, invitation.invitationId, {})).rejects.toMatchObject({ code: 'CORRECTIVE_REASON_REQUIRED' })

    currentTime = new Date('2030-09-09T00:00:00.000Z')
    const archived = await projectTasks.archive(instructor, projectTask.id, { expectedUpdatedAt: closed.updatedAt })
    expect(archived.status).toBe('ARCHIVED')
    expect(await prisma.repositoryActivity.count()).toBe(0)
  })

  it('rejects post-deadline change requests but approves with optional feedback release', async () => {
    const instructor = await createActiveUser(prisma, 'INSTRUCTOR')
    const owner = await createActiveUser(prisma, 'STUDENT')
    const taskDueDate = new Date('2030-09-03T00:00:00.000Z')
    const { classRecord, projectTask } = await publishedTask(
      instructor.id,
      'Post-deadline Review',
      3,
      taskDueDate,
    )
    await createActiveMembership(prisma, classRecord.id, owner.id)
    const { repositories } = services()
    let created = await repositories.createClassProject(owner, projectTask.id, {
      teamName: 'Deadline Team', repositoryName: 'Deadline Repository',
    })
    created = await repositories.readyForReview(owner, created.id, { expectedUpdatedAt: created.updatedAt })
    const draft = await repositories.createFeedbackDraft(instructor, created.id, {
      feedbackText: 'Approved with a concise final note.',
    })
    currentTime = new Date('2030-09-04T00:00:00.000Z')

    await expect(
      repositories.requestChanges(instructor, created.id, {
        expectedUpdatedAt: created.updatedAt,
        feedbackId: draft.feedbackId,
        expectedFeedbackUpdatedAt: draft.updatedAt,
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_TASK_DEADLINE_PASSED' })
    const approved = await repositories.approve(instructor, created.id, {
      expectedUpdatedAt: created.updatedAt,
      feedbackId: draft.feedbackId,
      expectedFeedbackUpdatedAt: draft.updatedAt,
    })
    expect(approved.reviewStatus).toBe('APPROVED')
    expect(await repositories.listFeedback(owner, created.id)).toEqual([
      expect.objectContaining({ feedbackId: draft.feedbackId, status: 'RELEASED' }),
    ])
  })
})
