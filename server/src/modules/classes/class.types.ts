import type { AcademicPeriod, ClassMemberStatus, ClassStatus } from '@prisma/client'

export interface ClassRecord {
  id: string
  instructorId: string | null
  className: string
  classCode: string
  classCodeActive: boolean
  classCodeChangedAt: Date
  section: string | null
  semester: string | null
  schoolYear: string | null
  courseId?: string | null
  courseNumberSnapshot?: string | null
  courseNameSnapshot?: string | null
  officialClassCode?: string | null
  academicPeriod?: AcademicPeriod | null
  schedule?: string | null
  days?: string | null
  room?: string | null
  status: ClassStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  instructor: {
    id: string
    fullName: string
  } | null
  teachingStaff?: { instructorId: string; status: string }[]
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
  section: string | null
  semester: string | null
  schoolYear: string | null
  courseId?: string | null
  courseNumber?: string | null
  courseName?: string | null
  officialClassCode?: string | null
  academicPeriod?: AcademicPeriod | null
  schedule?: string | null
  days?: string | null
  room?: string | null
  status: ClassStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  instructor: {
    userId: string
    fullName: string
  } | null
}

export function isTeachingInstructor(record: { instructorId: string | null; teachingStaff?: { instructorId: string; status: string }[] }, userId: string): boolean {
  return record.instructorId === userId || Boolean(record.teachingStaff?.some((staff) => staff.instructorId === userId && staff.status === 'ACTIVE'))
}

export function toClassProjection(record: ClassRecord): ClassProjection {
  return {
    id: record.id,
    className: record.className,
    section: record.section,
    semester: record.semester,
    schoolYear: record.schoolYear,
    courseId: record.courseId,
    courseNumber: record.courseNumberSnapshot,
    courseName: record.courseNameSnapshot,
    officialClassCode: record.officialClassCode,
    academicPeriod: record.academicPeriod,
    schedule: record.schedule,
    days: record.days,
    room: record.room,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
    instructor: record.instructor ? {
      userId: record.instructor.id,
      fullName: record.instructor.fullName,
    } : null,
  }
}
