import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/app-error.js'
import type { PaginationMeta } from '../../shared/http/response.js'
import type { SafeUserProfile } from '../auth/auth.types.js'
import type { ClassRepository } from '../classes/class.repository.js'
import type { ClassAccessRecord } from '../classes/class.types.js'
import type {
  ProjectTaskRepository,
  ProjectTaskWriteFailure,
} from './project-task.repository.js'
import type {
  CreateProjectTaskInput,
  ProjectTaskListQuery,
  ProjectTaskTransitionInput,
  UpdateProjectTaskInput,
} from './project-task.schemas.js'
import {
  toProjectTaskProjection,
  type ProjectTaskAccessRecord,
  type ProjectTaskMonitoringProjection,
  type ProjectTaskProjection,
  type TeamSummaryProjection,
} from './project-task.types.js'

export interface ProjectTaskListResult {
  projectTasks: ProjectTaskProjection[]
  pagination: PaginationMeta
}

export interface ProjectTaskService {
  create(caller: SafeUserProfile, classId: string, input: CreateProjectTaskInput): Promise<ProjectTaskProjection>
  list(caller: SafeUserProfile, classId: string, query: ProjectTaskListQuery): Promise<ProjectTaskListResult>
  get(caller: SafeUserProfile, projectTaskId: string): Promise<ProjectTaskProjection>
  update(caller: SafeUserProfile, projectTaskId: string, input: UpdateProjectTaskInput): Promise<ProjectTaskProjection>
  publish(caller: SafeUserProfile, projectTaskId: string, input: ProjectTaskTransitionInput): Promise<ProjectTaskProjection>
  close(caller: SafeUserProfile, projectTaskId: string, input: ProjectTaskTransitionInput): Promise<ProjectTaskProjection>
  archive(caller: SafeUserProfile, projectTaskId: string, input: ProjectTaskTransitionInput): Promise<ProjectTaskProjection>
  restore(caller: SafeUserProfile, projectTaskId: string, input: ProjectTaskTransitionInput): Promise<ProjectTaskProjection>
  listTeams(caller: SafeUserProfile, projectTaskId: string): Promise<TeamSummaryProjection[]>
  monitoring(caller: SafeUserProfile, projectTaskId: string): Promise<ProjectTaskMonitoringProjection>
}

function notFound(): AppError {
  return new AppError({ statusCode: 404, code: 'PROJECT_TASK_NOT_FOUND', message: 'Project task not found.' })
}

function classNotFound(): AppError {
  return new AppError({ statusCode: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found.' })
}

function forbidden(): AppError {
  return new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'You are not authorized to perform this action.' })
}

function requireActive(caller: SafeUserProfile): void {
  if (caller.status !== 'ACTIVE') throw forbidden()
}

function ownsClass(caller: SafeUserProfile, instructorId: string): boolean {
  return caller.role === 'INSTRUCTOR' && caller.id === instructorId
}

function canViewClass(caller: SafeUserProfile, access: ClassAccessRecord): boolean {
  return (
    caller.role === 'ADMIN' ||
    ownsClass(caller, access.classRecord.instructorId) ||
    (caller.role === 'STUDENT' && access.membership?.status === 'ACTIVE')
  )
}

function canViewTask(caller: SafeUserProfile, access: ProjectTaskAccessRecord): boolean {
  if (caller.role === 'ADMIN' || ownsClass(caller, access.projectTask.class.instructorId)) return true
  return (
    caller.role === 'STUDENT' &&
    access.membership?.status === 'ACTIVE' &&
    (access.projectTask.status === 'PUBLISHED' || access.projectTask.status === 'CLOSED')
  )
}

function requireOwner(caller: SafeUserProfile, access: ProjectTaskAccessRecord): void {
  if (!ownsClass(caller, access.projectTask.class.instructorId)) throw notFound()
}

function mapWriteFailure(result: ProjectTaskWriteFailure): never {
  if (result.kind === 'not_found') throw notFound()
  if (result.kind === 'class_archived') {
    throw new AppError({ statusCode: 409, code: 'CLASS_ARCHIVED', message: 'Archived classes are read-only.' })
  }
  if (result.kind === 'stale') {
    throw new AppError({ statusCode: 409, code: 'STALE_PROJECT_TASK_VERSION', message: 'The project task changed. Reload it before trying again.' })
  }
  if (result.kind === 'due_date_not_future') {
    throw new AppError({ statusCode: 422, code: 'PROJECT_TASK_DUE_DATE_NOT_FUTURE', message: 'A project task must have a future deadline before publication.' })
  }
  if (result.kind === 'archive_blocked') {
    throw new AppError({ statusCode: 409, code: 'PROJECT_TASK_ARCHIVE_BLOCKED', message: 'The project task still has pending invitations, unfinished repository review, or inconsistent membership records.' })
  }
  throw new AppError({ statusCode: 409, code: 'INVALID_PROJECT_TASK_TRANSITION', message: 'The project-task lifecycle transition is not allowed.' })
}

