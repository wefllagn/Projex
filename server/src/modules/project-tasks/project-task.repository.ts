import type {
  Prisma,
  PrismaClient,
  ProjectTaskStatus,
  UserRole,
} from '@prisma/client'
import type {
  CreateProjectTaskInput,
  ProjectTaskListQuery,
} from './project-task.schemas.js'
import type {
  ProjectTaskAccessRecord,
  ProjectTaskMonitoringProjection,
  ProjectTaskRecord,
  TeamSummaryProjection,
} from './project-task.types.js'

export const projectTaskRecordSelect = {
  id: true,
  classId: true,
  createdById: true,
  title: true,
  instructions: true,
  dueDate: true,
  maxTeamSize: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  closedAt: true,
  archivedAt: true,
  class: { select: { id: true, instructorId: true, status: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const

export type ProjectTaskWriteFailure =
  | { kind: 'not_found' }
  | { kind: 'class_archived' }
  | { kind: 'invalid_state' }
  | { kind: 'stale' }
  | { kind: 'due_date_not_future' }
  | { kind: 'archive_blocked' }

export type ProjectTaskWriteResult =
  | { kind: 'updated'; projectTask: ProjectTaskRecord }
  | ProjectTaskWriteFailure

export type CreateProjectTaskResult =
  | { kind: 'created'; projectTask: ProjectTaskRecord }
  | { kind: 'class_not_found' }
  | { kind: 'class_archived' }

export interface ProjectTaskRepository {
  create(input: {
    classId: string
    createdById: string
    projectTask: CreateProjectTaskInput
    now: Date
  }): Promise<CreateProjectTaskResult>
  list(input: {
    classId: string
    callerId: string
    callerRole: UserRole
    studentView: boolean
    query: ProjectTaskListQuery
  }): Promise<{ projectTasks: ProjectTaskRecord[]; totalItems: number }>
  findAccess(projectTaskId: string, callerId: string): Promise<ProjectTaskAccessRecord | null>
  update(input: {
    projectTaskId: string
    expectedUpdatedAt: Date
    fields: Partial<Pick<ProjectTaskRecord, 'title' | 'instructions' | 'dueDate' | 'maxTeamSize'>>
    now: Date
  }): Promise<ProjectTaskWriteResult>
  publish(input: {
    projectTaskId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ProjectTaskWriteResult>
  close(input: {
    projectTaskId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ProjectTaskWriteResult>
  archive(input: {
    projectTaskId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ProjectTaskWriteResult>
  restore(input: {
    projectTaskId: string
    expectedUpdatedAt: Date
    now: Date
  }): Promise<ProjectTaskWriteResult>
  listTeams(projectTaskId: string): Promise<TeamSummaryProjection[]>
  monitoring(projectTaskId: string, now: Date): Promise<ProjectTaskMonitoringProjection>
}

function nextUpdatedAt(expected: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expected.getTime() + 1))
}

async function loadProjectTask(
  transaction: Prisma.TransactionClient,
  projectTaskId: string,
): Promise<ProjectTaskRecord> {
  return transaction.projectTask.findUniqueOrThrow({
    where: { id: projectTaskId },
    select: projectTaskRecordSelect,
  })
}

async function diagnoseWriteFailure(
  transaction: Prisma.TransactionClient,
  projectTaskId: string,
  expectedUpdatedAt: Date,
  allowedStatuses: readonly ProjectTaskStatus[],
): Promise<ProjectTaskWriteFailure> {
  const current = await transaction.projectTask.findUnique({
    where: { id: projectTaskId },
    select: { status: true, updatedAt: true, class: { select: { status: true } } },
  })
  if (!current) return { kind: 'not_found' }
  if (current.class.status === 'ARCHIVED') return { kind: 'class_archived' }
  if (!allowedStatuses.includes(current.status)) return { kind: 'invalid_state' }
  if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return { kind: 'stale' }
  return { kind: 'stale' }
}

async function membershipInvariantBroken(
  transaction: Prisma.TransactionClient,
  projectTaskId: string,
): Promise<boolean> {
  const result = await transaction.$queryRaw<Array<{ broken: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM "repositories" r
      JOIN "teams" t ON t."team_id" = r."team_id"
      WHERE r."project_task_id" = ${projectTaskId}::uuid
        AND r."repository_type" = 'CLASS_PROJECT'
        AND (
          r."owner_id" <> t."lead_student_id"
          OR NOT EXISTS (
            SELECT 1 FROM "team_members" tm
            WHERE tm."team_id" = t."team_id"
              AND tm."student_id" = t."lead_student_id"
              AND tm."member_role" = 'LEAD'
              AND tm."status" = 'ACTIVE'
          )
          OR NOT EXISTS (
            SELECT 1 FROM "repository_members" rm
            WHERE rm."repository_id" = r."repository_id"
              AND rm."student_id" = r."owner_id"
              AND rm."member_role" = 'OWNER'
              AND rm."status" = 'ACTIVE'
          )
          OR EXISTS (
            SELECT 1 FROM "team_members" tm
            LEFT JOIN "repository_members" rm
              ON rm."repository_id" = r."repository_id" AND rm."student_id" = tm."student_id"
            WHERE tm."team_id" = t."team_id"
              AND (rm."repository_member_id" IS NULL OR rm."status"::text <> tm."status"::text)
          )
          OR EXISTS (
            SELECT 1 FROM "repository_members" rm
            LEFT JOIN "team_members" tm
              ON tm."team_id" = t."team_id" AND tm."student_id" = rm."student_id"
            WHERE rm."repository_id" = r."repository_id"
              AND (tm."team_member_id" IS NULL OR tm."status"::text <> rm."status"::text)
          )
        )
    ) AS broken
  `
  return result[0]?.broken ?? true
}

export function createPrismaProjectTaskRepository(
  prisma: PrismaClient,
): ProjectTaskRepository {
  return {
    create(input) {
      return prisma.$transaction(async (transaction) => {
        const classRecord = await transaction.class.findUnique({
          where: { id: input.classId },
          select: { status: true },
        })
        if (!classRecord) return { kind: 'class_not_found' } as const
        if (classRecord.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        const projectTask = await transaction.projectTask.create({
          data: {
            classId: input.classId,
            createdById: input.createdById,
            title: input.projectTask.title,
            instructions: input.projectTask.instructions,
            dueDate: input.projectTask.dueDate,
            maxTeamSize: input.projectTask.maxTeamSize,
            status: 'DRAFT',
            createdAt: input.now,
            updatedAt: input.now,
          },
          select: projectTaskRecordSelect,
        })
        return { kind: 'created', projectTask } as const
      })
    },
    async list(input) {
      const studentStatuses: ProjectTaskStatus[] = ['PUBLISHED', 'CLOSED']
      const where: Prisma.ProjectTaskWhereInput = {
        classId: input.classId,
        ...(input.studentView
          ? {
              status: input.query.status
                ? studentStatuses.includes(input.query.status)
                  ? input.query.status
                  : { in: [] }
                : { in: studentStatuses },
              class: { members: { some: { studentId: input.callerId, status: 'ACTIVE' } } },
            }
          : input.query.status
            ? { status: input.query.status }
            : {}),
        ...(input.query.search
          ? {
              OR: [
                { title: { contains: input.query.search, mode: 'insensitive' } },
                { instructions: { contains: input.query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }
      const [projectTasks, totalItems] = await prisma.$transaction([
        prisma.projectTask.findMany({
          where,
          select: projectTaskRecordSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (input.query.page - 1) * input.query.pageSize,
          take: input.query.pageSize,
        }),
        prisma.projectTask.count({ where }),
      ])
      return { projectTasks, totalItems }
    },
    async findAccess(projectTaskId, callerId) {
      const projectTask = await prisma.projectTask.findUnique({
        where: { id: projectTaskId },
        select: {
          ...projectTaskRecordSelect,
          class: {
            select: {
              id: true,
              instructorId: true,
              status: true,
              members: {
                where: { studentId: callerId },
                select: { id: true, status: true },
                take: 1,
              },
            },
          },
        },
      })
      if (!projectTask) return null
      const { members, ...classRecord } = projectTask.class
      return {
        projectTask: { ...projectTask, class: classRecord },
        membership: members[0] ?? null,
      }
    },
    update(input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.projectTask.updateMany({
          where: {
            id: input.projectTaskId,
            status: 'DRAFT',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            ...input.fields,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(transaction, input.projectTaskId, input.expectedUpdatedAt, ['DRAFT'])
        }
        return {
          kind: 'updated',
          projectTask: await loadProjectTask(transaction, input.projectTaskId),
        } as const
      })
    },
    publish(input) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.projectTask.findUnique({
          where: { id: input.projectTaskId },
          select: { status: true, dueDate: true, updatedAt: true, class: { select: { status: true } } },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (current.status !== 'DRAFT') return { kind: 'invalid_state' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        if (current.dueDate.getTime() <= input.now.getTime()) return { kind: 'due_date_not_future' } as const
        const result = await transaction.projectTask.updateMany({
          where: { id: input.projectTaskId, status: 'DRAFT', updatedAt: input.expectedUpdatedAt },
          data: {
            status: 'PUBLISHED',
            publishedAt: input.now,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) return { kind: 'stale' } as const
        return { kind: 'updated', projectTask: await loadProjectTask(transaction, input.projectTaskId) } as const
      })
    },
    close(input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.projectTask.updateMany({
          where: {
            id: input.projectTaskId,
            status: 'PUBLISHED',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: 'CLOSED',
            closedAt: input.now,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(transaction, input.projectTaskId, input.expectedUpdatedAt, ['PUBLISHED'])
        }
        return { kind: 'updated', projectTask: await loadProjectTask(transaction, input.projectTaskId) } as const
      })
    },
    archive(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT "project_task_id" FROM "project_tasks"
          WHERE "project_task_id" = ${input.projectTaskId}::uuid FOR UPDATE
        `
        const current = await transaction.projectTask.findUnique({
          where: { id: input.projectTaskId },
          select: { status: true, updatedAt: true, class: { select: { status: true } } },
        })
        if (!current) return { kind: 'not_found' } as const
        if (current.class.status === 'ARCHIVED') return { kind: 'class_archived' } as const
        if (current.status !== 'CLOSED') return { kind: 'invalid_state' } as const
        if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { kind: 'stale' } as const
        const [pendingInvitations, nonterminalRepositories, brokenMembership] = await Promise.all([
          transaction.repositoryInvitation.count({
            where: { projectTaskId: input.projectTaskId, status: 'PENDING', expiresAt: { gt: input.now } },
          }),
          transaction.repository.count({
            where: {
              projectTaskId: input.projectTaskId,
              NOT: [
                { status: 'ARCHIVED' },
                { status: { not: 'ARCHIVED' }, reviewStatus: 'APPROVED' },
              ],
            },
          }),
          membershipInvariantBroken(transaction, input.projectTaskId),
        ])
        if (pendingInvitations > 0 || nonterminalRepositories > 0 || brokenMembership) {
          return { kind: 'archive_blocked' } as const
        }
        const result = await transaction.projectTask.updateMany({
          where: { id: input.projectTaskId, status: 'CLOSED', updatedAt: input.expectedUpdatedAt },
          data: {
            status: 'ARCHIVED',
            archivedAt: input.now,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) return { kind: 'stale' } as const
        return { kind: 'updated', projectTask: await loadProjectTask(transaction, input.projectTaskId) } as const
      })
    },
    restore(input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.projectTask.updateMany({
          where: {
            id: input.projectTaskId,
            status: 'ARCHIVED',
            updatedAt: input.expectedUpdatedAt,
            class: { status: 'ACTIVE' },
          },
          data: {
            status: 'CLOSED',
            archivedAt: null,
            closedAt: input.now,
            updatedAt: nextUpdatedAt(input.expectedUpdatedAt, input.now),
          },
        })
        if (result.count === 0) {
          return diagnoseWriteFailure(transaction, input.projectTaskId, input.expectedUpdatedAt, ['ARCHIVED'])
        }
        return { kind: 'updated', projectTask: await loadProjectTask(transaction, input.projectTaskId) } as const
      })
    },
    async listTeams(projectTaskId) {
      const teams = await prisma.team.findMany({
        where: { projectTaskId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          status: true,
          leadStudent: { select: { id: true, fullName: true } },
          _count: { select: { members: { where: { status: 'ACTIVE' } } } },
          repository: {
            select: { id: true, repositoryName: true, status: true, reviewStatus: true },
          },
        },
      })
      return teams.map((team) => ({
        teamId: team.id,
        name: team.name,
        status: team.status,
        lead: { userId: team.leadStudent.id, fullName: team.leadStudent.fullName },
        activeMemberCount: team._count.members,
        repository: team.repository
          ? {
              repositoryId: team.repository.id,
              repositoryName: team.repository.repositoryName,
              status: team.repository.status,
              reviewStatus: team.repository.reviewStatus,
            }
          : null,
      }))
    },
    async monitoring(projectTaskId, now) {
      const [teamCount, repositoryCount, activeMemberCount, pendingInvitationCount, grouped] =
        await prisma.$transaction([
          prisma.team.count({ where: { projectTaskId } }),
          prisma.repository.count({ where: { projectTaskId } }),
          prisma.teamMember.count({ where: { projectTaskId, status: 'ACTIVE' } }),
          prisma.repositoryInvitation.count({
            where: { projectTaskId, status: 'PENDING', expiresAt: { gt: now } },
          }),
          prisma.repository.groupBy({
            by: ['reviewStatus'],
            where: { projectTaskId, status: { not: 'ARCHIVED' } },
            _count: { _all: true },
          }),
        ])
      const repositoriesByReviewStatus = {
        WORKING: 0,
        READY_FOR_REVIEW: 0,
        CHANGES_REQUESTED: 0,
        APPROVED: 0,
      }
      for (const row of grouped) repositoriesByReviewStatus[row.reviewStatus] = row._count._all
      return {
        projectTaskId,
        teamCount,
        repositoryCount,
        activeMemberCount,
        pendingInvitationCount,
        repositoriesByReviewStatus,
      }
    },
  }
}
