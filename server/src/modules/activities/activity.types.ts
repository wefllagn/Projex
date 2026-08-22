import type {
  ActivityStatus,
  AttemptCreditPolicy,
  ClassMemberStatus,
  ClassStatus,
  Prisma,
  ProgrammingLanguage,
} from '@prisma/client'

export interface ActivityRecord {
  id: string
  classId: string
  createdById: string
  title: string
  instructions: string
  dueDate: Date
  language: ProgrammingLanguage
  entryClassName: string
  starterCode: string
  maxAttempts: number
  creditPolicy: AttemptCreditPolicy
  totalPoints: Prisma.Decimal
  status: ActivityStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  closedAt: Date | null
  archivedAt: Date | null
  class: {
    id: string
    instructorId: string
    status: ClassStatus
  }
  createdBy: {
    id: string
    fullName: string
  }
}

export interface ActivityAccessRecord {
  activity: ActivityRecord
  membership: {
    id: string
    status: ClassMemberStatus
  } | null
}

export type ActivityDueState =
  | 'DRAFT'
  | 'OPEN'
  | 'PAST_DUE'
  | 'CLOSED'
  | 'ARCHIVED'

export interface ActivityProjection {
  id: string
  classId: string
  title: string
  instructions: string
  dueDate: Date
  dueState: ActivityDueState
  language: ProgrammingLanguage
  entryClassName: string
  starterCode: string
  maxAttempts: number
  creditPolicy: AttemptCreditPolicy
  totalPoints: number
  status: ActivityStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  closedAt: Date | null
  archivedAt: Date | null
  createdBy: {
    userId: string
    fullName: string
  }
}

export interface AdminActivityProjection {
  id: string
  classId: string
  title: string
  dueDate: Date
  dueState: ActivityDueState
  language: ProgrammingLanguage
  entryClassName: string
  maxAttempts: number
  creditPolicy: AttemptCreditPolicy
  totalPoints: number
  status: ActivityStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  closedAt: Date | null
  archivedAt: Date | null
  createdBy: { userId: string; fullName: string }
}

export function activityDueState(record: ActivityRecord, now: Date): ActivityDueState {
  if (record.status === 'DRAFT') return 'DRAFT'
  if (record.status === 'ARCHIVED') return 'ARCHIVED'
  if (record.status === 'CLOSED') return 'CLOSED'
  return isOrdinarySubmissionOpen(record.status, record.dueDate, now)
    ? 'OPEN'
    : 'PAST_DUE'
}

export function isOrdinarySubmissionOpen(
  status: ActivityStatus,
  dueDate: Date,
  now: Date,
): boolean {
  return status === 'PUBLISHED' && now.getTime() < dueDate.getTime()
}

export function toActivityProjection(
  record: ActivityRecord,
  now: Date,
): ActivityProjection {
  return {
    id: record.id,
    classId: record.classId,
    title: record.title,
    instructions: record.instructions,
    dueDate: record.dueDate,
    dueState: activityDueState(record, now),
    language: record.language,
    entryClassName: record.entryClassName,
    starterCode: record.starterCode,
    maxAttempts: record.maxAttempts,
    creditPolicy: record.creditPolicy,
    totalPoints: Number(record.totalPoints),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    closedAt: record.closedAt,
    archivedAt: record.archivedAt,
    createdBy: {
      userId: record.createdBy.id,
      fullName: record.createdBy.fullName,
    },
  }
}

export function toAdminActivityProjection(
  record: ActivityRecord,
  now: Date,
): AdminActivityProjection {
  return {
    id: record.id,
    classId: record.classId,
    title: record.title,
    dueDate: record.dueDate,
    dueState: activityDueState(record, now),
    language: record.language,
    entryClassName: record.entryClassName,
    maxAttempts: record.maxAttempts,
    creditPolicy: record.creditPolicy,
    totalPoints: Number(record.totalPoints),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    closedAt: record.closedAt,
    archivedAt: record.archivedAt,
    createdBy: {
      userId: record.createdBy.id,
      fullName: record.createdBy.fullName,
    },
  }
}