export function createProjectTaskService(dependencies: {
  repository: ProjectTaskRepository
  classRepository: ClassRepository
  logger: Logger
  now?: () => Date
}): ProjectTaskService {
  const { repository, classRepository, logger } = dependencies
  const now = dependencies.now ?? (() => new Date())

  async function loadAccess(caller: SafeUserProfile, projectTaskId: string) {
    requireActive(caller)
    const access = await repository.findAccess(projectTaskId, caller.id)
    if (!access) throw notFound()
    return access
  }

  async function loadOwnerAccess(caller: SafeUserProfile, projectTaskId: string) {
    const access = await loadAccess(caller, projectTaskId)
    requireOwner(caller, access)
    return access
  }

  async function transition(
    caller: SafeUserProfile,
    projectTaskId: string,
    input: ProjectTaskTransitionInput,
    action: 'publish' | 'close' | 'archive' | 'restore',
  ) {
    await loadOwnerAccess(caller, projectTaskId)
    const result = await repository[action]({
      projectTaskId,
      expectedUpdatedAt: input.expectedUpdatedAt,
      now: now(),
    })
    if (result.kind !== 'updated') mapWriteFailure(result)
    const pastTense = {
      publish: 'published',
      close: 'closed',
      archive: 'archived',
      restore: 'restored',
    }[action]
    logger.info(
      { event: `project_task.${pastTense}`, actorId: caller.id, projectTaskId },
      `project task ${pastTense}`,
    )
    return toProjectTaskProjection(result.projectTask, now())
  }

  return {
    async create(caller, classId, input) {
      requireActive(caller)
      const access = await classRepository.findAccess(classId, caller.id)
      if (!access || !ownsClass(caller, access.classRecord.instructorId)) throw classNotFound()
      if (access.classRecord.status === 'ARCHIVED') {
        throw new AppError({ statusCode: 409, code: 'CLASS_ARCHIVED', message: 'Archived classes are read-only.' })
      }
      const currentTime = now()
      const result = await repository.create({ classId, createdById: caller.id, projectTask: input, now: currentTime })
      if (result.kind === 'class_not_found') throw classNotFound()
      if (result.kind === 'class_archived') {
        throw new AppError({ statusCode: 409, code: 'CLASS_ARCHIVED', message: 'Archived classes are read-only.' })
      }
      logger.info({ event: 'project_task.created', actorId: caller.id, classId, projectTaskId: result.projectTask.id }, 'project task created')
      return toProjectTaskProjection(result.projectTask, currentTime)
    },
    async list(caller, classId, query) {
      requireActive(caller)
      const access = await classRepository.findAccess(classId, caller.id)
      if (!access || !canViewClass(caller, access)) throw classNotFound()
      const result = await repository.list({
        classId,
        callerId: caller.id,
        callerRole: caller.role,
        studentView: caller.role === 'STUDENT',
        query,
      })
      const totalPages = Math.ceil(result.totalItems / query.pageSize)
      return {
        projectTasks: result.projectTasks.map((record) => toProjectTaskProjection(record, now())),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: result.totalItems,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      }
    },
    async get(caller, projectTaskId) {
      const access = await loadAccess(caller, projectTaskId)
      if (!canViewTask(caller, access)) throw notFound()
      return toProjectTaskProjection(access.projectTask, now())
    },
    async update(caller, projectTaskId, input) {
      await loadOwnerAccess(caller, projectTaskId)
      const { expectedUpdatedAt, ...fields } = input
      const result = await repository.update({ projectTaskId, expectedUpdatedAt, fields, now: now() })
      if (result.kind !== 'updated') mapWriteFailure(result)
      logger.info({ event: 'project_task.updated', actorId: caller.id, projectTaskId }, 'project task updated')
      return toProjectTaskProjection(result.projectTask, now())
    },
    publish(caller, projectTaskId, input) {
      return transition(caller, projectTaskId, input, 'publish')
    },
    close(caller, projectTaskId, input) {
      return transition(caller, projectTaskId, input, 'close')
    },
    archive(caller, projectTaskId, input) {
      return transition(caller, projectTaskId, input, 'archive')
    },
    restore(caller, projectTaskId, input) {
      return transition(caller, projectTaskId, input, 'restore')
    },
    async listTeams(caller, projectTaskId) {
      const access = await loadAccess(caller, projectTaskId)
      if (!(caller.role === 'ADMIN' || ownsClass(caller, access.projectTask.class.instructorId))) throw notFound()
      return repository.listTeams(projectTaskId)
    },
    async monitoring(caller, projectTaskId) {
      const access = await loadAccess(caller, projectTaskId)
      if (!(caller.role === 'ADMIN' || ownsClass(caller, access.projectTask.class.instructorId))) throw notFound()
      return repository.monitoring(projectTaskId, now())
    },
  }
}
