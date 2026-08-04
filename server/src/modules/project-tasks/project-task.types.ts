import type {
  ClassMemberStatus,
  ClassStatus,
  ProjectTaskStatus,
  RepositoryReviewStatus,
  RepositoryStatus,
  TeamStatus,
} from '@prisma/client'

export interface ProjectTaskRecord {
  id: string
  classId: string
  createdById: string
  title: string
  instructions: string
  dueDate: Date
  maxTeamSize: number
  status: ProjectTaskStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  closedAt: Date | null
  archivedAt: Date | null
  class: { id: string; instructorId: string; status: ClassStatus }
  createdBy: { id: string; fullName: string }
}

export interface ProjectTaskAccessRecord {
  projectTask: ProjectTaskRecord
  membership: { id: string; status: ClassMemberStatus } | null
}

export type ProjectTaskDueState =
  | 'DRAFT'
  | 'OPEN'
  | 'PAST_DUE'
  | 'CLOSED'
  | 'ARCHIVED'

export interface ProjectTaskProjection {
  id: string
  classId: string
  title: string
  instructions: string
  dueDate: Date
  dueState: ProjectTaskDueState
  maxTeamSize: number
  status: ProjectTaskStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  closedAt: Date | null
  archivedAt: Date | null
  createdBy: { userId: string; fullName: string }
}

export interface TeamSummaryProjection {
  teamId: string
  name: string
  status: TeamStatus
  lead: { userId: string; fullName: string }
  activeMemberCount: number
  repository: {
    repositoryId: string
    repositoryName: string
    status: RepositoryStatus
    reviewStatus: RepositoryReviewStatus
  } | null
}

export interface ProjectTaskMonitoringProjection {
  projectTaskId: string
  teamCount: number
  repositoryCount: number
  activeMemberCount: number
  pendingInvitationCount: number
  repositoriesByReviewStatus: Record<RepositoryReviewStatus, number>
}

export function projectTaskDueState(
  record: ProjectTaskRecord,
  now: Date,
): ProjectTaskDueState {
  if (record.status === 'DRAFT') return 'DRAFT'
  if (record.status === 'ARCHIVED') return 'ARCHIVED'
  if (record.status === 'CLOSED') return 'CLOSED'
  return record.dueDate.getTime() <= now.getTime() ? 'PAST_DUE' : 'OPEN'
}

export function toProjectTaskProjection(
  record: ProjectTaskRecord,
  now: Date,
): ProjectTaskProjection {
  return {
    id: record.id,
    classId: record.classId,
    title: record.title,
    instructions: record.instructions,
    dueDate: record.dueDate,
    dueState: projectTaskDueState(record, now),
    maxTeamSize: record.maxTeamSize,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    closedAt: record.closedAt,
    archivedAt: record.archivedAt,
    createdBy: { userId: record.createdBy.id, fullName: record.createdBy.fullName },
  }
}
