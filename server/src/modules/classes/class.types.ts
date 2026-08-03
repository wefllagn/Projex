import type { ClassMemberStatus, ClassStatus } from '@prisma/client'

export interface ClassRecord {
  id: string
  instructorId: string
  className: string
  classCode: string
  classCodeActive: boolean
  classCodeChangedAt: Date
  section: string
  semester: string
  schoolYear: string
  status: ClassStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  instructor: {
    id: string
    fullName: string
  }
}

export interface ClassAccessRecord {
  classRecord: ClassRecord
  membership: {
    id: string
    status: ClassMemberStatus
  } | null
}

export interface ClassProjection {
  id: string
  className: string
  section: string
  semester: string
  schoolYear: string
  status: ClassStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  instructor: {
    userId: string
    fullName: string
  }
}

export function toClassProjection(record: ClassRecord): ClassProjection {
  return {
    id: record.id,
    className: record.className,
    section: record.section,
    semester: record.semester,
    schoolYear: record.schoolYear,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
    instructor: {
      userId: record.instructor.id,
      fullName: record.instructor.fullName,
    },
  }
}
